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

Stan na 2026-08-23 po pierwszej partii: **173 miejsca, 33 zrobione,
72 do zrobienia teraz, 68 po zalogowaniu.**

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

---

## Rig zrzutów TUI — dopisek CZATU B (Kurs 1)

Kurs 1 ma 33 zrzuty **interfejsu Claude Code**, a rig z pierwszej partii
umie tylko przeglądarkę (`zrob-zrzut.mjs`) i nagrane pary komenda/wyjście
(`terminal.mjs`). TUI przerysowuje ekran w miejscu, więc żadne z tych dwóch
narzędzi go nie odda. Doszły więc dwa narzędzia i jeden skrypt:

| Narzędzie | Do czego |
|---|---|
| `tools/zrzuty/sesja-tui.sh` | nagrywa REALNĄ sesję Claude Code przez PTY (`script`) wg scenariusza klawiszy |
| `tools/zrzuty/tui.mjs` | odtwarza nagrany strumień w prawdziwym emulatorze (xterm.js w Firefoksie) i zrzuca ekran |
| `tools/zrzuty/buduj-projekt-demo.sh` | odtwarza projekt demonstracyjny (padające testy, hooki, skill, subagent, serwer MCP) |
| `tools/zrzuty/scenariusze/k1/` | scenariusze klawiszy — zrzut jest odtwarzalny komendą, nie z pamięci |

Rig potrzebuje dodatkowo `@xterm/xterm` (nadal **poza** `package.json`):

```bash
(cd "$ZRZUTY_RIG" && npm i puppeteer-core sharp @xterm/xterm)
```

**Dlaczego przez emulator, a nie przez własne parsowanie ANSI:** jedynym
wiernym „ekranem" TUI jest stan prawdziwego emulatora po odtworzeniu całego
strumienia. Stąd też bierze się `ZNACZNIK`: nagrywarka zapisuje przesunięcia
bajtów, a `tui.mjs` renderuje prefiks strumienia — **jedna sesja daje kilkanaście
ekranów**, zamiast kilkunastu startów po ~15 s każdy.

### Ustalenia, które kosztowały czas (nie wyprowadzać od nowa)

1. **`HOME` musi zostać PRAWDZIWY** — tylko w nim żyje uwierzytelnienie.
   Sprawdzone: `HOME=/tmp/oliwia claude -p …` odpowiada `Not logged in`.
   Neutralność daje więc **katalog roboczy** `/tmp/oliwia/projekt-demo`,
   a nie podmiana tekstu.
2. **Podmiana danych w TUI musi zachowywać SZEROKOŚĆ.** Ramki paneli są
   rysowane znakami, więc krótszy tekst rozjeżdża prawą krawędź. `tui.mjs`
   dopełnia spacjami i **przerywa z błędem**, gdy podmiana jest dłuższa od
   oryginału. Adres właściciela zamieniamy na `oliwia.dev@przyklady.com`
   (dokładnie ta sama długość — 24 znaki).
3. **Sesje startują z `--setting-sources project`** — inaczej w kadr wchodzą
   statusline, hooki i skille właściciela. Skutek uboczny: `/status` pokazuje
   wtedy `Setting sources: Shared project settings` i to jest w tej sesji prawda.
4. **`script` dokleja własny nagłówek i stopkę** („Skrypt uruchomiony…") —
   trafiały na ekran zrzutu. Nagrywarka je usuwa.
5. **Esc NIE czyści pola wpisywania — czyszczą DWA Esc** (mówi to sam panel
   pomocy: „double tap esc to clear input"). Scenariusz z pojedynczym Esc
   sklejał kolejne komendy w `/co/sum@/hooks`, co wysłało do modelu prawdziwe
   zapytanie zamiast otworzyć panel.
6. **`.mcp.json` wymaga zatwierdzenia w oknie startowym** i ładuje się
   dopiero z `--mcp-config .mcp.json`; bez tego `/mcp` mówi „No MCP servers
   configured". Zatwierdzenie jest trwałe.
7. **Okno zaufania do katalogu** („Is this a project you created or one you
   trust?") przechwytuje pierwsze klawisze sesji. Trzeba je zatwierdzić raz.
