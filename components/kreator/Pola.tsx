"use client";

import { useState, type ReactNode } from "react";
import { naGrosze, zGroszy } from "@/components/kreator/cena";
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
  przyOpuszczeniu,
}: WspolneProps & { typ?: "text" | "url"; przyOpuszczeniu?: () => void }) {
  return (
    <label className={cn("block", klasa)}>
      <Etykieta wymagane={wymagane}>{etykieta}</Etykieta>
      <input
        type={typ}
        value={wartosc}
        onChange={(e) => zmien(e.target.value)}
        onBlur={przyOpuszczeniu}
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
 *
 * UWAGA NA POLE STEROWANE LICZBĄ. Kontrolka trzyma WŁASNY tekst, a nie
 * wartość przeliczoną z groszy. Inaczej w trakcie pisania „199,90"
 * przeglądarka na chwilę oddaje pusty string (stan „199,"), z pustego
 * robi się 0 i pole samo kasuje to, co się właśnie wpisuje — cena
 * z groszami byłaby nie do wpisania, a właściciel mógłby zapisać
 * 0 zł w przekonaniu, że wpisał 199,90.
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
  const [tekst, setTekst] = useState(() => zGroszy(grosze));

  // kurs przeładowany z serwera (np. po zapisie) — pole ma pokazać
  // stan z bazy, ale nie w trakcie pisania przez właściciela
  const [ostatnieGrosze, setOstatnieGrosze] = useState(grosze);
  if (grosze !== ostatnieGrosze) {
    setOstatnieGrosze(grosze);
    if (naGrosze(tekst) !== grosze) setTekst(zGroszy(grosze));
  }

  return (
    <label className={cn("block", klasa)}>
      <Etykieta wymagane>{etykieta}</Etykieta>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={tekst}
          onChange={(e) => {
            // przecinek jak na polskiej klawiaturze numerycznej
            const wpisane = e.target.value.replace(/[^\d.,]/g, "");
            setTekst(wpisane);
            const grosze = naGrosze(wpisane);
            // null = stan w połowie pisania („199,”) — zapisanej ceny
            // nie ruszamy, żeby pole nie kasowało tego, co się wpisuje
            if (grosze !== null) zmien(grosze);
            else if (wpisane === "") zmien(0);
          }}
          onBlur={() => setTekst(zGroszy(grosze))}
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
