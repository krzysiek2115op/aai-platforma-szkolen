import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BramaTokenu from "@/components/kreator/BramaTokenu";
import EdytorLekcji from "@/components/kreator/EdytorLekcji";
import PasekKreatora from "@/components/kreator/PasekKreatora";
import { Reveal } from "@/components/ui/Reveal";
import { czyKreator } from "@/lib/kreator-dostep";
import { trescLekcji } from "@/modules/m1-sklep";

/**
 * Pisanie treści JEDNEJ lekcji.
 *
 * DLACZEGO OSOBNA TRASA, a nie czwarta zakładka edytora kursu: treść
 * lekcji potrafi mieć 120 000 znaków, więc formularz kursu musiałby
 * wozić cały materiał (91 lekcji) tam i z powrotem przy każdym wejściu
 * w panel. Tutaj kanał JSON czyta DOKŁADNIE jedną lekcję, a zapis idzie
 * osobną akcją dyspozytora.
 *
 * Materiał kursu jest towarem: strona sprzedażowa i katalog dostają
 * z bazy samą FLAGĘ „ma treść", a pełny tekst wyłącznie ta trasa —
 * za bramą tokenu, z `robots: noindex`.
 */

export const metadata: Metadata = {
  title: "Treść lekcji",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TrescLekcjiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await czyKreator())) return <BramaTokenu />;

  const { id } = await params;
  // Adres, który nie jest uuid-em, to śmieć — 404 zamiast pytania bazy.
  if (!UUID.test(id)) notFound();

  const lekcja = await trescLekcji(id);
  if (!lekcja) notFound();

  return (
    <>
      <PasekKreatora
        tytul={`${lekcja.numer} ${lekcja.title}`}
        wrocDo={`/szkolenia/kreator/${lekcja.kurs_id}`}
      />

      <div className="container-site pt-28 pb-24 md:pt-32">
        <Reveal from="up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-volt">
            [ treść lekcji {lekcja.numer} ]
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {lekcja.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel">
            {lekcja.kurs_tytul} · {lekcja.modul_tytul}
          </p>
        </Reveal>

        <EdytorLekcji
          lekcja={{
            id: lekcja.id,
            title: lekcja.title,
            numer: lekcja.numer,
            kurs_id: lekcja.kurs_id,
            kurs_tytul: lekcja.kurs_tytul,
            modul_tytul: lekcja.modul_tytul,
            tresc: lekcja.tresc,
            materialy: lekcja.materialy as unknown as Array<
              Record<string, unknown>
            >,
          }}
        />
      </div>
    </>
  );
}
