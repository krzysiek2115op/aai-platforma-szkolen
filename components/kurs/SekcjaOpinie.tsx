import type { z } from "zod";
import type { TrescOpinie } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * Opinie (brief CDS pkt 11) — zero zmyślania: komponent gotowy do
 * uzupełnienia prawdziwymi opiniami po pierwszych sprzedażach;
 * do tego czasu treść z bazy mówi wprost, że to miejsce na nie.
 */
export default function SekcjaOpinie({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescOpinie>;
}) {
  return (
    <Sekcja id="opinie" etykieta={etykieta} tytul="Nie wierz nam na słowo">
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {tresc.opinie.map((op) => (
          <li key={op.autor} className="panel flex flex-col p-5">
            <p className="flex-1 text-sm leading-relaxed text-fg">
              „{op.tekst}”
            </p>
            <p className="mt-4 font-mono text-label tracking-[0.12em] text-steel uppercase">
              <span className="text-volt/90">{op.autor}</span>
              {op.rola ? <span> · {op.rola}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </Sekcja>
  );
}
