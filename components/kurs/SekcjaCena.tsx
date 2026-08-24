import type { z } from "zod";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Cascade, CascadeItem, Reveal } from "@/components/ui/Reveal";
import type { SzczegolyKursu, TrescGwarancja, TrescPakiet } from "@/modules/m1-sklep";
import { CTA_ZAKUPU, Etykieta, formatujCene } from "./Wspolne";
import { czasMaterialu, lekcje, moduly } from "@/lib/odmiana";

/**
 * Oferta (brief CDS pkt 12 + feedback B5: „to ważna sekcja, ma być
 * bardziej widoczna, więcej konkretnej treści"): sekcja wychodzi
 * z rytmu strony — własne tło, ramka i poświata — i zbiera wszystko,
 * za co klient płaci: pełne punkty pakietu z opisami, realne liczby
 * z bazy, warunki zakupu („w cenie"), kotwica, gwarancja i CTA.
 * Nadal ZERO zmyślonych warunków — wszystko z bazy.
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
  const liczbaLekcji = kurs.modules.reduce((n, m) => n + m.lessons.length, 0);
  const lacznyCzas = kurs.modules.reduce(
    (n, m) => n + m.lessons.reduce((s, l) => s + (l.duration_min ?? 0), 0),
    0
  );
  const liczby = [
    kurs.modules.length > 0 ? moduly(kurs.modules.length) : null,
    liczbaLekcji > 0 ? lekcje(liczbaLekcji) : null,
    lacznyCzas > 0 ? `${czasMaterialu(lacznyCzas)} materiału` : null,
  ].filter(Boolean) as string[];

  const punkty = pakiet?.punkty ?? [];

  return (
    <section
      id="cena"
      className="relative overflow-hidden border-y border-volt/15 bg-panel/40"
    >
      {/* własne tło sekcji — oferta ma się wyróżniać z rytmu strony */}
      <div aria-hidden className="bg-grid mask-fade-y absolute inset-0" />
      <div
        aria-hidden
        className="dryf-a absolute -top-32 left-[8%] size-[26rem] rounded-full bg-volt/[0.07] blur-[110px]"
      />
      <div
        aria-hidden
        className="dryf-b absolute -bottom-40 right-[6%] size-[24rem] rounded-full bg-volt/[0.05] blur-[110px]"
      />

      <div className="container-site relative pt-12 pb-14 md:pt-16 md:pb-20">
        <Reveal from="up">
          <Etykieta>{etykieta}</Etykieta>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl lg:text-5xl">
            Co dokładnie dostajesz za {formatujCene(kurs.price_grosze)}?
          </h2>
          {liczby.length > 0 ? (
            <p className="mt-4 font-mono text-label tracking-[0.18em] text-steel uppercase">
              {liczby.join(" · ")} · płacisz raz
            </p>
          ) : null}
        </Reveal>

        <div className="mt-9 grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          {/* lewa kolumna: pełna zawartość pakietu z opisami */}
          <Cascade interval={0.06} className="grid gap-3 sm:grid-cols-2">
            {punkty.map((p) => (
              <CascadeItem
                key={p.tytul}
                className="panel unos flex gap-3 p-4 md:p-5"
              >
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-volt" />
                <span>
                  <span className="block text-base font-semibold tracking-tight">
                    {p.tytul}
                  </span>
                  {p.opis ? (
                    <span className="mt-1 block text-sm leading-relaxed text-steel">
                      {p.opis}
                    </span>
                  ) : null}
                </span>
              </CascadeItem>
            ))}
          </Cascade>

          {/* prawa kolumna: cena, CTA, warunki, gwarancja */}
          <Reveal
            from="right"
            className="panel relative overflow-hidden border-volt/30 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.5)] md:p-8 lg:sticky lg:top-24"
          >
            <div
              aria-hidden
              className="absolute -top-24 -right-24 size-64 rounded-full bg-volt/[0.09] blur-[70px]"
            />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/10 px-3 py-1 font-mono text-micro tracking-[0.2em] text-volt uppercase">
                <Sparkles aria-hidden className="size-3" />
                Pełny dostęp
              </p>
              <p className="mt-5 text-5xl font-semibold tracking-tight text-volt tabular-nums md:text-6xl">
                {formatujCene(kurs.price_grosze)}
              </p>
              <p className="mt-2 text-sm text-steel">
                jednorazowo, bez abonamentu i bez ukrytych kosztów
              </p>

              {pakiet?.w_cenie && pakiet.w_cenie.length > 0 ? (
                <ul className="mt-6 grid gap-2.5 border-t border-line pt-6">
                  {pakiet.w_cenie.map((punkt) => (
                    <li key={punkt} className="flex items-start gap-3">
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-volt"
                      />
                      <span className="text-sm leading-relaxed text-fg">
                        {punkt}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {pakiet?.domkniecie ? (
                <p className="mt-6 text-sm leading-relaxed text-steel">
                  {pakiet.domkniecie}
                </p>
              ) : null}

              <a
                href={CTA_ZAKUPU}
                className="btn-glow btn-sheen group mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-volt px-6 text-base font-semibold text-void transition-colors hover:bg-[#d3ff70]"
              >
                Dołączam do kursu
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </a>
              <p className="mt-3 text-center text-sm text-steel">
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
          </Reveal>
        </div>

        {/* kotwica cenowa + gwarancja: ostatnie zdjęcie ryzyka */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {pakiet?.kotwica ? (
            <Reveal from="up" className="panel unos p-5 md:p-6">
              <p className="font-mono text-label tracking-[0.25em] text-steel uppercase">
                Dla porównania
              </p>
              <p className="mt-3 text-base leading-relaxed text-fg">
                {pakiet.kotwica}
              </p>
            </Reveal>
          ) : null}
          {gwarancja ? (
            <Reveal
              from="up"
              className="panel unos flex items-start gap-4 p-5 md:p-6"
            >
              <ShieldCheck aria-hidden className="size-7 shrink-0 text-volt" />
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {gwarancja.naglowek}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-steel">
                  {gwarancja.tekst}
                </p>
              </div>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
