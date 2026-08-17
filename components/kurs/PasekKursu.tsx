"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

export type PozycjaPaska = { id: string; tekst: string };

/**
 * Sticky course navigation (brief CDS pkt 2): subtelne mini-menu, które
 * pojawia się po przescrollowaniu hero — kotwice do sekcji + CTA.
 *
 * Progressive enhancement: pasek to udogodnienie, nie treść — bez
 * JavaScriptu pozostaje schowany, strona jest kompletna. Scroll mierzony
 * w rAF (bez layout thrashing), aktywna sekcja z jednego
 * IntersectionObservera; prefers-reduced-motion = brak animacji wjazdu.
 */
export default function PasekKursu({
  pozycje,
  progOdslony = 420,
}: {
  pozycje: PozycjaPaska[];
  /** po ilu px scrolla pasek się pojawia (mniej więcej wysokość hero) */
  progOdslony?: number;
}) {
  const [widoczny, setWidoczny] = useState(false);
  const [aktywna, setAktywna] = useState<string | null>(null);
  const tykaRef = useRef(false);

  useEffect(() => {
    const zmierz = () => {
      tykaRef.current = false;
      setWidoczny(window.scrollY > progOdslony);
    };
    const onScroll = () => {
      if (tykaRef.current) return;
      tykaRef.current = true;
      requestAnimationFrame(zmierz);
    };
    zmierz();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [progOdslony]);

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
    <div
      data-pasek-kursu
      className={`fixed inset-x-0 top-[4.5rem] z-40 border-b border-line bg-void/85 backdrop-blur-md transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
        widoczny
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      <nav
        aria-label="Nawigacja kursu"
        className="container-site flex h-12 items-center gap-4"
      >
        <ul className="scrollbar-none -mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1">
          {pozycje.map((p) => (
            <li key={p.id} className="shrink-0">
              <a
                href={`#${p.id}`}
                aria-current={aktywna === p.id ? "true" : undefined}
                className={`inline-flex h-8 items-center rounded-full px-3 font-mono text-label tracking-[0.14em] uppercase transition-colors ${
                  aktywna === p.id
                    ? "bg-volt/10 text-volt"
                    : "text-steel hover:text-fg"
                }`}
              >
                {p.tekst}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#cena"
          className="group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-volt px-3.5 text-xs font-medium text-void transition-colors hover:bg-[#d3ff70]"
        >
          Dołącz do kursu
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </nav>
    </div>
  );
}
