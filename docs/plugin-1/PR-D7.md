# Opis PR — Dział 7 (treść obu kursów)

Treść pull requesta `feat/d7-tresc` → `plugin-1-sklep-kursow`.

```bash
gh pr create --base plugin-1-sklep-kursow --head feat/d7-tresc \
  --title "feat: Dział 7 — treść obu kursów (91 scenariuszy nagrań)" \
  --body-file docs/plugin-1/PR-D7.md
```

Po zielonym CI i merge: tag `v0.21.0` + release.

---

**Dział 7 dostarcza TREŚĆ obu kursów: 91 scenariuszy lekcji wideo**
napisanych wyłącznie z oryginalnej dokumentacji Anthropica i GitHuba.
Zero zmyślania — każda teza ma wiersz w tabeli „Zgodność ze źródłem"
wskazujący nazwę sekcji, numer kroku albo ramkę Note/Tip/Warning.

## Co wchodzi

**Kurs 1 „Jak poprawnie korzystać z Claude" — 41 scenariuszy**
(6 modułów): fundamenty, prompt engineering, Claude Code — start
i systemy pracy, Claude przez API, koszty i bezpieczeństwo.

**Kurs 2 „Jak poprawnie używać GitHuba" — 50 scenariuszy**
(7 modułów): start z Gitem, codzienna praca, repozytorium jak
u profesjonalisty, współpraca na issues i pull requestach, GitHub
Actions, bezpieczeństwo konta i kodu, narzędzia ponad podstawy.

**Każdy scenariusz** to gotowy materiał do nagrania: cel lekcji, sceny
z podziałem na `[EKRAN]` i `[NARRACJA]` z zakresami czasu, prompty do
pokazania, materiały dodatkowe i tabela zgodności ze źródłem.
Nagrywa właściciel; agent dostarcza scenariusz.

**Cytaty źródłowe** (`docs/dokumentacja-techniczna/d7/cytowane/`) —
17 plików, dzięki którym każdą tezę da się sprawdzić **bez** pobierania
55 MB dokumentacji producentów (ta leży poza gitem, odtwarza ją
`node tools/pobierz-dokumentacje-d7.mjs`).

## Jak to było produkowane

Moduły 1–3 Kursu 2 i cały Kurs 1 (62 scenariusze) — **trybem ręcznym**.
Od modułu 4 Kursu 2, decyzją właściciela — **trybem równoległym**:
agent główny pisze BRIEF całego modułu (łuk, tabela długu z wcześniejszych
modułów, twarde granice tematów, tezy i callbacki per lekcja), a potem
falami pracują subagenci, każdy nad jedną lekcją. Briefy zostają w repo
— to one są powodem, dla którego równolegle pisane lekcje nadal składają
się w kurs.

Cztery moduły tym trybem (4, 5, 6, 7) i **ani razu nie zaszedł warunek
powrotu do trybu ręcznego**. Oceny wg czterech sygnałów jakości, koszty
w tokenach i poprawki wnoszone do kolejnych modułów:
[`tresc-kursow/POSTEP.md`](../../tresc-kursow/POSTEP.md).

**Plik cytatów powstaje osobnym przebiegiem PO całym module i jest DRUGĄ
BRAMKĄ JAKOŚCI**, nie porządkami: autor cytatów szuka zdania w oryginale,
więc widzi, czego tam nie ma. Moduł 6 — 4 wyłapane usterki, moduł 7 — 10
(przy 286 zweryfikowanych wierszach tabel zgodności).

## Nowe zabezpieczenia

| Strażnik / golden | Czego pilnuje |
|---|---|
| `straznik-scenariuszy` | metryka zgodna ze ścieżką pliku, istnienie plików z `zrodla:` i niepustego `cytowane:`, pięć wymaganych sekcji, min. 8 wierszy tabeli zgodności, znacznik `[NARRACJA]`, brak artefaktów narzędzia zapisu (BLAD-008) |
| `straznik-odsylaczy-kursu` | **wierność własnemu kursowi**: odsyłacz „lekcja N.M" wskazuje istniejącą lekcję; zdanie o module nie wymienia tematu z innego modułu. Mapa tematów powstaje z metryk, więc nie starzeje się |
| `straznik-goldenu-tresci` + `goldeny/d7-tresc.json` | **cicha utrata tekstu**: suma kontrolna i cztery miary każdej lekcji (bajty, wiersze, sceny, wiersze zgodności). Różnica pokazywana per pole; regeneracja wymaga podania powodu |
| `tools/wyciag-zrodla.mjs` | narzędzie, nie strażnik: odchudza źródła do prozy i tabel (−38% na module 4), każde cięcie zostawia ślad w stopce |

## Dowody

- **strażnicy 16/16** (runner znajduje ich sam, CI bez zmian),
- `straznik-scenariuszy`: **91 scenariuszy w porządku**,
- `straznik-odsylaczy-kursu`: 91 scenariuszy bez błędnych odsyłaczy,
- golden treści: 91 lekcji, **506 scen, 1917 wierszy zgodności, 1307 kB**.

## Czego tu NIE ma (świadomie)

- **Materiał kursu nie trafia na publiczną stronę** — decyzja właściciela
  z 2026-08-18: kurs to lekcje wideo za logowaniem (etap WP), a na
  `/szkolenia` zostają katalog i strony sprzedażowe.
- **Finalnej treści stron sprzedażowych** — wchodzi kreatorem (Dział 6)
  po zatwierdzeniu programu; treść w `tools/seed/seed-przyklady.ts` jest
  nadal ROBOCZA i do zastąpienia.
- **Opinii klientów** — w seedach stoją jawne placeholdery; prawdziwe
  dopiero po pierwszych sprzedażach, niczego nie zmyślamy.
