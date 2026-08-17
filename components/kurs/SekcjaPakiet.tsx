import type { z } from "zod";
import { Cascade, CascadeItem } from "@/components/ui/Reveal";
import type { TrescPakiet } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * „Co znajduje się w środku?" (brief CDS pkt 5) — produkt pokazany jak
 * fizyczny: policzalne elementy pakietu odpowiadają na pytanie
 * „za co dokładnie płacę". Kotwica cenowa domyka sekcję.
 */
export default function SekcjaPakiet({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescPakiet>;
}) {
  return (
    <Sekcja
      id="pakiet"
      etykieta={etykieta}
      tytul="Co znajduje się w środku?"
      opis="To nie jest „dostęp do nagrań”. Kupujesz komplet — każdy element pakietu ma zadanie."
    >
      <Cascade as="ul" interval={0.07} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tresc.punkty.map((p, i) => (
          <CascadeItem
            key={p.tytul}
            as="li"
            className="group/pakiet panel unos relative overflow-hidden p-5"
          >
            <div
              aria-hidden
              className="absolute -top-10 -right-10 size-32 rounded-full bg-volt/[0.05] blur-[50px] opacity-0 transition-opacity duration-500 group-hover/pakiet:opacity-100"
            />
            <span className="font-mono text-2xl font-semibold text-volt/80 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-base font-semibold tracking-tight">
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
      {tresc.kotwica ? (
        <p className="mt-6 max-w-2xl border-l-2 border-volt pl-4 text-base leading-relaxed text-fg">
          {tresc.kotwica}
        </p>
      ) : null}
    </Sekcja>
  );
}
