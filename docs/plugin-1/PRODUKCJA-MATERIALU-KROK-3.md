# Produkcja materiału kursów — opcje do decyzji właściciela

> **CZĘŚCIOWO NIEAKTUALNE od 2026-08-25.** Decyzja właściciela na starcie
> etapu WordPress: **nie będzie ŻADNYCH e-booków ani PDF-ów** — ani jako
> produktu, ani jako dodatku. Zapis niżej o „PDF jako dodatku" to stan
> z 2026-08-19 i zostaje jako historia decyzji. Reszta dokumentu (kurs
> tekstowy zamiast wideo, dogęszczenie Kursu 1, znaczenie `duration_min`)
> obowiązuje bez zmian. Aktualny stan: [ETAP-WP.md](../ETAP-WP.md),
> sekcja „Decyzje właściciela (2026-08-25)".

Krok 3 planu domknięcia Pluginu 1, punkt 1.
Podstawa: [PLAN-FINAL-PLUGINU-1.md](PLAN-FINAL-PLUGINU-1.md) („Krok 3"),
decyzja właściciela z 2026-08-18 (wieczór): **właściciel NIE nagrywa wideo**.

Stan: **decyzja PODJĘTA 2026-08-19** (sekcja niżej). Reszta dokumentu to
ślad rozumowania: opcje, liczby i odrzucone drogi zostają, bo za pół roku
nikt nie odtworzy, dlaczego wybór wypadł tak, a nie inaczej.

---

## DECYZJE WŁAŚCICIELA (2026-08-19)

Podjęte po przedstawieniu opcji A–D i po zmierzeniu materiału w jednostkach
książkowych. **Nie robimy wideo.**

### 1. Produkt: kurs tekstowy na platformie + PDF jako dodatek

Materiał kursu = lekcje na stronie, za logowaniem, w naszym stylu premium:
proza, zrzuty ekranu, bloki terminala, prompty do skopiowania. PDF zostaje
**dodatkiem do pobrania**, nie rdzeniem — dokładnie jak zapowiadała decyzja
z 2026-08-18 o materiałach dodatkowych.

Dlaczego to nie jest odwrót od decyzji „pełnoprawny kurs, NIE e-book"
(2026-08-18): tamta decyzja stała na założeniu, że **właściciel nagrywa
wideo**. Założenie upadło tego samego wieczoru. To rewizja po zniknięciu
przesłanki, nie zmiana zdania o jakości produktu — i nadal **nie robimy
„taniego e-booka"**: sam PDF do pobrania został rozważony i **odrzucony**
(cena nie do obrony, jeden wyciek pliku kończy sprzedaż, aktualizacje
trzeba by dostarczać kupującym ręcznie, nasz design premium ginie).

**Ta droga niczego nie pali.** Scenariusze zostają ważne co do zdania;
jeżeli wideo kiedyś wróci, dokłada się kontrakty nagrań do tych samych
lekcji i nagrywa z tych samych plików. Odwrotna kolejność oznaczałaby
wydanie pieniędzy i czasu, zanim wiadomo, czy kursy się sprzedają.

### 2. ~~Kurs 1 zostaje dogęszczony~~ — DECYZJA ODWRÓCONA 2026-08-20

**Nieaktualne od 2026-08-20.** Pierwotnie: 91 stron prozy w Kursie 1
kontra 292 w Kursie 2 to nie różnica stylu, kurs za 499 zł nie może być
chudszy niż ten za 399 zł — więc Kurs 1 miał zostać dogęszczony, a
obniżenie ceny było jawnie ODRZUCONE.

**Po dwóch modułach właściciel wybrał dokładnie tę odrzuconą opcję.**
Powód jest z pomiaru, nie z gustu: moduł 1 kosztował ~152 tys. tokenów
na lekcję, moduł 2 ~172 tys., a produkcja trwa za długo. Nowa decyzja
(2026-08-20):

| Co | Było | Jest |
|---|---|---|
| Kurs 1 „Jak poprawnie korzystać z Claude" | 499 zł, do dogęszczenia | **299 zł**, bez dogęszczania |
| Kurs 2 „Jak poprawnie używać GitHuba" | 399 zł, 50 lekcji | **349 zł, program CIĘTY** — mniej lekcji |
| Objętość prozy na lekcję | 12 000–16 000 znaków | **8 000–12 000 znaków** |

Kurs 1 zostaje więc taki, jaki wynika ze źródeł, a proporcję ceny do
objętości prostuje cennik zamiast dopisywania treści. Moduły 1 i 2 są
już napisane gęściej (14–18 tys. znaków na lekcję) i **zostają jak są**
— przepisywanie ich w dół kosztowałoby drugi raz tyle, co napisanie.

### 3. Jednostka zostaje czasem — „czas przerobienia lekcji"

`duration_min` żyje dalej i znaczy, ile zajmie **przerobienie** lekcji
(przeczytanie + wykonanie kroków), a nie ile trwa film. Skutki:
program zatwierdzony 2026-08-18 **nie wymaga ponownej akceptacji**,
statystyki katalogu (moduły / lekcje / czas) zostają bez zmian w bazie,
kontraktach i goldenach — zmienia się **podpis na stronie**.
Odrzucone: strony zamiast minut oraz oba pola naraz.

### Co z tych decyzji wynika dla kodu

| Wynika | Nie wynika |
|---|---|
| Lekcja potrzebuje **treści** (proza dla klienta) — nowe pole w kontrakcie i migracja | Kontrakt nagrania wideo (hosting, czas trwania, napisy) — **nie powstaje** |
| Lekcja potrzebuje **materiałów dodatkowych** (PDF, ściągawka) — rodzaj + adres | Pole na identyfikator z Vimeo/Bunny/YouTube |
| Właściciel musi móc **obejrzeć lekcję** przed B7 — podgląd treści dla zalogowanego | Odtwarzacz wideo na stronie |
| Zrzuty ekranu z 517 miejsc `[EKRAN]` — osobna pozycja pracy, patrz niżej | Potok montażu, synteza mowy, licencje na głos |

### Pozycja otwarta, świadomie nieprzesądzona

**517 miejsc `[EKRAN]`** zamienia się w kursie tekstowym na zrzuty ekranu
i bloki terminala. Bloki terminala robimy tekstem (są lepsze od zrzutu:
da się skopiować, nie starzeją się wizualnie). Zrzuty interfejsu GitHuba
i claude.ai wymagają przeklikania — **kto i kiedy je robi, nie jest
rozstrzygnięte**. Propozycja: lekcje powstają najpierw bez zrzutów
(kroki opisane słowem + blok terminala), zrzuty dochodzą osobnym
przelotem, bo to najszybciej starzejąca się część materiału i najtaniej
odświeżyć ją na końcu.

---

## Co mamy zmierzone (nie z pamięci — policzone w repo 2026-08-19)

| Wielkość | Wartość | Jak policzone |
|---|---|---|
| Scenariuszy | 91 | pliki `tresc-kursow/**/lekcja-*.md` |
| Scen | 506 | nagłówki `### Scena` |
| Poleceń „co pokazać na ekranie" | 517 | znaczniki `[EKRAN]` |
| Bloków narracji | 509 | znaczniki `[NARRACJA]` |
| Tekstu do przeczytania | **586 299 znaków** | tekst w cudzysłowach `„…"` po `[NARRACJA]` |
| To w minutach mowy | **~617 min = 10,3 h** | przelicznik 950 znaków/min (tempo lektorskie) |
| Czas deklarowany przez program (w bazie i na stronie) | **1465 min = 24,4 h** | `sum(duration_min)` z `course_lessons` |

### Usterka wykryta przy pomiarze — do rozstrzygnięcia niezależnie od wybranej opcji

Narracja pokrywa deklarowany czas **bardzo nierówno**:

| Kurs | Mowa w scenariuszach | Deklarowane w programie | Pokrycie |
|---|---|---|---|
| Jak poprawnie korzystać z Claude | ~175 min | 720 min | **24 %** |
| Jak poprawnie używać GitHuba | ~530 min | 745 min | 71 % |

Mowa to nie całe wideo — pokaz na ekranie, pauzy i praca na żywo
legalnie zajmują resztę. Ale 24 % kontra 71 % to nie różnica stylu,
tylko różnica gęstości: Kurs 1 powstawał trybem ręcznym (scenariusze
szkicowe), Kurs 2 trybem równoległym z briefami (scenariusze gęste).

**Konsekwencja dla B7:** strona sprzedażowa obiecuje 12 h materiału
Kursu 1. Jeżeli z tych scenariuszy powstanie 5 h, strona obiecuje coś,
czego materiał nie dowozi — a to łamie zasadę „strona nie obiecuje
niczego spoza programu". Do wyboru: **dopisać narrację w Kursie 1**
(dogęszczenie do poziomu Kursu 2) albo **skorygować czasy w programie**
(kreatorem, z ponowną akceptacją programu). Rekomendacja: dogęścić —
399/499 zł za 5 h wygląda inaczej niż za 12 h.

---

## Czego żadna opcja nie załatwia sama

**517 poleceń `[EKRAN]`.** Kurs uczy obsługi narzędzi: terminala
z Claude Code, czatu claude.ai i interfejsu GitHuba. Materiał bez obrazu
tych interfejsów nie jest kursem obsługi. Głos to najwyżej połowa
roboty — i **najtańsza połowa**. Każda opcja niżej jest oceniana także
za to, co robi z obrazem.

Drugi podział, który realnie rządzi kosztem utrzymania:

| Rodzaj ekranu | Ile lekcji | Automatyzowalność | Trwałość |
|---|---|---|---|
| Terminal (Claude Code) | Kurs 1, moduły 3–4 (16 lekcji) | wysoka — nagranie terminala da się skryptować i odtwarzać deterministycznie | duża: tekstowy interfejs zmienia się wolno |
| Interfejs webowy GitHuba | Kurs 2, większość z 50 lekcji | średnia — da się sterować przeglądarką, ale selektory i układ ekranów żyją | średnia: GitHub przemalowuje UI regularnie |
| Czat claude.ai i konsola | Kurs 1, moduły 1–2, 5–6 | niska — logowanie, treść generowana, regulamin usługi | mała |

To jest prawdziwy koszt utrzymania kursu, nie cena syntezy mowy.

---

## Opcje

### A. Nagranie ekranu + synteza mowy z narracji (rekomendowana)

Obraz: nagrania ekranu robione u nas — terminal ze skryptu (deterministyczne,
odtwarzalne), GitHub sterowany przeglądarką albo nagrany ręcznie scena po
scenie. Głos: synteza z tekstu `[NARRACJA]`, głos **z biblioteki dostawcy**
(nikogo nie klonujemy). Montaż: scena = klip ekranu + ścieżka głosu, sklejane
narzędziem wiersza poleceń.

| Kryterium | Ocena |
|---|---|
| Jakość | Wysoka merytorycznie (prawdziwy interfejs, prawdziwe wyniki). Głos syntetyczny słychać — polski TTS 2026 jest dobry, ale to nie lektor. Do kursu technicznego akceptowalne, do materiału „premium" wymaga testu odsłuchowego przed decyzją |
| Prawa do głosu | Czyste, jeżeli używamy **głosu bibliotecznego z licencją komercyjną** (ElevenLabs: licencja komercyjna od planu Starter; Azure: w regulaminie usługi). **Nie klonujemy niczyjego głosu** — to jedyna droga bez zgód i ryzyka wizerunkowego |
| Prawa do obrazu | Nagrania własne. Pokazywanie cudzego interfejsu w materiale szkoleniowym to użycie nominatywne (znaki towarowe Anthropic/GitHub tylko do wskazania produktu, bez sugerowania firmowania kursu) |
| Koszt jednostkowy | Głos: **9–10 USD za komplet** przy Azure ($16/1 mln zn.), **~59 USD** przy ElevenLabs Multilingual ($0,10/1 tys. zn.). Na lekcję: **0,10–0,65 USD**. Obraz: 0 USD opłat, koszt to czas |
| Koszt utrzymania | Zmiana tekstu = przegenerowanie ścieżki za grosze. Zmiana interfejsu = przenagranie **dotkniętych scen**, nie lekcji i nie kursu. Przy terminalu ze skryptu: ponowne uruchomienie skryptu |
| Czas realizacji | Najdłuższy z opcji — potok trzeba zbudować i pilnować. Bez zbudowanego potoku nie umiem podać uczciwej liczby; proponuję **pilotaż jednej lekcji** (K1 L1.1, ta z flagą `preview`) i wycenę reszty z pomiaru, nie z przeczucia |
| Co ze scenariuszami | **Używane 1:1.** Konwencja `[EKRAN]`/`[NARRACJA]` została napisana dokładnie pod to. Zero przepisywania |

### B. Awatar / lektor AI (Synthesia, HeyGen)

Gadająca głowa czyta narrację, w tle slajdy.

| Kryterium | Ocena |
|---|---|
| Jakość | Wygląda jak korporacyjne e-learningowe wideo. **Nie pokazuje interfejsu** — obraz z opcji A i tak trzeba dorobić, więc to koszt **ponad** A, nie zamiast |
| Prawa | Awatary biblioteczne — licencja w ramach abonamentu, ograniczona regulaminem platformy (materiał zwykle wolno używać komercyjnie, ale awatar zostaje ich) |
| Koszt jednostkowy | 10,3 h = 617 min. Synthesia ~95 USD/50 min → **~1 170 USD** za komplet; HeyGen API 3 USD/min → **~1 850 USD**. Na lekcję: **13–20 USD** |
| Koszt utrzymania | Najgorszy: każda poprawka zdania = ponowny render = ponowna opłata |
| Czas realizacji | Krótki dla samego głosu/twarzy, ale nie zdejmuje pracy z obrazem |
| Co ze scenariuszami | Narracja użyta, **517 poleceń `[EKRAN]` marnuje się** albo wymaga i tak opcji A |

**Sensowny wycinek B:** intra modułów (13 modułów × ~1 min ≈ 15 min ≈ 45 USD)
— twarz marki na wejściu, reszta ekranem. Do rozważenia po A, nie zamiast A.

### C. Kurs tekstowo-obrazkowy zamiast wideo

Lekcja = instrukcja krok po kroku ze zrzutami ekranu i nagraniami terminala
osadzonymi w stronie, plus prompty do skopiowania. Bez ścieżki dźwiękowej.

| Kryterium | Ocena |
|---|---|
| Jakość | Najlepsza do **wracania** (wyszukiwanie, kopiowanie promptów, czytanie we własnym tempie), najsłabsza jako „kurs" w oczach kupującego. **Kłóci się z decyzją właściciela z 2026-08-18** („pełnoprawny kurs, NIE e-book") — choć tamta decyzja dotyczyła PDF-a, a nie interaktywnej platformy |
| Prawa | Bez tematu głosu w ogóle |
| Koszt jednostkowy | Najniższy: zrzuty ekranu i redakcja |
| Koszt utrzymania | Najniższy z materiałów pokazujących interfejs: przy zmianie UI wymienia się **jeden zrzut**, nie klip |
| Czas realizacji | Najkrótszy |
| Co ze scenariuszami | Wymagają przeróbki: narracja do kamery → proza do czytania. Robota redakcyjna na 91 plikach |
| Ryzyko cenowe | Cena 399/499 zł jest ustawiona pod kurs wideo. Materiał tekstowy przy tej cenie to ryzyko zwrotów i opinii |

