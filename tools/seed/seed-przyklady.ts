import { obsluzAkcje, zamknijDb1 } from "../../modules/m1-sklep/index.ts";

/**
 * Seed przykładowych kursów do oceny wyglądu (B4/B5) — TREŚĆ ROBOCZA.
 *
 * Docelowa treść obu kursów powstanie w Dziale 7 przez kreator
 * (decyzja właściciela 2026-08-17): (1) „Jak poprawnie korzystać
 * z Claude", (2) „Jak poprawnie używać GitHuba". Opinie to jawne
 * placeholdery — prawdziwe wejdą po pierwszych sprzedażach; niczego
 * nie zmyślamy.
 *
 * Idempotentny: kursy o tych slugach są najpierw usuwane.
 * Użycie: npm run db1:seed  (wymaga bazy i KREATOR_TOKEN w .env)
 */

const TOKEN = process.env.KREATOR_TOKEN ?? "";

const KURSY = [
  {
    slug: "jak-korzystac-z-claude",
    title: "Jak poprawnie korzystać z Claude",
    type: "kurs" as const,
    short_desc:
      "Praktyczny kurs pracy z Claude — od pierwszej rozmowy po własne automatyzacje w Twojej firmie.",
    price_grosze: 49900,
    cover_url: "/okladki/jak-korzystac-z-claude.svg",
    badge: "PRAKTYCZNY",
    level: "podstawowy" as const,
    sections: [
      {
        kind: "hero" as const,
        position: 0,
        content: {
          obietnica: "Opanuj Claude i oddaj AI powtarzalną połowę swojej pracy",
          rozwiniecie:
            "Bez teorii wziętej z kosmosu: siadasz, robisz, wdrażasz. Po kursie Claude pisze z Tobą oferty, analizuje dokumenty i pilnuje Twoich procesów.",
        },
      },
      {
        kind: "benefits" as const,
        position: 0,
        content: {
          punkty: [
            {
              tytul: "Rozmowy, które dowożą wynik",
              opis: "Nauczysz się prowadzić Claude tak, żeby za pierwszym razem dostawać użyteczną odpowiedź.",
            },
            {
              tytul: "Własne prompty do pracy",
              opis: "Zbudujesz bibliotekę promptów pod swoje zadania — oferty, maile, analizy, raporty.",
            },
            {
              tytul: "Dokumenty i dane w Claude",
              opis: "Przerobisz prawdziwe pliki firmowe: umowy, cenniki, zestawienia.",
            },
            {
              tytul: "Automatyzacje bez programowania",
              opis: "Poznasz Projekty, artefakty i integracje, które pracują, gdy Ty śpisz.",
            },
            {
              tytul: "Bezpieczeństwo i dobre praktyki",
              opis: "Wiesz, czego NIE wklejać do AI i jak ustawić pracę zespołu.",
            },
          ],
        },
      },
      {
        kind: "for_whom" as const,
        position: 0,
        content: {
          punkty: [
            "prowadzisz firmę i czujesz, że AI ucieka Ci sprzed nosa,",
            "codziennie piszesz maile, oferty albo raporty, które wyglądają tak samo,",
            "próbowałeś ChatGPT/Claude i wyszło „meh” — bo nikt nie pokazał Ci metody,",
            "chcesz konkretów na swoich plikach, nie teorii na cudzych przykładach.",
          ],
          nie_dla: [
            "szukasz „zarobku z AI bez pracy” — tu się pracuje,",
            "chcesz teorii akademickiej o sieciach neuronowych,",
            "Twoja praca nie dotyka tekstu, dokumentów ani komputera.",
          ],
        },
      },
      {
        kind: "package" as const,
        position: 0,
        content: {
          punkty: [
            { tytul: "3 moduły wideo", opis: "Każdy krok pokazany na ekranie, bez skrótów." },
            { tytul: "Biblioteka promptów", opis: "Gotowe prompty pod oferty, analizy i dokumenty." },
            { tytul: "Szablony i checklisty", opis: "Pliki do pobrania — wdrażasz tego samego dnia." },
            { tytul: "Dostęp bez limitu", opis: "Kupujesz raz, wracasz zawsze; aktualizacje w cenie." },
            { tytul: "Gwarancja 30 dni", opis: "Nie działa u Ciebie? Oddajemy pieniądze." },
          ],
          kotwica:
            "Godzina konsultacji AI kosztuje więcej niż ten kurs — a kurs zostaje z Tobą na zawsze.",
        },
      },
      {
        kind: "author" as const,
        position: 0,
        content: {
          imie: "Matthew",
          rola: "MatthewPlugins.pl — AI i automatyzacje dla firm",
          bio: "Buduję systemy AI i automatyzacje, które realnie pracują w polskich firmach. W kursie pokazuję dokładnie ten warsztat, którego używam u klientów — bez teorii, której nie stosuję.",
          atuty: [
            "wdrożenia AI w realnych firmach, nie na slajdach",
            "własne narzędzia i integracje (portfolio na matthewplugins.pl)",
            "uczę metodą „patrz i rób” — ekran, nie prezentacja",
          ],
        },
      },
      {
        kind: "opinions" as const,
        position: 0,
        content: {
          opinie: [
            {
              tekst:
                "Miejsce na opinię pierwszego uczestnika — uzupełnimy po premierze, żadnych zmyślonych recenzji.",
              autor: "Twoja opinia?",
              rola: "uczestnik kursu",
            },
          ],
        },
      },
      {
        kind: "guarantee" as const,
        position: 0,
        content: {
          naglowek: "30 dni gwarancji zwrotu",
          tekst:
            "Przerób kurs. Jeśli w 30 dni nie zaoszczędzi Ci ani godziny pracy, oddajemy pieniądze — bez pytań i bez formularzy na trzy strony.",
        },
      },
      {
        kind: "faq" as const,
        position: 0,
        content: {
          pytania: [
            {
              pytanie: "Nie znam się na technologii. Dam radę?",
              odpowiedz:
                "Tak — kurs zaczyna się od zera i każdy krok pokazujemy na ekranie. Jeśli piszesz maile, umiesz wystarczająco dużo.",
            },
            {
              pytanie: "Czy potrzebuję płatnego konta Claude?",
              odpowiedz:
                "Zaczniesz na darmowym. Pokazujemy też, co realnie daje plan płatny i kiedy się zwraca.",
            },
            {
              pytanie: "Jak długo mam dostęp?",
              odpowiedz: "Bez limitu — kupujesz raz, wracasz kiedy chcesz, aktualizacje w cenie.",
            },
          ],
        },
      },
    ],
    modules: [
      {
        position: 0,
        title: "Start: Claude bez tajemnic",
        summary: "Konto, interfejs, pierwsza rozmowa z metodą",
        lessons: [
          { position: 0, title: "Czym Claude różni się od reszty AI", duration_min: 9, preview: true },
          { position: 1, title: "Konto i ustawienia, które mają znaczenie", duration_min: 12, preview: false },
          { position: 2, title: "Pierwsza rozmowa: metoda zamiast zgadywania", duration_min: 16, preview: false },
        ],
      },
      {
        position: 1,
        title: "Prompty, które pracują za Ciebie",
        summary: "Struktura, kontekst, iteracja — na Twoich zadaniach",
        lessons: [
          { position: 0, title: "Anatomia dobrego promptu", duration_min: 14, preview: false },
          { position: 1, title: "Kontekst firmowy: dokumenty i dane", duration_min: 18, preview: false },
          { position: 2, title: "Biblioteka promptów Twojej firmy", duration_min: 15, preview: false },
        ],
      },
      {
        position: 2,
        title: "Automatyzacje i codzienna praca",
        summary: "Projekty, artefakty, zespół i bezpieczeństwo",
        lessons: [
          { position: 0, title: "Projekty: Claude z pamięcią Twojej firmy", duration_min: 17, preview: false },
          { position: 1, title: "Artefakty: dokumenty i narzędzia na zawołanie", duration_min: 13, preview: false },
          { position: 2, title: "Czego nie wklejać do AI — zasady zespołu", duration_min: 11, preview: false },
        ],
      },
    ],
  },
  {
    slug: "jak-uzywac-githuba",
    title: "Jak poprawnie używać GitHuba",
    type: "kurs" as const,
    short_desc:
      "Od pierwszego repozytorium po pull requesty i współpracę w zespole — GitHub bez strachu.",
    price_grosze: 39900,
    cover_url: "/okladki/jak-uzywac-githuba.svg",
    badge: "NOWOŚĆ",
    level: "podstawowy" as const,
    sections: [
      {
        kind: "hero" as const,
        position: 0,
        content: {
          obietnica: "GitHub od zera: przestań bać się commitów",
          rozwiniecie:
            "Repozytoria, commity, branche i pull requesty — pokazane po ludzku, na prawdziwym projekcie, z miejscami, w których wszyscy się wykładają.",
        },
      },
      {
        kind: "benefits" as const,
        position: 0,
        content: {
          punkty: [
            { tytul: "Repozytorium pod kontrolą", opis: "Zakładasz, porządkujesz i nie gubisz pracy — nigdy więcej „final_v7_poprawione”." },
            { tytul: "Commity i branche z sensem", opis: "Historia zmian, którą da się czytać i cofać bez paniki." },
            { tytul: "Pull requesty i współpraca", opis: "Review, konflikty, merge — współpraca zamiast nadpisywania sobie plików." },
          ],
        },
      },
    ],
    modules: [
      {
        position: 0,
        title: "Fundamenty: repozytorium i commity",
        summary: "Git i GitHub od pierwszego dnia",
        lessons: [
          { position: 0, title: "Po co komu kontrola wersji", duration_min: 8, preview: true },
          { position: 1, title: "Pierwsze repozytorium i pierwszy commit", duration_min: 14, preview: false },
        ],
      },
      {
        position: 1,
        title: "Współpraca: branche i pull requesty",
        summary: "Praca zespołowa bez deptania sobie po plikach",
        lessons: [
          { position: 0, title: "Branch: bezpieczna przestrzeń na zmiany", duration_min: 12, preview: false },
          { position: 1, title: "Pull request i code review", duration_min: 16, preview: false },
        ],
      },
    ],
  },
];

