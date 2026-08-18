import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { z } from "zod";
import HeroKursu from "@/components/kurs/HeroKursu";
import PasekKursu, { type PozycjaPaska } from "@/components/kurs/PasekKursu";
import FinalCta from "@/components/kurs/FinalCta";
import SekcjaAutor from "@/components/kurs/SekcjaAutor";
import SekcjaCena from "@/components/kurs/SekcjaCena";
import SekcjaDlaKogo from "@/components/kurs/SekcjaDlaKogo";
import SekcjaFaq from "@/components/kurs/SekcjaFaq";
import SekcjaKorzysci from "@/components/kurs/SekcjaKorzysci";
import SekcjaOpinie from "@/components/kurs/SekcjaOpinie";
import SekcjaPakiet from "@/components/kurs/SekcjaPakiet";
import SekcjaPlatforma from "@/components/kurs/SekcjaPlatforma";
import SekcjaPorownanie from "@/components/kurs/SekcjaPorownanie";
import SekcjaPozycjonowanie from "@/components/kurs/SekcjaPozycjonowanie";
import SekcjaProblem from "@/components/kurs/SekcjaProblem";
import SekcjaProgram from "@/components/kurs/SekcjaProgram";
import SekcjaTransformacja from "@/components/kurs/SekcjaTransformacja";
import TloKursu from "@/components/kurs/TloKursu";
import WejscieAdmina from "@/components/kreator/WejscieAdmina";
import { czyKreator } from "@/lib/kreator-dostep";
import {
  szczegolyKursu,
  TrescHero,
  TrescKorzysci,
  TrescDlaKogo,
  TrescOpinie,
  TrescGwarancja,
  TrescFaq,
  TrescPakiet,
  TrescAutor,
  TrescProblem,
  TrescPozycjonowanie,
  TrescTransformacja,
  TrescPorownanie,
  type SzczegolyKursu,
} from "@/modules/m1-sklep";

export type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const kurs = await szczegolyKursu(slug, { takzeSzkice: await czyKreator() });
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

/**
 * Course Detail System (brief właściciela, B5 iteracja 3): premium
 * product page + sales page + mini sklep. Strona to CIENKA kompozycja
 * reusable komponentów components/kurs/* — każda sekcja bierze treść
 * z bazy (course_sections + modules/lessons), sekcje bez treści po
 * prostu znikają. Kolejność = psychologia scrolla z briefu:
 * zainteresowanie → problem → wartość → program → dowód → oferta →
 * redukcja obaw → CTA.
 */
export default async function StronaKursu({ params }: Props) {
  const { slug } = await params;
  // Właściciel z ważnym ciastkiem bramy ogląda też SZKICE — inaczej nie
  // miałby jak zobaczyć kursu przed publikacją (a publikacja „w ciemno"
  // to publikacja z literówkami). Dla wszystkich innych szkic dalej
  // nie istnieje: kanał JSON filtruje po statusie, więc nie ma tu
  // żadnej treści do wycieku.
  const kreator = await czyKreator();
  const kurs = await szczegolyKursu(slug, { takzeSzkice: kreator });
  if (!kurs) notFound();

  const hero = trescSekcji(kurs, "hero", TrescHero);
  const problem = trescSekcji(kurs, "problem", TrescProblem);
  const korzysci = trescSekcji(kurs, "benefits", TrescKorzysci);
  const pakiet = trescSekcji(kurs, "package", TrescPakiet);
  const pozycjonowanie = trescSekcji(kurs, "positioning", TrescPozycjonowanie);
  const dlaKogo = trescSekcji(kurs, "for_whom", TrescDlaKogo);
  const transformacja = trescSekcji(kurs, "transformation", TrescTransformacja);
  const opinie = trescSekcji(kurs, "opinions", TrescOpinie);
  const autor = trescSekcji(kurs, "author", TrescAutor);
  const gwarancja = trescSekcji(kurs, "guarantee", TrescGwarancja);
  const porownanie = trescSekcji(kurs, "comparison", TrescPorownanie);
  const faq = trescSekcji(kurs, "faq", TrescFaq);

  // sekcje są opcjonalne — numeracja etykiet liczy się dynamicznie
  let licznikSekcji = 0;
  const numer = (nazwa: string) =>
    `${String(++licznikSekcji).padStart(2, "0")} · ${nazwa}`;

  // sticky nav pokazuje tylko sekcje, które naprawdę są na stronie
  const pozycjePaska: PozycjaPaska[] = [
    problem ? { id: "poznaj", tekst: "Poznaj kurs" } : null,
    kurs.modules.length > 0 ? { id: "program", tekst: "Program" } : null,
    pakiet ? { id: "pakiet", tekst: "Co otrzymujesz" } : null,
    dlaKogo ? { id: "dla-kogo", tekst: "Dla kogo" } : null,
    opinie ? { id: "opinie", tekst: "Opinie" } : null,
    faq ? { id: "faq", tekst: "FAQ" } : null,
    { id: "cena", tekst: "Cena" },
  ].filter((p): p is PozycjaPaska => p !== null);

  return (
    <div data-kurs>
      {/* żywe tło całej strony: poświata za kursorem + dryfujące bloby */}
      <TloKursu />
      <PasekKursu pozycje={pozycjePaska} />
      <HeroKursu kurs={kurs} hero={hero} />

      {problem ? (
        <SekcjaProblem etykieta={numer("Poznaj kurs")} tresc={problem} />
      ) : null}
      {korzysci ? (
        <SekcjaKorzysci etykieta={numer("Rezultaty")} tresc={korzysci} />
      ) : null}
      {pakiet ? (
        <SekcjaPakiet etykieta={numer("W środku")} tresc={pakiet} />
      ) : null}
      {kurs.modules.length > 0 ? (
        <SekcjaProgram etykieta={numer("Program")} kurs={kurs} />
      ) : null}
      {kurs.modules.length > 0 ? (
        <SekcjaPlatforma etykieta={numer("Platforma")} kurs={kurs} />
      ) : null}
      {pozycjonowanie ? (
        <SekcjaPozycjonowanie
          etykieta={numer("Pozycjonowanie")}
          tresc={pozycjonowanie}
          typ={kurs.type}
        />
      ) : null}
      {dlaKogo ? (
        <SekcjaDlaKogo
          etykieta={numer("Dla kogo")}
          tresc={dlaKogo}
          typ={kurs.type}
        />
      ) : null}
      {transformacja ? (
        <SekcjaTransformacja
          etykieta={numer("Transformacja")}
          tresc={transformacja}
        />
      ) : null}
      {opinie ? (
        <SekcjaOpinie etykieta={numer("Opinie")} tresc={opinie} />
      ) : null}
      {autor ? (
        <SekcjaAutor etykieta={numer("Prowadzący")} tresc={autor} />
      ) : null}
      <SekcjaCena
        etykieta={numer("Dołącz")}
        kurs={kurs}
        pakiet={pakiet}
        gwarancja={gwarancja}
      />
      {porownanie ? (
        <SekcjaPorownanie etykieta={numer("Porównanie")} tresc={porownanie} />
      ) : null}
      {faq ? <SekcjaFaq etykieta={numer("FAQ")} tresc={faq} /> : null}

      <FinalCta kurs={kurs} />

      {/* skrót do edycji TEGO kursu — widzi go tylko zalogowany właściciel */}
      <WejscieAdmina edytujId={kurs.id} status={kurs.status} />
    </div>
  );
}
