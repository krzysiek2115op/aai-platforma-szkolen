import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Play } from "lucide-react";
import type { z } from "zod";
import {
  szczegolyKursu,
  TrescHero,
  TrescKorzysci,
  TrescDlaKogo,
  TrescOpinie,
  TrescGwarancja,
  TrescFaq,
  type SzczegolyKursu,
} from "@/modules/m1-sklep";

// Strona sprzedażowa czyta bazę przy każdym żądaniu (kanał JSON działu).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const CENA = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

// CTA zakupu = placeholder do Pluginu 2 (bramka płatności) — do tego
// czasu zainteresowani piszą przez kontakt strony głównej.
const CTA_ZAKUPU = "https://matthewplugins.pl/kontakt";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const kurs = await szczegolyKursu(slug);
  if (!kurs) return { title: "Nie znaleziono" };
  return { title: kurs.title, description: kurs.short_desc ?? undefined };
}

/** content JSONB sekcji przez safeParse — zła treść pomija sekcję, nie wysadza strony. */
function trescSekcji<S extends z.ZodType>(
  kurs: SzczegolyKursu,
  kind: string,
  schemat: S
): z.infer<S> | null {
  const sekcja = kurs.sections.find((s) => s.kind === kind);
  if (!sekcja) return null;
  const wynik = schemat.safeParse(sekcja.content);
  return wynik.success ? wynik.data : null;
}

function Etykieta({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
      [ {children} ]
    </p>
  );
}

function CtaZakupu({ cena, duzy = false }: { cena: number; duzy?: boolean }) {
  return (
    <a
      href={CTA_ZAKUPU}
      className={`btn-glow btn-sheen group inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-volt font-medium text-void transition-colors hover:bg-[#d3ff70] ${
        duzy ? "h-13 px-7 text-base" : "h-11 px-5 text-sm"
      }`}
    >
      {/* 1. osoba — wzorzec z analizy claudedlafirm.pl (WZOR-STRONA-SPRZEDAZOWA.md) */}
      Dołączam za {CENA.format(cena / 100)}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform group-hover:translate-x-0.5"
      />
    </a>
  );
}

