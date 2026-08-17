import type { z } from "zod";
import HeroMotion from "@/components/szkolenia/HeroMotion";
import OknoKursu from "@/components/szkolenia/OknoKursu";
import type { SzczegolyKursu, TrescHero } from "@/modules/m1-sklep";
import { CtaZakupu, Etykieta, formatujCene } from "./Wspolne";

const POZIOM: Record<string, string> = {
  podstawowy: "podstawowy",
  sredniozaawansowany: "średnio zaawansowany",
  zaawansowany: "zaawansowany",
};

/**
 * Premium Hero strony kursu (brief CDS pkt 1): badge z realnymi liczbami
 * z bazy, obietnica efektu, jednozdaniowe „dla kogo", cena i dwa CTA
 * (mocne + miękkie „Zobacz program"), obok wizualizacja produktu
 * (OknoKursu z prawdziwych modułów/lekcji). Mało tekstu — hero sprzedaje
 * pierwsze wrażenie, resztę robią sekcje niżej.
 */
export default function HeroKursu({
  kurs,
  hero,
}: {
  kurs: SzczegolyKursu;
  hero: z.infer<typeof TrescHero> | null;
}) {
  const liczbaLekcji = kurs.modules.reduce((n, m) => n + m.lessons.length, 0);
  const badge = [
    kurs.type,
    kurs.modules.length > 0 ? `${kurs.modules.length} modułów` : null,
    liczbaLekcji > 0 ? `${liczbaLekcji} lekcji` : "premiera wkrótce",
    kurs.level ? `poziom ${POZIOM[kurs.level] ?? kurs.level}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <HeroMotion className="spotlight relative overflow-hidden">
      <div aria-hidden className="bg-grid mask-fade-y absolute inset-0" />
      <div
        aria-hidden
        className="glow-breathe absolute -top-32 right-[8%] size-[26rem] rounded-full bg-volt/[0.06] blur-[110px]"
      />
      <div aria-hidden className="grain absolute inset-0 opacity-[0.04]" />

      <div className="container-site relative grid items-center gap-12 pt-28 pb-14 md:pt-36 md:pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <Etykieta>{badge}</Etykieta>
          <h1 className="text-soft-gradient mt-4 max-w-4xl text-page-title leading-[1.02] font-semibold tracking-[-0.03em]">
            {hero?.obietnica ?? kurs.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel md:text-lg">
            {hero?.rozwiniecie ?? kurs.short_desc}
          </p>
          {hero?.dla_kogo ? (
            <p className="mt-4 max-w-2xl border-l-2 border-volt/60 pl-4 text-sm leading-relaxed text-fg md:text-base">
              {hero.dla_kogo}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <CtaZakupu cena={kurs.price_grosze} duzy />
            <a
              href="#program"
              className="inline-flex h-13 items-center gap-2 rounded-md border border-line px-6 text-base font-medium text-fg transition-colors hover:border-volt/40 hover:text-volt"
            >
              Zobacz program
            </a>
          </div>
          <p className="mt-4 font-mono text-label tracking-[0.18em] text-steel uppercase">
            {formatujCene(kurs.price_grosze)} · dostęp bez limitu czasu ·
            aktualizacje w cenie
          </p>
        </div>

        {/* wizualizacja produktu — prawdziwe dane, nie stockowa grafika */}
        <div className="parallax-1 hidden lg:block" aria-hidden>
          <OknoKursu kurs={kurs} />
        </div>
      </div>
    </HeroMotion>
  );
}
