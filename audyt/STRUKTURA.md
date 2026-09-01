# Struktura sektora AUDYT

**Etap E4 — szkielet.** Ten plik mówi, **jak sektor jest ułożony, co czym rusza
i kto co uruchamia**. Role i checklisty: [`ROLE.md`](ROLE.md). Granice:
[`GRANICE.md`](GRANICE.md). Zasady: [`REGULAMIN.md`](REGULAMIN.md).

---

## Układ katalogu

```
audyt/
  REGULAMIN.md          zasady i rozstrzygnięcia właściciela (E1)
  PLAN-BUDOWY.md        etapy, stan budowy, fakty zmierzone (E1)
  ROLE.md               19 ról: zakres + checklista (E2)
  GRANICE.md            do kogo należy znalezisko (E2)
  BRIEF-PROJEKTU.md     jedyne wejście wiedzy dla agentów (E3)
  DOKUMENTACJA.md       7 rodzajów, kto dostaje co (E3)
  ZRODLA-DOKUMENTACJI.md  źródła i cięcia (E3)
  STRUKTURA.md          ten plik (E4)

  szablony/             wzorce ról — kopiowane w E5
    AGENT.md  KRYTYK.md  SKILL.md  golden.md

  tools/                narzędzia sektora (E4)
    wspolne.mjs                  ścieżki, progi, HASH MIEJSCA
    zgloszenie.mjs               jedyna droga wejścia znaleziska
    status.mjs                   pięć statusów + rundy pętli
    mapa.mjs                     pokrycie w trzech stanach
    migawka-wartosci.mjs         wartości przed i po (W6)
    porownaj-cykle.mjs           test powtarzalności (K4')
    polacz-sektory.mjs           audyt + re-audyt (W4)
    generuj-agentow.mjs          źródło → .claude/agents (D1)
    straznik-sektora-audytu.mjs  czternaście kontroli
    audyt-straznika-sektora.mjs  mutacje strażnika
    pobierz-dokumentacje-audyt.mjs

  role/                 19 ról, po katalogu na rolę (E5)
    <KOD>/AGENT.md  KRYTYK.md  SKILL.md  goldeny/wzorzec.md

    SKILL.md NIE jest instalowany do `.claude/skills/` (rozstrzygnięcie
    właściciela 2026-09-01). Skill jedzie RAZEM ZE SWOJĄ ROLĄ: agent czyta go
    ze ścieżki własnym `Read`, więc nie widzi go żadna inna sesja ani żaden
    inny agent. Powód jest zmierzony, nie estetyczny — patrz niżej.

  zgloszenia/           wpisy JSON, ID nadaje narzędzie
  stan/                 status i rundy każdej roli
  migawki/              przed.json, po.json
  wyniki/               połączone fale i sektory
```

**Poza repozytorium:**
`~/.cache/aai-audyt-dokumentacja/` (44 MB) — dokumentacja masowa.
Nie leży w drzewie, bo **strażnicy skanują dysk, nie git**; powód i dowód
w [`ZRODLA-DOKUMENTACJI.md`](ZRODLA-DOKUMENTACJI.md).

`.claude/agents/aud-*.md` — generat, **nieśledzony przez gita**. Powstaje
komendą ze źródła w `audyt/role/`, więc nie ma czego commitować i niezmiennik
zostaje nietknięty.

---

## Skille należą do ról, nie do repozytorium

**Rozstrzygnięcie właściciela (2026-09-01): skill ma być na tym agencie, który
go potrzebuje — nie na całym repo.** Zmierzone w harnessie, nie założone:

1. **Nie istnieje pole `skills:` w definicji agenta.** Frontmatter ma cztery
   pola — `name`, `description`, `tools`, `model`. Przypisania „ten skill do
   tego agenta" nie ma czym zapisać.
2. **`Skill` to jedna pozycja w `tools:` — wszystko albo nic.** Przyznanie jej
   otwiera CAŁĄ listę skilli, nie wybrany podzbiór.
3. **Audytorzy nie mają `Skill` w narzędziach** (`Read, Grep, Glob, Bash`), więc
   skille zainstalowane do `.claude/skills/` byłyby widoczne w każdej sesji tego
   repo i **nieużywalne przez sektor**. Najgorsze z obu stron.

