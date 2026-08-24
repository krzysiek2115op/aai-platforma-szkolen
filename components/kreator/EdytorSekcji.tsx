"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Pole } from "@/components/kreator/PolaOpisane";
import {
  OPIS_SEKCJI,
  type OpisSekcji,
} from "@/components/kreator/opis-sekcji";
import {
  brakujacePola,
  pustaTresc,
  type Tresc,
} from "@/components/kreator/tresc-sekcji";

/**
 * Edytor treści sprzedażowej — WSZYSTKIE rodzaje sekcji jednym
 * komponentem, bo o tym, co się rysuje, decyduje opis pól
 * (opis-sekcji.ts), a nie dwanaście osobnych formularzy. Nowy rodzaj
 * sekcji = wpis w opisie; tutaj nie ma czego dopisywać.
 *
 * Strona sprzedażowa bierze po JEDNEJ sekcji każdego rodzaju i układa
 * je w stałej kolejności, więc kreator daje na rodzaj jedno miejsce:
 * dodaj / wypełnij / usuń. Kolejność kart = kolejność na stronie.
 */

export type StanSekcji = Record<string, Tresc>;

export default function EdytorSekcji({
  sekcje,
  zmien,
  bledy,
}: {
  sekcje: StanSekcji;
  zmien: (sekcje: StanSekcji) => void;
  bledy: Record<string, string>;
}) {
  const [rozwiniete, setRozwiniete] = useState<string[]>([]);

  function przelacz(rodzaj: string) {
    setRozwiniete((p) =>
      p.includes(rodzaj) ? p.filter((r) => r !== rodzaj) : [...p, rodzaj]
    );
  }

  function dodaj(opis: OpisSekcji) {
    zmien({ ...sekcje, [opis.rodzaj]: pustaTresc(opis) });
    setRozwiniete((p) => [...p, opis.rodzaj]);
  }

  function usun(rodzaj: string) {
    const kopia = { ...sekcje };
    delete kopia[rodzaj];
    zmien(kopia);
  }

  function ustawPole(rodzaj: string, pole: string, wartosc: unknown) {
    zmien({ ...sekcje, [rodzaj]: { ...sekcje[rodzaj], [pole]: wartosc } });
  }

  const uzyte = OPIS_SEKCJI.filter((o) => sekcje[o.rodzaj] !== undefined).length;
  const komplet = uzyte === OPIS_SEKCJI.length;

  return (
    <div className="mt-6 grid gap-3">
      {/* Panel musi sam tłumaczyć swoją logikę: lista NIŻEJ to komplet
          rodzajów, jakie strona kursu potrafi wyrenderować. Brak
          przycisku „Dodaj" przy komplecie mylił („nie mogę nigdzie
          dodać sekcji") — teraz jest napisane wprost. */}
      <div className="rounded-xl border border-line bg-panel/40 px-5 py-4">
        <p className="text-sm leading-relaxed text-steel">
          Niżej jest <strong className="text-fg">komplet {OPIS_SEKCJI.length} rodzajów</strong>{" "}
          sekcji, jakie potrafi pokazać strona kursu. Każdy rodzaj
          występuje raz: dodajesz go przyciskiem <strong className="text-volt">Dodaj</strong>,
          a zdejmujesz koszem. Sekcja, której nie dodasz, nie pojawia się
          na stronie. Kolejność jest stała — wynika z układu strony
          sprzedażowej, nie z panelu.
        </p>
        <p className="mt-3 font-mono text-label uppercase tracking-[0.2em]">
          {komplet ? (
            <span className="text-volt">
              masz komplet {uzyte}/{OPIS_SEKCJI.length} — nie ma już czego dodać
            </span>
          ) : (
            <span className="text-steel">
              na stronie: {uzyte}/{OPIS_SEKCJI.length} · do dodania:{" "}
              <span className="text-amber-400">{OPIS_SEKCJI.length - uzyte}</span>
            </span>
          )}
        </p>
      </div>

      {OPIS_SEKCJI.map((opis, i) => {
        const tresc = sekcje[opis.rodzaj];
        const wlaczona = tresc !== undefined;
        const braki = wlaczona ? brakujacePola(opis, tresc) : [];
        const otwarta = rozwiniete.includes(opis.rodzaj);

        return (
          <section
            key={opis.rodzaj}
            className={`rounded-xl border transition-colors ${
              wlaczona ? "border-line bg-panel/40" : "border-line/60 bg-panel/20"
            }`}
          >
            <header className="flex flex-wrap items-center gap-3 p-4 md:p-5">
              <span className="font-mono text-label text-steel tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>

              <button
                type="button"
                onClick={() => (wlaczona ? przelacz(opis.rodzaj) : dodaj(opis))}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium text-fg">
                    {opis.nazwa}
                  </span>
                  <span className="block truncate text-xs text-steel">
                    {opis.cel}
                  </span>
                </span>
              </button>

              {wlaczona ? (
                <>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-label uppercase tracking-[0.15em] ${
                      braki.length === 0
                        ? "bg-volt/10 text-volt"
                        : "bg-amber-400/10 text-amber-400"
                    }`}
                  >
                    {braki.length === 0 ? (
                      <>
                        <Check aria-hidden className="size-3" />
                        gotowa
                      </>
                    ) : (
                      `brakuje: ${braki.join(", ")}`
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => usun(opis.rodzaj)}
                    aria-label={`Usuń sekcję ${opis.nazwa}`}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-line text-steel transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => przelacz(opis.rodzaj)}
                    aria-label={otwarta ? "Zwiń" : "Rozwiń"}
                    aria-expanded={otwarta}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-line text-steel transition-colors hover:text-fg"
                  >
                    <ChevronDown
                      aria-hidden
                      className={`size-4 transition-transform ${otwarta ? "rotate-180" : ""}`}
                    />
                  </button>
                </>
              ) : (
                <>
                  <span className="font-mono text-label uppercase tracking-[0.15em] text-steel/60">
                    nie ma jej na stronie
                  </span>
                  <button
                    type="button"
                    onClick={() => dodaj(opis)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-volt/30 bg-volt/10 px-4 text-sm text-volt transition-colors hover:bg-volt/20"
                  >
                    <Plus aria-hidden className="size-3.5" />
                    Dodaj
                  </button>
                </>
              )}
            </header>

            {wlaczona && otwarta ? (
              <div className="grid gap-5 border-t border-line p-4 md:p-6">
                {opis.pola.map((pole) => (
                  <Pole
                    key={pole.pole}
                    pole={pole}
                    wartosc={tresc[pole.pole]}
                    zmien={(w) => ustawPole(opis.rodzaj, pole.pole, w)}
                    blad={bledy[`sections.${opis.rodzaj}.${pole.pole}`]}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
