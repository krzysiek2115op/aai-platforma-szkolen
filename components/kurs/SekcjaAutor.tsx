import type { z } from "zod";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import type { TrescAutor } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/** Prowadzący — twarz i praktyka za kursem (wiarygodność przed ofertą). */
export default function SekcjaAutor({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescAutor>;
}) {
  return (
    <Sekcja etykieta={etykieta} tytul="Kto prowadzi ten kurs?">
      <Reveal
        from="up"
        className="panel unos mt-8 grid max-w-4xl gap-6 p-6 md:grid-cols-[auto_1fr] md:p-8"
      >
        <div
          aria-hidden
          className="bg-grid flex size-20 items-center justify-center rounded-full border border-volt/30 text-2xl font-semibold text-volt"
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
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-steel md:text-base">
            {tresc.bio}
          </p>
          {tresc.atuty && tresc.atuty.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {tresc.atuty.map((atut) => (
                <li key={atut} className="flex items-start gap-3">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-volt" />
                  <span className="text-sm leading-relaxed text-fg">{atut}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Reveal>
    </Sekcja>
  );
}
