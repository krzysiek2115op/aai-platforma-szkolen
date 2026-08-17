import type { z } from "zod";
import { Check, ShieldCheck } from "lucide-react";
import type { SzczegolyKursu, TrescGwarancja, TrescPakiet } from "@/modules/m1-sklep";
import { CtaZakupu, Sekcja, formatujCene } from "./Wspolne";

/**
 * Oferta (brief CDS pkt 12): „ZA X ZŁ OTRZYMUJESZ ✓…" — lista wartości
 * z pakietu (język wartości, nie cech), cena PO zbudowaniu wartości,
 * CTA 1. osoby, link z powrotem do programu (wzorzec wzoru) i gwarancja
 * bezpośrednio przy cenie — tylko PRAWDZIWE warunki z bazy.
 */
export default function SekcjaCena({
  etykieta,
  kurs,
  pakiet,
  gwarancja,
}: {
  etykieta: string;
  kurs: SzczegolyKursu;
  pakiet: z.infer<typeof TrescPakiet> | null;
  gwarancja: z.infer<typeof TrescGwarancja> | null;
}) {
  return (
    <Sekcja id="cena" etykieta={etykieta} tytul="Co dostajesz za tę cenę?">
      <div className="panel relative mt-8 max-w-4xl overflow-hidden border-volt/20 p-6 md:p-10">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-72 rounded-full bg-volt/[0.06] blur-[80px]"
        />
        <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
              Za {formatujCene(kurs.price_grosze)} otrzymujesz
            </p>
            <ul className="mt-4 grid gap-2.5">
              {(pakiet?.punkty ?? [{ tytul: kurs.title }]).map((p) => (
                <li key={p.tytul} className="flex items-start gap-3">
                  <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-volt" />
                  <span className="text-base leading-relaxed text-fg">
                    {p.tytul}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-steel">
              Wciąż się wahasz?{" "}
              <a
                href="#program"
                className="text-fg underline underline-offset-4 transition-colors hover:text-volt"
              >
                Zobacz jeszcze raz pełny program
              </a>
              .
            </p>
          </div>
          <div className="flex flex-col items-start gap-5 border-line md:items-center md:border-l md:pl-8 md:text-center">
            <p className="text-4xl font-semibold tracking-tight text-volt tabular-nums md:text-5xl">
              {formatujCene(kurs.price_grosze)}
            </p>
            <p className="font-mono text-label tracking-[0.18em] text-steel uppercase">
              płacisz raz · dostęp bez limitu
            </p>
            <CtaZakupu tekst="Dołączam do kursu" duzy />
          </div>
        </div>

        {gwarancja ? (
          <div className="relative mt-8 flex items-start gap-4 border-t border-line pt-6">
            <ShieldCheck aria-hidden className="size-7 shrink-0 text-volt" />
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                {gwarancja.naglowek}
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-steel">
                {gwarancja.tekst}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Sekcja>
  );
}
