import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Szkolenia",
  description:
    "Katalog kursów i ebooków MatthewPlugins — AI, agenci i automatyzacja w praktyce.",
};

// Dział 1: szkielet wyglądu (bramka B1 — ocena właściciela).
// Karty to placeholdery — prawdziwe kursy przyjdą Z BAZY przez kanał JSON
// działu (D2–D4); strona nigdy nie sięgnie do bazy sama (straznik-granic).
const PLACEHOLDERY = [
  {
    typ: "kurs",
    tytul: "Miejsce na pierwszy kurs",
    opis: "Okładka, tytuł, opis i cena wejdą z bazy db1_kursy w Dziale 4.",
  },
  {
    typ: "ebook",
    tytul: "Miejsce na ebooka",
    opis: "Badge typu, cena w złotówkach i CTA — dane z kanału JSON działu.",
  },
  {
    typ: "kurs",
    tytul: "Miejsce na kolejny kurs",
    opis: "Kreator kursów (Dział 6) pozwoli dodać go bez dotykania kodu.",
  },
] as const;

export default function StronaSzkolenia() {
  return (
    <>
      {/* Hero — wzorzec PageHero strony głównej */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="bg-grid mask-fade-y absolute inset-0" />
        <div
          aria-hidden
          className="absolute -top-32 right-[8%] size-[26rem] rounded-full bg-volt/[0.06] blur-[110px]"
        />
        <div className="container-site relative pt-28 pb-10 md:pt-36 md:pb-14">
          <p className="font-mono text-xs tracking-[0.25em] text-volt uppercase">
            [ Szkolenia ]
          </p>
          <h1 className="text-soft-gradient mt-4 max-w-4xl text-page-title leading-[1.02] font-semibold tracking-[-0.03em]">
            Kursy i ebooki, które wdrażasz, nie tylko oglądasz.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel md:text-lg">
            Praktyczna wiedza o AI, agentach i automatyzacji — od pierwszego
            promptu po działający system w Twojej firmie.
          </p>
        </div>
      </header>

      {/* Katalog — siatka kart (placeholder do Działu 4) */}
      <section id="katalog" className="container-site pb-16 md:pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
          [ 01 · Katalog ]
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
          Wybierz swoją ścieżkę
        </h2>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLACEHOLDERY.map((kurs) => (
            <li key={kurs.tytul}>
              <article className="panel group flex h-full flex-col overflow-hidden transition-colors duration-300 hover:border-volt/25">
                <div
                  aria-hidden
                  className="bg-grid mask-fade-y flex h-36 items-center justify-center border-b border-line"
                >
                  <span className="font-mono text-label tracking-[0.25em] text-steel uppercase">
                    [ okładka ]
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4 md:p-5">
                  <p className="font-mono text-label tracking-[0.12em] text-steel uppercase">
                    <span className="text-volt/90">{kurs.typ}</span>
                    <span aria-hidden> · </span>
                    <span>wkrótce</span>
                  </p>
                  <h3 className="mt-2 text-base leading-snug font-semibold tracking-tight transition-colors group-hover:text-volt md:text-lg">
                    {kurs.tytul}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-steel">
                    {kurs.opis}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Pasek CTA — wzorzec CtaStrip strony głównej */}
      <section className="border-t border-line bg-panel/30">
        <div className="container-site flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Masz pytanie o szkolenia?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-steel md:text-base">
              Napisz — podpowiemy, od którego kursu zacząć.
            </p>
          </div>
          <a
            href="https://matthewplugins.pl/kontakt"
            className="btn-glow btn-sheen group inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-md bg-volt px-7 text-base font-medium text-void transition-colors hover:bg-[#d3ff70]"
          >
            Porozmawiajmy
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </a>
        </div>
      </section>
    </>
  );
}