### D. Człowiek z rynku (lektor + montażysta)

Freelancer nagrywa głos, ktoś montuje z naszymi nagraniami ekranu.

| Kryterium | Ocena |
|---|---|
| Jakość | Najwyższa dźwiękowo |
| Prawa | Wymaga umowy z przeniesieniem majątkowych praw autorskich albo licencji wyłącznej — inaczej nie wolno swobodnie przerabiać materiału przy aktualizacjach |
| Koszt jednostkowy | Najwyższy. **Nie podaję liczby** — stawek polskiego rynku lektorskiego nie mam zweryfikowanych; do wyceny ofertowej, jeśli ta droga wejdzie do gry |
| Koszt utrzymania | Najgorszy operacyjnie: każda zmiana zdania to ponowne zlecenie i czekanie na człowieka |
| Czas realizacji | Zależny od terminarza obcej osoby |
| Co ze scenariuszami | Używane 1:1 (są gotowym tekstem lektorskim) |

---

## Rekomendacja agenta z 2026-08-19 — NIEAKTUALNA, patrz „Decyzje właściciela"

> Agent rekomendował opcję A (nagranie ekranu + synteza mowy). Właściciel
> po zapoznaniu się z liczbami wybrał **C w wariancie platformowym**
> (kurs tekstowy + PDF jako dodatek), z argumentem, że skoro i tak nikt
> nie nagrywa, tekst jest tańszy w utrzymaniu i nie zamyka drogi do wideo.
> Poniższe zostaje jako ślad rozumowania.

