"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { PoleObszar, PolePrzelacznik, PoleTekst } from "@/components/kreator/Pola";
import { czasMaterialu, slowo } from "@/lib/odmiana";

/**
 * Program kursu: moduły i lekcje. To spis treści realnego materiału —
 * strona liczy z niego statystyki katalogu (liczba modułów, lekcji,
 * czas), więc wpisujemy tu to, co kurs NAPRAWDĘ zawiera.
 *
 * Kolejność wynika z ustawienia na liście (position liczymy przy
 * zapisie), dlatego edytor daje strzałki, a nie pole „numer" —
 * numeracji nie da się rozjechać.
 */

export type StanLekcji = {
  title: string;
  duration_min: string;
  preview: boolean;
};

export type StanModulu = {
  title: string;
  summary: string;
  lessons: StanLekcji[];
};

export const PUSTY_MODUL: StanModulu = { title: "", summary: "", lessons: [] };

function przesun<T>(lista: T[], skad: number, dokad: number): T[] {
  if (dokad < 0 || dokad >= lista.length) return lista;
  const kopia = [...lista];
  const [element] = kopia.splice(skad, 1);
  kopia.splice(dokad, 0, element);
  return kopia;
}

export default function EdytorProgramu({
  moduly,
  zmien,
}: {
  moduly: StanModulu[];
  zmien: (moduly: StanModulu[]) => void;
}) {
  const liczbaLekcji = moduly.reduce((n, m) => n + m.lessons.length, 0);
  const minuty = moduly.reduce(
    (n, m) =>
      n + m.lessons.reduce((s, l) => s + (Number(l.duration_min) || 0), 0),
    0
  );

  function ustawModul(i: number, modul: StanModulu) {
    zmien(moduly.map((m, j) => (j === i ? modul : m)));
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-panel/40 px-5 py-4">
        <p className="text-sm leading-relaxed text-steel">
          Program to spis treści materiału — z niego strona liczy
          statystyki kursu.
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-label uppercase tracking-[0.2em] text-steel">
          <div className="flex gap-2">
            <dt>Moduły</dt>
            <dd className="text-fg">{moduly.length}</dd>
          </div>
          <div className="flex gap-2">
            <dt>{slowo(liczbaLekcji, "lekcja", "lekcje", "lekcji")}</dt>
            <dd className="text-fg">{liczbaLekcji}</dd>
          </div>
          <div className="flex gap-2">
            <dt>Czas</dt>
            <dd className="text-fg">{czasMaterialu(minuty)}</dd>
          </div>
        </dl>
      </div>

      <ul className="mt-4 grid gap-4">
        {moduly.map((modul, i) => (
          <li key={i} className="rounded-xl border border-line bg-panel/40 p-5">
            <div className="flex items-start gap-3">
              <span className="mt-2.5 font-mono text-label text-steel tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <PoleTekst
                  etykieta="Tytuł modułu"
                  wymagane
                  wartosc={modul.title}
                  zmien={(w) => ustawModul(i, { ...modul, title: w })}
                  placeholder="Fundamenty pracy z Claude"
                />
                <PoleObszar
                  etykieta="Opis modułu"
                  wartosc={modul.summary}
                  zmien={(w) => ustawModul(i, { ...modul, summary: w })}
                  wiersze={2}
                />
              </div>
              <div className="mt-6 flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => zmien(przesun(moduly, i, i - 1))}
                  disabled={i === 0}
                  aria-label="Przesuń moduł w górę"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-line text-steel transition-colors hover:text-fg disabled:opacity-30"
                >
                  <ArrowUp aria-hidden className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => zmien(przesun(moduly, i, i + 1))}
                  disabled={i === moduly.length - 1}
                  aria-label="Przesuń moduł w dół"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-line text-steel transition-colors hover:text-fg disabled:opacity-30"
                >
                  <ArrowDown aria-hidden className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => zmien(moduly.filter((_, j) => j !== i))}
                  aria-label="Usuń moduł"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-line text-steel transition-colors hover:border-red-500/40 hover:text-red-400"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                </button>
              </div>
            </div>

            <ul className="mt-5 grid gap-2 border-t border-line pt-4">
              {modul.lessons.map((lekcja, j) => (
                <li
                  key={j}
                  className="grid items-center gap-2 md:grid-cols-[auto_1fr_7rem_auto_auto]"
                >
                  <span className="font-mono text-label text-steel tabular-nums">
                    {i + 1}.{j + 1}
                  </span>
                  <input
                    value={lekcja.title}
                    onChange={(e) => {
                      const lessons = [...modul.lessons];
                      lessons[j] = { ...lekcja, title: e.target.value };
                      ustawModul(i, { ...modul, lessons });
                    }}
                    placeholder="Tytuł lekcji"
                    className="w-full rounded-md border border-line bg-panel/60 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-volt/60 focus:bg-panel"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={lekcja.duration_min}
                      onChange={(e) => {
                        const lessons = [...modul.lessons];
                        lessons[j] = { ...lekcja, duration_min: e.target.value };
                        ustawModul(i, { ...modul, lessons });
                      }}
                      placeholder="—"
                      aria-label={`Czas lekcji ${i + 1}.${j + 1} w minutach`}
                      className="w-full rounded-md border border-line bg-panel/60 py-2 pr-9 pl-3 text-sm text-fg outline-none transition-colors focus:border-volt/60 focus:bg-panel"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-label text-steel">
                      min
                    </span>
                  </div>
                  <PolePrzelacznik
                    etykieta="zapowiedź"
                    wlaczone={lekcja.preview}
                    zmien={(w) => {
                      const lessons = [...modul.lessons];
                      lessons[j] = { ...lekcja, preview: w };
                      ustawModul(i, { ...modul, lessons });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      ustawModul(i, {
                        ...modul,
                        lessons: modul.lessons.filter((_, k) => k !== j),
                      })
                    }
                    aria-label={`Usuń lekcję ${i + 1}.${j + 1}`}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-line text-steel transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() =>
                ustawModul(i, {
                  ...modul,
                  lessons: [
                    ...modul.lessons,
                    { title: "", duration_min: "", preview: false },
                  ],
                })
              }
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-steel transition-colors hover:border-volt/40 hover:text-volt"
            >
              <Plus aria-hidden className="size-3.5" />
              Dodaj lekcję
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => zmien([...moduly, { ...PUSTY_MODUL, lessons: [] }])}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-volt/30 bg-volt/10 px-5 text-sm font-medium text-volt transition-colors hover:bg-volt/20"
      >
        <Plus aria-hidden className="size-4" />
        Dodaj moduł
      </button>
    </div>
  );
}
