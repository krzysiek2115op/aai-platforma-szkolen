"use client";

import { useState } from "react";
import { Check, ChevronDown, GripVertical, Plus, Trash2, X } from "lucide-react";
import { PoleObszar, PoleTekst } from "@/components/kreator/Pola";
import {
  OPIS_SEKCJI,
  type OpisSekcji,
  type PoleProste,
  type PoleSekcji,
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

  return (
    <div className="mt-6 grid gap-3">
      <p className="text-sm leading-relaxed text-steel">
        Sekcje bez treści nie pojawiają się na stronie kursu. Kolejność
        poniżej to kolejność, w jakiej zobaczy je kupujący — jest stała,
        bo wynika z układu strony sprzedażowej.
      </p>

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
                <button
                  type="button"
                  onClick={() => dodaj(opis)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-volt/30 bg-volt/10 px-4 text-sm text-volt transition-colors hover:bg-volt/20"
                >
                  <Plus aria-hidden className="size-3.5" />
                  Dodaj
                </button>
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

/* ————— pojedyncze pole: kontrolka wynika z opisu ————— */

function Pole({
  pole,
  wartosc,
  zmien,
  blad,
}: {
  pole: PoleSekcji;
  wartosc: unknown;
  zmien: (wartosc: unknown) => void;
  blad?: string;
}) {
  if (pole.typ === "lista-tekstow") {
    return (
      <ListaTekstow
        etykieta={pole.etykieta}
        wymagane={pole.wymagane}
        podpowiedz={pole.podpowiedz}
        nazwaElementu={pole.nazwaElementu}
        wartosc={(wartosc as string[]) ?? []}
        zmien={(w) => zmien(w)}
      />
    );
  }

  if (pole.typ === "lista-obiektow") {
    return (
      <ListaObiektow
        etykieta={pole.etykieta}
        wymagane={pole.wymagane}
        podpowiedz={pole.podpowiedz}
        nazwaElementu={pole.nazwaElementu}
        pola={pole.pola}
        wartosc={(wartosc as Array<Record<string, unknown>>) ?? []}
        zmien={(w) => zmien(w)}
      />
    );
  }

  if (pole.typ === "obiekt") {
    const obiekt = (wartosc as Record<string, unknown>) ?? {};
    return (
      <fieldset className="rounded-lg border border-line/70 p-4">
        <legend className="px-2 font-mono text-label uppercase tracking-[0.25em] text-steel">
          {pole.etykieta}
        </legend>
        {pole.podpowiedz ? (
          <p className="mb-3 text-xs text-steel/70">{pole.podpowiedz}</p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {pole.pola.map((p) => (
            <PoleProsteEdytor
              key={p.pole}
              pole={p}
              wartosc={String(obiekt[p.pole] ?? "")}
              zmien={(w) => zmien({ ...obiekt, [p.pole]: w })}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <PoleProsteEdytor
      pole={pole}
      wartosc={String(wartosc ?? "")}
      zmien={zmien}
      blad={blad}
    />
  );
}

function PoleProsteEdytor({
  pole,
  wartosc,
  zmien,
  blad,
}: {
  pole: PoleProste;
  wartosc: string;
  zmien: (wartosc: string) => void;
  blad?: string;
}) {
  const wspolne = {
    etykieta: pole.etykieta,
    wartosc,
    zmien,
    podpowiedz: pole.podpowiedz,
    wymagane: pole.wymagane,
    placeholder: pole.placeholder,
    blad,
  };
  return pole.typ === "akapit" ? (
    <PoleObszar {...wspolne} wiersze={3} />
  ) : (
    <PoleTekst {...wspolne} typ={pole.typ === "url" ? "url" : "text"} />
  );
}

/* ————— listy ————— */

function NaglowekListy({
  etykieta,
  wymagane,
  podpowiedz,
}: {
  etykieta: string;
  wymagane?: boolean;
  podpowiedz?: string;
}) {
  return (
    <>
      <span className="font-mono text-label uppercase tracking-[0.25em] text-steel">
        {etykieta}
        {wymagane ? <span className="ml-1 text-volt">*</span> : null}
      </span>
      {podpowiedz ? (
        <span className="mt-1 block text-xs text-steel/70">{podpowiedz}</span>
      ) : null}
    </>
  );
}

function PrzyciskDodaj({
  nazwaElementu,
  onClick,
}: {
  nazwaElementu: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-steel transition-colors hover:border-volt/40 hover:text-volt"
    >
      <Plus aria-hidden className="size-3.5" />
      Dodaj {nazwaElementu}
    </button>
  );
}

function ListaTekstow({
  etykieta,
  wymagane,
  podpowiedz,
  nazwaElementu,
  wartosc,
  zmien,
}: {
  etykieta: string;
  wymagane?: boolean;
  podpowiedz?: string;
  nazwaElementu: string;
  wartosc: string[];
  zmien: (wartosc: string[]) => void;
}) {
  return (
    <div>
      <NaglowekListy etykieta={etykieta} wymagane={wymagane} podpowiedz={podpowiedz} />
      <ul className="mt-2 grid gap-2">
        {wartosc.map((tekst, i) => (
          <li key={i} className="flex items-center gap-2">
            <GripVertical aria-hidden className="size-4 shrink-0 text-steel/40" />
            <input
              value={tekst}
              onChange={(e) => {
                const kopia = [...wartosc];
                kopia[i] = e.target.value;
                zmien(kopia);
              }}
              className="w-full rounded-md border border-line bg-panel/60 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-volt/60 focus:bg-panel"
            />
            <button
              type="button"
              onClick={() => zmien(wartosc.filter((_, j) => j !== i))}
              aria-label={`Usuń ${nazwaElementu} ${i + 1}`}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-steel transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <PrzyciskDodaj
        nazwaElementu={nazwaElementu}
        onClick={() => zmien([...wartosc, ""])}
      />
    </div>
  );
}

function ListaObiektow({
  etykieta,
  wymagane,
  podpowiedz,
  nazwaElementu,
  pola,
  wartosc,
  zmien,
}: {
  etykieta: string;
  wymagane?: boolean;
  podpowiedz?: string;
  nazwaElementu: string;
  pola: PoleProste[];
  wartosc: Array<Record<string, unknown>>;
  zmien: (wartosc: Array<Record<string, unknown>>) => void;
}) {
  return (
    <div>
      <NaglowekListy etykieta={etykieta} wymagane={wymagane} podpowiedz={podpowiedz} />
      <ul className="mt-2 grid gap-3">
        {wartosc.map((element, i) => (
          <li
            key={i}
            className="rounded-lg border border-line/70 bg-void/30 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-label uppercase tracking-[0.2em] text-steel">
                {nazwaElementu} {i + 1}
              </span>
              <button
                type="button"
                onClick={() => zmien(wartosc.filter((_, j) => j !== i))}
                aria-label={`Usuń ${nazwaElementu} ${i + 1}`}
                className="inline-flex size-8 items-center justify-center rounded-full border border-line text-steel transition-colors hover:border-red-500/40 hover:text-red-400"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </div>
            <div className="grid gap-4">
              {pola.map((p) => (
                <PoleProsteEdytor
                  key={p.pole}
                  pole={p}
                  wartosc={String(element[p.pole] ?? "")}
                  zmien={(w) => {
                    const kopia = [...wartosc];
                    kopia[i] = { ...element, [p.pole]: w };
                    zmien(kopia);
                  }}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
      <PrzyciskDodaj
        nazwaElementu={nazwaElementu}
        onClick={() =>
          zmien([
            ...wartosc,
            Object.fromEntries(pola.map((p) => [p.pole, ""])),
          ])
        }
      />
    </div>
  );
}