/** Sluga seedów sprzed decyzji o treści — sprzątane przy każdym seedzie. */
const STARE_SLUGI = ["ai-w-twojej-firmie", "prompt-engineering-w-praktyce"];

async function idPoSlugu(slug: string): Promise<string | null> {
  const { listaKursowKreatora } = await import("../../modules/m1-sklep/index.ts");
  const lista = await listaKursowKreatora();
  return lista.find((k) => k.slug === slug)?.id ?? null;
}

let kod = 0;
try {
  for (const slug of [...STARE_SLUGI, ...KURSY.map((k) => k.slug)]) {
    const id = await idPoSlugu(slug);
    if (id) await obsluzAkcje({ akcja: "usun", token: TOKEN, id });
  }
  for (const kurs of KURSY) {
    const zapis = await obsluzAkcje(
      { akcja: "zapisz", token: TOKEN, kurs },
      { aktor: "seed-przyklady" }
    );
    if (!zapis.ok) throw new Error(`seed ${kurs.slug}: ${JSON.stringify(zapis)}`);
    const pub = await obsluzAkcje({
      akcja: "publikuj",
      token: TOKEN,
      id: (zapis as { id: string }).id,
    });
    if (!pub.ok) throw new Error(`publikacja ${kurs.slug}: ${JSON.stringify(pub)}`);
    console.log(`seed: ${kurs.slug} — OK`);
  }
} catch (blad) {
  console.error("seed: PORAŻKA —", blad instanceof Error ? blad.message : blad);
  kod = 1;
} finally {
  await zamknijDb1();
}
process.exit(kod);