**A jako rdzeń**, z trzema zastrzeżeniami:

1. **Pilotaż przed skalowaniem.** Jedna lekcja (K1 L1.1 — ma flagę
   `preview`, więc i tak będzie publiczną zajawką) przechodzi cały potok:
   nagranie ekranu → synteza głosu → montaż → odsłuch właściciela.
   Dopiero jego ocena tego pliku decyduje, czy robimy tak 91 razy.
   To ten sam wzorzec, co „format scenariusza zaakceptowany na wzorcu
   K1/M1/L1" przy D7.
2. **Dwa głosy do porównania w pilotażu** (tani Azure kontra droższy
   ElevenLabs) — różnica to 50 USD na całości, czyli decyzja o jakości,
   nie o pieniądzach.
3. **C nie znika** — materiały dodatkowe (ściągawki, biblioteka promptów)
   były planowane od D7 i zostają. Zmienia się tylko to, że nie są rdzeniem.

**B odradzam jako rdzeń** (kosztuje 100× więcej za głos i nie rozwiązuje
obrazu), **D odradzam na tym etapie** (blokuje aktualizacje kursu o cudzy
terminarz przy materiale, który z definicji będzie się zmieniał).

---

## Co ta decyzja zmienia w kodzie — rozważania sprzed decyzji

