import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

// Adres produkcyjny strony głównej — na localhost ta aplikacja żyje osobno
// (port 3001), więc powrót do reszty serwisu prowadzi na domenę główną.
const STRONA_GLOWNA = "https://matthewplugins.pl";

/**
 * Nagłówek w stylu strony głównej (uproszczony na Dział 1: bez mega menu
 * i bez menu mobilnego — dojdą, gdy podstrona dostanie więcej tras).
 * Klasy i proporcje przejęte z components/navbar/Navbar.tsx strony głównej.
 */
export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="border-b border-line bg-void/80 backdrop-blur-md">
        <nav
          aria-label="Nawigacja główna"
          className="container-site flex h-[4.5rem] items-center justify-between"
        >
          <a
            href={STRONA_GLOWNA}
            className="text-lg font-semibold tracking-tight"
          >
            MatthewPlugins<span className="text-volt">.pl</span>
          </a>

          <ul className="hidden items-center gap-7 sm:flex">
            <li>
              <Link
                href="/szkolenia"
                className="text-sm text-fg transition-colors hover:text-volt"
              >
                Szkolenia
              </Link>
            </li>
            <li>
              <a
                href={STRONA_GLOWNA}
                className="inline-flex items-center gap-1 text-sm text-steel transition-colors hover:text-fg"
              >
                Strona główna
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            </li>
          </ul>

          <a
            href={`${STRONA_GLOWNA}/kontakt`}
            className="group inline-flex h-10 items-center gap-2 rounded-md bg-volt px-4 text-sm font-medium text-void transition-colors hover:bg-[#d3ff70]"
          >
            Porozmawiajmy
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </a>
        </nav>
      </div>
    </header>
  );
}
