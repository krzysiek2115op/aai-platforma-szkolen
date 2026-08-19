import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import BramaTokenu from "@/components/kreator/BramaTokenu";
import ListaKursow, {
  type PozycjaListy,
} from "@/components/kreator/ListaKursow";
import PasekKreatora from "@/components/kreator/PasekKreatora";
import { Reveal } from "@/components/ui/Reveal";
import { czyKreator } from "@/lib/kreator-dostep";
import { odmien } from "@/lib/odmiana";
import { listaKursowKreatora } from "@/modules/m1-sklep";

export const metadata: Metadata = {
  title: "Kreator kursów",
  robots: { index: false, follow: false },
};

// Panel czyta bazę przy KAŻDYM żądaniu (kanał JSON działu) — właściciel
// zawsze widzi stan po ostatniej akcji, nigdy wersję z cache'u.
export const dynamic = "force-dynamic";

const CENA = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

// Formatowanie daty na SERWERZE i ze stałą strefą — inaczej serwer
// i przeglądarka wyrenderowałyby różny tekst (błąd hydratacji).
const DATA = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

const POZIOM: Record<string, string> = {
  podstawowy: "Podstawowy",
  sredniozaawansowany: "Średnio zaawansowany",
  zaawansowany: "Zaawansowany",
};

export default async function KreatorPage() {
  if (!(await czyKreator())) return <BramaTokenu />;

  const kursy = await listaKursowKreatora();
  const pozycje: PozycjaListy[] = kursy.map((k) => ({
    id: k.id,
    slug: k.slug,
    title: k.title,
    type: k.type,
    status: k.status,
    cena: CENA.format(k.price_grosze / 100),
    badge: k.badge,
    poziom: k.level ? POZIOM[k.level] : null,
    sekcje: k.sections_count,
    moduly: k.modules_count,
    lekcje: k.lessons_count,
    zmieniono: DATA.format(k.updated_at),
  }));

  const opublikowane = pozycje.filter((p) => p.status === "published").length;

  return (
    <>
      <PasekKreatora tytul="Wszystkie kursy" />

      <div className="container-site pt-28 pb-24 md:pt-32">
        <Reveal from="up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
            [ panel treści ]
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-page-title font-semibold leading-[0.95] tracking-tight">
                Kreator kursów
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel">
                Wszystko, co widać na{" "}
                <Link href="/szkolenia" className="text-fg underline decoration-line underline-offset-4 hover:decoration-volt">
                  /szkolenia
                </Link>
                , pochodzi stąd. W bazie{" "}
                {odmien(pozycje.length, "kurs", "kursy", "kursów")}
                {pozycje.length > 0
                  ? `, opublikowanych: ${opublikowane}`
                  : ""}
                .
              </p>
            </div>

            <Link
              href="/szkolenia/kreator/nowy"
              className="btn-glow btn-sheen inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-volt px-6 text-sm font-medium text-void transition-colors hover:bg-[#d3ff70]"
            >
              <Plus aria-hidden className="size-4" />
              Nowy kurs
            </Link>
          </div>
        </Reveal>

        <ListaKursow kursy={pozycje} />
      </div>
    </>
  );
}
