"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Cegiełki formularzy kreatora — jeden wygląd pola dla całego panelu.
 *
 * DLACZEGO OSOBNY PLIK. Kreator w Dziale 6 dostanie edytory dwunastu
 * rodzajów sekcji sprzedażowych; gdyby każdy z nich stylował inputy po
 * swojemu, panel rozjechałby się przy pierwszej zmianie. Tu są wszystkie
 * kontrolki, jakich potrzebuje kreator, w języku wizualnym strony
 * (volt na aktywnym polu, mono na etykietach, panel jako tło).
 */

const KLASA_POLA =
  "mt-2 w-full rounded-md border border-line bg-panel/60 px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-steel/40 focus:border-volt/60 focus:bg-panel disabled:opacity-50";

export function Etykieta({
  children,
  wymagane,
}: {
  children: ReactNode;
  wymagane?: boolean;
}) {
  return (
    <span className="font-mono text-label uppercase tracking-[0.25em] text-steel">
      {children}
      {wymagane ? <span className="ml-1 text-volt">*</span> : null}
    </span>
  );
}

function Podpowiedz({ tekst }: { tekst?: string }) {
  if (!tekst) return null;
  return <span className="mt-1.5 block text-xs leading-relaxed text-steel/70">{tekst}</span>;
}

function Blad({ tekst }: { tekst?: string }) {
  if (!tekst) return null;
  return (
    <span role="alert" className="mt-1.5 block text-xs text-red-400">
      {tekst}
    </span>
  );
}

type WspolneProps = {
  etykieta: string;
  wartosc: string;
  zmien: (wartosc: string) => void;
  podpowiedz?: string;
  blad?: string;
  wymagane?: boolean;
  placeholder?: string;
  klasa?: string;
};

export function PoleTekst({
  etykieta,
  wartosc,
  zmien,
  podpowiedz,
  blad,
  wymagane,
  placeholder,
  klasa,
  typ = "text",
}: WspolneProps & { typ?: "text" | "url" }) {
  return (
    <label className={cn("block", klasa)}>
      <Etykieta wymagane={wymagane}>{etykieta}</Etykieta>
      <input
        type={typ}
        value={wartosc}
        onChange={(e) => zmien(e.target.value)}
        placeholder={placeholder}
        aria-invalid={blad ? true : undefined}
        className={cn(KLASA_POLA, blad && "border-red-500/60")}
      />
      <Podpowiedz tekst={podpowiedz} />
      <Blad tekst={blad} />
    </label>
  );
}

export function PoleObszar({
  etykieta,
  wartosc,
  zmien,
  podpowiedz,
  blad,
  wymagane,
  placeholder,
  klasa,
  wiersze = 4,
}: WspolneProps & { wiersze?: number }) {
  return (
    <label className={cn("block", klasa)}>
      <Etykieta wymagane={wymagane}>{etykieta}</Etykieta>
      <textarea
        value={wartosc}
        onChange={(e) => zmien(e.target.value)}
        rows={wiersze}
        placeholder={placeholder}
        aria-invalid={blad ? true : undefined}
        className={cn(KLASA_POLA, "resize-y leading-relaxed", blad && "border-red-500/60")}
      />
      <Podpowiedz tekst={podpowiedz} />
      <Blad tekst={blad} />
    </label>
  );
}

export function PoleWybor({
  etykieta,
  wartosc,
  zmien,
  opcje,
  podpowiedz,
  blad,
  wymagane,
  klasa,
}: WspolneProps & { opcje: Array<{ wartosc: string; tekst: string }> }) {
  return (
    <label className={cn("block", klasa)}>
      <Etykieta wymagane={wymagane}>{etykieta}</Etykieta>
      <select
        value={wartosc}
        onChange={(e) => zmien(e.target.value)}
        aria-invalid={blad ? true : undefined}
        className={cn(KLASA_POLA, "appearance-none", blad && "border-red-500/60")}
      >
        {opcje.map((o) => (
          <option key={o.wartosc} value={o.wartosc} className="bg-panel">
            {o.tekst}
          </option>
        ))}
      </select>
      <Podpowiedz tekst={podpowiedz} />
      <Blad tekst={blad} />
    </label>
  );
}

/**
 * Cena po ludzku: właściciel wpisuje złotówki, baza trzyma grosze
 * (int — bez błędów zaokrągleń na kwotach).
 */
export function PoleCena({
  etykieta,
  grosze,
  zmien,
  podpowiedz,
  blad,
  klasa,
}: {
  etykieta: string;
  grosze: number;
  zmien: (grosze: number) => void;
  podpowiedz?: string;
  blad?: string;
  klasa?: string;
}) {
  return (
    <label className={cn("block", klasa)}>
      <Etykieta wymagane>{etykieta}</Etykieta>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="0.01"
          value={grosze === 0 ? "0" : String(grosze / 100)}
          onChange={(e) => {
            const zlote = Number(e.target.value);
            zmien(Number.isFinite(zlote) ? Math.round(zlote * 100) : 0);
          }}
          aria-invalid={blad ? true : undefined}
          className={cn(KLASA_POLA, "pr-12", blad && "border-red-500/60")}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-label text-steel">
          PLN
        </span>
      </div>
      <Podpowiedz tekst={podpowiedz} />
      <Blad tekst={blad} />
    </label>
  );
}

export function PolePrzelacznik({
  etykieta,
  wlaczone,
  zmien,
  podpowiedz,
}: {
  etykieta: string;
  wlaczone: boolean;
  zmien: (wlaczone: boolean) => void;
  podpowiedz?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={wlaczone}
        onChange={(e) => zmien(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-volt)]"
      />
      <span>
        <span className="block text-sm text-fg">{etykieta}</span>
        {podpowiedz ? (
          <span className="block text-xs text-steel/70">{podpowiedz}</span>
        ) : null}
      </span>
    </label>
  );
}
