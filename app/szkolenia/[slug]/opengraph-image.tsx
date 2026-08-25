import { ImageResponse } from "next/og";
import { Sygnet } from "@/components/brand/SygnetOg";
import { czasMaterialu, lekcje } from "@/lib/odmiana";
import { PODGLAD_STATYCZNY } from "@/lib/podglad";
import { listaKursow, szczegolyKursu } from "@/modules/m1-sklep";

/**
 * Miniatura Open Graph PER KURS.
 *
 * Bez niej każdy wklejony link do kursu wyglądałby identycznie — a to
 * właśnie ten kafelek decyduje, czy ktoś kliknie. Treść bierzemy z tego
 * samego odczytu, z którego renderuje się strona, więc tytuł, poziom
 * i cena na obrazku nie mogą rozjechać się z ofertą.
 *
 * O braku własnego kroju i o spacji, którą Satori wstawia między elementy
 * rzędu flex — patrz app/opengraph-image.tsx.
 */
export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VOLT = "#BFFF38";
const VOID = "#08090B";
const STEEL = "#8F929C";
const FG = "#F5F5F5";
const LINIA = "rgba(245,245,245,0.12)";

const POZIOM: Record<string, string> = {
  podstawowy: "Podstawowy",
  sredniozaawansowany: "Średnio zaawansowany",
  zaawansowany: "Zaawansowany",
};

/**
 * Które obrazki wyprodukować.
 *
 * Zachowanie przy leżącej bazie jest RÓŻNE w obu trybach i to jest
 * celowe. W podglądzie statycznym brak bazy = brak miniatur w plikach,
 * których nikt później nie dogeneruje — to wada gotowego artefaktu,
 * więc build ma paść głośno. W trybie serwerowym `next build` musi
 * przechodzić BEZ bazy (tak chodzi job „Kod aplikacji" w CI), a obrazki
 * i tak powstaną na żądanie, więc pusta lista niczego nie psuje.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const kursy = await listaKursow();
    return kursy.map((kurs) => ({ slug: kurs.slug }));
  } catch (blad) {
    if (PODGLAD_STATYCZNY) throw blad;
    return [];
  }
}

export default async function ObrazOgKursu({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kurs = await szczegolyKursu(slug);

  const tytul = kurs?.title ?? "Kurs";
  const lekcji = kurs?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0;
  const minut =
    kurs?.modules.flatMap((m) => m.lessons).reduce((s, l) => s + (l.duration_min ?? 0), 0) ?? 0;
  const poziom = kurs?.level ? POZIOM[kurs.level] : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: VOID,
          backgroundImage:
            "linear-gradient(rgba(245,245,245,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,245,245,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Sygnet rozmiar={40} />
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>
            <span style={{ color: FG }}>Automatic</span>
            <span style={{ color: VOLT }}>AI</span>
          </div>
          {poziom ? (
            <span style={{ color: STEEL, fontSize: 22, marginLeft: 12 }}>· {poziom}</span>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: tytul.length > 30 ? 66 : 82,
            fontWeight: 700,
            letterSpacing: "-3px",
            lineHeight: 1.06,
            color: FG,
          }}
        >
          {tytul}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${LINIA}`,
            paddingTop: 28,
            fontSize: 26,
          }}
        >
          <span style={{ color: STEEL }}>
            {/* Polski ma trzy formy liczebnika — odmiana idzie przez
                lib/odmiana.ts, nigdy ręcznie (straznik-odmiany). */}
            {lekcji > 0
              ? `${lekcje(lekcji)} · ${czasMaterialu(minut)} materiału`
              : "Kurs online"}
          </span>
          <span style={{ color: VOLT, fontWeight: 700 }}>
            {kurs ? `${(kurs.price_grosze / 100).toFixed(0)} zł` : ""}
          </span>
        </div>
      </div>
    ),
    size
  );
}
