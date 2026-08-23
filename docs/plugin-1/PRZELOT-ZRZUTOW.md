# Przelot zrzutów — brief wiążący dla obu czatów

Dokument roboczy etapu. **Czytać PRZED pierwszym zrzutem.** Powstał, bo
właściciel zdecydował 2026-08-23, żeby 72 zrzuty „do zrobienia teraz"
podzielić na **dwa czaty pracujące równolegle**, wg tych samych zasad.

## Stan (liczyć komendą, nie przepisywać)

```
node tools/zrzuty/manifest.mjs
```

Manifest **wyprowadza się z prozy**, nie z osobnej listy: miejsce ze
znacznikiem `<!-- ZRZUT: … -->` jest do zrobienia, miejsce z
`![…](zrzuty/…)` i istniejącym plikiem jest zrobione. Dzięki temu nie da
się rozjechać licznika z rzeczywistością — i dlatego **nie trzymamy
osobnego pliku stanu**.

Stan po pierwszej partii (2026-08-23, **liczba historyczna** — kubły zmieniły
się w turze 2, patrz niżej): 173 miejsca, 33 zrobione, 72 do zrobienia teraz,
68 po zalogowaniu.

## Podział terytoriów — ROZŁĄCZNY, po KURSACH

| | Czat A (worktree `…-k2-A`, gałąź `feat/tresc-k2-modul-2-3`) | Czat B (własny worktree i gałąź) |
|---|---|---|
| Kurs | **Kurs 2 — `jak-uzywac-githuba`** | **Kurs 1 — `jak-korzystac-z-claude`** |
| Ile | 36 (github-public 19, terminal 12, desktop 5) | 36 (tui 33, docs 1, terminal 1, arkusz 1) |
| Czym | przeglądarka bez logowania + odtworzone repo + nagrane wyjścia Gita | **realne sesje Claude Code** we własnym katalogu |

Podział po kursach jest rozłączny **co do pliku**: każdy czat dotyka
wyłącznie `tresc-kursow/<swój-slug>/**`. Zero wspólnych plików prozy,
zero wspólnych katalogów `zrzuty/`.

**Pliki wspólne — protokół:** `docs/plugin-1/KROK-3-KURSY.md`,
`tresc-kursow/POSTEP.md` i `tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md`
dopisują OBA czaty. Każdy dopisuje **własną sekcję z nazwą czatu
w nagłówku** i nie przepisuje cudzych — wtedy scalenie jest unią, a nie
konfliktem treści. Reguła bez zmian: **żaden czat nie przełącza gałęzi
w cudzym katalogu.**

## Zasady zrzutu — WIĄŻĄCE

1. **Zero zmyślania.** Zrzut pochodzi z ŻYWEGO interfejsu albo z realnego
   wykonania komendy. Nie rysujemy interfejsów, nie składamy ekranów
   z fragmentów.
2. **Podpis nazywa to, co widać.** Jeśli podpis mówi o napisie, którego
   na ekranie nie ma — poprawiamy **podpis I prozę**, a znalezisko
   wpisujemy do `tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md`.
   To główna klasa usterki tego przelotu; dotąd znalazła cztery
   nieaktualne komunikaty Gita w jednej lekcji.
3. **Komunikat narzędzia sprawdzamy WYKONANIEM, nie lekturą.**
   Dokumentacja GitHuba cytuje starsze brzmienia (`fatal:` zamiast
   `error:`). Decyduje to, co wypisze narzędzie.
4. **REGUŁA PRYWATNOŚCI (decyzja właściciela 2026-08-23).** W materiale
   nie ma danych właściciela. Nazwa użytkownika, e-mail, ścieżki domowe
   i awatary są podmieniane na przykładowe (`oliwia-dev`) **przed**
   zrzutem — w DOM-ie strony i w nagranym wyjściu terminala. Chrom
   interfejsu zostaje prawdziwy, dane są przykładowe. Robi to rig
   automatycznie; przy nowym rodzaju danych dopisz podmianę, nie kadruj
   na ślepo.
5. **Nic w globalnej konfiguracji.** Komendy `git config --global`
   nagrywamy z `HOME` wskazanym na katalog demonstracyjny
   (`tools/zrzuty/nagraj-demo.sh`) — konfiguracja właściciela jest
   nietykalna.
