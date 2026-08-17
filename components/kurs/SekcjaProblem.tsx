import type { z } from "zod";
import { MoveRight } from "lucide-react";
import { Cascade, CascadeItem, Reveal } from "@/components/ui/Reveal";
import type { TrescProblem } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

const KROKI = [
  { klucz: "problem", nazwa: "Problem" },
  { klucz: "rozwiazanie", nazwa: "Rozwiązanie" },
  { klucz: "rezultat", nazwa: "Rezultat" },
] as const;

/**
 * „Dlaczego ten kurs?" (brief CDS pkt 3) — sprzedajemy zmianę, nie kurs:
 * wstęp-empatia, potem PROBLEM → ROZWIĄZANIE → REZULTAT jako trzy
 * połączone panele. Konkret, zero lania wody.
 */
export default function SekcjaProblem({
  etykieta,
  tresc,
}: {
  etykieta: string;
  tresc: z.infer<typeof TrescProblem>;
}) {
  return (
    <Sekcja id="poznaj" etykieta={etykieta} tytul="Dlaczego ten kurs?">
      <Reveal from="up" delay={0.08}>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-fg md:text-xl">
          {tresc.wstep}
        </p>
      </Reveal>
      <Cascade as="ol" interval={0.12} className="mt-8 grid gap-3 md:grid-cols-3 md:gap-0">
        {KROKI.map((krok, i) => (
          <CascadeItem
            key={krok.klucz}
            as="li"
            className="relative md:px-3 md:first:pl-0 md:last:pr-0"
          >
            <div className="panel unos relative h-full overflow-hidden p-5 md:p-6">
              <div
                aria-hidden
                className={`absolute -top-10 -right-10 size-32 rounded-full blur-[50px] ${
                  krok.klucz === "rezultat" ? "bg-volt/[0.09]" : "bg-volt/[0.04]"
                }`}
              />
              <p
                className={`font-mono text-label tracking-[0.25em] uppercase ${
                  krok.klucz === "rezultat" ? "text-volt" : "text-steel"
                }`}
              >
                {String(i + 1).padStart(2, "0")} · {krok.nazwa}
              </p>
              <p className="mt-3 text-base leading-relaxed text-fg">
                {tresc[krok.klucz]}
              </p>
            </div>
            {/* strzałka łącząca kroki (dekoracja, tylko desktop) */}
            {i < KROKI.length - 1 ? (
              <MoveRight
                aria-hidden
                className="absolute top-1/2 -right-2.5 z-10 hidden size-5 -translate-y-1/2 text-volt md:block"
              />
            ) : null}
          </CascadeItem>
        ))}
      </Cascade>
    </Sekcja>
  );
}
