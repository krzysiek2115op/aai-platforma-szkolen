import type { z } from "zod";
import { MoveRight } from "lucide-react";
import type { TrescTransformacja } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * Efekt PRZED / PO (brief CDS pkt 10) — transformacja, nie lista funkcji:
 * klient ma zobaczyć siebie po kursie. Dwie kolumny połączone strzałką.
 */
export default function SekcjaTransformacja({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescTransformacja>;
}) {
  return (
    <Sekcja etykieta={etykieta} tytul="Efekt: przed i po kursie">
      <div className="relative mt-8 grid gap-4 md:grid-cols-2 md:gap-8">
        <div className="panel p-5 md:p-6">
          <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
            Przed
          </p>
          <ul className="mt-4 grid gap-3">
            {tresc.przed.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-steel/60"
                />
                <span className="text-sm leading-relaxed text-steel md:text-base">
                  {punkt}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <MoveRight
          aria-hidden
          className="absolute top-1/2 left-1/2 z-10 hidden size-6 -translate-x-1/2 -translate-y-1/2 text-volt md:block"
        />

        <div className="panel relative overflow-hidden border-volt/20 p-5 md:p-6">
          <div
            aria-hidden
            className="absolute -top-14 -right-14 size-40 rounded-full bg-volt/[0.07] blur-[60px]"
          />
          <p className="font-mono text-label tracking-[0.25em] text-volt uppercase">
            Po
          </p>
          <ul className="mt-4 grid gap-3">
            {tresc.po.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-volt"
                />
                <span className="text-sm leading-relaxed text-fg md:text-base">
                  {punkt}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sekcja>
  );
}
