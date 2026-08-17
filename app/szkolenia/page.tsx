import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listaKursow, type KartaKursu } from "@/modules/m1-sklep";

export const metadata: Metadata = {
  title: "Szkolenia",
  description:
    "Katalog kursów i ebooków MatthewPlugins — AI, agenci i automatyzacja w praktyce.",
};

// Katalog czyta bazę przy KAŻDYM żądaniu (kanał JSON działu — WYTYCZNE §8);
// bez tego build zapiekłby listę kursów z chwili builda.
export const dynamic = "force-dynamic";

const CENA = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

function KartaKatalogu({ kurs }: { kurs: KartaKursu }) {
  return (
    <article className="panel group flex h-full flex-col overflow-hidden transition-colors duration-300 hover:border-volt/25">
      {kurs.cover_url ? (
        // Zwykły <img>: okładki będą lokalnymi plikami z kreatora (D6) —
        // wtedy przejście na next/image z konfiguracją rozmiarów.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={kurs.cover_url}
          alt=""
          className="h-36 w-full border-b border-line object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="bg-grid mask-fade-y flex h-36 items-center justify-center border-b border-line"
        >
          <span className="font-mono text-label tracking-[0.25em] text-steel uppercase">
            [ okładka ]
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="font-mono text-label tracking-[0.12em] text-steel uppercase">
          <span className="text-volt/90">{kurs.type}</span>
          <span aria-hidden> · </span>
          <span className="tabular-nums">{CENA.format(kurs.price_grosze / 100)}</span>
        </p>
        <h3 className="mt-2 text-base leading-snug font-semibold tracking-tight transition-colors group-hover:text-volt md:text-lg">
          {kurs.title}
        </h3>
        {kurs.short_desc ? (
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-steel">
            {kurs.short_desc}
          </p>
        ) : null}
        <p className="mt-auto pt-4">
          <Link
            href={`/szkolenia/${kurs.slug}`}
            className="group/cta inline-flex items-center gap-2 text-sm font-medium text-volt underline-offset-4 hover:underline"
          >
            Sprawdź ofertę
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover/cta:translate-x-0.5"
            />
          </Link>
        </p>
      </div>
    </article>
  );
}

export default async function StronaSzkolenia() {
  // Kanał JSON: dział czyta bazę i oddaje stronie gotowe dane przy
  // renderowaniu. Strona NIE dotyka SQL (straznik-granic).
  const kursy = await listaKursow();

  return (
    <>
      {/* Hero — wzorzec PageHero strony głównej */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="bg-grid mask-fade-y absolute inset-0" />
        <div
          aria-hidden
          className="glow-breathe absolute -top-32 right-[8%] size-[26rem] rounded-full bg-volt/[0.06] blur-[110px]"
        />
        <div aria-hidden className="grain absolute inset-0 opacity-[0.04]" />
        <div className="container-site relative pt-28 pb-10 md:pt-36 md:pb-14">
          <p className="font-mono text-xs tracking-[0.25em] text-volt uppercase">
            [ Szkolenia ]
          </p>
          <h1 className="text-soft-gradient mt-4 max-w-4xl text-page-title leading-[1.02] font-semibold tracking-[-0.03em]">
            Kursy i ebooki, które wdrażasz, nie tylko oglądasz.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel md:text-lg">
            Praktyczna wiedza o AI, agentach i automatyzacji — od pierwszego
            promptu po działający system w Twojej firmie.
          </p>
        </div>
      </header>

      {/* Katalog — kursy Z BAZY (linia border-t = horyzont kratki hero) */}
      <section
        id="katalog"
        className="container-site border-t border-line pt-8 pb-16 md:pt-10 md:pb-24"
      >
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
          [ 01 · Katalog ]
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-tight md:text-4xl">
          Wybierz swoją ścieżkę
        </h2>

        {kursy.length === 0 ? (
          <div className="panel mt-8 px-6 py-10 text-center">
            <p className="font-mono text-label tracking-[0.25em] text-volt uppercase">
              [ Katalog w przygotowaniu ]
            </p>
            <p className="mt-3 text-sm leading-relaxed text-steel">
              Pierwsze kursy pojawią się tu wkrótce. Masz pytanie już teraz?
              Napisz do nas.
            </p>
          </div>
        ) : (
          <ul data-katalog className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kursy.map((kurs) => (
              <li key={kurs.id}>
                <KartaKatalogu kurs={kurs} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pasek CTA — wzorzec CtaStrip strony głównej */}
      <section className="border-t border-line bg-panel/30">
        <div className="container-site flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Masz pytanie o szkolenia?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-steel md:text-base">
              Napisz — podpowiemy, od którego kursu zacząć.
            </p>
          </div>
          <a
            href="https://matthewplugins.pl/kontakt"
            className="btn-glow btn-sheen group inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-md bg-volt px-7 text-base font-medium text-void transition-colors hover:bg-[#d3ff70]"
          >
            Porozmawiajmy
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </a>
        </div>
      </section>
    </>
  );
}
