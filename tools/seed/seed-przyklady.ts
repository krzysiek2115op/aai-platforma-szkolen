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

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/**
 * URUCHOMIENIE tylko z wiersza poleceń. Bez tej bramki sam IMPORT pliku
 * kasował kursy (blok wykonawczy stoi na górnym poziomie), a razem z nimi
 * treść 73 lekcji. Porównujemy ŚCIEŻKI, nie łańcuchy URL — patrz BLAD-014.
 */
const URUCHOMIONY_WPROST =
  Boolean(process.argv[1]) && resolve(process.argv[1]!) === fileURLToPath(import.meta.url);

const TOKEN = process.env.KREATOR_TOKEN ?? "";

const KURSY = [
  {
    slug: "jak-korzystac-z-claude",
    title: "Jak poprawnie korzystać z Claude",
    type: "kurs" as const,
    // dłuższy opis karty katalogu — „dlaczego my, a nie inni" (brief CDS pkt 2)
    short_desc:
      "Nie kolejne nagrania o AI, tylko system pracy: prowadzisz Claude metodą, na plikach i zadaniach Twojej firmy. Uczysz się od praktyka, który wdraża AI w polskich firmach — i wychodzisz z promptami i gotowymi przepisami pracy do użycia tego samego dnia, nie z notatkami.",
    price_grosze: 29900,
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
            "Bez teorii wziętej z kosmosu: siadasz, robisz, wdrażasz. Sześć modułów prowadzi od pierwszej rozmowy, przez Claude Code na Twoim komputerze, po API i koszty w produkcji.",
          dla_kogo:
            "Dla przedsiębiorców i zespołów, które chcą wdrożyć Claude u siebie — od rozmowy w przeglądarce po własne integracje.",
        },
      },
      {
        kind: "problem" as const,
        position: 0,
        content: {
          wstep:
            "Znasz to: otwierasz czat z AI, wpisujesz pytanie, dostajesz ładny, ogólny tekst — i kasujesz go, bo nie da się go użyć.",
          problem:
            "Większość ludzi używa Claude jak wyszukiwarki: jedno pytanie, przypadkowa odpowiedź, zero metody. Efekt wygląda jak AI, ale nie nadaje się do pracy.",
          rozwiazanie:
            "Ten kurs uczy systemu: jak przygotować kontekst, poprowadzić rozmowę i zweryfikować wynik — na Twoich plikach i zadaniach, krok po kroku na ekranie.",
          rezultat:
            "Claude przejmuje powtarzalną część Twojej pracy: oferty, analizy, dokumenty. Ty decydujesz, on wykonuje.",
        },
      },
      {
        kind: "positioning" as const,
        position: 0,
        content: {
          nie_jest: [
            "kursem teorii o sztucznej inteligencji,",
            "listą trików i „magicznych promptów”, które zestarzeją się za miesiąc,",
            "nagraniem webinaru, które obejrzysz i zapomnisz.",
          ],
          jest: [
            "systemem pracy z Claude — od pierwszej rozmowy po automatyzacje,",
            "kursem tekstowym z ćwiczeniem „Zrób to teraz” w każdej lekcji i zrzutami z prawdziwych ekranów,",
            "biblioteką promptów, która zostaje z Tobą po kursie.",
          ],
        },
      },
      {
        kind: "transformation" as const,
        position: 0,
        content: {
          przed: [
            "każdy mail, ofertę i raport piszesz ręcznie od zera,",
            "AI odpalasz od święta i nie ufasz temu, co zwraca,",
            "nie wiesz, które dane firmowe wolno wkleić do czatu.",
          ],
          po: [
            "powtarzalne teksty powstają z Claude w kilka minut — Ty je tylko zatwierdzasz,",
            "masz metodę: kontekst → rozmowa → weryfikacja, zamiast zgadywania,",
            "znasz zasady bezpieczeństwa i ustawiasz je całemu zespołowi.",
          ],
        },
      },
      {
        kind: "comparison" as const,
        position: 0,
        content: {
          alternatywa_nazwa: "Samodzielna nauka",
          alternatywa: [
            "setki poradników o różnej jakości — sam oceniasz, co jest aktualne,",
            "uczysz się na własnych błędach, często na ważnych danych firmy,",
            "wiedza przychodzi bez kolejności: dziś triki, jutro podstawy.",
          ],
          kurs: [
            "jedna przemyślana ścieżka: od pierwszej rozmowy do automatyzacji,",
            "typowe błędy pokazane na ekranie, zanim popełnisz je u siebie,",
            "gotowe prompty zamiast pustej kartki.",
          ],
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
              tytul: "Dokumenty, pliki i obrazy",
              opis: "Nauczysz się podawać Claude pliki, PDF-y i obrazy — i liczyć, ile to kosztuje.",
            },
            {
              tytul: "Automatyzacje wokół Claude",
              opis: "Poznasz subagentów, skille, hooki i MCP — mechanizmy Claude Code, które pracują za Ciebie.",
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
            {
              tytul: "6 modułów tekstowych (41 lekcji)",
              opis: "Od pierwszej rozmowy po wywołania API — każda lekcja z ćwiczeniem „Zrób to teraz”, bez skrótów i bez „resztę doczytaj sam”.",
            },
            {
              tytul: "Biblioteka promptów",
              opis: "Gotowe prompty w 35 lekcjach — kopiujesz, podstawiasz własne dane, używasz.",
            },
            {
              tytul: "Pytania do wykonawcy",
              opis: "10 lekcji o API i produkcji kończy się listą pytań do firmy wdrażającej — oceniasz ofertę, nie pisząc kodu.",
            },
            {
              tytul: "Ćwiczenie w każdej lekcji",
              opis: "Każda lekcja kończy się krokami „Zrób to teraz” — tam, gdzie to ma sens, na Twoich własnych plikach i zadaniach.",
            },
            {
              tytul: "Dostęp bez limitu + aktualizacje",
              opis: "Kupujesz raz i wracasz zawsze. Gdy Claude się zmienia, poprawiamy lekcje — dostajesz je bez dopłat.",
            },
            {
              tytul: "Gwarancja 30 dni",
              opis: "Nie oszczędza Ci czasu? Piszesz jedno zdanie, oddajemy pieniądze — bez pytań o powód.",
            },
          ],
          kotwica:
            "Jedna godzina konsultacji wdrożeniowej AI kosztuje w Polsce zwykle więcej niż ten kurs. Konsultacja się kończy — kurs i prompty zostają z Tobą na zawsze.",
          w_cenie: [
            "Dostęp od razu po zakupie, bez czekania na start edycji",
            "Wszystkie 41 lekcji od pierwszego dnia",
            "Aktualizacje kursu bez dopłat",
            "Dostęp bez limitu czasu — także po zmianie komputera",
            "Pytania przed zakupem i po nim: odpowiadam osobiście",
            "Gwarancja zwrotu przez 30 dni",
          ],
          domkniecie:
            "Płacisz raz. Jeśli kurs oszczędzi Ci choć godzinę pracy tygodniowo, zwróci się szybciej niż jeden wieczór spędzony na szukaniu poradników.",
        },
      },
      {
        kind: "author" as const,
        position: 0,
        content: {
          imie: "Matthew",
          rola: "Automatic AI — AI i automatyzacje dla firm",
          bio: "Buduję systemy AI i automatyzacje, które realnie pracują w polskich firmach. W kursie pokazuję dokładnie ten warsztat, którego używam u klientów — bez teorii, której nie stosuję.",
          cytat:
            "Zrobiłem ten kurs, bo mam dość patrzenia, jak ktoś płaci za AI i dalej pisze wszystko ręcznie. Nie chodzi o narzędzie — chodzi o metodę, której nikt nie pokazuje.",
          czym_sie_zajmuje: [
            "wdrożenia AI w firmach",
            "automatyzacje procesów",
            "własne narzędzia i integracje",
            "szkolenia zespołów",
          ],
          atuty: [
            "wdrożenia AI w realnych firmach, nie na slajdach",
            "własne narzędzia i integracje — kod, nie same slajdy",
            "uczę metodą „patrz i rób” — ekran, nie prezentacja",
            "odpowiadam na pytania kursantów osobiście",
          ],
          link: {
            url: "https://automaticai.pl",
            etykieta: "Zobacz moje projekty na automaticai.pl",
          },
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
          // FAQ = realne obiekcje przed zakupem (wzorzec z analizy wzoru §6)
          pytania: [
            {
              pytanie: "Nie znam się na technologii. Dam radę?",
              odpowiedz:
                "Pierwsze dwa moduły — na pewno: zaczynają się od zera, w przeglądarce. Dalej wchodzi terminal i klucz API; prowadzimy przez to krok po kroku, a lekcje o API są napisane dla osoby, która ZAMAWIA wdrożenie, nie pisze kodu.",
            },
            {
              pytanie: "Czy potrzebuję płatnego konta Claude?",
              odpowiedz:
                "Moduły 1–2 przejdziesz na darmowym koncie. Claude Code i wywołania API są płatne, dlatego osobna lekcja pierwszego modułu jest o cenniku — liczysz koszt, zanim zaczniesz.",
            },
            {
              pytanie: "Kiedy dostanę dostęp do kursu?",
              odpowiedz:
                "Od razu po zakupie. Logujesz się i zaczynasz od pierwszej lekcji — bez czekania na „start edycji”.",
            },
            {
              pytanie: "Ile czasu zajmie mi przejście kursu?",
              odpowiedz:
                "Materiał to 12 godzin czytania (720 minut na 41 lekcji), a największą wartość daje robienie ćwiczeń na własnych plikach. Godzina dziennie przez dwa tygodnie w zupełności wystarczy, żeby wdrożyć system u siebie.",
            },
            {
              pytanie: "Prowadzę jednoosobową firmę. Czy to nie „za duży” kurs dla mnie?",
              odpowiedz:
                "Przeciwnie — im mniejszy zespół, tym więcej zyskujesz, bo Claude przejmuje pracę, na którą nie masz ludzi. Wszystkie przykłady działają także w pojedynkę.",
            },
            {
              pytanie: "Czym ten kurs różni się od darmowych poradników na YouTube?",
              odpowiedz:
                "Kolejnością, selekcją i sprawdzalnością. Zamiast stu przypadkowych trików dostajesz jedną ścieżkę — od pierwszej rozmowy po produkcję — a każda lekcja kończy się tabelą, która pokazuje, z którego miejsca dokumentacji pochodzi każda teza.",
            },
            {
              pytanie: "Czy moje dane firmowe są bezpieczne przy pracy z AI?",
              odpowiedz:
                "Temu poświęcamy osobne lekcje: czego nie wklejać, jak przygotować dokumenty i jakie zasady ustawić sobie oraz zespołowi. Zero teorii — konkretne reguły.",
            },
            {
              pytanie: "Co, jeśli Claude się zmieni i lekcje się zestarzeją?",
              odpowiedz:
                "Aktualizacje są w cenie — gdy interfejs lub możliwości Claude się zmieniają, poprawiamy lekcje, a Ty dostajesz je bez dopłat.",
            },
            {
              pytanie: "Jak długo mam dostęp?",
              odpowiedz:
                "Bez limitu — kupujesz raz, wracasz kiedy chcesz, aktualizacje w cenie.",
            },
            {
              pytanie: "Co, jeśli kurs u mnie nie zadziała?",
              odpowiedz:
                "Masz 30 dni gwarancji. Przerób kurs — jeśli nie zaoszczędzi Ci ani godziny pracy, oddajemy pieniądze bez pytań.",
            },
          ],
        },
      },
    ],
    // Program Kursu 1 PO DZIALE 7 — lustro tego, co stoi w bazie
    // (audyt 2026-08-24: seed niósł jeszcze program ROBOCZY sprzed D7,
    // z lekcjami, których kurs nie ma — a to z niego brały się obietnice
    // o „czatach, projektach i artefaktach” na stronie sprzedażowej).
    modules: [
      {
        position: 0,
        title: "Fundamenty: poznaj Claude",
        summary: "Czym jest Claude, jakie są modele i ile to kosztuje — zanim wydasz pierwszą złotówkę.",
        lessons: [
          { position: 0, title: "Czym jest Claude i co potrafi", duration_min: 15, preview: true },
          { position: 1, title: "Rodzina modeli: Opus, Sonnet, Haiku", duration_min: 20, preview: false },
          { position: 2, title: "Jak dobrać model do zadania (i nie przepłacać)", duration_min: 20, preview: false },
          { position: 3, title: "Cennik: za co naprawdę płacisz", duration_min: 15, preview: false },
          { position: 4, title: "Okno kontekstu w praktyce", duration_min: 20, preview: false },
          { position: 5, title: "Słowniczek pojęć — mów językiem AI", duration_min: 10, preview: false },
        ],
      },
      {
        position: 1,
        title: "Prompt engineering: mów tak, żeby Claude robił to, co chcesz",
        summary: null,
        lessons: [
          { position: 0, title: "Zasady dobrego promptu", duration_min: 15, preview: false },
          { position: 1, title: "Najlepsze praktyki promptowania Claude", duration_min: 25, preview: false },
          { position: 2, title: "Promptowanie najnowszych modeli (Opus 5, Sonnet 5)", duration_min: 20, preview: false },
          { position: 3, title: "Rozszerzone myślenie: kiedy dać modelowi czas", duration_min: 20, preview: false },
          { position: 4, title: "Mniej halucynacji, więcej spójności", duration_min: 20, preview: false },
        ],
      },
      {
        position: 2,
        title: "Claude Code: start i codzienna praca",
        summary: null,
        lessons: [
          { position: 0, title: "Jak działa Claude Code", duration_min: 15, preview: true },
          { position: 1, title: "Instalacja i pierwsza sesja", duration_min: 20, preview: false },
          { position: 2, title: "Codzienne przepływy pracy", duration_min: 25, preview: false },
          { position: 3, title: "Najlepsze praktyki pracy z agentem", duration_min: 25, preview: false },
          { position: 4, title: "Pamięć projektu: CLAUDE.md", duration_min: 15, preview: false },
          { position: 5, title: "Tryb interaktywny i komendy", duration_min: 15, preview: false },
          { position: 6, title: "Uprawnienia: co Claude może, a czego nie", duration_min: 15, preview: false },
          { position: 7, title: "Konfiguracja pod siebie: settings.json", duration_min: 15, preview: false },
        ],
      },
      {
        position: 3,
        title: "Claude Code: systemy pracy, które skalują",
        summary: null,
        lessons: [
          { position: 0, title: "Subagenci: deleguj pracę", duration_min: 20, preview: false },
          { position: 1, title: "Skille: wiedza wielokrotnego użytku", duration_min: 20, preview: false },
          { position: 2, title: "Hooki: automatyzacja wokół agenta", duration_min: 20, preview: false },
          { position: 3, title: "MCP: podłącz narzędzia zewnętrzne", duration_min: 20, preview: false },
          { position: 4, title: "Pluginy: gotowe zestawy możliwości", duration_min: 15, preview: false },
          { position: 5, title: "Claude Code w CI: GitHub Actions", duration_min: 20, preview: false },
          { position: 6, title: "Praca równoległa: worktrees i sesje", duration_min: 15, preview: false },
          { position: 7, title: "Punkty kontrolne: cofanie zmian bez stresu", duration_min: 10, preview: false },
        ],
      },
      {
        position: 4,
        title: "Claude przez API: pierwsze integracje",
        summary: "Dla firm, które chcą zbudować własne rozwiązanie na Claude.",
        lessons: [
          { position: 0, title: "Pierwsze wywołanie API", duration_min: 20, preview: false },
          { position: 1, title: "Klucz API i praca z Messages", duration_min: 20, preview: false },
          { position: 2, title: "Tool use: Claude używa Twoich narzędzi", duration_min: 25, preview: false },
          { position: 3, title: "Ustrukturyzowane odpowiedzi (JSON)", duration_min: 15, preview: false },
          { position: 4, title: "Streaming: odpowiedź na żywo", duration_min: 15, preview: false },
          { position: 5, title: "Agent Skills na platformie", duration_min: 15, preview: false },
          { position: 6, title: "Praca z plikami i PDF-ami", duration_min: 15, preview: false },
          { position: 7, title: "Vision: Claude patrzy na obrazy", duration_min: 15, preview: false },
        ],
      },
      {
        position: 5,
        title: "Koszty, jakość i bezpieczeństwo w produkcji",
        summary: null,
        lessons: [
          { position: 0, title: "Prompt caching: płać mniej za powtarzany kontekst", duration_min: 20, preview: false },
          { position: 1, title: "Batch API: połowa ceny, gdy nie ma pośpiechu", duration_min: 15, preview: false },
          { position: 2, title: "Liczenie tokenów przed wysyłką", duration_min: 10, preview: false },
          { position: 3, title: "Testy i ewaluacje jakości odpowiedzi", duration_min: 20, preview: false },
          { position: 4, title: "Ochrona przed jailbreakami i wyciekiem promptu", duration_min: 15, preview: false },
          { position: 5, title: "Bezpieczeństwo Claude Code w firmie", duration_min: 15, preview: false },
        ],
      },
    ],
  },
  {
    slug: "jak-uzywac-githuba",
    title: "Jak poprawnie używać GitHuba",
    type: "kurs" as const,
    // dłuższy opis karty katalogu — „dlaczego my, a nie inni" (brief CDS pkt 2)
    short_desc:
      "GitHub wytłumaczony po ludzku, na prawdziwym projekcie — nie na slajdach. Repozytoria, commity, branche i pull requesty w kolejności, w której naprawdę się ich używa, z miejscami, w których wszyscy się wykładają. Po kursie pracujesz jak zespół, a nie jak archiwum „final_v7”.",
    price_grosze: 34900,
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
          dla_kogo:
            "Dla początkujących i samouków, którzy chcą pracować z kodem jak zespół — bez wcześniejszej znajomości Gita.",
        },
      },
      {
        kind: "problem" as const,
        position: 0,
        content: {
          wstep:
            "Folder „projekt_final_v7_naprawde_ostateczny” to nie system kontroli wersji. To bomba z opóźnionym zapłonem.",
          problem:
            "Bez Gita każda zmiana to ryzyko: nadpisane pliki, zgubione wersje, strach przed dotknięciem cudzego kodu. A tutoriale zakładają, że „przecież każdy zna Gita”.",
          rozwiazanie:
            "Ten kurs prowadzi Cię przez prawdziwy projekt: commit po commicie, branch po branchu, aż po pull request i code review — z wpadkami pokazanymi zawczasu.",
          rezultat:
            "Pracujesz jak zespół: historia zmian, którą da się czytać, wersje, które da się cofnąć, i współpraca bez nadpisywania sobie plików.",
        },
      },
      {
        kind: "positioning" as const,
        position: 0,
        content: {
          nie_jest: [
            "encyklopedią wszystkich komend Gita,",
            "kursem DevOps ani administracji serwerami,",
            "teorią o grafach commitów bez praktyki.",
          ],
          jest: [
            "ścieżką przez prawdziwy projekt: od pierwszego commita po zmergowany pull request,",
            "treningiem nawyków, których oczekują zespoły pracujące na GitHubie,",
            "ściągami i ćwiczeniami, do których wracasz przy codziennej pracy.",
          ],
        },
      },
      {
        kind: "transformation" as const,
        position: 0,
        content: {
          przed: [
            "wersje projektu trzymasz w kopiach folderów i załącznikach maili,",
            "boisz się, że jedna komenda zepsuje projekt — więc nie używasz żadnej,",
            "pull request brzmi jak rytuał dla wtajemniczonych.",
          ],
          po: [
            "każda zmiana ma commit, opis i możliwość cofnięcia,",
            "branch, merge i konflikt rozwiązujesz bez zaglądania do poradników,",
            "otwierasz pull requesty jak członek zespołu, nie jak intruz.",
          ],
        },
      },
      {
        kind: "comparison" as const,
        position: 0,
        content: {
          alternatywa_nazwa: "Samodzielna nauka",
          alternatywa: [
            "dokumentacja Gita jest świetna — i przytłaczająca na starcie,",
            "błędy odkrywasz w najgorszym momencie: na żywym projekcie,",
            "tutoriale pokazują komendy, ale nie kolejność pracy zespołu.",
          ],
          kurs: [
            "fundamenty w kolejności, w której naprawdę się ich używa,",
            "typowe wpadki pokazane bezpiecznie, na projekcie ćwiczeniowym,",
            "pełny przepływ zespołu: branch → commit → pull request → review → merge.",
          ],
        },
      },
      {
        kind: "for_whom" as const,
        position: 0,
        content: {
          punkty: [
            "piszesz pierwsze projekty i trzymasz wersje w folderach „final_v3”,",
            "uczysz się programować, a każdy tutorial zakłada, że Gita już znasz,",
            "dołączasz do zespołu pracującego na GitHubie i nie chcesz wypaść na starcie,",
            "prowadzisz własny projekt i boisz się, że jednym ruchem stracisz pracę.",
          ],
          nie_dla: [
            "na co dzień prowadzisz zespół przez zaawansowane strategie gałęzi,",
            "szukasz zaawansowanego CI/CD i administracji serwerami — piąty moduł daje wstęp do GitHub Actions, nie kurs DevOps,",
            "nie planujesz pracować z kodem ani plikami projektu.",
          ],
        },
      },
      {
        kind: "package" as const,
        position: 0,
        content: {
          punkty: [
            {
              tytul: "6 modułów tekstowych (32 lekcje)",
              opis: "Od pustego folderu po zmergowany pull request — cała droga na ekranie, komenda po komendzie.",
            },
            {
              tytul: "Ściąga komend",
              opis: "Najważniejsze polecenia z opisem, KIEDY ich użyć — jedna kartka zamiast dziesięciu zakładek w przeglądarce.",
            },
            {
              tytul: "Ćwiczenia na prawdziwym repozytorium",
              opis: "Nie klikasz po slajdach — commitujesz, branchujesz, rozwiązujesz konflikt i mergujesz naprawdę.",
            },
            {
              tytul: "88 zrzutów z prawdziwego GitHuba",
              opis: "Każdy klikany krok pokazany na ekranie — dokładnie ten, który zobaczysz u siebie.",
            },
            {
              tytul: "Dostęp bez limitu + aktualizacje",
              opis: "Kupujesz raz, wracasz zawsze. Zmienia się interfejs GitHuba? Poprawki dostajesz bez dopłat.",
            },
            {
              tytul: "Gwarancja 30 dni",
              opis: "Nie czujesz się pewnie z commitami i pull requestami? Oddajemy pieniądze — bez pytań.",
            },
          ],
          kotwica:
            "Jeden wieczór odzyskiwania nadpisanej pracy kosztuje więcej nerwów niż ten kurs pieniędzy — a bez systemu taki wieczór wraca co kilka miesięcy.",
          w_cenie: [
            "Dostęp od razu po zakupie, bez czekania na start edycji",
            "Wszystkie 32 lekcje od pierwszego dnia",
            "Ćwiczenia na repozytorium, które zakładasz w pierwszym module",
            "Aktualizacje kursu bez dopłat",
            "Dostęp bez limitu czasu — wracasz, kiedy zapomnisz komendy",
            "Gwarancja zwrotu przez 30 dni",
          ],
          domkniecie:
            "Płacisz raz i przestajesz bać się własnego projektu. Pierwsze cofnięte zmiany zamiast straconej pracy zwracają ten wydatek natychmiast.",
        },
      },
      {
        kind: "author" as const,
        position: 0,
        content: {
          imie: "Matthew",
          rola: "Automatic AI — narzędzia i automatyzacje",
          bio: "Prowadzę projekty na GitHubie na co dzień — od własnych narzędzi po pracę z klientami. W kursie pokazuję dokładnie ten przepływ pracy, którego sam używam, z wpadkami, które sam zaliczyłem.",
          cytat:
            "Pamiętam swój folder „projekt_final_v7”. Nikt mi wtedy nie powiedział, że wystarczy kilka komend, żeby przestać się bać o własną pracę — ten kurs jest po to, żebyś Ty nie stracił na to roku.",
          czym_sie_zajmuje: [
            "projekty open source i klienckie",
            "praca zespołowa przez pull requesty",
            "automatyzacja publikowania",
            "code review",
          ],
          atuty: [
            "codzienna praca na GitHubie przy własnych i klienckich projektach",
            "publicznie dostępne repozytoria — możesz sprawdzić, jak pracuję",
            "uczę metodą „patrz i rób” — ekran, nie prezentacja",
            "pokazuję też, jak wyjść z sytuacji, gdy coś pójdzie nie tak",
          ],
          link: {
            url: "https://automaticai.pl",
            etykieta: "Zobacz moje projekty na automaticai.pl",
          },
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
            "Przerób kurs. Jeśli w 30 dni nie poczujesz się pewnie z commitami i pull requestami, oddajemy pieniądze — bez pytań i bez formularzy na trzy strony.",
        },
      },
      {
        kind: "faq" as const,
        position: 0,
        content: {
          // FAQ = realne obiekcje przed zakupem (wzorzec z analizy wzoru §6)
          pytania: [
            {
              pytanie: "Czy muszę umieć programować?",
              odpowiedz:
                "Nie. Git i GitHub to narzędzia do wersjonowania plików — kurs zaczyna od zera i nie wymaga pisania kodu.",
            },
            {
              pytanie: "Terminal mnie przeraża. Poradzę sobie?",
              odpowiedz:
                "Tak — każdą komendę wpisujemy razem, ze zrzutem ekranu i wyjaśnieniem, co robi i dlaczego. Najważniejsze zbiera osobna lekcja-ściąga, do której wracasz w każdej chwili.",
            },
            {
              pytanie: "Mam Windowsa / Maca — zadziała?",
              odpowiedz:
                "Tak. Wszystko pokazujemy w narzędziach dostępnych na obu systemach.",
            },
            {
              pytanie: "Nauczę się Gita czy GitHuba?",
              odpowiedz:
                "Obu. Zaczynasz w przeglądarce — pierwszy pełny cykl przechodzisz bez instalowania czegokolwiek — potem instalujesz Gita i schodzisz na własny komputer, a od czwartego modułu pracujesz jak zespół: issues, pull requesty, przeglądy.",
            },
            {
              pytanie: "Pracuję sam. Po co mi branche i pull requesty?",
              odpowiedz:
                "Bo porządek i możliwość cofnięcia zmian przydają się najbardziej, gdy nikt Cię nie pilnuje. A gdy dołączysz do zespołu, będziesz gotowy od pierwszego dnia.",
            },
            {
              pytanie: "Kiedy dostanę dostęp do kursu?",
              odpowiedz:
                "Od razu po zakupie. Logujesz się i zaczynasz od pierwszej lekcji.",
            },
            {
              pytanie: "Ile czasu zajmie mi kurs?",
              odpowiedz:
                "Materiał to 8 godzin i 15 minut czytania (495 minut na 32 lekcje) plus ćwiczenia na prawdziwym repozytorium. Pracując po godzinie dziennie, w tydzień–dwa przejdziesz całość i zaczniesz pracować po nowemu.",
            },
            {
              pytanie: "Czym różni się kurs od darmowej dokumentacji i tutoriali?",
              odpowiedz:
                "Dokumentacja opisuje wszystko, ale bez kolejności i bez Twojego kontekstu. Tu dostajesz jedną ścieżkę przez prawdziwy projekt — z typowymi wpadkami pokazanymi, ZANIM je popełnisz.",
            },
            {
              pytanie: "Jak długo mam dostęp?",
              odpowiedz:
                "Bez limitu — kupujesz raz, wracasz kiedy chcesz, aktualizacje w cenie.",
            },
            {
              pytanie: "Co, jeśli kurs nie jest dla mnie?",
              odpowiedz:
                "Masz 30 dni gwarancji. Jeśli po przerobieniu kursu nie poczujesz się pewnie z commitami i pull requestami, oddajemy pieniądze bez pytań.",
            },
          ],
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
            { tytul: "Projekt w chmurze", opis: "Push, pull i praca z dowolnego komputera — GitHub jako bezpieczna kopia Twojej pracy." },
            { tytul: "Konflikty bez paniki", opis: "Rozbrajasz konflikt scalania w przeglądarce i wiesz, co zrobić, gdy `git push` zostanie odrzucony." },
          ],
        },
      },
    ],
    // Program Kursu 2 PO CIĘCIU (32 lekcje, decyzja właściciela
    // 2026-08-22) — lustro tego, co stoi w bazie. Seed nie może
    // rozjechać się z programem: po odtworzeniu bazy z seeda proza
    // z `tresc-kursow/` musi trafić w te same lekcje.
    //
    // POZYCJE MAJĄ DZIURY I TAK MA BYĆ (moduł 2: 0..4 i 6). Numer pliku
    // prozy jest związany z `position+1` (lib/proza-lekcji.ts), a
    // straznik-prozy szuka scenariusza po tym samym numerze —
    // przenumerowanie po cięciu wskazałoby prozie CUDZY scenariusz.
    //
    // Sekcje sprzedażowe WYŻEJ zostały zsynchronizowane z produktem
    // (audyt 2026-08-24): liczby modułów i lekcji pochodzą z bazy, znikło
    // słowo „wideo” (nie nagrywamy — decyzja 2026-08-19) i moduł ratunkowy,
    // którego kurs nie ma. Pilnuje tego `straznik-obietnic`.
    modules: [
      {
        position: 0,
        title: "Start: Git, GitHub i pierwsze repozytorium",
        summary: null,
        lessons: [
          { position: 0, title: "Czym jest GitHub (i czym jest Git)", duration_min: 15, preview: true },
          { position: 1, title: "Hello World: pierwszy projekt w przeglądarce", duration_min: 20, preview: false },
          { position: 2, title: "Konfiguracja Gita na Twoim komputerze", duration_min: 15, preview: false },
          { position: 3, title: "Repozytorium dla Twojego projektu", duration_min: 15, preview: false },
          { position: 4, title: "Połącz lokalny kod z GitHubem", duration_min: 15, preview: false },
          { position: 5, title: "Git od środka: jak to działa", duration_min: 15, preview: false },
        ],
      },
      {
        position: 1,
        title: "Codzienna praca z Gitem",
        summary: null,
        lessons: [
          { position: 0, title: "Przepływy pracy Git", duration_min: 15, preview: false },
          { position: 1, title: "Wypychanie commitów", duration_min: 10, preview: false },
          { position: 2, title: "Pobieranie zmian ze zdalnego repozytorium", duration_min: 10, preview: false },
          { position: 3, title: ".gitignore: czego nie commitować", duration_min: 10, preview: false },
          { position: 4, title: "Zdalne repozytoria pod kontrolą", duration_min: 15, preview: false },
          { position: 6, title: "Ściąga komend Gita", duration_min: 10, preview: false },
        ],
      },
      {
        position: 2,
        title: "Repozytorium jak u profesjonalisty",
        summary: null,
        lessons: [
          { position: 0, title: "Dobre praktyki repozytoriów", duration_min: 15, preview: false },
          { position: 1, title: "README, które sprzedaje projekt", duration_min: 15, preview: false },
          { position: 2, title: "Markdown: formatowanie na GitHubie", duration_min: 20, preview: false },
          { position: 4, title: "Gałęzie chronione", duration_min: 15, preview: false },
          { position: 5, title: "Releasy i tagi: wersjonuj jak dorośli", duration_min: 20, preview: false },
        ],
      },
      {
        position: 3,
        title: "Współpraca: issues i pull requesty",
        summary: "Serce kursu — tak pracują zespoły na GitHubie.",
        lessons: [
          { position: 0, title: "GitHub Flow: jak pracują zespoły", duration_min: 15, preview: true },
          { position: 1, title: "Issues: planowanie pracy", duration_min: 15, preview: false },
          { position: 3, title: "Czym jest pull request", duration_min: 15, preview: false },
          { position: 4, title: "Tworzenie pull requesta", duration_min: 15, preview: false },
          { position: 5, title: "Prośba o review i praca z uwagami", duration_min: 15, preview: false },
          { position: 7, title: "Konflikty scalania: bez paniki", duration_min: 20, preview: false },
          { position: 8, title: "Merge, squash czy rebase?", duration_min: 15, preview: false },
        ],
      },
      {
        position: 4,
        title: "Automatyzacja: GitHub Actions",
        summary: null,
        lessons: [
          { position: 0, title: "Zrozum GitHub Actions", duration_min: 20, preview: false },
          { position: 1, title: "Pierwszy workflow w 10 minut", duration_min: 20, preview: false },
          { position: 2, title: "Continuous Integration", duration_min: 15, preview: false },
          { position: 5, title: "Sekrety w workflow", duration_min: 15, preview: false },
        ],
      },
      {
        position: 5,
        title: "Bezpieczeństwo konta i kodu",
        summary: null,
        lessons: [
          { position: 0, title: "Dwuskładnikowe uwierzytelnianie (2FA)", duration_min: 15, preview: false },
          { position: 1, title: "Klucze SSH: logowanie bez haseł", duration_min: 20, preview: false },
          { position: 3, title: "Zabezpiecz swoje repozytorium", duration_min: 20, preview: false },
          { position: 5, title: "Secret scanning: sekrety poza repo", duration_min: 10, preview: false },
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

if (URUCHOMIONY_WPROST) {
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
}

/** Dane seeda do ponownego użycia przez narzędzia (bez uruchamiania zapisu). */
export const KURSY_SEED = KURSY;

