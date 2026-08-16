import Link from "next/link";

/**
 * Stopka w stylu HUD strony głównej (uproszczona: bez sceny canvas
 * i SVG wordmarku — statement + status + linki).
 */
export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line">
      <div className="container-site flex items-center justify-between pt-8 font-mono text-label tracking-[0.25em] uppercase md:pt-10">
        <span className="flex items-center gap-2">
          <span className="status-dot size-1.5 shrink-0 rounded-full bg-volt" />
          <span className="text-volt">[ Status · Budowa — Dział 1 ]</span>
        </span>
        <span className="hidden text-steel sm:inline">[ Plugin 1 · Sklep z kursami ]</span>
      </div>

      <div className="container-site py-10 md:py-14">
        <p className="text-page-title leading-[1.08] tracking-tight">
          <span className="block font-normal text-steel">
            Tu kończy się strona.
          </span>
          <span className="block font-semibold">System pracuje dalej.</span>
        </p>

        <nav aria-label="Stopka" className="mt-8">
          <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
            Nawigacja
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link
                href="/szkolenia"
                className="text-sm text-steel transition-colors hover:text-fg"
              >
                Szkolenia
              </Link>
            </li>
            <li>
              <a
                href="https://matthewplugins.pl"
                className="text-sm text-steel transition-colors hover:text-fg"
              >
                matthewplugins.pl
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container-site flex flex-col gap-2 border-t border-line py-6 font-mono text-label-sm tracking-[0.14em] text-steel uppercase md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} MatthewPlugins</span>
        <span>Licencja GPL-2.0 · wersja przedprodukcyjna</span>
      </div>
    </footer>
  );
}
