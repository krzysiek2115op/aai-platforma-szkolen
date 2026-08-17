import type { SzczegolyKursu } from "@/modules/m1-sklep";
import { CtaZakupu } from "./Wspolne";

/**
 * Final CTA (brief CDS pkt 15) — domknięcie historii strony; pod CTA
 * wyłącznie prawdziwe informacje (bez zmyślonych liczników i bonusów).
 */
export default function FinalCta({ kurs }: { kurs: SzczegolyKursu }) {
  return (
    <section className="relative overflow-hidden border-t border-line bg-panel/30">
      <div
        aria-hidden
        className="glow-breathe absolute -bottom-32 left-1/2 size-[24rem] -translate-x-1/2 rounded-full bg-volt/[0.05] blur-[100px]"
      />
      <div className="container-site relative flex flex-col gap-6 py-14 md:flex-row md:items-center md:justify-between md:py-20">
        <div>
          <h2 className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight md:text-4xl">
            Za tydzień możesz dalej próbować na czuja —
            <span className="text-volt"> albo pracować systemem.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-steel md:text-base">
            Dostęp od razu po zakupie, bez limitu czasu. Masz pytanie przed
            zakupem? Napisz — odpowiadamy szczerze.
          </p>
        </div>
        <CtaZakupu cena={kurs.price_grosze} duzy />
      </div>
    </section>
  );
}