Dlatego `SKILL.md` zostaje plikiem roli, a `AGENT.md` wskazuje go ścieżką.
**Ślad dla GOLD-06** („czy dział użył swojego skilla") bierze się z treści:
każdy krok procedury kończy się czymś sprawdzalnym — komendą, liczbą albo
`plik:linia` — więc wyjście działu albo te artefakty niesie, albo skill nie
został użyty.

Frontmatter `name:`/`description:` w `SKILL.md` **zostaje mimo to**: nic nie
kosztuje, a gdyby kiedyś zapadła decyzja o instalacji, jest to jedna zmiana
w generatorze, nie przepisywanie 19 plików.

---

## Niezmiennik sektora

```
git diff main --name-only -- . ':!audyt'      →  musi dać 0
```

**Jedna komenda, bez wyjątków** (rozstrzygnięcie właściciela). Dlatego kod
sektora mieszka w `audyt/tools/`, a nie w `tools/audyt/`, a generat i
dokumentacja masowa nie wchodzą do gita.

**Druga twarz tej ceny, zmierzona przy E5:** niezmiennik `git diff` nie widzi
`.claude/`, ale **strażnicy z `main` skanują DYSK**. Generat z odsyłaczami
względnymi wywrócił `straznik-linkow` przy commicie — 28 martwych odsyłaczy
w czterech definicjach naraz. Dlatego w plikach ról ścieżki podajemy **od
korzenia repo, w kodzie inline** (to zarazem forma, której agent potrzebuje do
`Read`), a pilnuje tego reguła 14 strażnika sektora.

**Cena jest nazwana (K8):** bramki z `main` nas nie pilnują.
`straznik-wagi-dokumentacji` skanuje wyłącznie `tools/`, a audyt mutacyjny
projektu leży poza `audyt/` — dlatego sektor ma **własnego strażnika i własne
mutacje**, uruchamiane na gałęzi sektora.

---

## Co pilnuje strażnik sektora — czternaście kontroli

| # | Kontrola | Co się psuje bez niej |
|---|---|---|
| 1 | gałąź nie zmienia kodu produktu | sektor naprawia zamiast wskazywać (W2, D7) |
| 2 | każda rola ma krytyka | rola bez drugiej pary oczu (D3, WYTYCZNE N1) |
| 3 | pięć elementów §5 w `AGENT.md` | agent bez zakresu albo bez ograniczeń |
| 4 | generat zgodny ze źródłem, bez sierot | agent istnieje, choć nikt go już nie definiuje |
| 5 | każde zgłoszenie ma dowód, miejsce i hash | wpis dopisany ręcznie omija bramkę |
| 6 | trzy zasady nadrzędne dosłownie | definicja z pustym nagłówkiem niczego nie zabrania (W9) |
| 7 | mechaniczny zakres i checklista w `ROLE.md` | swobodny przegląd nie da tego samego wyniku w drugiej fali (K4′) |
| 8 | mapa pokrycia bez sierot | plik, którego nie czyta nikt |
| 9 | `zgloszenie.mjs --test` przechodzi | bramka wpuszczania znalezisk jest zepsuta |
| 10 | trzynaście zasad Goldena w `AGENT.md` i `KRYTYK.md` | agent nie wie, wobec czego będzie oceniany |
| 11 | golden przechodzi przez `powodyOdmowy()` | golden przestaje być miarą i gnije razem z kodem |
| 12 | komplet 19 ról i czterech plików każdej | `ROLE.md` opisuje rolę bez definicji |
| 13 | checklista `AGENT.md` zgodna z `ROLE.md` w obie strony | agent nie zada pytania, które właściciel zatwierdził |
| 14 | generat bez martwych odsyłaczy | sektor wywraca `straznik-linkow` z `main` |

Reguły 2, 3, 4, 6, 10, 11 i 12 są **warunkowe**: dopóki `audyt/role/` jest pusty,
mówią wprost „pominięte". Cisza byłaby nie do odróżnienia od zaliczenia — a katalog
istniał jako pusty od E4, więc sześć kontroli przechodziło po pustce, dopóki nie
zaczęły o tym mówić.

Audyt mutacyjny: **24 mutacje**, 0 przeoczonych, 0 martwych
(`audyt/tools/audyt-straznika-sektora.mjs`).

---

## Cykl życia zgłoszenia

```
  agent znajduje                         checklista, pozycja <KOD>-NN
        │
        ▼
  zgloszenie.mjs --plik=…                ODMAWIA bez dowodu, bez miejsca
        │                                albo gdy miejsca NIE MA w kodzie
        ▼
  AUD-<DZIAŁ>-NNN + hash miejsca         ID nadaje NARZĘDZIE, nie agent (§11)
        │
        ▼
  status: DO WERYFIKACJI
        │
        ├─▶ krytyk roli          PRZEPUSZCZAM / ODRZUCAM z powodem
        ├─▶ Golden (bramka)      13 zasad — na WYJŚCIU działu, nie w trakcie
        └─▶ weryfikator (WER)    czy problem istnieje — poza audytem (§16)
        │
        ▼
  status: ZWERYFIKOWANE          (istnieje albo odrzucone — wpis ZOSTAJE)
        │
        ▼
  kierownik zbiera → RAP → raport końcowy
```

**Odrzucone zgłoszenie nie znika.** Druga fala musi trafić na to samo miejsce
i dojść do tego samego wniosku; skasowany wpis zafałszowałby porównanie.

---

## Kto co uruchamia

| Komenda | Kto | Kiedy |
|---|---|---|
| `node audyt/tools/migawka-wartosci.mjs --zapisz=przed` | kierownik | przed pierwszą falą |
| `node audyt/tools/mapa.mjs` | kierownik | przed falą i po niej |
| `node audyt/tools/status.mjs --rola=X --fala=N --status=…` | każda rola | na starcie i na końcu |
| `node audyt/tools/status.mjs --rola=X --fala=N --runda` | rola pętlowa | co rundę |
| `node audyt/tools/zgloszenie.mjs --plik=…` | każda rola | przy znalezisku |
| `node audyt/tools/porownaj-cykle.mjs` | kierownik | po obu falach |
| `node audyt/tools/polacz-sektory.mjs --fala=N` | kierownik | po re-audycie |
| `node audyt/tools/migawka-wartosci.mjs --porownaj` | kierownik | na koniec |
| `node audyt/tools/straznik-sektora-audytu.mjs` | każdy | przed commitem |
| `node audyt/tools/audyt-straznika-sektora.mjs` | przy zmianie strażnika | zawsze |

---

## Progi i sufity — rozstrzygnięcia właściciela (2026-09-01)

| Co | Wartość | Skutek przekroczenia |
|---|---|---|
| Nośnik wyników | **200 zgłoszeń** | powyżej — SQLite; format wpisu bez zmian, zmienia się warstwa zapisu |
| Rundy agenta pętlowego (W3) | **5** | rola kończy i **musi wypisać niedomknięte pozycje**; cisza po suficie jest luką |

`node:sqlite` jest w standardzie node 26, więc przejście na bazę nie dokłada
zależności.

---

## Kolejność sektorów (§17, W5, K9')

```
MAPA PRZED
  │
  ├─ AUDYT fala 1        działy równolegle MIĘDZY SOBĄ
  │     └─ dział kończy → re-audyt może wejść WŁAŚNIE DO NIEGO
  ├─ RE-AUDYT fala 1     nigdy na tym samym dziale co audyt
  ├─ AUDYT fala 2        na NIEZMIENIONYM kodzie, ślepa na wyniki fali 1
  ├─ RE-AUDYT fala 2
  │
  ├─ porownaj-cykle.mjs
  │     ├─ zgodne  → błędy potwierdzone → NAPRAWA (osobny krok)
  │     └─ rozjazd → DEFEKT AUDYTU: napraw sektor i powtórz (K4')
  │
  └─ MAPA PO → migawka-wartosci.mjs --porownaj
```

**Ślepota fali 2 ma trzy warstwy:** zakaz w prompcie, czysty kontekst subagenta
oraz kontrola w `porownaj-cykle.mjs` — identyczne co do słowa stwierdzenie przy
tym samym miejscu jest zgłaszane jako **podejrzenie kopiowania**. Bez tego
„ten sam wynik" wychodziłby zawsze, także gdyby audyt był zepsuty.

---

## Czego szkielet nie rozstrzyga

- ~~treści ról~~ **powstały w E5** — 19 katalogów w `audyt/role/`, 76 plików;
- **przebiegu** — sektor nie rusza bez zielonego światła właściciela (D10);
- **napraw** — sektory nie naprawiają, nigdy (W2).
