"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { PoleObszar, PoleTekst, PoleWybor } from "@/components/kreator/Pola";
import type { PoleProste, PoleSekcji } from "@/components/kreator/opis-pol";
import { pustyElement } from "@/components/kreator/tresc-sekcji";

/**
 * Kontrolki sterowane OPISEM POLA — jedno miejsce, w którym opis
 * (`opis-sekcji.ts`, `opis-lekcji.ts`) zamienia się w formularz.
 *
 * DLACZEGO OSOBNY PLIK. Do kroku 3 ten kod siedział w `EdytorSekcji`,
 * bo opis pól był tylko jeden. Od chwili, gdy opisem sterowana jest też
 * treść lekcji, drugi edytor musiałby albo importować z wnętrza tamtego
 * komponentu, albo mieć własne kontrolki — a wtedy pole opisane raz
 * wyglądałoby w panelu na dwa sposoby i `straznik-kreatora` pilnowałby
 * zgodności z kontraktem tylko w jednym z nich.
 *
 * Nowy typ kontrolki dopisuje się TUTAJ i nigdzie indziej.
 */

export function Pole({
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
        maks={pole.maks}
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

export function PoleProsteEdytor({
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
  if (pole.typ === "akapit") {
    return <PoleObszar {...wspolne} wiersze={pole.wiersze ?? 3} />;
  }
  if (pole.typ === "wybor") {
    // Lista zamknięta — kontrakt trzyma enum, więc panel nie ma prawa
    // dać wpisać nic spoza niego (opcje pilnuje straznik-kreatora).
    return <PoleWybor {...wspolne} opcje={pole.opcje ?? []} />;
  }
  return <PoleTekst {...wspolne} typ={pole.typ === "url" ? "url" : "text"} />;
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
  wylaczony,
}: {
  nazwaElementu: string;
  onClick: () => void;
  wylaczony?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={wylaczony}
      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-steel transition-colors hover:border-volt/40 hover:text-volt disabled:opacity-40 disabled:hover:border-line disabled:hover:text-steel"
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
  maks,
}: {
  etykieta: string;
  wymagane?: boolean;
  podpowiedz?: string;
  nazwaElementu: string;
  pola: PoleProste[];
  wartosc: Array<Record<string, unknown>>;
  zmien: (wartosc: Array<Record<string, unknown>>) => void;
  maks?: number;
}) {
  const pelno = maks !== undefined && wartosc.length >= maks;
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
      <div className="flex flex-wrap items-center gap-3">
        <PrzyciskDodaj
          nazwaElementu={nazwaElementu}
          wylaczony={pelno}
          onClick={() => zmien([...wartosc, pustyElement(pola)])}
        />
        {pelno ? (
          <span className="mt-3 font-mono text-label uppercase tracking-[0.2em] text-amber-400">
            limit: {maks} — więcej kontrakt nie przyjmie
          </span>
        ) : null}
      </div>
    </div>
  );
}
