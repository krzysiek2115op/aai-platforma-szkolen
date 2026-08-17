import { ArrowRight } from "lucide-react";

/**
 * Wspólne cegiełki Course Detail System (brief właściciela, B5 iteracja 3):
 * etykieta sekcji, CTA zakupu i szkielet sekcji. Każda strona kursu
 * składa się z tych samych komponentów — dane per kurs przychodzą z bazy.
 */

const CENA = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

export function formatujCene(grosze: number): string {
  return CENA.format(grosze / 100);
}

// CTA zakupu = placeholder do Pluginu 2 (bramka płatności) — do tego
// czasu zainteresowani piszą przez kontakt strony głównej.
export const CTA_ZAKUPU = "https://matthewplugins.pl/kontakt";

export function Etykieta({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
      [ {children} ]
    </p>
  );
}

/** CTA 1. osoby — wzorzec z analizy wzoru (WZOR-STRONA-SPRZEDAZOWA.md §2). */
export function CtaZakupu({
  cena,
  duzy = false,
  tekst,
}: {
  cena?: number;
  duzy?: boolean;
  tekst?: string;
}) {
  return (
    <a
      href={CTA_ZAKUPU}
      className={`btn-glow btn-sheen group inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-volt font-medium text-void transition-colors hover:bg-[#d3ff70] ${
        duzy ? "h-13 px-7 text-base" : "h-11 px-5 text-sm"
      }`}
    >
      {tekst ?? (cena !== undefined ? `Dołączam za ${formatujCene(cena)}` : "Dołączam do kursu")}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform group-hover:translate-x-0.5"
      />
    </a>
  );
}

/**
 * Szkielet sekcji strony kursu: etykieta z dynamicznym numerem,
 * nagłówek H2 (SEO/a11y: jedna hierarchia na stronie) i treść.
 */
export function Sekcja({
  id,
  etykieta,
  tytul,
  opis,
  children,
}: {
  id?: string;
  etykieta: string;
  tytul: React.ReactNode;
  opis?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="container-site border-t border-line pt-8 pb-14 md:pt-10 md:pb-20"
    >
      <Etykieta>{etykieta}</Etykieta>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
        {tytul}
      </h2>
      {opis ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel">
          {opis}
        </p>
      ) : null}
      {children}
    </section>
  );
}