> Rozstrzygnięte: patrz tabela „Co z tych decyzji wynika dla kodu" wyżej.
> Kontrakt materiału wideo NIE powstaje; zostaje treść lekcji i materiały
> dodatkowe. Poniższe zostaje, bo opisuje, dlaczego kolejność „najpierw
> decyzja, potem migracja" była wymuszona.

Kontrakt materiału da się zaprojektować **odporny na zmianę opcji**:
lekcja dostaje treść (scenariusz/instrukcję) i **listę materiałów**, gdzie
materiał ma rodzaj (`wideo-plik`, `wideo-osadzone`, `nagranie-terminala`,
`galeria-krokow`) i pola zależne od rodzaju. Wtedy wybór A/B/C/D decyduje,
**czym wypełniamy**, a nie **co przechowujemy**.

Czego mimo to nie da się zrobić przed decyzją:
- **gdzie mieszka plik wideo** (10 h materiału to nie jest katalog `public/`;
  Vimeo/Bunny/YouTube niepubliczne = przechowujemy identyfikator, własny
  hosting = przechowujemy ścieżkę i rozmiar),
- **czy w ogóle jest ścieżka dźwiękowa** (opcja C nie ma czasu trwania
  materiału ani napisów),
- **czy potrzebujemy pola na napisy/transkrypcję** (przy A dostajemy je
  za darmo — mamy tekst źródłowy).

