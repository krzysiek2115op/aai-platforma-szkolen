import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import WejscieAdmina from "@/components/kreator/WejscieAdmina";
import HeroMotion from "@/components/szkolenia/HeroMotion";
import OknoKursu from "@/components/szkolenia/OknoKursu";
import { Reveal, Cascade, CascadeItem } from "@/components/ui/Reveal";
import {
  listaKursow,
  szczegolyKursu,
  type KartaKatalogu,
} from "@/modules/m1-sklep";
import { czasMaterialu, lekcje, moduly, slowo } from "@/lib/odmiana";

export const metadata: Metadata = {
  title: "Szkolenia",
  description:
    "Kursy i ebooki MatthewPlugins — systemy pracy z AI, Claude i GitHubem, nie kolejne nagrania do obejrzenia.",
};

// Katalog czyta bazę przy KAŻDYM żądaniu (kanał JSON działu — WYTYCZNE §8).
export const dynamic = "force-dynamic";

const CENA = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

const POZIOM: Record<string, string> = {
  podstawowy: "Podstawowy",
  sredniozaawansowany: "Średnio zaawansowany",
  zaawansowany: "Zaawansowany",
};

/* „System pracy" — z czego składa się każdy produkt (metoda, nie marketing). */
const SYSTEM_PRACY = [
  {
    nr: "01",
    tytul: "Wiedza",
    opis: "Lekcje wideo krok po kroku — na ekranie widzisz dokładnie to, co masz zrobić u siebie.",
  },
  {
    nr: "02",
    tytul: "Narzędzia",
    opis: "Konfiguracje i ustawienia, które przenosisz do swojej firmy jednym ruchem.",
  },
  {
    nr: "03",
    tytul: "Prompty",
    opis: "Gotowa biblioteka promptów pod realne zadania — oferty, analizy, dokumenty.",
  },
  {
    nr: "04",
    tytul: "Automatyzacje",
    opis: "Przepływy, które pracują bez Ciebie — od szkicu do wdrożenia.",
  },
  {
    nr: "05",
    tytul: "Workflow",
    opis: "Kompletny sposób pracy: co robić, w jakiej kolejności i czego unikać.",
  },
  {
    nr: "06",
    tytul: "Materiały",
    opis: "Checklisty, szablony i pliki źródłowe — do pobrania i użycia od razu.",
  },
] as const;

const CHIPY_MARQUEE = [
  "Claude",
  "GitHub",
  "Prompty",
  "Automatyzacje",
  "AI w firmie",
  "Workflow",
  "Praktyka, nie teoria",
  "Dostęp bez limitu",
] as const;

function Chipy() {
  return (
    <>
      {CHIPY_MARQUEE.map((chip) => (
        <span
          key={chip}
          className="mx-3 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-panel/60 px-4 py-1.5 font-mono text-label tracking-[0.18em] text-steel uppercase"
        >
          <span aria-hidden className="size-1 rounded-full bg-volt" />
          {chip}
        </span>
      ))}
    </>
  );
}