6. **Zakres zmian na GitHubie (decyzja właściciela 2026-08-23):**
   wolno zmieniać **wyłącznie repozytorium `stargazers-log`**. Ustawień
   konta (2FA, klucze SSH) NIE włączamy — te ekrany robimy jako podgląd
   formularzy przy zrzutach po zalogowaniu.
7. **Gdzie leżą pliki:** `tresc-kursow/<slug>/modul-N/zrzuty/*.webp`,
   odsyłacz w prozie `![podpis](zrzuty/plik.webp)`. Ścieżka jest
   względna **od pliku lekcji** — tak rozwiązuje ją `straznik-linkow`.
   **Poza `public/`**, bo `public/` wchodzi w całości do eksportu
   statycznego i treść lekcji by wyciekła (klasa BLAD-007).
8. **Rozmiar:** rig skaluje do 1600 px i zapisuje webp q82 (~40–90 kB).
   Nie wrzucamy zrzutów 2x — 173 pliki po 240 kB to 40 MB w repo.
9. **Weryfikacja wzrokowa jest obowiązkowa** i robi się ją **stykówką**
   (`tools/zrzuty/stykowka.mjs`), nie plikiem po pliku. Pierwsza partia
   miała 3 klasy usterek widoczne wyłącznie na obrazie: baner zgód na
   ciasteczka, zły adres strony (404) i kadr ucięty przed tabelą,
   o którą prosił podpis.
10. **Kod wyjścia bez potoku**, commit po każdym domkniętym kawałku,
    strażnicy zieloni przed commitem (hook uruchamia 25).

## Rig — wspólny, w repo

```bash
export ZRZUTY_KORZEN=$PWD                       # korzeń worktree
export ZRZUTY_RIG=<scratchpad-sesji>/rig        # tu mieszkają zależności
mkdir -p "$ZRZUTY_RIG" && (cd "$ZRZUTY_RIG" && npm init -y && npm i puppeteer-core sharp)
```

`puppeteer-core` i `sharp` **nie wchodzą do package.json** (lekcja z D5:
narzędzia przeglądarkowe żyją w scratchpadzie). Przeglądarka to
**systemowy Firefox** (`/usr/bin/firefox`, protokół webDriverBiDi) —
nie trzeba nic pobierać.

| Narzędzie | Do czego |
|---|---|
| `tools/zrzuty/manifest.mjs` | stan przelotu, wyprowadzony z prozy |
| `tools/zrzuty/zrob-zrzut.mjs` | jeden zrzut ze specyfikacji JSON (odrzuca zgody na ciasteczka, podmienia dane, zdejmuje chrom) |
| `tools/zrzuty/kolejka.mjs` | partia zrzutów; nie przerywa na błędzie, podaje bilans |
| `tools/zrzuty/terminal.mjs` | renderuje **nagrane** wyjście terminala (ANSI → obraz) |
| `tools/zrzuty/nagraj-demo.sh` | nagrywa realne wyjście komendy w odizolowanym `HOME` |
| `tools/zrzuty/stykowka.mjs` | siatka miniatur do weryfikacji wzrokowej |
| `tools/zrzuty/wepnij.mjs` | zamienia znacznik na `![…](…)`, **tylko gdy plik istnieje** |
| `tools/zrzuty/buduj-stargazers-log.sh` | odtwarza repozytorium demonstracyjne etapami (`m1 m2 m3 m4 m5 pr konflikt scalony`) |

`wepnij.mjs` zostawia znacznik tam, gdzie obrazu nie ma — dlatego licznik
`straznik-prozy` podaje pozostałą pracę wprost.

## Repozytorium demonstracyjne

