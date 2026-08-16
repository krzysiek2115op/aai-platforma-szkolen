import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { FooterScene } from "@/components/footer/FooterScene";

/*
 * Stopka przejęta 1:1 ze strony głównej (components/footer/Footer.tsx):
 * pasek statusu HUD → statement + odnośniki → SVG wordmark na szynie
 * zasilającej z impulsem → copyright + linki prawne; pod spodem scena
 * canvas z pyłem danych (FooterScene). Różnice: nawigacja tej podstrony
 * oraz linki do reszty serwisu jako adresy bezwzględne (osobny serwer).
 */

const STRONA_GLOWNA = "https://matthewplugins.pl";
const EMAIL = "hello@matthewplugins.pl";

const footerNavLinks = [
  { label: "Szkolenia", href: "/szkolenia" },
  { label: "Usługi", href: `${STRONA_GLOWNA}/uslugi` },
  { label: "Realizacje", href: `${STRONA_GLOWNA}/realizacje` },
  { label: "Portfolio", href: `${STRONA_GLOWNA}/portfolio` },
  { label: "Blog", href: `${STRONA_GLOWNA}/blog` },
  { label: "Kontakt", href: `${STRONA_GLOWNA}/kontakt` },
];

const socialLinks = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/matthewplugins" },
  { label: "Instagram", href: "https://www.instagram.com/matthewplugins" },
  { label: "X", href: "https://x.com/matthewplugins" },
];

const legalLinks = [
  { label: "Polityka prywatności", href: `${STRONA_GLOWNA}/polityka-prywatnosci` },
  { label: "Polityka cookies", href: `${STRONA_GLOWNA}/polityka-cookies` },
];

/*
 * Impuls zasilania na horyzoncie sceny (kopia ze strony głównej).
 *
 * Wordmark osadzony na szynie zasilającej; co kilka sekund przez szynę
 * i litery przepływa impuls światła (maska SVG + gradient przesuwany
 * transformem CSS — `.fw-impuls` w globals.css). Dotknięcie wordmarku
 * odpala impuls od razu (FooterScene). Czysty SVG + CSS, działa bez JS;
 * przy prefers-reduced-motion zostaje statyczny wordmark na szynie.
 *
 * `textLength` + `lengthAdjust="spacing"` trzyma napis dokładnie na
 * szerokość układu niezależnie od tego, czy Geist już się wczytał.
 * `data-szyna` czyta FooterScene — pył danych osiada dokładnie na tej linii.
 */
function PowerlineWordmark() {
  return (
    <div
      aria-hidden
      data-fw-hotspot
      className="container-site mt-16 select-none md:mt-24"
    >
      <svg viewBox="0 0 1200 96" className="fw-svg block w-full" data-szyna>
        <defs>
          <linearGradient id="fw-baza" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#20222a" />
            <stop offset="1" stopColor="#101116" />
          </linearGradient>
          <linearGradient id="fw-swiatlo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#bfff38" stopOpacity="0" />
            <stop offset="0.35" stopColor="#bfff38" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#f2ffd9" stopOpacity="0.95" />
            <stop offset="0.65" stopColor="#bfff38" stopOpacity="0.5" />
            <stop offset="1" stopColor="#bfff38" stopOpacity="0" />
          </linearGradient>
          <mask id="fw-maska">
            <line x1="0" y1="94" x2="1200" y2="94" stroke="#fff" strokeWidth="1.5" />
            <text
              x="600"
              y="90"
              textAnchor="middle"
              textLength="1200"
              lengthAdjust="spacing"
              fontSize="112"
              fontWeight="600"
              fill="#fff"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              MATTHEWPLUGINS
            </text>
          </mask>
        </defs>

        {/* szyna zasilająca */}
        <line
          x1="0"
          y1="94"
          x2="1200"
          y2="94"
          stroke="rgba(245, 245, 245, 0.09)"
          strokeWidth="1"
        />
        {/* wordmark w spoczynku — cień marki, nie krzyk */}
        <text
          x="600"
          y="90"
          textAnchor="middle"
          textLength="1200"
          lengthAdjust="spacing"
          fontSize="112"
          fontWeight="600"
          fill="url(#fw-baza)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          MATTHEWPLUGINS
        </text>
        {/* przebieg impulsu — widoczny wyłącznie przez maskę liter i szyny */}
        <g mask="url(#fw-maska)">
          <rect
            className="fw-impuls"
            x="-560"
            y="0"
            width="560"
            height="96"
            fill="url(#fw-swiatlo)"
          />
        </g>
      </svg>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-line">
      <FooterScene>
        {/* status systemu — stopka zaczyna się jak HUD, nie jak spis treści */}
        <div className="container-site flex items-center justify-between pt-8 font-mono text-label tracking-[0.25em] uppercase md:pt-10">
          <p className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="status-dot size-1.5 shrink-0 rounded-full bg-volt"
            />
            <span className="text-volt">[ Status · Online ]</span>
            <span className="hidden text-steel sm:inline">
              System działa 24/7
            </span>
          </p>
          <p aria-hidden className="hidden text-steel lg:block">
            [ AI · Automatyzacja · Software ]
          </p>
        </div>

        {/* ostatnia scena: statement + odnośniki w asymetrii */}
        <div className="container-site mt-14 flex flex-col gap-12 md:mt-20 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <Reveal className="max-w-3xl">
            <p className="text-page-title leading-[1.08] tracking-tight">
              <span className="block font-normal text-steel">
                Tu kończy się strona.
              </span>
              <span className="block font-semibold">
                System pracuje dalej.
              </span>
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-steel">
              AI, automatyzacja i rozwiązania cyfrowe dla nowoczesnego
              biznesu.
            </p>
            <p className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href={`${STRONA_GLOWNA}/kontakt`}
                className="group inline-flex items-center gap-2 font-medium text-volt underline-offset-4 hover:underline"
              >
                Porozmawiajmy
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="font-mono text-sm text-steel transition-colors hover:text-fg"
              >
                {EMAIL}
              </a>
            </p>
          </Reveal>

          <Reveal
            delay={0.08}
            className="grid grid-cols-2 gap-10 sm:max-w-sm lg:shrink-0 lg:gap-14"
          >
            <nav aria-label="Nawigacja w stopce">
              <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
                Nawigacja
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {footerNavLinks.map((link) =>
                  link.href.startsWith("/") ? (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-steel transition-colors hover:text-fg"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-sm text-steel transition-colors hover:text-fg"
                      >
                        {link.label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div>
              <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
                Social
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 text-sm text-steel transition-colors hover:text-fg"
                    >
                      {link.label}
                      <span className="sr-only">
                        {" "}
                        (otwiera się w nowej karcie)
                      </span>
                      <ArrowUpRight
                        aria-hidden
                        className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <PowerlineWordmark />

        {/* szyna wordmarku pełni rolę separatora — bez drugiej linii pod spodem */}
        <div>
          <div className="container-site flex flex-col gap-3 pt-4 pb-6 font-mono text-label text-steel sm:flex-row sm:items-center sm:justify-between">
            <p>© {year} MatthewPlugins.pl — wszystkie prawa zastrzeżone</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              {legalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-fg"
                >
                  {link.label}
                </a>
              ))}
            </p>
          </div>
        </div>
      </FooterScene>
    </footer>
  );
}
