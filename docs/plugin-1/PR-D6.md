# Opis PR — Dział 6 (kreator kursów)

Gotowa treść pull requesta `feat/d6-kreator` → `plugin-1-sklep-kursow`,
przygotowana z wyprzedzeniem, bo GitHub miał awarię w dniu domknięcia
działu. Po powrocie serwisu leci jednym poleceniem:

```bash
gh pr create --base plugin-1-sklep-kursow --head feat/d6-kreator \
  --title "feat: Dział 6 — kreator kursów (B6 zaliczona)" \
  --body-file docs/plugin-1/PR-D6.md
```

Po zielonym CI i merge: tag `v0.16.2` + release.

---

**B6 zaliczona przez właściciela 2026-08-17.** Kreator kursów: panel,
z którego wprowadza się CAŁĄ treść widoczną na `/szkolenia` i na
stronach kursów. Dział zamknięty na wersji 0.16.2.

## Co wchodzi

**Brama dostępu (0.14.0)** — token `KREATOR_TOKEN` w ciastku HttpOnly
(nie istnieje w JavaScripcie strony), porównanie w stałym czasie, kara
czasowa za zły token, flaga `Secure` zależna od protokołu żądania.
Logowanie i wylogowanie to akcje serwerowe **bez dostępu do bazy** —
zasada „jedna baza = jeden AJAX" (WYTYCZNE §8) zostaje nienaruszona.

**Lista i dane podstawowe (0.14.0)** — `/szkolenia/kreator` pokazuje
kursy w każdym statusie z licznikami treści liczonymi w bazie
(sekcje / moduły / lekcje), publikację, ukrycie i usuwanie
z potwierdzeniem. Edytor `/szkolenia/kreator/[id]`: slug (podpowiadany
z tytułu tylko dla nowego kursu), tytuł, typ, opis, cena, okładka,
**badge** i **poziom**.

**Edytor treści (0.15.0)** — wszystkie **12 rodzajów sekcji**
sprzedażowych i program (moduły + lekcje), obsługiwane JEDNYM
komponentem sterowanym opisem pól. Nowa mapa `SCHEMATY_SEKCJI`
w `typy.ts` jest jedną prawdą dla strony sprzedażowej i dla panelu.

**Podgląd i instrukcja (0.16.0)** — właściciel ogląda stronę kursu
przed publikacją (gość dostaje na tym samym adresie 404), a obsługę
panelu opisuje [KREATOR.md](KREATOR.md).

**Wejście z podstrony `/szkolenia`** (decyzja właściciela) — dyskretna
pigułka w rogu katalogu i strony kursu, renderowana wyłącznie przy
ważnym ciastku; gość nie ma jej nawet w źródle strony.

## Ochrona przed nawrotami

| Co pilnuje | Czego |
|---|---|
| `straznik-kreatora` | pola lub rodzaju sekcji, który strona potrafi wyrenderować, a kreator nie pozwala wypełnić (także w polach zagnieżdżonych) |
| `straznik-odmiany` | ręcznej odmiany polskich liczebników zamiast `lib/odmiana.ts` |
| `straznik-fixed` (rozszerzony) | animacji z wypełnieniem `forwards`/`both` na klasie opakowującej treść (BLAD-004) |
| `goldeny/d6-kreator.json` | zmiany w zestawie pól formularza |
| `goldeny/d6-runda.json` | utraty treści na drodze kreator → baza → odczyt |

Przykładowa treść w testach jest **generowana z opisu pól**, więc nowe
pole samo wchodzi do rundy zapis → odczyt — nie da się dołożyć pola,
które po cichu ginie po drodze.

## Błędy naprawione po drodze (z wpisami w rejestrze)

- **BLAD-004** — wypełniana animacja `.page-enter` zostawiała trwały
  kontekst układania i chowała elementy `fixed` pod stopką.
- **BLAD-005** — pole ceny kasowało wpis w trakcie pisania; można było
  zapisać kurs za 0 zł w przekonaniu, że wpisało się 199,90 zł.
- **BLAD-006** — dyspozytor przyjmował treść sekcji niezgodną z jej
  rodzajem; zapis „przechodził", a sekcja po cichu znikała ze strony.

Plus, z przeglądu kodu: slug nie przyjmował myślnika, zaczęte pole
opcjonalne świeciło „gotowa" mimo że zapis by padał, zły JSONB
wywracał edytor, ręczna odmiana liczebników. Każda naprawa ma test
albo strażnika.

## Dowody

- strażnicy **12/12**, testy **36/36**, smoke **D4 / D5 / D6**, lint,
  `tsc --noEmit`, build
- smoke D6 pilnuje granicy bezpieczeństwa z obu stron: bez ciastka
  kreator nie pokazuje żadnego szkicu, AJAX odpowiada 403, a strona
  szkicu daje 404; z ciastkiem przechodzi pełny cykl
  szkic → publikacja → katalog → usunięcie
- pomiary w przeglądarce (systemowy Firefox): 12 kart sekcji
  w kolejności strony, cykl kosz → „Dodaj" → komplet, pigułka admina
  nad stopką
- przegląd bezpieczeństwa gałęzi: brak ustaleń powyżej progu
- sprawdzone, że zaostrzenie kontraktu sekcji nie koliduje z seedem
  właściciela (przepuszczony na bazie `db1_kursy_test`)

## Dokumentacja

- [KREATOR.md](KREATOR.md) — instrukcja obsługi panelu
- [docs/dokumentacja-techniczna/d6](../dokumentacja-techniczna/d6/ZRODLA.md)
  — Server Actions, formularze i `cookies()` z pakietu `next@16.3.1`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
