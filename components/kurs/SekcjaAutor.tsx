import type { z } from "zod";
import { ArrowUpRight, Check, Quote } from "lucide-react";
import { Cascade, CascadeItem, Reveal } from "@/components/ui/Reveal";
import type { TrescAutor } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * Prowadzący (rozbudowa po feedbacku B5: „można coś dodać, rozwinąć,
 * bardziej zachęcić") — nie sama wizytówka, tylko dowód wiarygodności:
 * cytat „dlaczego zrobiłem ten kurs", czym zajmuje się na co dzień,
 * atuty jako karty i link do portfolio. Wszystkie pola opcjonalne —
 * kurs bez nich renderuje wariant minimalny.
 */
export default function SekcjaAutor({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescAutor>;
}) {
  return (
    <Sekcja
      etykieta={etykieta}
      tytul="Kto prowadzi ten kurs?"
      opis="Uczy praktyk, nie wykładowca — to ma znaczenie, gdy pytasz „a czy u mnie to zadziała?”."
    >
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* wizytówka + cytat */}
        <Reveal from="left" className="panel unos relative overflow-hidden p-6 md:p-8">
          <div
            aria-hidden
            className="dryf-a absolute -top-20 -right-20 size-56 rounded-full bg-volt/[0.06] blur-[70px]"
          />
          <div className="relative flex flex-wrap items-center gap-5">
            <div
              aria-hidden
              className="bg-grid flex size-20 shrink-0 items-center justify-center rounded-full border border-volt/30 text-2xl font-semibold text-volt"
            >
              {tresc.imie.slice(0, 1)}
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                {tresc.imie}
              </h3>
              {tresc.rola ? (
                <p className="mt-1 font-mono text-label tracking-[0.18em] text-volt uppercase">
                  {tresc.rola}
                </p>
              ) : null}
            </div>
          </div>

          <p className="relative mt-5 max-w-2xl text-sm leading-relaxed text-steel md:text-base">
            {tresc.bio}
          </p>

          {tresc.cytat ? (
            <figure className="relative mt-6 border-l-2 border-volt pl-4">
              <Quote aria-hidden className="size-4 text-volt/70" />
              <blockquote className="mt-2 text-base leading-relaxed text-fg md:text-lg">
                „{tresc.cytat}”
              </blockquote>
              <figcaption className="mt-2 font-mono text-label tracking-[0.14em] text-steel uppercase">
                {tresc.imie}
              </figcaption>
            </figure>
          ) : null}

          {tresc.link ? (
            <a
              href={tresc.link.url}
              className="group/link relative mt-6 inline-flex items-center gap-2 text-sm font-medium text-volt underline-offset-4 hover:underline"
            >
              {tresc.link.etykieta}
              <ArrowUpRight
                aria-hidden
                className="size-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
              />
            </a>
          ) : null}
        </Reveal>

        {/* czym się zajmuje + atuty */}
        <div className="grid gap-4">
          {tresc.czym_sie_zajmuje && tresc.czym_sie_zajmuje.length > 0 ? (
            <Reveal from="right" className="panel unos p-5 md:p-6">
              <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
                Czym zajmuje się na co dzień
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {tresc.czym_sie_zajmuje.map((obszar) => (
                  <li
                    key={obszar}
                    className="rounded-full border border-line bg-void/60 px-3 py-1.5 text-sm text-fg"
                  >
                    {obszar}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          {tresc.atuty && tresc.atuty.length > 0 ? (
            <Cascade interval={0.07} className="grid gap-3">
              {tresc.atuty.map((atut) => (
                <CascadeItem
                  key={atut}
                  from="right"
                  className="panel unos flex items-start gap-3 p-4"
                >
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-volt" />
                  <span className="text-sm leading-relaxed text-fg">{atut}</span>
                </CascadeItem>
              ))}
            </Cascade>
          ) : null}
        </div>
      </div>
    </Sekcja>
  );
}
