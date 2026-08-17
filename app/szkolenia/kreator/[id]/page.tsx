import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BramaTokenu from "@/components/kreator/BramaTokenu";
import FormularzKursu, {
  PUSTY_KURS,
  type StanKursu,
} from "@/components/kreator/FormularzKursu";
import type { StanSekcji } from "@/components/kreator/EdytorSekcji";
import { OPIS_WG_RODZAJU } from "@/components/kreator/opis-sekcji";
import { trescDoFormularza } from "@/components/kreator/tresc-sekcji";
import PasekKreatora from "@/components/kreator/PasekKreatora";
import { Reveal } from "@/components/ui/Reveal";
import { czyKreator } from "@/lib/kreator-dostep";
import { szczegolyKursuPoId } from "@/modules/m1-sklep";

export const metadata: Metadata = {
  title: "Edycja kursu",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EdycjaKursuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await czyKreator())) return <BramaTokenu />;

  const { id } = await params;
  const nowy = id === "nowy";
  // Adres spoza tych dwóch kształtów to śmieć — 404 zamiast zapytania
  // do bazy o „uuid", który nim nie jest.
  if (!nowy && !UUID.test(id)) notFound();

  const kurs = nowy ? null : await szczegolyKursuPoId(id);
  if (!nowy && !kurs) notFound();

  // Sekcje z bazy → stan formularza. Rodzaj bez opisu w kreatorze
  // pomijamy świadomie: straznik-kreatora nie dopuści takiej sytuacji,
  // a gdyby powstała, lepiej pokazać resztę niż wysypać panel.
  const sekcje: StanSekcji = {};
  for (const sekcja of kurs?.sections ?? []) {
    const opis = OPIS_WG_RODZAJU.get(sekcja.kind);
    if (opis) sekcje[sekcja.kind] = trescDoFormularza(opis, sekcja.content);
  }

  const stan: StanKursu = kurs
    ? {
        id: kurs.id,
        slug: kurs.slug,
        title: kurs.title,
        type: kurs.type,
        short_desc: kurs.short_desc ?? "",
        price_grosze: kurs.price_grosze,
        cover_url: kurs.cover_url ?? "",
        badge: kurs.badge ?? "",
        level: kurs.level ?? "",
        sekcje,
        moduly: kurs.modules.map((m) => ({
          title: m.title,
          summary: m.summary ?? "",
          lessons: m.lessons.map((l) => ({
            title: l.title,
            duration_min: l.duration_min ? String(l.duration_min) : "",
            preview: l.preview,
          })),
        })),
      }
    : PUSTY_KURS;

  return (
    <>
      <PasekKreatora
        tytul={kurs ? kurs.title : "Nowy kurs"}
        wrocDo="/szkolenia/kreator"
      />

      <div className="container-site pt-28 pb-24 md:pt-32">
        <Reveal from="up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
            [ {nowy ? "nowy kurs" : "edycja"} ]
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {kurs ? kurs.title : "Nowy kurs"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel">
            Dane podstawowe trafiają na kartę w katalogu i w nagłówek
            strony sprzedażowej.
          </p>
        </Reveal>

        <FormularzKursu poczatkowy={stan} />
      </div>
    </>
  );
}
