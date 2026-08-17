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
    // dłuższy opis karty katalogu — „dlaczego my, a nie inni" (brief CDS pkt 2)
    short_desc:
      "Nie kolejne nagrania o AI, tylko system pracy: prowadzisz Claude metodą, na plikach i zadaniach Twojej firmy. Uczysz się od praktyka, który wdraża AI w polskich firmach — i wychodzisz z promptami, szablonami i workflow do użycia tego samego dnia, nie z notatkami.",
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
          dla_kogo:
            "Dla przedsiębiorców i zespołów, które chcą oddać AI powtarzalną robotę — bez programowania i bez akademickiej teorii.",
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
            "warsztatem na prawdziwych plikach firmowych: umowach, cennikach, raportach,",
            "biblioteką promptów i szablonów, która zostaje z Tobą po kursie.",
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
            "gotowe prompty i szablony zamiast pustej kartki.",
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
            { tytul: "7 modułów wideo", opis: "Każdy krok pokazany na ekranie, bez skrótów." },
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
          // FAQ = realne obiekcje przed zakupem (wzorzec z analizy wzoru §6)
          pytania: [
            {
              pytanie: "Nie znam się na technologii. Dam radę?",
              odpowiedz:
                "Tak — kurs zaczyna się od zera i każdy krok pokazujemy na ekranie. Jeśli piszesz maile, umiesz wystarczająco dużo.",
            },
            {
              pytanie: "Czy potrzebuję płatnego konta Claude?",
              odpowiedz:
                "Zaczniesz na darmowym. Pokazujemy też, co realnie daje plan płatny i kiedy się zwraca — decyzję podejmujesz świadomie, nie w ciemno.",
            },
            {
              pytanie: "Kiedy dostanę dostęp do kursu?",
              odpowiedz:
                "Od razu po zakupie. Logujesz się i zaczynasz od pierwszej lekcji — bez czekania na „start edycji”.",
            },
            {
              pytanie: "Ile czasu zajmie mi przejście kursu?",
              odpowiedz:
                "Sam materiał to kilka godzin wideo, ale największą wartość daje robienie ćwiczeń na własnych plikach. Godzina dziennie przez dwa tygodnie w zupełności wystarczy, żeby wdrożyć system u siebie.",
            },
            {
              pytanie: "Prowadzę jednoosobową firmę. Czy to nie „za duży” kurs dla mnie?",
              odpowiedz:
                "Przeciwnie — im mniejszy zespół, tym więcej zyskujesz, bo Claude przejmuje pracę, na którą nie masz ludzi. Wszystkie przykłady działają także w pojedynkę.",
            },
            {
              pytanie: "Czym ten kurs różni się od darmowych poradników na YouTube?",
              odpowiedz:
                "Kolejnością i selekcją. Zamiast stu przypadkowych trików dostajesz jedną ścieżkę: od pierwszej rozmowy po automatyzacje, z gotowymi promptami i szablonami do pobrania.",
            },
            {
              pytanie: "Czy moje dane firmowe są bezpieczne przy pracy z AI?",
              odpowiedz:
                "Temu poświęcamy osobne lekcje: czego nie wklejać, jak przygotować dokumenty i jakie zasady ustawić sobie oraz zespołowi. Zero teorii — konkretne reguły.",
            },
            {
              pytanie: "Co, jeśli Claude się zmieni i lekcje się zestarzeją?",
              odpowiedz:
                "Aktualizacje są w cenie — gdy interfejs lub możliwości Claude się zmieniają, nagrywamy poprawki, a Ty dostajesz je bez dopłat.",
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
    // program ROBOCZY (feedback B5: dłuższy, szczegółowy) — finalne
    // treści lekcji powstaną w D7 na bazie pełnej dokumentacji Claude
    modules: [
      {
        position: 0,
        title: "Start: Claude bez tajemnic",
        summary: "Konto, interfejs i pierwsza rozmowa z metodą",
        lessons: [
          { position: 0, title: "Czym Claude różni się od reszty AI", duration_min: 9, preview: true },
          { position: 1, title: "Konto, plany i ustawienia, które mają znaczenie", duration_min: 12, preview: false },
          { position: 2, title: "Interfejs bez zgadywania: czaty, projekty, artefakty", duration_min: 10, preview: false },
          { position: 3, title: "Pierwsza rozmowa: metoda zamiast zgadywania", duration_min: 16, preview: false },
          { position: 4, title: "Najczęstsze błędy początkujących — i jak ich uniknąć", duration_min: 11, preview: false },
        ],
      },
      {
        position: 1,
        title: "Metoda: prompty, które dowożą wynik",
        summary: "Struktura, kontekst i iteracja — na Twoich zadaniach",
        lessons: [
          { position: 0, title: "Anatomia dobrego promptu", duration_min: 14, preview: false },
          { position: 1, title: "Kontekst: jak podać firmę, cel i ograniczenia", duration_min: 13, preview: false },
          { position: 2, title: "Iteracja: z „meh” do „dokładnie o to chodziło”", duration_min: 12, preview: false },
          { position: 3, title: "Style, tony i formaty odpowiedzi", duration_min: 10, preview: false },
          { position: 4, title: "Budujesz bibliotekę promptów swojej firmy", duration_min: 15, preview: false },
        ],
      },
      {
        position: 2,
        title: "Dokumenty i dane firmowe w Claude",
        summary: "Umowy, cenniki, raporty — prawdziwe pliki, prawdziwa praca",
        lessons: [
          { position: 0, title: "Wczytywanie plików: co Claude umie przeczytać", duration_min: 9, preview: false },
          { position: 1, title: "Analiza umowy krok po kroku", duration_min: 16, preview: false },
          { position: 2, title: "Oferta i wycena prosto z cennika", duration_min: 14, preview: false },
          { position: 3, title: "Raporty i zestawienia: liczby pod kontrolą", duration_min: 13, preview: false },
          { position: 4, title: "Długie dokumenty: streszczenia i porównania", duration_min: 12, preview: false },
        ],
      },
      {
        position: 3,
        title: "Projekty: Claude z pamięcią Twojej firmy",
        summary: "Stała wiedza firmowa zamiast tłumaczenia od zera",
        lessons: [
          { position: 0, title: "Czym są Projekty i kiedy ich używać", duration_min: 10, preview: false },
          { position: 1, title: "Budujesz bazę wiedzy: dokumenty i instrukcje", duration_min: 14, preview: false },
          { position: 2, title: "Instrukcje projektu: Claude w roli Twojego działu", duration_min: 13, preview: false },
          { position: 3, title: "Projekty w praktyce: obsługa klienta i sprzedaż", duration_min: 15, preview: false },
        ],
      },
      {
        position: 4,
        title: "Artefakty: dokumenty i narzędzia na zawołanie",
        summary: "Od notatki po działające mini-narzędzia",
        lessons: [
          { position: 0, title: "Artefakty: co to jest i po co", duration_min: 8, preview: false },
          { position: 1, title: "Dokumenty, tabele i szablony wielokrotnego użytku", duration_min: 13, preview: false },
          { position: 2, title: "Mini-narzędzia dla firmy bez programowania", duration_min: 16, preview: false },
          { position: 3, title: "Publikowanie i udostępnianie efektów pracy", duration_min: 9, preview: false },
        ],
      },
      {
        position: 5,
        title: "Automatyzacje i integracje",
        summary: "Claude pracuje, gdy Ty robisz co innego",
        lessons: [
          { position: 0, title: "Powtarzalne zadania: od ręcznej pracy do szablonu", duration_min: 12, preview: false },
          { position: 1, title: "Łączenie Claude z narzędziami, których używasz", duration_min: 15, preview: false },
          { position: 2, title: "Przepływ pracy: od szkicu do wdrożenia", duration_min: 14, preview: false },
          { position: 3, title: "Kiedy automatyzować, a kiedy nie warto", duration_min: 9, preview: false },
        ],
      },
      {
        position: 6,
        title: "Zespół, bezpieczeństwo i wdrożenie",
        summary: "Zasady, które chronią firmę i skalują efekty",
        lessons: [
          { position: 0, title: "Czego NIE wklejać do AI — zasady danych", duration_min: 11, preview: false },
          { position: 1, title: "Ustawiasz standardy pracy zespołu", duration_min: 13, preview: false },
          { position: 2, title: "Plan wdrożenia na pierwsze 30 dni", duration_min: 14, preview: false },
          { position: 3, title: "Jak mierzyć, czy AI naprawdę oszczędza czas", duration_min: 10, preview: false },
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
            "szukasz kursu CI/CD i administracji — tu są fundamenty pracy z kodem,",
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
              tytul: "6 modułów wideo",
              opis: "Każdy krok na ekranie — od pustego folderu po zmergowany pull request.",
            },
            {
              tytul: "Ściągi komend",
              opis: "Najważniejsze polecenia z opisem, KIEDY ich użyć — do pobrania.",
            },
            {
              tytul: "Ćwiczenia na prawdziwym repozytorium",
              opis: "Nie klikasz po slajdach — commitujesz, branchujesz i mergujesz naprawdę.",
            },
            {
              tytul: "Dostęp bez limitu",
              opis: "Kupujesz raz, wracasz zawsze; aktualizacje w cenie.",
            },
            {
              tytul: "Gwarancja 30 dni",
              opis: "Nie działa u Ciebie? Oddajemy pieniądze.",
            },
          ],
          kotwica:
            "Jedna zgubiona wersja projektu kosztuje więcej nerwów niż ten kurs pieniędzy.",
        },
      },
      {
        kind: "author" as const,
        position: 0,
        content: {
          imie: "Matthew",
          rola: "MatthewPlugins.pl — narzędzia i automatyzacje",
          bio: "Prowadzę projekty na GitHubie na co dzień — od własnych narzędzi po pracę z klientami. W kursie pokazuję dokładnie ten przepływ pracy, którego sam używam, z wpadkami, które sam zaliczyłem.",
          atuty: [
            "codzienna praca na GitHubie przy własnych i klienckich projektach",
            "publicznie dostępne narzędzia (portfolio na matthewplugins.pl)",
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
                "Tak — każdą komendę wpisujemy razem, na ekranie, z wyjaśnieniem co robi i dlaczego. Do najczęstszych masz ściągę do pobrania.",
            },
            {
              pytanie: "Mam Windowsa / Maca — zadziała?",
              odpowiedz:
                "Tak. Wszystko pokazujemy w narzędziach dostępnych na obu systemach.",
            },
            {
              pytanie: "Nauczę się Gita czy GitHuba?",
              odpowiedz:
                "Obu — i w dobrej kolejności: najpierw Git lokalnie (commity, branche), potem GitHub (zdalne repozytorium, pull requesty, współpraca).",
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
                "Materiał to kilka godzin wideo plus ćwiczenia na prawdziwym repozytorium. Pracując po godzinie dziennie, w tydzień–dwa przejdziesz całość i zaczniesz pracować po nowemu.",
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
            { tytul: "Ratunek z opresji", opis: "Restore, revert, reset — wiesz, którego użyć, zanim wpadniesz w panikę." },
          ],
        },
      },
    ],
    // program ROBOCZY (feedback B5: dłuższy, szczegółowy) — finalne
    // treści lekcji powstaną w D7 na bazie pełnej dokumentacji GitHuba
    modules: [
      {
        position: 0,
        title: "Start: po co komu kontrola wersji",
        summary: "Od chaosu plików do porządku w projekcie",
        lessons: [
          { position: 0, title: "Po co komu kontrola wersji", duration_min: 8, preview: true },
          { position: 1, title: "Instalacja Gita i konto na GitHubie", duration_min: 12, preview: false },
          { position: 2, title: "Konfiguracja, która oszczędza nerwy", duration_min: 9, preview: false },
          { position: 3, title: "Mapa pojęć: repo, commit, branch, remote", duration_min: 10, preview: false },
        ],
      },
      {
        position: 1,
        title: "Repozytorium i commity",
        summary: "Historia zmian, którą da się czytać",
        lessons: [
          { position: 0, title: "Pierwsze repozytorium i pierwszy commit", duration_min: 14, preview: false },
          { position: 1, title: "Status, diff i staging: co właściwie zapisuję?", duration_min: 13, preview: false },
          { position: 2, title: "Dobre opisy commitów — list do przyszłego siebie", duration_min: 9, preview: false },
          { position: 3, title: ".gitignore: co NIE powinno trafić do repo", duration_min: 8, preview: false },
          { position: 4, title: "Historia: przeglądanie i powrót do starych wersji", duration_min: 12, preview: false },
        ],
      },
      {
        position: 2,
        title: "Branche i merge",
        summary: "Bezpieczna przestrzeń na każdą zmianę",
        lessons: [
          { position: 0, title: "Branch: bezpieczna przestrzeń na zmiany", duration_min: 12, preview: false },
          { position: 1, title: "Przełączanie i porządek w gałęziach", duration_min: 10, preview: false },
          { position: 2, title: "Merge bez strachu", duration_min: 13, preview: false },
          { position: 3, title: "Konflikty: skąd się biorą i jak je rozwiązywać", duration_min: 15, preview: false },
        ],
      },
      {
        position: 3,
        title: "GitHub: Twoje repozytorium w chmurze",
        summary: "Push, pull i praca z każdego miejsca",
        lessons: [
          { position: 0, title: "Łączysz lokalny projekt z GitHubem", duration_min: 11, preview: false },
          { position: 1, title: "Push i pull: synchronizacja bez niespodzianek", duration_min: 12, preview: false },
          { position: 2, title: "README, opis i porządek w repozytorium", duration_min: 9, preview: false },
          { position: 3, title: "Klonowanie i praca na dwóch komputerach", duration_min: 10, preview: false },
        ],
      },
      {
        position: 4,
        title: "Pull requesty i code review",
        summary: "Współpraca jak w prawdziwym zespole",
        lessons: [
          { position: 0, title: "Pull request i code review", duration_min: 16, preview: false },
          { position: 1, title: "Fork vs branch: dwa modele współpracy", duration_min: 11, preview: false },
          { position: 2, title: "Review: jak komentować i przyjmować uwagi", duration_min: 12, preview: false },
          { position: 3, title: "Merge pull requesta i sprzątanie po pracy", duration_min: 9, preview: false },
          { position: 4, title: "Issues i tablice: praca zespołu w jednym miejscu", duration_min: 13, preview: false },
        ],
      },
      {
        position: 5,
        title: "Ratunek z opresji i dobre nawyki",
        summary: "Cofanie zmian i porządek na co dzień",
        lessons: [
          { position: 0, title: "Cofanie zmian: restore, revert, reset — bez paniki", duration_min: 15, preview: false },
          { position: 1, title: "„Zepsułem repo” — najczęstsze wpadki i wyjścia", duration_min: 14, preview: false },
          { position: 2, title: "Nawyki, które doceni każdy zespół", duration_min: 10, preview: false },
          { position: 3, title: "Twój przepływ pracy od jutra: checklista", duration_min: 8, preview: false },
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
