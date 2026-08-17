import type { z } from "zod";
import { ChevronDown } from "lucide-react";
import type { TrescFaq } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * FAQ (brief CDS pkt 14) — pytania = realne obiekcje przed zakupem;
 * pod spodem wyjście awaryjne: kontakt (wzorzec z analizy wzoru).
 */
export default function SekcjaFaq({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescFaq>;
}) {
  return (
    <Sekcja id="faq" etykieta={etykieta} tytul="Pytania, które zadałbyś i Ty">
      <div className="mt-8 flex max-w-3xl flex-col gap-3">
        {tresc.pytania.map((p) => (
          <details key={p.pytanie} className="panel group/faq">
            <summary className="flex cursor-pointer list-none items-center gap-4 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
              <span className="flex-1 text-base font-medium">{p.pytanie}</span>
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-steel transition-transform group-open/faq:rotate-180"
              />
            </summary>
            <p className="border-t border-line px-4 py-4 text-sm leading-relaxed text-steel md:px-5">
              {p.odpowiedz}
            </p>
          </details>
        ))}
      </div>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-steel">
        Masz inne pytanie?{" "}
        <a
          href="https://matthewplugins.pl/kontakt"
          className="text-fg underline underline-offset-4 transition-colors hover:text-volt"
        >
          Napisz do nas
        </a>{" "}
        — odpowiadamy szczerze, także gdy ten kurs nie jest dla Ciebie.
      </p>
    </Sekcja>
  );
}