Dlatego kolejność z planu jest utrzymana: najpierw decyzja, potem migracja
006 i panel.

---

## Źródła cen (sprawdzone 2026-08-19)

- ElevenLabs — [texttolab.com](https://texttolab.com/blog/elevenlabs-pricing),
  [bigvu.tv](https://bigvu.tv/blog/elevenlabs-pricing-2026-plans-credits-commercial-rights-api-costs/):
  0,05 USD/1 tys. znaków (Flash/Turbo), 0,10 USD/1 tys. (Multilingual v2/v3);
  licencja komercyjna od planu Starter.
- Azure AI Speech — [texttolab.com](https://texttolab.com/blog/azure-text-to-speech-pricing),
  [azure.microsoft.com](https://azure.microsoft.com/en-us/pricing/details/speech/):
  16 USD/1 mln znaków (Neural), 22 USD/1 mln (Neural HD), 500 tys. znaków
  miesięcznie w warstwie bezpłatnej.
- Synthesia / HeyGen — [knowlify.com](https://knowlify.com/articles/synthesia-pricing),
  [eesel.ai](https://www.eesel.ai/blog/heygen-pricing),
  [freelipsync.com](https://freelipsync.com/blog/best-ai-video-generator-value-cost-per-minute):
  Synthesia ~95 USD za 50 min gotowego wideo; HeyGen Avatar V API 0,05 USD/s
  (3 USD/min).

Ceny są z serwisów porównawczych, nie z cenników dostawców — przed
zakupem potwierdzić na stronie dostawcy.
