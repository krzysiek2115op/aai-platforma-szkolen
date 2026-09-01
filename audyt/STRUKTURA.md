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
    straznik-sektora-audytu.mjs  dziewięć kontroli
    audyt-straznika-sektora.mjs  mutacje strażnika
    pobierz-dokumentacje-audyt.mjs

  role/                 POWSTAJE W E5 — po katalogu na rolę
    <KOD>/AGENT.md  KRYTYK.md  SKILL.md  goldeny/

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

## Niezmiennik sektora

```
git diff main --name-only -- . ':!audyt'      →  musi dać 0
```

**Jedna komenda, bez wyjątków** (rozstrzygnięcie właściciela). Dlatego kod
sektora mieszka w `audyt/tools/`, a nie w `tools/audyt/`, a generat i
dokumentacja masowa nie wchodzą do gita.

**Cena jest nazwana (K8):** bramki z `main` nas nie pilnują.
`straznik-wagi-dokumentacji` skanuje wyłącznie `tools/`, a audyt mutacyjny
projektu leży poza `audyt/` — dlatego sektor ma **własnego strażnika i własne
mutacje**, uruchamiane na gałęzi sektora.

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

- **treści ról** — powstają w E5 z szablonów;
- **przebiegu** — sektor nie rusza bez zielonego światła właściciela (D10);
- **napraw** — sektory nie naprawiają, nigdy (W2).
