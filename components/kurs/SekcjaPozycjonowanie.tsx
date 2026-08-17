import type { z } from "zod";
import { Check, X } from "lucide-react";
import type { TrescPozycjonowanie } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * „To NIE jest / to JEST" (brief CDS pkt 8) — pozycjonowanie produktu.
 * Wzorzec nagłówka-negacji z analizy wzoru: odróżniamy się od
 * „kolejnego kursu", zanim klient sam zada to pytanie.
 */
export default function SekcjaPozycjonowanie({
  etykieta,
  tresc,
  typ,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescPozycjonowanie>;
  typ: string;
}) {
  return (
    <Sekcja
      etykieta={etykieta}
      tytul={
        <>
          <span className="block text-steel">
            To NIE jest kolejny {typ} do odhaczenia.
          </span>
          <span className="block">To system pracy, który zostaje z Tobą.</span>
        </>
      }
    >
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="panel p-5 md:p-6">
          <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
            To NIE jest
          </p>
          <ul className="mt-4 grid gap-3">
            {tresc.nie_jest.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <X aria-hidden className="mt-0.5 size-5 shrink-0 text-steel" />
                <span className="text-sm leading-relaxed text-steel md:text-base">
                  {punkt}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel relative overflow-hidden border-volt/20 p-5 md:p-6">
          <div
            aria-hidden
            className="absolute -top-14 -right-14 size-40 rounded-full bg-volt/[0.07] blur-[60px]"
          />
          <p className="font-mono text-label tracking-[0.25em] text-volt uppercase">
            To JEST
          </p>
          <ul className="mt-4 grid gap-3">
            {tresc.jest.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-volt" />
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
