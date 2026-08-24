"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AutomaticMark } from "@/components/brand/AutomaticMark";

export type PozycjaPaska = { id: string; tekst: string };

/**
 * Pasek menu KURSU (feedback właściciela do B5): na stronie kursu
 * globalny navbar znika (NavbarPrzelacznik), a jego miejsce zajmuje
 * pływająca pigułka widoczna OD WEJŚCIA — na pierwszy rzut oka mówi,
 * co jest w środku, i oprowadza po sekcjach (kotwice + aktywna sekcja
 * podświetlana z IntersectionObservera) aż do CTA „Dołącz".
 *
 * Bez JavaScriptu pasek też stoi (to jedyna nawigacja strony kursu) —
 * JS dokłada tylko podświetlenie aktywnej sekcji.
 */
export default function PasekKursu({
  pozycje,
}: {
  pozycje: PozycjaPaska[];
}) {
  const [aktywna, setAktywna] = useState<string | null>(null);

  useEffect(() => {
    const sekcje = pozycje
      .map((p) => document.getElementById(p.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sekcje.length === 0) return;

    // „aktywna" = sekcja przecinająca pas 35–45% wysokości widoku
    const obserwator = new IntersectionObserver(
      (wpisy) => {
        for (const wpis of wpisy) {
          if (wpis.isIntersecting) setAktywna(wpis.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    for (const el of sekcje) obserwator.observe(el);
    return () => obserwator.disconnect();
  }, [pozycje]);

  return (
    <header
      data-pasek-kursu
      className="pasek-wjazd fixed inset-x-0 top-0 z-50 px-3 pt-3 md:pt-4"
    >
      <nav
        aria-label="Nawigacja kursu"
        className="mx-auto flex h-12 w-full max-w-4xl items-center gap-1.5 rounded-full border border-line bg-void/80 px-2 shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-md md:h-13 md:gap-2"
      >
        <Link
          href="/szkolenia"
          aria-label="Wróć do katalogu szkoleń"
          className="group/wroc flex size-9 shrink-0 items-center justify-center rounded-full border border-volt/25 bg-volt/10 font-mono text-xs font-semibold text-volt transition-colors hover:bg-volt hover:text-void"
        >
          <AutomaticMark className="size-4 group-hover/wroc:hidden" />
          <ArrowLeft aria-hidden className="hidden size-4 group-hover/wroc:block" />
        </Link>

        <ul className="scrollbar-none flex flex-1 items-center gap-0.5 overflow-x-auto px-1 md:gap-1">
          {pozycje.map((p) => (
            <li key={p.id} className="shrink-0">
              <a
                href={`#${p.id}`}
                aria-current={aktywna === p.id ? "true" : undefined}
                className={`inline-flex h-9 items-center rounded-full px-3 text-sm transition-colors md:px-3.5 ${
                  aktywna === p.id
                    ? "bg-volt/10 text-volt"
                    : "text-steel hover:bg-fg/[0.04] hover:text-fg"
                }`}
              >
                {p.tekst}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#cena"
          className="btn-glow group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-volt px-4 text-sm font-medium text-void transition-colors hover:bg-[#d3ff70]"
        >
          Dołącz
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </nav>
    </header>
  );
}
