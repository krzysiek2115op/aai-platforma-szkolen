import type { z } from "zod";
import { Check } from "lucide-react";
import { Cascade, CascadeItem } from "@/components/ui/Reveal";
import type { TrescKorzysci } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * „Co będziesz potrafić po kursie?" (brief CDS pkt 4) — konkretne
 * rezultaty jako premium cards: efekt, nie cecha.
 */
export default function SekcjaKorzysci({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescKorzysci>;
}) {
  return (
    <Sekcja
      etykieta={etykieta}
      tytul="Co będziesz potrafić po kursie?"
      opis="Nie „poznasz podstawy” — wyjdziesz z umiejętnościami, których użyjesz następnego dnia w pracy."
    >
      <Cascade as="ul" interval={0.07} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tresc.punkty.map((p) => (
          <CascadeItem
            key={p.tytul}
            as="li"
            className="group/korzysc panel relative flex flex-col overflow-hidden p-4 transition-colors duration-300 hover:border-volt/25 md:p-5"
          >
            <div
              aria-hidden
              className="absolute -top-10 -right-10 size-32 rounded-full bg-volt/[0.05] blur-[50px] opacity-0 transition-opacity duration-500 group-hover/korzysc:opacity-100"
            />
            <Check aria-hidden className="size-5 text-volt" />
            <h3 className="mt-3 text-base font-semibold tracking-tight">
              {p.tytul}
            </h3>
            {p.opis ? (
              <p className="mt-1.5 text-sm leading-relaxed text-steel">
                {p.opis}
              </p>
            ) : null}
          </CascadeItem>
        ))}
      </Cascade>
    </Sekcja>
  );
}
