import { MARKA, DOMENA_DOCELOWA, adres, cenaSchema, czasIso } from "@/lib/seo";
import type { KartaKatalogu, SzczegolyKursu } from "@/modules/m1-sklep";

/**
 * Budowanie danych strukturalnych schema.org z tych samych danych, które
 * renderuje strona.
 *
 * ZASADA, KTÓREJ TU PILNUJEMY: JSON-LD nie może twierdzić niczego, czego
 * nie widać na stronie. To nie jest wyłącznie wymóg Google (choć jest —
 * rozjazd treści widocznej i strukturalnej to powód odrzucenia wyników
 * z rozszerzeniami); to ta sama zasada „zero zmyślania", którą stosujemy
 * do treści kursów i tabel pomiarowych. Dlatego każdy budowniczy niżej
 * dostaje obiekt Z BAZY i nie dokłada od siebie ani jednego pola.
 */

type Wezel = Record<string, unknown>;

const DOSTAWCA = {
  "@type": "Organization",
  name: MARKA,
  url: DOMENA_DOCELOWA,
} as const;

/** Wizytówka marki — jedna na serwis, w układzie strony. */
export function organizacja(): Wezel {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: MARKA,
    url: DOMENA_DOCELOWA,
    description:
      "Kursy i systemy pracy z AI, Claude i GitHubem dla firm — Automatic AI.",
  };
}

/** Okruszki: gdzie użytkownik jest w strukturze serwisu. */
export function okruszki(sciezka: { nazwa: string; adres: string }[]): Wezel {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: sciezka.map((krok, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: krok.nazwa,
      item: krok.adres,
    })),
  };
}

/** Katalog jako lista produktów — kolejność taka jak na stronie. */
export function listaKatalogu(kursy: KartaKatalogu[]): Wezel {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Kursy Automatic AI",
    numberOfItems: kursy.length,
    itemListElement: kursy.map((kurs, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: adres(`/szkolenia/${kurs.slug}`),
      name: kurs.title,
    })),
  };
}

const POZIOM_SCHEMA: Record<string, string> = {
  podstawowy: "Beginner",
  sredniozaawansowany: "Intermediate",
  zaawansowany: "Advanced",
};

/**
 * Kurs jako `Course` z ofertą.
 *
 * DOSTĘPNOŚĆ = `PreOrder`, ŚWIADOMIE. Zakup jest dziś placeholderem
 * prowadzącym do kontaktu — płatności przychodzą z Pluginem 2. Wpisanie
 * `InStock` byłoby deklaracją, że da się kupić od ręki, czyli dokładnie
 * tym zmyślaniem, którego zakazują wytyczne (a Google traktuje rozjazd
 * oferty z rzeczywistością jako powód do kary). Zmienimy na `InStock`
 * w tym samym kroku, w którym ruszy koszyk.
 */
export function kurs(dane: SzczegolyKursu): Wezel {
  const url = adres(`/szkolenia/${dane.slug}`);
  const minuty = dane.modules
    .flatMap((m) => m.lessons)
    .reduce((suma, l) => suma + (l.duration_min ?? 0), 0);

  const wezel: Wezel = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: dane.title,
    url,
    inLanguage: "pl-PL",
    provider: DOSTAWCA,
    offers: {
      "@type": "Offer",
      price: cenaSchema(dane.price_grosze),
      priceCurrency: "PLN",
      availability: "https://schema.org/PreOrder",
      category: "Paid",
      url,
    },
  };

  if (dane.short_desc) wezel.description = dane.short_desc;
  if (dane.level && POZIOM_SCHEMA[dane.level]) {
    wezel.educationalLevel = POZIOM_SCHEMA[dane.level];
  }

  // Program wchodzi do danych strukturalnych tylko wtedy, gdy jest też
  // na stronie — sekcja programu znika, gdy kurs nie ma modułów.
  if (dane.modules.length > 0) {
    wezel.syllabusSections = dane.modules.map((modul) => {
      const sekcja: Wezel = {
        "@type": "Syllabus",
        position: modul.position,
        name: modul.title,
      };
      if (modul.summary) sekcja.description = modul.summary;
      return sekcja;
    });
    wezel.hasCourseInstance = [
      {
        "@type": "CourseInstance",
        courseMode: "online",
        ...(minuty > 0 ? { courseWorkload: czasIso(minuty) } : {}),
      },
    ];
  }

  return wezel;
}

/** FAQ — wyłącznie pytania, które NAPRAWDĘ są w sekcji FAQ strony. */
export function faq(pytania: { pytanie: string; odpowiedz: string }[]): Wezel {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pytania.map((p) => ({
      "@type": "Question",
      name: p.pytanie,
      acceptedAnswer: { "@type": "Answer", text: p.odpowiedz },
    })),
  };
}
