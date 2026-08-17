import type { z } from "zod";
import { Check, X } from "lucide-react";
import { Cascade, CascadeItem, Reveal } from "@/components/ui/Reveal";
import type { TrescDlaKogo } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * „Dla kogo jest / NIE jest" (brief CDS pkt 9) — samoidentyfikacja
 * klienta; uczciwe „NIE jest" paradoksalnie buduje zaufanie
 * (wzorzec z analizy wzoru).
 */
export default function SekcjaDlaKogo({
  etykieta,
  tresc,
  typ,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescDlaKogo>;
  typ: string;
}) {
  return (
    <Sekcja
      id="dla-kogo"
      etykieta={etykieta}
      tytul={`Ten ${typ} jest dla Ciebie, jeśli…`}
    >
      <div className="mt-8 grid max-w-5xl gap-8 md:grid-cols-2">
        <Cascade as="ul" interval={0.07} className="grid gap-3">
          {tresc.punkty.map((punkt) => (
            <CascadeItem key={punkt} as="li" from="left" className="flex items-start gap-3">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-volt" />
              <span className="text-base leading-relaxed text-fg">{punkt}</span>
            </CascadeItem>
          ))}
        </Cascade>
        {tresc.nie_dla && tresc.nie_dla.length > 0 ? (
          <Reveal from="right" className="panel unos h-fit p-5 md:p-6">
            {/* uczciwość sprzedaje: mówimy też, komu NIE pomożemy */}
            <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
              A NIE jest, jeśli…
            </p>
            <ul className="mt-4 grid gap-3">
              {tresc.nie_dla.map((punkt) => (
                <li key={punkt} className="flex items-start gap-3">
                  <X aria-hidden className="mt-0.5 size-5 shrink-0 text-steel" />
                  <span className="text-sm leading-relaxed text-steel">
                    {punkt}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </div>
    </Sekcja>
  );
}