export default async function StronaKursu({ params }: Props) {
  const { slug } = await params;
  const kurs = await szczegolyKursu(slug);
  if (!kurs) notFound();

  const hero = trescSekcji(kurs, "hero", TrescHero);
  const korzysci = trescSekcji(kurs, "benefits", TrescKorzysci);
  const dlaKogo = trescSekcji(kurs, "for_whom", TrescDlaKogo);
  const opinie = trescSekcji(kurs, "opinions", TrescOpinie);
  const gwarancja = trescSekcji(kurs, "guarantee", TrescGwarancja);
  const faq = trescSekcji(kurs, "faq", TrescFaq);
  const liczbaLekcji = kurs.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <div data-kurs>
      {/* HERO — obietnica efektu + cena + CTA od pierwszego ekranu */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="bg-grid mask-fade-y absolute inset-0" />
        <div
          aria-hidden
          className="glow-breathe absolute -top-32 right-[8%] size-[26rem] rounded-full bg-volt/[0.06] blur-[110px]"
        />
        <div aria-hidden className="grain absolute inset-0 opacity-[0.04]" />
        <div className="container-site relative pt-28 pb-12 md:pt-36 md:pb-16">
          <Etykieta>
            {kurs.type} · {kurs.modules.length > 0 ? `${kurs.modules.length} modułów · ` : ""}
            {liczbaLekcji > 0 ? `${liczbaLekcji} lekcji` : "premiera wkrótce"}
          </Etykieta>
          <h1 className="text-soft-gradient mt-4 max-w-4xl text-page-title leading-[1.02] font-semibold tracking-[-0.03em]">
            {hero?.obietnica ?? kurs.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel md:text-lg">
            {hero?.rozwiniecie ?? kurs.short_desc}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <CtaZakupu cena={kurs.price_grosze} duzy />
            <a
              href="#program"
              className="text-sm text-steel underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              Zobacz program kursu
            </a>
          </div>
        </div>
      </header>

      {/* KORZYŚCI — efekt, nie cecha */}
      {korzysci ? (
        <section className="container-site border-t border-line pt-8 pb-14 md:pt-10 md:pb-20">
          <Etykieta>01 · Czego się nauczysz</Etykieta>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
            Konkretne umiejętności, nie teoria
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {korzysci.punkty.map((p) => (
              <li key={p.tytul} className="panel flex flex-col p-4 md:p-5">
                <Check aria-hidden className="size-5 text-volt" />
                <h3 className="mt-3 text-base font-semibold tracking-tight">
                  {p.tytul}
                </h3>
                {p.opis ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-steel">
                    {p.opis}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* PROGRAM — moduły i lekcje z bazy (akordeon bez JS) */}
      {kurs.modules.length > 0 ? (
        <section
          id="program"
          className="container-site border-t border-line pt-8 pb-14 md:pt-10 md:pb-20"
        >
          <Etykieta>02 · Program</Etykieta>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
            Dokładnie wiesz, co dostajesz
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {kurs.modules.map((modul, i) => (
              <details key={modul.id} className="panel group/mod" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-4 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-xs text-steel tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="block text-base font-semibold tracking-tight">
                      {modul.title}
                    </span>
                    {modul.summary ? (
                      <span className="mt-0.5 block text-sm text-steel">
                        {modul.summary}
                      </span>
                    ) : null}
                  </span>
                  <span className="hidden font-mono text-label tracking-[0.12em] text-steel uppercase sm:inline">
                    {modul.lessons.length} lekcji
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-4 shrink-0 text-steel transition-transform group-open/mod:rotate-180"
                  />
                </summary>
                {modul.lessons.length > 0 ? (
                  <ul className="border-t border-line px-4 py-2 md:px-5">
                    {modul.lessons.map((lekcja) => (
                      <li
                        key={lekcja.id}
                        className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-b-0"
                      >
                        <Play aria-hidden className="size-3.5 shrink-0 text-steel" />
                        <span className="flex-1">{lekcja.title}</span>
                        {lekcja.preview ? (
                          <span className="font-mono text-label tracking-[0.12em] text-volt uppercase">
                            podgląd
                          </span>
                        ) : null}
                        {lekcja.duration_min ? (
                          <span className="font-mono text-label text-steel tabular-nums">
                            {lekcja.duration_min} min
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* DLA KOGO */}
      {dlaKogo ? (
        <section className="container-site border-t border-line pt-8 pb-14 md:pt-10 md:pb-20">
          <Etykieta>03 · Dla kogo</Etykieta>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
            Ten {kurs.type} jest dla Ciebie, jeśli…
          </h2>
          <ul className="mt-8 grid max-w-3xl gap-3">
            {dlaKogo.punkty.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-volt" />
                <span className="text-base leading-relaxed text-fg">{punkt}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* OPINIE */}
      {opinie ? (
        <section className="container-site border-t border-line pt-8 pb-14 md:pt-10 md:pb-20">
          <Etykieta>04 · Opinie</Etykieta>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
            Nie wierz nam na słowo
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {opinie.opinie.map((op) => (
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
        </section>
      ) : null}

      {/* CENA + CTA */}
      <section
        id="cena"
        className="container-site border-t border-line pt-8 pb-14 md:pt-10 md:pb-20"
      >
        <Etykieta>05 · Dołącz</Etykieta>
        <div className="panel mt-8 flex flex-col items-start gap-8 p-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {kurs.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-steel md:text-base">
              Pełny dostęp bez limitu czasu — uczysz się we własnym tempie
              i wracasz do materiałów, kiedy chcesz.
            </p>
            <p className="mt-5 text-4xl font-semibold tracking-tight text-volt tabular-nums md:text-5xl">
              {CENA.format(kurs.price_grosze / 100)}
            </p>
          </div>
          <CtaZakupu cena={kurs.price_grosze} duzy />
        </div>
      </section>

      {/* GWARANCJA */}
      {gwarancja ? (
        <section className="container-site border-t border-line pt-8 pb-14 md:pt-10 md:pb-20">
          <Etykieta>06 · Gwarancja</Etykieta>
          <div className="mt-8 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {gwarancja.naglowek}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-steel">
              {gwarancja.tekst}
            </p>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {faq ? (
        <section className="container-site border-t border-line pt-8 pb-16 md:pt-10 md:pb-24">
          <Etykieta>07 · FAQ</Etykieta>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
            Pytania, które zadałbyś i Ty
          </h2>
          <div className="mt-8 flex max-w-3xl flex-col gap-3">
            {faq.pytania.map((p) => (
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
        </section>
      ) : null}

      {/* domknięcie — ostatnie CTA */}
      <section className="border-t border-line bg-panel/30">
        <div className="container-site flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Zacznij dziś — efekty zobaczysz szybciej, niż myślisz.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-steel md:text-base">
              Masz pytanie przed zakupem? Napisz, odpowiadamy szczerze.
            </p>
          </div>
          <CtaZakupu cena={kurs.price_grosze} duzy />
        </div>
      </section>
    </div>
  );
}