function Badge({ tekst, akcent = false }: { tekst: string; akcent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-micro tracking-[0.2em] uppercase ${
        akcent
          ? "border-volt/40 bg-volt/10 text-volt"
          : "border-line bg-void/60 text-steel"
      }`}
    >
      {tekst}
    </span>
  );
}

function MetaKursu({ kurs }: { kurs: KartaKatalogu }) {
  const czesci = [
    kurs.modules_count > 0 ? moduly(kurs.modules_count) : null,
    kurs.lessons_count > 0 ? lekcje(kurs.lessons_count) : null,
    kurs.total_min > 0 ? `${czasMaterialu(kurs.total_min)} materiału` : null,
    kurs.level ? POZIOM[kurs.level] : null,
  ].filter(Boolean);
  if (czesci.length === 0) return null;
  return (
    <p className="font-mono text-label tracking-[0.12em] text-steel uppercase">
      {czesci.join(" · ")}
    </p>
  );
}

function Okladka({ kurs }: { kurs: KartaKatalogu }) {
  return kurs.cover_url ? (
    // Okładki to lokalne SVG z /public (docelowo z kreatora D6).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={kurs.cover_url}
      alt=""
      className="karta-okladka h-full w-full object-cover"
    />
  ) : (
    <div
      aria-hidden
      className="bg-grid mask-fade-y flex h-full w-full items-center justify-center"
    >
      <span className="font-mono text-label tracking-[0.25em] text-steel uppercase">
        [ okładka ]
      </span>
    </div>
  );
}

/**
 * Karta katalogu — wszystkie produkty RÓWNE (decyzja właściciela,
 * brief CDS pkt 1–2): bez karty wyróżnionej, z pełnym opisem
 * „dlaczego my, a nie inni" zamiast uciętych dwóch linii.
 */
function Karta({ kurs, numer }: { kurs: KartaKatalogu; numer: string }) {
  return (
    <article className="group/karta panel relative flex h-full flex-col overflow-hidden transition-colors duration-300 hover:border-volt/30">
      <div className="relative h-48 overflow-hidden border-b border-line md:h-52">
        <Okladka kurs={kurs} />
        <span className="absolute top-3 right-3 font-mono text-xs text-steel tabular-nums">
          /{numer}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-7">
        <div className="flex flex-wrap gap-2">
          {kurs.badge ? <Badge tekst={kurs.badge} akcent /> : null}
          <Badge tekst={kurs.type} />
        </div>
        <h3 className="mt-4 text-xl leading-snug font-semibold tracking-tight transition-colors group-hover/karta:text-volt md:text-2xl">
          {kurs.title}
        </h3>
        {kurs.short_desc ? (
          <p className="mt-2.5 text-sm leading-relaxed text-steel md:text-base">
            {kurs.short_desc}
          </p>
        ) : null}
        <div className="mt-4">
          <MetaKursu kurs={kurs} />
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="text-xl font-semibold tracking-tight text-volt tabular-nums md:text-2xl">
            {CENA.format(kurs.price_grosze / 100)}
          </p>
          <Link
            href={`/szkolenia/${kurs.slug}`}
            className="btn-glow btn-sheen group/cta inline-flex h-11 items-center gap-2 rounded-md bg-volt px-5 text-sm font-medium text-void transition-colors hover:bg-[#d3ff70]"
          >
            Sprawdź ofertę
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover/cta:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function StronaSzkolenia() {
  // Kanał JSON: dział czyta bazę, strona dostaje gotowe dane
  // (straznik-granic pilnuje, żeby nigdy nie było inaczej).
  const kursy = await listaKursow();
  const flagowy = kursy[0]
    ? await szczegolyKursu(kursy[0].slug)
    : null;

  const stat = {
    kursy: kursy.length,
    moduly: kursy.reduce((n, k) => n + k.modules_count, 0),
    lekcje: kursy.reduce((n, k) => n + k.lessons_count, 0),
    godziny: Math.round(kursy.reduce((n, k) => n + k.total_min, 0) / 60),
  };

  return (
    <>
      {/* ————— HERO: digital product experience ————— */}
      <HeroMotion className="spotlight relative overflow-hidden">
        <div aria-hidden className="bg-grid mask-fade-y absolute inset-0" />
        <div
          aria-hidden
          className="glow-breathe absolute -top-40 right-[4%] size-[30rem] rounded-full bg-volt/[0.07] blur-[120px]"
        />
        <div aria-hidden className="grain absolute inset-0 opacity-[0.04]" />

        <div className="container-site relative grid items-center gap-12 pt-28 pb-14 md:pt-36 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] text-volt uppercase">
              [ Szkolenia · MatthewPlugins ]
            </p>
            <h1 className="text-soft-gradient mt-4 text-page-title leading-[1.02] font-semibold tracking-[-0.03em]">
              Szkolenia, które zamieniają AI w&nbsp;przewagę.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-steel md:text-lg">
              Nie sprzedajemy nagrań do obejrzenia. Dostajesz gotowe systemy
              pracy z Claude i GitHubem — prompty, narzędzia i workflow,
              które wdrażasz w swojej firmie od pierwszego dnia.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a
                href="#katalog"
                className="btn-glow btn-sheen group inline-flex h-13 items-center gap-2 rounded-md bg-volt px-7 text-base font-medium text-void transition-colors hover:bg-[#d3ff70]"
              >
                Poznaj szkolenia
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </a>
              <a
                href="#srodek"
                className="inline-flex h-13 items-center gap-2 rounded-md border border-line px-6 text-base font-medium text-fg transition-colors hover:border-volt/40 hover:text-volt"
              >
                Zobacz, co dostajesz
              </a>
            </div>

            {/* HUD z PRAWDZIWYMI liczbami z bazy */}
            {stat.kursy > 0 ? (
              <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6">
                {[
                  [stat.kursy, slowo(stat.kursy, "produkt", "produkty", "produktów")],
                  [stat.moduly, slowo(stat.moduly, "moduł", "moduły", "modułów")],
                  [stat.lekcje, slowo(stat.lekcje, "lekcja", "lekcje", "lekcji")],
                  [stat.godziny, slowo(stat.godziny, "godzina", "godziny", "godzin") + " materiału"],
                ]
                  .filter(([n]) => Number(n) > 0)
                  .map(([n, etykieta]) => (
                    <div key={String(etykieta)}>
                      <dt className="sr-only">{etykieta}</dt>
                      <dd className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-fg tabular-nums">
                          {n}
                        </span>
                        <span className="font-mono text-label tracking-[0.18em] text-steel uppercase">
                          {etykieta}
                        </span>
                      </dd>
                    </div>
                  ))}
              </dl>
            ) : null}
          </div>

          {/* wizual produktu: prawdziwe okno kursu + floating cards */}
          {flagowy ? (
            <div className="relative hidden lg:block" aria-hidden>
              <div className="parallax-1">
                <OknoKursu kurs={flagowy} />
              </div>

              {/* floating: karta promptu */}
              <div className="parallax-2 float-a absolute -left-10 -bottom-10 w-60">
                <div className="panel p-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                  <p className="flex items-center gap-2 font-mono text-micro tracking-[0.25em] text-volt uppercase">
                    <Sparkles className="size-3" /> Prompt z biblioteki
                  </p>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-steel">
                    „Przeanalizuj ofertę i wskaż 3 miejsca, w których tracimy
                    klienta…”
                  </p>
                  <span className="cursor-blink mt-1 block h-3 w-px bg-volt" />
                </div>
              </div>

              {/* floating: gwarancja */}
              <div className="parallax-3 float-b absolute -right-6 top-6 w-48">
                <div className="panel flex items-center gap-3 p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                  <ShieldCheck className="size-6 shrink-0 text-volt" />
                  <p className="font-mono text-micro leading-relaxed tracking-[0.14em] text-steel uppercase">
                    30 dni gwarancji zwrotu
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* pas tematów — marquee jak na stronie głównej */}
        <div className="mask-fade-x relative overflow-hidden border-t border-line py-4">
          <div className="animate-marquee flex w-max">
            <Chipy />
            <Chipy />
          </div>
        </div>
      </HeroMotion>

      {/* ————— SYSTEM PRACY: produkt od środka ————— */}
      <section id="srodek" className="container-site pt-14 pb-14 md:pt-20 md:pb-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
              [ 01 · Co dostajesz ]
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl lg:text-5xl">
              <span className="block text-steel">
                Nie kupujesz kolejnego kursu.
              </span>
              <span className="block">Dostajesz gotowy system pracy.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-steel">
              Każdy produkt składa się z sześciu warstw — od wiedzy po pliki,
              które wgrywasz do swojej firmy tego samego dnia.
            </p>
            {flagowy ? (
              <Reveal className="mt-8 hidden lg:block" from="up">
                <OknoKursu kurs={flagowy} />
              </Reveal>
            ) : null}
          </div>

          <Cascade as="ol" interval={0.09} className="flex flex-col gap-3">
            {SYSTEM_PRACY.map((el) => (
              <CascadeItem
                key={el.nr}
                as="li"
                className="panel group/sys relative overflow-hidden p-5 transition-colors duration-300 hover:border-volt/25 md:p-6"
              >
                <div
                  aria-hidden
                  className="absolute -right-10 -top-10 size-36 rounded-full bg-volt/[0.05] blur-[50px] opacity-0 transition-opacity duration-500 group-hover/sys:opacity-100"
                />
                <div className="flex items-start gap-5">
                  <span className="font-mono text-2xl font-semibold text-volt/80 tabular-nums">
                    {el.nr}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {el.tytul}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-steel">
                      {el.opis}
                    </p>
                  </div>
                </div>
              </CascadeItem>
            ))}
          </Cascade>
        </div>
      </section>

      {/* ————— KATALOG PREMIUM ————— */}
      <section
        id="katalog"
        className="container-site border-t border-line pt-8 pb-16 md:pt-10 md:pb-24"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
              [ 02 · Katalog ]
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
              Wybierz swoją przewagę
            </h2>
          </div>
          {kursy.length > 0 ? (
            <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
              [ {String(kursy.length).padStart(2, "0")} produkt
              {kursy.length === 1 ? "" : "y"} ]
            </p>
          ) : null}
        </div>

        {kursy.length === 0 ? (
          <div className="panel mt-8 px-6 py-10 text-center">
            <p className="font-mono text-label tracking-[0.25em] text-volt uppercase">
              [ Katalog w przygotowaniu ]
            </p>
            <p className="mt-3 text-sm leading-relaxed text-steel">
              Pierwsze kursy pojawią się tu wkrótce. Masz pytanie już teraz?
              Napisz do nas.
            </p>
          </div>
        ) : (
          <ul data-katalog className="mt-8 grid items-stretch gap-5 md:grid-cols-2">
            {kursy.map((kurs, i) => (
              <li key={kurs.id}>
                <Karta kurs={kurs} numer={String(i + 1).padStart(2, "0")} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ————— CTA ————— */}
      <section className="border-t border-line bg-panel/30">
        <div className="container-site flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Nie wiesz, od czego zacząć?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-steel md:text-base">
              Napisz — podpowiemy, który system pracy da Ci najszybszy efekt.
            </p>
          </div>
          <a
            href="https://matthewplugins.pl/kontakt"
            className="btn-glow btn-sheen group inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-md bg-volt px-7 text-base font-medium text-void transition-colors hover:bg-[#d3ff70]"
          >
            Porozmawiajmy
            <ArrowUpRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </div>
      </section>

      {/* Widoczne WYŁĄCZNIE dla zalogowanego właściciela — gość nie ma
          tego elementu nawet w źródle strony. Wygoda, nie ochrona:
          dostępu pilnuje token, nie ukrycie linku. */}
      <WejscieAdmina />
    </>
  );
}
