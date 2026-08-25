import type { z } from "zod";
import { Check, Minus } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import type { TrescPorownanie } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * Porównanie (brief CDS pkt 13): samodzielna nauka vs kurs — premium
 * i nieagresywnie: alternatywa jest OK, my po prostu skracamy drogę.
 */
export default function SekcjaPorownanie({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescPorownanie>;
}) {
  return (
    <Sekcja
      etykieta={etykieta}
      tytul="Dasz radę bez nas. Pytanie: kiedy?"
      opis="Wszystko z tego kursu znajdziesz w internecie za darmo — rozsypane po setkach źródeł. Płacisz za kolejność, selekcję i czas."
    >
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Reveal from="left" className="panel unos p-5 md:p-6">
          <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
            {tresc.alternatywa_nazwa}
          </p>
          <ul className="mt-4 grid gap-3">
            {tresc.alternatywa.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <Minus aria-hidden className="mt-0.5 size-5 shrink-0 text-steel" />
                <span className="text-sm leading-relaxed text-steel md:text-base">
                  {punkt}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal
          from="right"
          className="panel unos relative overflow-hidden border-volt/20 p-5 md:p-6"
        >
          <div
            aria-hidden
            className="dryf-a absolute -top-14 -right-14 size-40 rounded-full bg-volt/[0.07] blur-[60px]"
          />
          <p className="font-mono text-label tracking-[0.25em] text-volt uppercase">
            Z tym kursem
          </p>
          <ul className="mt-4 grid gap-3">
            {tresc.kurs.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-volt" />
                <span className="text-sm leading-relaxed text-fg md:text-base">
                  {punkt}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Sekcja>
  );
}