`github.com/krzysiek2115op/stargazers-log` — publiczne, zbudowane
skryptem, stany zgodne z ćwiczeniami: README z pięcioma sekcjami i placem
zabaw Markdownu, gałąź `add-starred-list`, `.gitignore` w kolejności
z lekcji, ochrona `main` z dwoma domyślnymi zakazami, wydanie `v1.0.0`,
issue #1, workflow demo z zielonymi przebiegami Actions, PR otwarty (#2),
PR z konfliktem (#3), PR scalony (#4).

**Kurs 1 nie ma odpowiednika tego repozytorium** — jego zrzuty TUI robi
się w realnych sesjach Claude Code na dowolnym prawdziwym projekcie.
Czat B pracuje na SWOIM worktree, nie na cudzym.

## Czego w tym przelocie NIE robimy

- **Nie audytujemy kursów** — audyt jest PO ocenie wizualnej właściciela
  (`tresc-kursow/AUDYT-KONCOWY.md`). Tropy tam dopisujemy, ale ich nie
  realizujemy.
- **Nie robimy zrzutów wymagających logowania** — 68 miejsc czeka na
  wspólne posiedzenie z właścicielem.
- **Nie ruszamy `[EKRAN]`** — 517 takich miejsc siedzi w scenariuszach
  D7 (`lekcja-*.md`), nie w prozie, i nie są przedmiotem przelotu.

## Prompty startowe obu czatów (do skopiowania po `/clear`)

Zapisane w repo świadomie: po `/clear` nie ma z czego ich odtworzyć,
a oba czaty muszą wystartować z tym samym kompletem ustaleń.

### Czat A — Kurs 2 (`jak-uzywac-githuba`), stan po turze 2

```
Jesteś CZATEM A przelotu zrzutów, tura 3. Terytorium: KURS 2
(tresc-kursow/jak-uzywac-githuba). Worktree /home/krzysiek/Pod-strona-Szkolenia-k2-A,
gałąź feat/tresc-k2-modul-2-3, drzewo czyste, strażnicy 25/25.

PRZECZYTAJ NAJPIERW (to instrukcje, nie materiał do streszczania):
- docs/plugin-1/PRZELOT-ZRZUTOW.md — brief WIĄŻĄCY, a w nim sekcja
  „Czat A, tura 2": stan, PUŁAPKI, przepis na zrzuty pulpitu, zmiany
  w repozytorium demonstracyjnym.
- tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md — wiersze 11–13 to trzy
  poprawki do zrobienia W PIERWSZEJ KOLEJNOŚCI.
- CLAUDE.md — zasady projektu.

STAN LICZ KOMENDĄ, nigdy z pamięci:
  export ZRZUTY_KORZEN=$PWD
  node tools/zrzuty/manifest.mjs --kurs K2
  node tools/zrzuty/manifest.mjs --json > /tmp/m.json
  node tools/zrzuty/wepnij.mjs /tmp/m.json --sprawdz

KOLEJNOŚĆ ZATWIERDZONA PRZEZ WŁAŚCICIELA — odchaczać po kolei:
1. Poprawić trzy podpisy/prozę (znaleziska 11–13). UWAGA na pułapkę:
   poprawka podpisu zmienia oczekiwaną nazwę pliku zrzutu, więc po
   każdej poprawce PRZEMIANOWAĆ plik na nazwę z manifestu — inaczej
   wepnij zostawi znacznik, jakby zrzutu nie było.
2. wepnij.mjs — 23 gotowe zrzuty wchodzą do prozy.
3. GitHub Desktop, 4 zrzuty (fork z Flathuba JEST zainstalowany;
   przepis na zagnieżdżony kompozytor w briefie — okno ubić po robocie).
4. Zrzut edytora kodu (VS Code), M1 lekcja 5 — klon na commicie 4bc1b45.
Potem: lokalny podgląd OBU kursów W STYLU STRONY do oceny wzrokowej
właściciela. To jeszcze NIE jest zrobione.

RIG (zależności POZA package.json — lekcja z D5):
  export ZRZUTY_RIG=<scratchpad-sesji>/rig
  mkdir -p "$ZRZUTY_RIG" && (cd "$ZRZUTY_RIG" && npm init -y && npm i puppeteer-core sharp)
Przeglądarka: systemowy Firefox, nic nie pobieramy.

CZEGO NIE RUSZASZ: tresc-kursow/jak-korzystac-z-claude (to czat B);
49 miejsc Kursu 2 odłożonych na wspólne posiedzenie z właścicielem
(manifest sam je odkłada — nie próbować ich robić); audytu kursów;
znaczników [EKRAN] w scenariuszach D7.
```

### Czat B — Kurs 1 (`jak-korzystac-z-claude`), 36 miejsc

```
Jesteś CZATEM B przelotu zrzutów. Terytorium: KURS 1
(tresc-kursow/jak-korzystac-z-claude) — 36 miejsc: 33 zrzuty Claude Code
(TUI), 1 dokumentacja, 1 terminal, 1 arkusz.

PRZECZYTAJ NAJPIERW: docs/plugin-1/PRZELOT-ZRZUTOW.md (brief WIĄŻĄCY)
oraz CLAUDE.md.

STAN LICZ KOMENDĄ:
  export ZRZUTY_KORZEN=$PWD
  node tools/zrzuty/manifest.mjs --kurs K1

WORKTREE: załóż WŁASNY (`git worktree add`) z gałęzi
plugin-1-sklep-kursow, gałąź `feat/zrzuty-k1`. NIE pracuj w
…-k2-A ani …-k2-B i NIE przełączaj gałęzi w cudzym katalogu.
W worktree `node_modules` musi być KOPIĄ (`cp -al`) — Turbopack odrzuca
dowiązanie wychodzące poza projekt.

RIG: jak w briefie (ZRZUTY_RIG + puppeteer-core i sharp w scratchpadzie).

CZEGO NIE RUSZASZ: katalogu tresc-kursow/jak-uzywac-githuba (to czat A);
zrzutów wymagających logowania (27 miejsc Kursu 1 — claude.ai, Console,
Workbench, surowe odpowiedzi API); audytu kursów; znaczników [EKRAN].
```

**Do wspólnych plików** (`docs/plugin-1/KROK-3-KURSY.md`,
`tresc-kursow/POSTEP.md`, `tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md`)
każdy czat dopisuje WŁASNĄ sekcję z nazwą czatu w nagłówku i nie
przepisuje cudzych — wtedy scalenie jest unią, nie konfliktem treści.

## Czat A, tura 2 (2026-08-23) — stan, pułapki i kolejność dalszej pracy

**Stan liczy komenda, nie ten rozdział:**

```bash
export ZRZUTY_KORZEN=$PWD
node tools/zrzuty/manifest.mjs --kurs K2                       # bilans kubłów
node tools/zrzuty/manifest.mjs --json > /tmp/m.json
node tools/zrzuty/wepnij.mjs /tmp/m.json --sprawdz             # ile plików czeka na wpięcie
```

Na koniec tury: **23 zrzuty Kursu 2 leżą na dysku i czekają na wpięcie**
(12 terminala + 11 widoków GitHuba), `--sprawdz` potwierdza dopasowanie 23/23
i **ani jednego pliku Kursu 1** — terytoria pozostały rozłączne.

### Kolejność dalszej pracy — ZATWIERDZONA przez właściciela 2026-08-23

1. **Poprawić trzy podpisy/prozę** (znaleziska 11–13) — dopiero potem wpinać.
2. **`wepnij.mjs`** — zamienia znaczniki na obrazy.
3. **GitHub Desktop, 4 zrzuty** (przepis na kompozytor niżej).
4. **Zrzut edytora kodu** (VS Code) — M1 lekcja 5.

Potem dopiero **lokalny podgląd obu kursów w stylu strony** — właściciel chce
ocenić kursy wzrokowo. To wciąż NIE jest zrobione.

### PUŁAPKA: poprawka podpisu zmienia nazwę pliku zrzutu

`manifest.mjs` wyprowadza `obraz_plan` **z podpisu** (`z<NR>-cztery-pierwsze-słowa`).
Poprawiasz podpis → zmienia się oczekiwana nazwa pliku → `wepnij.mjs` przestaje
widzieć gotowy zrzut i zostawia znacznik, jakby pracy nie było. **Po każdej
poprawce podpisu przemianuj plik** na nazwę, którą podaje manifest:

```bash
node tools/zrzuty/manifest.mjs --json | grep -A2 '"linia": 33'   # obraz_plan dla tej pozycji
git mv <stara-nazwa>.webp <nowa-nazwa>.webp
```

Dotyczy to dwóch plików ze znalezisk 12 i 13 (zakładka Actions, plik workflow).
Automatyczne dopasowanie „po samym numerze" było próbowane i **odrzucone**:
numeracja `zNN` leci w obrębie PLIKU lekcji, a katalog `zrzuty/` jest wspólny dla
całego modułu, więc fallback sparował 40 pozycji zamiast 23 — w tym cudze.

### Czego rig nauczył się w tej turze (jest w kodzie, nie trzeba wyprowadzać)

- **`manifest.mjs`** liczy teraz `id` i `obraz_plan` (funkcja `slug`, polskie „ł"
  osobno — NFD go nie rozkłada i w nazwach robiły się dziury typu `nag-owek`).
  Dzięki temu każda sesja wylicza tę samą nazwę pliku i nie robi zrzutu drugi raz
  pod inną nazwą.
- **`manifest.mjs`** zna wzorce miejsc niemożliwych bez logowania (merge box,
  `Restore branch`, `Compare & pull request`, opcje scalania, log przebiegu oraz
  ekran „Let's get started!" w GitHub Desktop). Reguła stoi **pierwsza** na
  liście kubłów — inaczej „desktop" i „github-public" łapią te miejsca wcześniej
  i licznik obiecuje zrzut, którego nie da się zrobić. Po turze 2 odłożonych
  jest **osiem** miejsc Kursu 2.
- **`zrob-zrzut.mjs`** ma kadr „od elementu do elementu": `kadrOd` / `kadrDo`
  (selektory; elementy oznacza się wcześniej akcją `eval`, samo `id` niczego nie
  przesuwa) oraz `margines` jako liczba **albo** `{gora,dol,lewo,prawo}` — ikona
  kotwicy nagłówka siedzi POZA jego pudełkiem, więc zapas z lewej musi być inny
  niż z dołu.
- **Nagrywanie terminala:** `LC_ALL=C` (kurs cytuje angielskie brzmienia za
  dokumentacją) **oraz `TERM=xterm-256color`** — bez `TERM` Git uznaje terminal za
  „dumb" i gasi kolory, a jeden z podpisów wprost obiecuje kolorowe wyjście.
- **Po nagraniu trzeba oczyścić sterowanie:** zostawiamy wyłącznie sekwencje SGR,
  a `\r` w środku linii **nadpisuje** linię (paski postępu `git fetch`), inaczej
  w obrazie zostaje sklejony bełkot `Counting objects: 20%...40%...`.
- **`ssh-keygen` nagrany w kontenerze** (`podman`, alpine, użytkownik `oliwia`):
  narzędzie bierze katalog domowy z `getpwuid`, **nie z `HOME`**, więc na maszynie
  właściciela pokazałoby jego ścieżkę i zapisało klucz w jego `~/.ssh`. Hasło do
  klucza trzeba podawać **z opóźnieniem** — `ssh-keygen` czyści bufor wejścia
  między pytaniami (`TCSAFLUSH`), więc trzy `\n` wysłane naraz przepadają.

### Zrzuty pulpitu — przepis (GitHub Desktop, VS Code)

Decyzja właściciela 2026-08-23: **GitHub Desktop bierzemy z forka na Flathubie**
(`io.github.shiftey.Desktop`, ten sam kod przebudowany na Linuksa) — oficjalny
build jest tylko na Windowsa i macOS. **Jest już zainstalowany.** Cztery zrzuty
robimy bez logowania (ekran powitalny, menu `Repository`, panel commitu, menu
`Current Branch`); piąty — „Let's get started!" z listą `Your repositories` —
wymaga zalogowania i dołącza do wspólnego posiedzenia.

Okna otwieramy w **zagnieżdżonym kompozytorze**, żeby nie zaśmiecać ekranu
właściciela i żeby `grim` łapał wyłącznie nasz pulpit:

```bash
Hyprland -c <scratchpad>/hypr/hyprland.conf &      # wychodzi jako okno klasy `aquamarine`
hyprctl dispatch setfloating class:aquamarine       # w instancji WŁAŚCICIELA
hyprctl dispatch resizewindowpixel exact 1440 900,class:aquamarine
WAYLAND_DISPLAY=wayland-2 grim zrzut.png            # łapie TYLKO zagnieżdżony pulpit
pkill -f "Hyprland -c <scratchpad>"                 # ubić po robocie!
```

`AQ_BACKENDS=headless` u nas **nie działa** — Hyprland i tak startuje na backendzie
wayland i wychodzi jako okno; dlatego trzeba je zamknąć, a nie zostawiać.
VS Code uruchamiać z osobnym `--user-data-dir`, żeby nie pokazać ustawień ani
historii właściciela, a repozytorium klonować do katalogu o nazwie
`stargazers-log` (VS Code pokazuje nazwę katalogu, nie pełną ścieżkę) na commicie
`4bc1b45` — wtedy w drzewku są dokładnie `index.html` i `README.md`, tak jak
obiecuje podpis.

### Co zmieniło się w repozytorium demonstracyjnym

Wszystko w granicach zasady 6 (wolno ruszać **wyłącznie** `stargazers-log`):

- trzy commity na `main`: dopisek do `notatki.md`, założenie `notatki2.md`
  (jedno i drugie po to, żeby `git fetch`/`merge`/`pull` miały co pobierać —
  zmiany „kolegi z zespołu" robione przez API, jak przez edytor na GitHubie)
  oraz **trzy poziomy nagłówka w placu zabaw Markdownu** w `README.md`
  (bez nich nie było czego zrzucić w lekcji o Markdownie);
- gałąź **`ci-nodejs`** z plikiem `.github/workflows/nodejs-ci.yml` — dokładnie
  tym, który cytuje lekcja o CI; commit ma w temacie `[skip ci]`, więc nie
  odpalił przebiegu (plik bez `package.json` by go wywrócił). **Gałęzi nie
  kasować** — to źródło zrzutu z tej lekcji;
- gałąź `test-nazwy` założona i skasowana w ramach ćwiczenia z lekcji o
  wypychaniu — tak jak każe proza.

Konfiguracja Gita właściciela i jego `~/.ssh` **nietknięte**.

## Czat A, tura 3 (2026-08-23) — co domknięte, co zablokowane

**Stan liczy komenda** (`node tools/zrzuty/manifest.mjs --kurs K2`): 47 zrobionych,
**4 do zrobienia** (same ekrany GitHub Desktopu), 49 po zalogowaniu.

Odchaczone z kolejności zatwierdzonej przez właściciela: (1) trzy poprawki
podpisów i prozy ze znalezisk 11–13, (2) wpięcie 23 zrzutów, (4) zrzut edytora
kodu. Punkt (3) — GitHub Desktop — **stoi na przeszkodzie technicznej opisanej
niżej** i czeka na decyzję właściciela.

### GitHub Desktop nie startuje na tej maszynie (nie „nie umiem zrobić zrzutu")

Flatpak `io.github.shiftey.Desktop` 3.4.13 **uruchamia się, rozwidla procesy
potomne Electrona i kończy z kodem 0, nie mapując ANI JEDNEGO okna** — tak samo
w zagnieżdżonym kompozytorze, jak i na pulpicie właściciela. Sprawdzone
i wykluczone: brak katalogu `TMPDIR` z jego skryptu startowego (istnieje),
zrzut pamięci po awarii (`coredumpctl` — brak), usługa sekretów (aktywowalna,
`org.kde.secretservicecompat`), blokada pojedynczej instancji (nigdzie nie ma
katalogu danych aplikacji), uprawnienia sandboxa (`sockets=wayland;x11`).
Aplikacja **nie wypisuje ani bajtu** ani na stdout, ani na stderr, także
z `ELECTRON_ENABLE_LOGGING=1`, i **nie zakłada własnego katalogu konfiguracji**
— umiera bardzo wcześnie w procesie głównym. Argumentów wiersza poleceń nie da
się jej podać: własny parser odrzuca każdą nieznaną opcję
(`bad option: --remote-debugging-port`), więc droga przez CDP jest zamknięta.
**DECYZJA WŁAŚCICIELA 2026-08-23: te cztery miejsca WYPADAJĄ Z PROZY** —
bez szukania obejścia. Znaczniki usunięte (ekran powitalny, menu `Repository`,
panel commitu, menu `Current Branch`); proza ich nie przywoływała, więc
zostaje bez zmian poza scaleniem listy numerowanej rozbitej w lekcji 2.1.
Odrzucone warianty: inna maszyna, starsza wersja z Flathuba, przeniesienie do
partii po zalogowaniu. **Do rozstrzygnięcia na wspólnym posiedzeniu:** piąty
ekran tej samej aplikacji („Let's get started!", lekcja 1.5) siedzi w partii
po zalogowaniu, a jest na tej maszynie tak samo niewykonalny.

### Zrzut edytora kodu — przepis, który zadziałał

Code - OSS 1.131 w zagnieżdżonym kompozytorze, klon `stargazers-log` na
commicie `4bc1b45`. Trzy rzeczy, bez których kadr kłamie:

- **`--user-data-dir` i `--extensions-dir` w scratchpadzie** — zero ustawień
  i historii właściciela w kadrze;
- **`chat.disableAIFeatures: true` w `User/settings.json`** zdejmuje panel
  czatu i modal „Welcome to VS Code / Sign in to use GitHub Copilot"; **NIE**
  używać do tego `--disable-extensions`, bo wtedy w kadrze siada dymek
  „All installed extensions are temporarily disabled" — artefakt uruchomienia,
  nie interfejs;
- **`git update-ref refs/remotes/origin/main <commit lekcji>`** po
  `git reset --hard` — inaczej pasek stanu pokazuje „14↓", czego uczeń zaraz
  po sklonowaniu nie zobaczy.

Zrzut zdjęty przez **CDP** (`--remote-debugging-port` + `puppeteer-core`,
`page.screenshot()`), bo to jedyna droga niezależna od tego, czy kompozytor
akurat rysuje.

### PUŁAPKA: zagnieżdżony Hyprland rysuje tylko wtedy, gdy jego okno jest widoczne

`grim` na `WAYLAND_DISPLAY=wayland-2` **wisi w nieskończoność**, kiedy okno
klasy `aquamarine` siedzi na workspace, którego właściciel akurat nie ogląda:
rodzic nie wysyła `frame callback`, zagnieżdżony kompozytor nie renderuje,
a screencopy czeka na klatkę, która nie nadejdzie. Kiedy okno jest widoczne,
`grim` zwraca obraz **tła, bez okien klientów**. Wyjście headless
(`hyprctl output create headless`) pomaga tylko czasem — raz oddało poprawną
klatkę, potem znów wisiało. **Wniosek: do zrzutów aplikacji pulpitu nie
polegać na screencopy zagnieżdżonego kompozytora, tylko zdejmować obraz
z samej aplikacji (CDP dla Electrona).**

Dwie pomniejsze rzeczy z tej samej tury:

- konfiguracja zagnieżdżonego Hyprlanda **musi być bezbłędna** — przy błędzie
  składni kompozytor rysuje czerwoną nakładkę i rezerwuje pasek u góry
  (`hyprctl configerrors` pokazuje co); w 0.56 `blur`/`shadow` to bloki, nie
  pola, a `windowrulev2` jest wycofane;
- `pkill -f` / `pgrep -f` z pełną ścieżką **trafia własną powłokę agenta**
  (wzorzec jest w jej wierszu poleceń) — to ta sama klasa co lekcja
  z `next start` w CLAUDE.md. Ratuje wzorzec w klasie znaków: `'[v]scode-ext'`.

### Podgląd obu kursów w stylu strony — `tools/podglad-kursow.mjs`

```bash
export ZRZUTY_RIG=<scratchpad>/rig      # tam dodatkowo: npm i marked
node tools/podglad-kursow.mjs --wyjscie /tmp/podglad-kursow
```

Składa statyczny podgląd obu kursów w design systemie „Volt": strona wejściowa
z bilansem, strona kursu z modułami i lekcjami, po jednej stronie na lekcję
(74 znaki na wiersz, fonty Geist z `public/fonts`). Treść bierze **`czytajProze`
z `lib/proza-lekcji.ts`** — tę samą funkcję, którą wgrywarka wysyła lekcje do
bazy — więc podgląd pokazuje dokładnie to, co dostanie uczeń: bez frontmatteru
i bez tabeli „Zgodność ze źródłem". Miejsca bez zrzutu zostają **widoczną,
opisaną dziurą**: ocena wzrokowa ma pokazywać także braki. Katalog docelowy
podaje się jawnie i **narzędzie odmawia zapisu do wnętrza repo** (klasa
BLAD-007: `public/` wchodzi w całości do eksportu statycznego, a treść kursu
jest towarem). `marked` siedzi w rigu, nie w `package.json`.

### Kurs 1: 36 zrzutów czatu B NIE MA jeszcze w repozytorium

Sprawdzone komendą, nie z pamięci: gałąź `feat/zrzuty-k1` ma dwa commity
i **10 plików `.webp`** Kursu 1 (te same, co wspólny przodek), a jej worktree
`…-zrzuty-k1` nie ma niczego niezacommitowanego poza dwoma plikami rigu.
Manifest liczy w Kursie 1 **36 miejsc wciąż do zrobienia**. W podglądzie widać
to jako 63 dziury w Kursie 1 wobec 53 w Kursie 2.

## Co dalej — kolejność ustalona przez właściciela (2026-08-23, po turze 3)

Zapisane, bo to sekwencja decyzji, a nie oczywistość do wyprowadzenia od nowa.

1. **Czekamy na czat B.** Kurs 1 ma wciąż 36 miejsc do zrobienia (sprawdzone
   manifestem i gałęzią, nie pamięcią — patrz sekcja tury 3). Właściciel daje
   znać, gdy czat B skończy.
2. **Push gałęzi na GitHuba** robi czat A — dopiero po tym sygnale, nie
   wcześniej. Dziś `feat/tresc-k2-modul-2-3` jest o 38 commitów przed zdalną.
3. **49 zrzutów po zalogowaniu robimy RAZEM z właścicielem** — to ta partia,
   której anonimowa przeglądarka nie widzi (merge box, przyciski scalania,
   `Restore branch`, baner `Compare & pull request`, logi Actions, ekrany
   konta) plus ekran „Let's get started!" z GitHub Desktopu. Manifest sam je
   odkłada, więc licznik pokaże je jako jedyną pozostałą pracę.
4. **Domknięcie: push → PR → merge → tag → release** wg CONTRIBUTING.
   **Uwaga na CI:** limit minut Actions organizacji odnawia się 1 września
   2026, więc do tego czasu merge idzie na dowodach lokalnych (strażnicy,
   testy, smoke'i) — tak samo jak przy 0.21.0 i 0.25.0, decyzją właściciela.
   Po powrocie CI zostaje do potwierdzenia skan sekretów (gitleaks) — jako
   jedyny nie ma lokalnego odpowiednika.
5. **Audyt kursów** (`tresc-kursow/AUDYT-KONCOWY.md`) — dopiero teraz, zgodnie
   z zasadą „nie audytujemy w trakcie przelotu".
6. **Higiena repo** — sprzątanie gałęzi wg decyzji właściciela z 2026-08-19
   (scalone gałęzie do skasowania, `bak/*` domyślnie zostają).

### Aktualizacja po sygnale czatu B (2026-08-23, wieczór) — czat A

**Sygnał odebrany: czat B dał zielone światło, gałąź `feat/tresc-k2-modul-2-3`
idzie na GitHuba** (pkt 2 kolejności właściciela). Sekcja tury 3 mówiąca, że
36 zrzutów Kursu 1 nie ma w repo, jest już HISTORYCZNA: gałąź `feat/zrzuty-k1`
ma 6 nowych commitów i 29 plików `.webp` Kursu 1; wg meldunku czatu B na jego
gałęzi zostają do dokończenia „4 ekrany + 12 modelowych" — przed JEGO PR-em.

Meldunek czatu B sprawdzony komendami po stronie czatu A, nie przepisany na wiarę:

1. **Próbne scalenie potwierdzone**: `git merge-tree --write-tree HEAD
   feat/zrzuty-k1` u mnie pokazuje konflikty wyłącznie w trzech wspólnych
   dokumentach (PRZELOT-ZRZUTOW, KROK-3-KURSY, ZNALEZISKA) — znana unia
   sekcji, rozwiązywać zostawiając obie strony. Narzędzia (`zrob-zrzut.mjs`,
   `manifest.mjs`) scalają się czysto.
2. **Liczba wspólnego posiedzenia: 76, nie 68 i nie 49.** Moje wcześniejsze
   „49" liczyło tylko Kurs 2. Sprostowanie czatu B („68 = K1 27 + K2 41")
   jest mierzone manifestem sprzed tury 2 — jego gałąź odeszła od mojej PRZED
   commitami, w których manifest nauczył się ośmiu wzorców miejsc K2
   niemożliwych bez logowania (merge box, `Restore branch`, `Compare & pull
   request`, opcje scalania, log przebiegu, „Let's get started!"). Na tej
   gałęzi manifest bez filtra liczy dziś: **K1 27 + K2 49 = 76 po
   zalogowaniu**. LEKCJA: komenda liczy dobrze tylko na gałęzi z AKTUALNYM
   manifestem — liczbę ostateczną policzyć jeszcze raz PO scaleniu, na
   scalonym stanie (proza czatu B mogła też przesunąć własne kubły, np.
   commit „Lekcja 1.3 dostaje tabelę zamiast obiecanego arkusza").
3. **Po scaleniu kadrować przez `kadrOdSelektora`** — czat B naprawił martwe
   `scrollDo` i dodał kadrowanie od selektora w swojej kopii
   `zrob-zrzut.mjs`; nie blokuje niczego przed scaleniem, ale po nim nie
   liczyć już `clip` ręcznie.

**Kolejność PR-ów (ustalenie czatu B, zgodne z topologią gałęzi):**
`feat/zrzuty-k1` jest odbita od gałęzi czatu A, więc **PR czatu A idzie
pierwszy**; czat B dokańcza swoje 16 miejsc na własnej gałęzi i dopiero
potem otwiera swój PR.
