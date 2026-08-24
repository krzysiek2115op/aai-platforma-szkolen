"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { Pole } from "@/components/kreator/PolaOpisane";
import {
  LIMIT_ZNAKOW,
  OPIS_LEKCJI,
  type OpisLekcji,
} from "@/components/kreator/opis-lekcji";
import {
  oczyscTresc,
  trescDoFormularza,
  type Tresc,
} from "@/components/kreator/tresc-sekcji";
import { bledyPol, komunikat, wystrzel } from "@/components/kreator/wystrzal";
import { slowo } from "@/lib/odmiana";

/**
 * Edytor TREŚCI LEKCJI — materiału, który kupujący czyta po zalogowaniu.
 *
 * Trzy decyzje, które widać w tym pliku:
 *
 *  1. **Osobna trasa, nie zakładka kursu.** Treść jednej lekcji potrafi
 *     mieć 120 000 znaków; wczytanie 41 lekcji do formularza kursu
 *     znaczyłoby tyle, co wysłanie całego kursu do przeglądarki przy
 *     każdym wejściu w panel. Kreator czyta więc lekcję po id, a zapis
 *     idzie osobną akcją dyspozytora (patrz `AkcjaDyspozytora`).
 *  2. **Pola z opisu, nie z ręki.** Zestaw pól bierze się z
 *     `opis-lekcji.ts`, tak samo jak w sekcjach sprzedażowych — dzięki
 *     temu `straznik-kreatora` porównuje panel z kontraktem Zod i pole
 *     dodane do jednego bez drugiego zapala CI.
 *  3. **Podgląd bez renderera Markdowna.** W projekcie nie ma biblioteki
 *     do Markdowna i krok 3 jej nie dokłada: podgląd pokazuje tekst
 *     z zachowanymi łamaniami i mówi wprost, że nie jest składem.
 *     Prawdziwy render przyjdzie z platformą kursu (etap WordPressa) —
 *     udawanie go tutaj kłamałoby o tym, jak wygląda gotowa lekcja.
 */

export type LekcjaDoPisania = {
  id: string;
  title: string;
  /** numer w programie, np. „3.4" */
  numer: string;
  kurs_id: string;
  kurs_tytul: string;
  modul_tytul: string;
  tresc: string;
  materialy: Array<Record<string, unknown>>;
};

/** Grupowanie tysięcy bez `toLocaleString` — serwer i klient muszą dać
 *  ten sam tekst, inaczej licznik psuje hydratację. */
function zGrupami(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Błędy pól z dyspozytora: ścieżki lecą jako `tresc.…` (kształt akcji). */
function bledyLekcji(mapa: Record<string, string>): Record<string, string> {
  const wynik: Record<string, string> = {};
  for (const [pole, wiadomosc] of Object.entries(mapa)) {
    wynik[pole.replace(/^tresc\./, "")] = wiadomosc;
  }
  return wynik;
}

export default function EdytorLekcji({
  lekcja,
  opis = OPIS_LEKCJI,
}: {
  lekcja: LekcjaDoPisania;
  opis?: OpisLekcji;
}) {
  const router = useRouter();
  const [stan, setStan] = useState<Tresc>(() =>
    trescDoFormularza(opis, { tresc: lekcja.tresc, materialy: lekcja.materialy })
  );
  const [zmienione, setZmienione] = useState(false);
  const [zapisuje, setZapisuje] = useState(false);
  const [zapisano, setZapisano] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const [bledy, setBledy] = useState<Record<string, string>>({});
  const [podglad, setPodglad] = useState(false);

  // Napisana lekcja żyje wyłącznie w przeglądarce do chwili zapisu —
  // zamknięcie karty bez ostrzeżenia kasowałoby godziny pracy.
  useEffect(() => {
    if (!zmienione) return;
    const ostrzez = (zdarzenie: BeforeUnloadEvent) => zdarzenie.preventDefault();
    window.addEventListener("beforeunload", ostrzez);
    return () => window.removeEventListener("beforeunload", ostrzez);
  }, [zmienione]);

  function ustaw(pole: string, wartosc: unknown) {
    setStan((p) => ({ ...p, [pole]: wartosc }));
    setZmienione(true);
    setZapisano(false);
  }

  async function zapisz() {
    setZapisuje(true);
    setBlad(null);
    setBledy({});

    const wynik = await wystrzel({
      akcja: "zapisz-tresc-lekcji",
      id: lekcja.id,
      tresc: oczyscTresc(opis, stan),
    });
    setZapisuje(false);

    if (!wynik.ok) {
      setBlad(komunikat(wynik));
      setBledy(bledyLekcji(bledyPol(wynik)));
      return;
    }
    setZapisano(true);
    setZmienione(false);
    // to serwer mówi, jaki jest stan po zapisie (licznik „ma treść"
    // przy lekcji bierze się z bazy, nie z tego formularza)
    router.refresh();
  }

  const tekst = typeof stan.tresc === "string" ? stan.tresc : "";
  const materialy = Array.isArray(stan.materialy) ? stan.materialy : [];
  const zaDlugo = tekst.length > LIMIT_ZNAKOW;
  const bledyMaterialow = Object.entries(bledy).filter(([p]) =>
    p.startsWith("materialy.")
  );

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-xl border border-line bg-panel/40 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-steel">{opis.cel}</p>
          <button
            type="button"
            onClick={() => setPodglad((p) => !p)}
            aria-pressed={podglad}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-steel transition-colors hover:border-volt/40 hover:text-volt"
          >
            {podglad ? (
              <EyeOff aria-hidden className="size-3.5" />
            ) : (
              <Eye aria-hidden className="size-3.5" />
            )}
            {podglad ? "Wróć do pisania" : "Podgląd"}
          </button>
        </div>

        {podglad ? (
          <div>
            <p className="font-mono text-label uppercase tracking-[0.25em] text-steel">
              Podgląd tekstu
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-steel/70">
              To jest sam tekst z zachowanymi łamaniami — nie skład
              Markdowna. Kreator nie udaje wyglądu gotowej lekcji;
              prawdziwy render przyjdzie z platformą kursu.
            </p>
            <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-md border border-line bg-void/40 p-5">
              {tekst.trim() === "" ? (
                <p className="text-sm text-steel/60">Lekcja jest jeszcze pusta.</p>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-fg">
                  {tekst}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {opis.pola.map((pole) => (
              <Pole
                key={pole.pole}
                pole={
                  pole.pole === "tresc"
                    ? {
                        ...pole,
                        podpowiedz: `${pole.podpowiedz ?? ""} Znaków: ${zGrupami(
                          tekst.length
                        )} / ${zGrupami(LIMIT_ZNAKOW)}.`,
                      }
                    : pole
                }
                wartosc={stan[pole.pole]}
                zmien={(w) => ustaw(pole.pole, w)}
                blad={bledy[pole.pole]}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-line bg-panel/40 p-6">
          <p className="font-mono text-label uppercase tracking-[0.25em] text-steel">
            Zapis lekcji
          </p>
          <p className="mt-3 text-sm leading-relaxed text-steel">
            Zapis dotyczy WYŁĄCZNIE tej lekcji — program kursu i strona
            sprzedażowa zostają nietknięte.
          </p>

          <dl className="mt-4 grid gap-1 font-mono text-label uppercase tracking-[0.2em] text-steel">
            <div className="flex justify-between gap-2">
              <dt>Znaki</dt>
              <dd className={zaDlugo ? "text-red-400" : "text-fg"}>
                {zGrupami(tekst.length)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{slowo(materialy.length, "Materiał", "Materiały", "Materiałów")}</dt>
              <dd className="text-fg">{materialy.length}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={zapisz}
            disabled={zapisuje}
            className="btn-glow btn-sheen mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-volt text-sm font-medium text-void transition-colors hover:bg-[#d3ff70] disabled:opacity-60"
          >
            {zapisuje ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : zapisano && !zmienione ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Save aria-hidden className="size-4" />
            )}
            {zapisuje ? "Zapisuję…" : zapisano && !zmienione ? "Zapisane" : "Zapisz lekcję"}
          </button>

          <Link
            href={`/szkolenia/kreator/${lekcja.kurs_id}`}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line text-sm text-steel transition-colors hover:border-volt/40 hover:text-volt"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Wróć do programu kursu
          </Link>

          {zmienione ? (
            <p className="mt-4 font-mono text-label uppercase tracking-[0.2em] text-amber-400">
              niezapisane zmiany
            </p>
          ) : null}

          {blad ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {blad}
            </p>
          ) : null}

          {bledyMaterialow.length > 0 ? (
            <ul className="mt-3 grid gap-1 text-xs text-red-300">
              {bledyMaterialow.map(([pole, wiadomosc]) => (
                <li key={pole}>
                  <span className="font-mono">{pole}</span>: {wiadomosc}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
