# Fala kontrolna po 0.78.0 — Pogłębiacz PROTO

Środowisko: **prototyp Next.js lokalnie** (`db1_kursy` przez podman, port 5432),
**BEZ dotykania `:8892`/`:8894`** (zakaz tej fali) i **bez `npm run dev`**
(pułapka ucinająca `CLAUDE.md`) — cała praca przez `build`/`start`/`test`/
`lint`/`tsc`/`smoke`/strażników oraz własne skrypty w scratchpadzie na bazie
testowej `db1_kursy_test` (izolacja z `testowa-baza.ts`, nie na danych dev).

**`git diff --stat CLAUDE.md` sprawdzony PO każdym `build`/`smoke` (w tym po
`build:podglad`, który też robi `next build`) — zawsze pusty, `wc -l` stale
4164.** `npm run dev` NIE był uruchamiany w tej sesji.

Zakres PROTO zmierzony (nie przepisany): `git ls-files -- 'app' 'components'
'lib' 'modules' 'public' 'tools/seed' 'next.config.ts' 'proxy.serwer.ts'
'tsconfig.json' 'eslint.config.mjs' 'postcss.config.mjs' 'package.json'
'tools/csp-podglad.mjs' 'tools/og-rozszerzenie.mjs'` → **131 plików**, zgodne
z definicją roli. Krzyżowo zsumowane po katalogach: app 26 + components 47 +
lib 13 + modules 21 + public 15 + tools/seed 1 + 8 plików korzenia = **131**.

Stan bramek na starcie i na końcu (bez zmian w plikach produktu — `git status`
poza `audyt/wyniki/` i `audyt/migawki/` jest pusty): strażnicy **39/39** (kod 0),
`npm run lint` kod 0 (7 ostrzeżeń, 0 błędów — te same co na `main`),
`npx tsc --noEmit` kod 0, `npm test` **84/84** (kod 0 — 83 z protokołu fali jest
liczbą nieaktualną, jak zapowiedziano), `npm run build` kod 0, `npm run smoke`
(7 smoke'ów prototypu: d4, d5, d6, lekcje, csp, podglad, seo) kod 0.

---

## W1 — naprawy z wydań v0.66.0…v0.78.0 dotykające PROTO

**Metoda ustalenia zakresu W1:** `git log --oneline v0.65.0..v0.78.0 -- app
components lib modules public tools/seed next.config.ts proxy.serwer.ts
tsconfig.json eslint.config.mjs postcss.config.mjs package.json
tools/csp-podglad.mjs tools/og-rozszerzenie.mjs` — pathspec identyczny z
zakresem roli, więc wynik jest zjawiskiem (co naprawdę dotknęło PROTO), nie
opinią o zasięgu narzędzia. Wynik: **dokładnie JEDEN commit**, `668237d`
„Zapis, który melduje skutek, zaczyna go sprawdzać" (wydanie v0.71.0). Reszta
trzynastu wydań (v0.66.0…v0.78.0 poza v0.71.0) dotyczy wyłącznie
`wordpress/wtyczki/*` — potwierdzone tym samym `git log` z pustym wynikiem dla
pozostałych zakresów dat; werdykt dla nich: **NIE DOTYCZY PROTO**.

| Pozycja (wydanie) | Werdykt | Dowód |
|---|---|---|
| Prototyp przestaje przeczyć produktowi: `TrescLekcji.materialy` miał `.default([])`, zapis samej prozy KASOWAŁ materiały lekcji (v0.71.0) | **NAPRAWIONE** | (1) Kod: `materialy: z.array(MaterialLekcji).max(12).optional()` bez `.default()` (`modules/m1-sklep/typy.ts:355`); dyspozytor rusza kolumnę `materials` TYLKO gdy `undefined !== tresc.materialy` (`modules/m1-sklep/dyspozytor.ts:297-311`); `EdytorLekcji.tsx:122` wysyła klucz ZAWSZE (`materialy: oczyszczona.materialy ?? []`). (2) `npm test` → test „zapis prozy BEZ klucza materialy nie kasuje materiałów" **PASS** (84/84 ogółem). (3) **Test negatywny wykonany w tej sesji**: przywróciłem `.default([])` w `typy.ts` (kopia zapasowa, potem `cp` z powrotem), uruchomiłem sam plik testowy — **FAIL**, `AssertionError: zapis samej prozy SKASOWAŁ materiały lekcji, 0 !== 2` (log `/tmp/mutacja-materialy.log`). Po przywróceniu oryginału: **PASS**, `git status --short modules/m1-sklep/typy.ts` puste. Mutacja reprodukuje dokładnie opisaną usterkę i test ją łapie — nie jest to test, który nie mógł zawieść. |
| Ebooki wycofane z prototypu: `KursTyp` zawężony do `z.enum(["kurs"])` (v0.60.1, przed zakresem tej fali, ale wymagana kontrola trwałości) | **NAPRAWIONE (trwa)** | `modules/m1-sklep/typy.ts:23` — `KursTyp = z.enum(["kurs"])`. Pełny grep `-rniI "ebook"` po całym zakresie PROTO (`app components lib modules public tools/seed`) → **2 trafienia, oba komentarze w `typy.ts` (uzasadnienie decyzji) + 1 w SQL CHECK migracji (świadomie NIE zwężony, udokumentowane)**; **zero** wystąpień w tekście renderowanym klientowi (widoki, komponenty, seedy). |
| `straznik-granic` obejmował 0 plików PHP przy 108 istniejących (MAR-A-05, v0.77.0) | **NIE DOTYCZY PROTO** | Zmiana rozszerzyła zasięg strażnika o PHP trzech wtyczek; JS/TS prototypu (240 plików) było w zasięgu JUŻ PRZED naprawą i zostało bez zmian. `node tools/straznicy/straznik-granic.mjs` uruchomiony samodzielnie w tej sesji → kod 0, cisza (brak naruszeń). Plik strażnika (`tools/straznicy/straznik-granic.mjs`) leży poza zakresem plikowym PROTO (nie ma go w liście 131 plików) — narzędzie audytowe, nie kod produktu. |
| Pozostałe 16 pozycji CHANGELOG (v0.66.0, 0.67.0, 0.68.0, 0.69.0, 0.70.0, 0.72.0–0.78.0) | **NIE DOTYCZY PROTO** | `git log` z pathspecem PROTO dla całego zakresu dat v0.65.0..v0.78.0 zwraca WYŁĄCZNIE commit `668237d` (wyżej) — żaden inny commit tego zakresu nie dotyka żadnego z 131 plików PROTO. Sprawdzone też ręcznie: `sed`+`grep -niE` po treści CHANGELOG dla ścieżek `modules/m1-sklep\|tools/seed\|app/\|components/\|lib/\|proxy\.serwer\|next\.config` w sekcjach 0.66.0-0.70.0 i 0.72.0-0.78.0 — brak trafień poza prozą historyczną cytującą stare wersje. |

**Kwantyfikator policzony w całości:** 17 wpisów CHANGELOG w oknie v0.66.0…v0.78.0
zostało PRZEJRZANYCH WSZYSTKICH (13 nagłówków wersji × pozycje wewnątrz);
**1 NAPRAWIONE + potwierdzone test negatywnym**, **1 NAPRAWIONE (trwałość
starszej decyzji) potwierdzone pełnym grepem zakresu**, **15 NIE DOTYCZY
PROTO** (w tym MAR-A-05 policzone osobno jako dotyczące narzędzia audytowego,
nie kodu PROTO).

---

## W2 — rundy regresji wg checklisty roli

| # | Pytanie | Metoda / komenda | Wynik | Dowód |
|---|---|---|---|---|
| PROTO-R1 | Każde zweryfikowane ustalenie audytu z tego obszaru da się odtworzyć uruchomieniowo? | Jedyne ustalenie tej fali dotyczące PROTO (`materialy`) odtworzone mutacją + przywróceniem, patrz W1. | **TAK** | log `/tmp/mutacja-materialy.log` (FAIL na zepsutym kodzie) + `/tmp/przywrocone-materialy.log` (PASS 12/12 po przywróceniu). |
| PROTO-R2 | Ile jest WSZYSTKICH wystąpień tej klasy („domyślna wartość na polu opcjonalnym patch-owej akcji kasuje dane przy braku klucza") w repozytorium? | `grep -rn "\.default(" modules/ lib/ components/ app/` (poza plikami testowymi) → **6 wystąpień, wszystkie w `modules/m1-sklep/typy.ts`**, jedno źródło prawdy o kontraktach. Każde sprawdzone z osobna. | **1 z 6 była usterką i jest naprawiona; pozostałe 5 to inna semantyka (pełna podmiana tablicy `sections`/`modules`/`lessons` przy PEŁNYM zapisie kursu, gdzie klucze nadrzędne `sections`/`modules` są `.optional()` BEZ `.default()` — sprawdzone `typy.ts:483-484` i `dyspozytor.ts:145,155` `if (kurs.sections)`/`if (kurs.modules)`)** | Sonda uruchomieniowa `proto-r2-sonda.mjs` na bazie testowej: utworzono kurs z sekcją+modułem+lekcją, edytowano BEZ kluczy `sections`/`modules` w ogóle — **sekcje i moduły PRZETRWAŁY** (`PRZED: sekcje=1 moduly=1` → `PO: sekcje=1 moduly=1`), kod wyjścia 0. Posprzątane (`usun`), kontrola sierot po fakcie: 0 wierszy. |
| PROTO-R3 | Klasyfikacja/wpływ z audytu utrzymuje się przy pełnym zasięgu? | Zasięg klasy „materialy" = 1 miejsce (potwierdzone R2) — wpływ nie zmienia się przy pełnym zasięgu, bo zasięg to jedno miejsce. | **TAK (trywialnie)** | j.w. |
| PROTO-R4 | Czy w PROTO występują klasy znalezione przez INNE działy (0.78.0: „operacja melduje skutek bez sprawdzenia wyniku zapisu")? | Przegląd WSZYSTKICH 24 wywołań `await k.query(...)` w `dyspozytor.ts` + próba fault-injection na naturalnym mechanizmie transakcji (`UNIQUE … DEFERRABLE INITIALLY IMMEDIATE` + `SET CONSTRAINTS ALL DEFERRED` na `course_modules`/`course_lessons`, zaobserwowane w migracji 001). Wysłano dwa moduły o TEJ SAMEJ pozycji, aby wymusić naruszenie w chwili `COMMIT`. | **KLASA NIE WYSTĘPUJE w PROTO** — `pg` (driver Node) ODRZUCA obietnicę przy błędzie zapytania (w tym `COMMIT`), więc `wTransakcji`'s `catch`+`ROLLBACK` zawsze się wykonuje; nie ma tu odpowiednika `$wpdb->query()` PHP oddającego cicho `false`. | Sonda `proto-r3-commit-failure.mjs`: `COMMIT` naruszający odroczony `UNIQUE` → `obsluzAkcje` zwraca `{"ok":false,"blad":"duplikat", …}` (NIE `ok:true`), stare dane w bazie **nietknięte** (`Modul A`/`Modul B` ocalone). Kod wyjścia sondy 0. Przy okazji: komunikat „Taki kurs już istnieje — slug musi być unikalny." jest generyczny dla WSZYSTKICH `code=23505` (nie tylko sluga) — świadomie udokumentowane w kodzie (`dyspozytor.ts:421-429`, ukrywanie szczegółów schematu przed klientem, log do `console.error`) — **nie zgłaszam jako usterkę**: operacja poprawnie zwraca `ok:false`, nie „sukces mimo awarii". |
| PROTO-R5 | Mechanizm tej samej klasy (z audytów TEJ fali), którego nikt nie zgłosił? | Pełny skan `.default(` (R2) + skan wzorca „wzorzec strażnika na NAZWĘ zamiast na ROZSTRZYGNIĘCIE" pod kątem strażników DOTYCZĄCYCH plików PROTO. | Żaden strażnik z listy 39 nie testuje wyłącznie plików PROTO poza `straznik-granic` (już objęty R4/W1) i `straznik-obietnic`/`straznik-podgladu-kursow`/`straznik-hydratacji`/`straznik-fixed` — te cztery uruchomione osobno w tej sesji, wszystkie zielone/pominięte świadomie (`straznik-podgladu-kursow`: „pominięte — nie znalazłem wygenerowanego podglądu", zgodnie z jego udokumentowanym trybem warunkowym). | Wyjście `uruchom-wszystkie.mjs` w tej sesji (patrz nagłówek pliku). |
| PROTO-R6 | Rozjazd prototyp↔wtyczka pokazany URUCHOMIENIOWO po OBU stronach? | **NIEWYKONALNE W TEJ FALI** — instrukcja tej roli zabrania dotykania `:8892`/`:8894` („obie instalacje WordPressa są w stanie dowodowym po innych rolach"), a R6 z definicji wymaga porównania `:3001` z `:8892`. | **NIEDOMKNIĘTE — powód środowiskowy, nie brak pracy.** | Zastępczo: `npm run build` (produkcyjny, nie `dev`) i `npm run smoke` (w tym `smoke-seo`, który porównuje dane strukturalne strony **z bazą `db1_kursy`**) wykonane i zielone — to potwierdza wewnętrzną spójność PROTO, nie rozjazd z produktem WP. |
| PROTO-90 | Coś poza checklistą, w zakresie, mierzone własnym pomiarem? | Przegląd wszystkich 131 plików zakresu pod kątem literalnych wzorców ryzyka (`ebook`, `.default(`, brak sprawdzenia wyniku zapisu) — patrz W1/R2/R4. Dodatkowo: sprawdzone, że sonda testowa (R2, R3) NIE zostawiła śladu w bazie testowej ani w drzewie repo. | Brak nowych ustaleń ponad W1 — nic do zgłoszenia. | `git status --short` (repo) i zapytanie `SELECT slug FROM courses WHERE slug LIKE 'proto-r2-sonda-%'` → 0 wierszy, oba po zakończeniu sond. |

---

## Niedomknięte

- **PROTO-R6** — nie mogłem porównać `:3001` z `:8892`/`:8894` (zakaz tej
  fali dotyczący środowisk WP w stanie dowodowym). Zastępczo wykonałem
  wewnętrzne smoke'i prototypu (zielone). Rekomendacja: R6 do domknięcia
  osobnym przebiegiem, gdy środowiska WP będą wolne od cudzego stanu
  dowodowego.

## Środowisko / higiena

`npm run dev` — **NIE URUCHAMIANY** w tej sesji (świadomie, praca wykonana
przez `build`/`start`/`test`/`lint`/`tsc`/`smoke`, które nie mają
udokumentowanego ryzyka ucinania `CLAUDE.md`). `git diff --stat CLAUDE.md`
sprawdzony po `node tools/straznicy/uruchom-wszystkie.mjs`, po `npm run
build`, po `npm run smoke` (w tym `build:podglad` wewnątrz `smoke-seo`/
`smoke-podglad`/`smoke-csp`) — za każdym razem **pusty diff, 4164 linie**.

Dwie sondy uruchomieniowe (`proto-r2-sonda.mjs`, `proto-r3-commit-failure.mjs`,
`proto-r2-cleanup-check.mjs`) żyją WYŁĄCZNIE w scratchpadzie sesji, nie w repo;
pracowały na `db1_kursy_test` (przełączenie przez `testowa-baza.ts`, jak
`npm test`), nigdy na `db1_kursy` dev. Repo: `git status --short` poza
`audyt/wyniki/` i `audyt/migawki/` — puste przez całą sesję.

---

## Werdykt krytyka: ODRZUCAM

**Powód główny (PROTO-R2).** Produktem tej roli jest ZASIĘG. Zasięg jest
policzony źle, a dowód, którym rola go broni, odpowiada na inne pytanie niż
zadane. Rola wymienia sześć wystąpień `.default(`, uznaje jedno za usterkę
(naprawioną) i pisze, że **„pozostałe 5 to inna semantyka"**, uzasadniając to
zdaniem o kluczach NADRZĘDNYCH (`sections`/`modules` są `.optional()` bez
`.default()`) i sondą, która edytuje kurs BEZ tych dwóch kluczy. To rozstrzyga
poziom górny. Jedno z pięciu — `lessons: z.array(LekcjaWejscie).max(LIMIT_LEKCJI).default([])`
(`modules/m1-sklep/typy.ts:430`) — leży **wewnątrz modułu** i nie ma żadnej
osłony: `modules/m1-sklep/dyspozytor.ts:252-259` kasuje lekcje spoza `m.lessons`.

Zmierzone przeze mnie (sonda w scratchpadzie, `db1_kursy_test`, asercja sceny
przechodzi PRZED pomiarem, więc nie mierzy pustki):

```
zapisz kurs, modules: [{ id, position, title }]   ← BEZ klucza `lessons`
WYNIK ZAPISU: {"ok":true,"akcja":"zapisz","id":"5e431232-…"}
LEKCJE PRZED=2  PO=0
AssertionError: BRAK klucza lessons SKASOWAL lekcje modulu
```

To jest **strukturalnie ta sama klasa**, którą rola przed chwilą potwierdziła
jako naprawioną dla `materialy`: `.default([])` na nieprzysłanym kluczu →
sfabrykowana pusta lista → kasowanie wierszy spoza wejścia → `ok: true`.
Rola orzekła o PRZYCZYNIE („inna semantyka") bez pomiaru tego przypadku.
Drobniejsza usterka w tym samym wierszu: liczba „6" obejmuje `typy.ts:349`,
który jest **komentarzem** opisującym usuniętą usterkę, nie żywym wystąpieniem —
wystąpień w kodzie jest 5.

**Powód drugi (W1, uzasadnienie nieprawdziwe).** Zdanie „Reszta trzynastu wydań
(v0.66.0…v0.78.0 poza v0.71.0) **dotyczy wyłącznie** `wordpress/wtyczki/*`" jest
fałszywe. Zmierzone: commity inne niż `668237d` zmieniły **48 plików poza
`wordpress/wtyczki/*`** — 13 strażników (w tym `straznik-csp`,
`straznik-limitera`, `straznik-granic`), 9 smoke'ów WP, `tools/pakuj-wtyczki.mjs`,
README/CHANGELOG/CONTRIBUTING, 9 plików `docs/` i `docs/schematy/`,
`goldeny/d7-tresc.json`, dwa pliki `tresc-kursow/`, `.gitignore`,
`.gitleaksignore` oraz `wordpress/srodowisko/*`. Cytowany dowód (pusty `git log`
z pathspekiem PROTO) uzasadnia **werdykt** („NIE DOTYCZY PROTO"), ale nie to
zdanie — dowód sąsiaduje ze stwierdzeniem, zamiast je potwierdzać. Sam werdykt
przeżywa (sprawdziłem: zmiany w `straznik-csp`/`straznik-limitera` to
jednolinijkowe poprawki liczb z commita dokumentacyjnego `92e4b77`).

**Powód trzeci (drobny, nie samodzielny).** Dowód R4 podaje, że
`SET CONSTRAINTS ALL DEFERRED` jest „zaobserwowane w migracji 001" — tam go nie
ma; jest w `modules/m1-sklep/dyspozytor.ts:169`. Mechanizm istnieje, cytat
lokalizacji jest błędny.

### Pozycje odtworzone samodzielnie — PRZYJĘTE

| Co | Komenda | Mój wynik |
|---|---|---|
| Zakres 131 plików | `git ls-files -- app components lib modules public tools/seed next.config.ts proxy.serwer.ts tsconfig.json eslint.config.mjs postcss.config.mjs package.json tools/csp-podglad.mjs tools/og-rozszerzenie.mjs \| wc -l` | **131**; suma po katalogach 26+47+13+21+15+1+8 = 131 — zgadza się |
| Kwantyfikator „dokładnie jeden commit" | pathspec złożony ręcznie, a osobno `git log --oneline v0.65.0..v0.78.0 -- lib modules components app` oraz `git diff --name-only v0.65.0 v0.78.0 -- . ':!wordpress'` | **potwierdzony**: 64 commity w oknie, tylko `668237d` rusza kod prototypu; `migracje/`, `tools/seed`, `package.json`, konfiguracje i smoke'i prototypu w oknie NIE zmienione |
| Test negatywny `materialy` | przywrócenie `.default([])` w `typy.ts` → `node --test modules/m1-sklep/tresc-lekcji.test.ts` | **FAIL 2/12**, `AssertionError: zapis samej prozy SKASOWAŁ materiały lekcji`; po przywróceniu **PASS 12/12**; `sha256` `typy.ts` identyczny (`ef3eca8b…`), `git status` czysty. Test ma asercję sceny („lekcja ma mieć materiały, inaczej pomiar jest ślepy") — nie przechodzi po pustce |
| PROTO-R4 (klasa 0.78.0 nie występuje) | własna sonda: dwa moduły o tej samej `position` → naruszenie odroczonego `UNIQUE` w chwili `COMMIT` | **potwierdzone**: `{"ok":false,"blad":"duplikat",…}`, dane nietknięte (`Modul A@0, Modul B@1`). Teza oczyszczająca broni się |
| Higiena bazy | zapytanie do `db1_kursy` (dev) o slugi sond | **0 śladów**, 2 kursy — praca roli i moja poszły na `db1_kursy_test` |
| Stan bramek | `node tools/straznicy/uruchom-wszystkie.mjs`; `npm test` | strażnicy **39/39** (kod 0), testy **84/84** (kod 0) — liczba 84 (nie 83) potwierdzona |

### Nieprzyjęte

- **PROTO-R2** — klasyfikacja „5 to inna semantyka" obalona pomiarem (wyżej);
  liczba 6 zawyżona o komentarz.
- **W1, zdanie o „wyłącznie `wordpress/wtyczki/*`"** — obalone pomiarem (48 plików).
- **R4, lokalizacja `SET CONSTRAINTS`** — błędny cytat własnego dowodu.
- **PROTO-R6** — **nie jest powodem odrzucenia.** Rola zadeklarowała pozycję jako
  niedomkniętą JAWNIE, z powodem i rekomendacją, i nie podała pomiaru zastępczego
  za dowód rozjazdu. Sprawdziłem drogi obejścia: jedyne narzędzie różnicowe
  prototyp↔wtyczka (`tools/sprawdz-proze-php.mjs`) wymaga `podman exec` na
  kontenerze `:8892` (linie 98–101) i riga `marked`, a lokalnego `php` w systemie
  nie ma — zakaz tej fali domyka tę drogę. Zastrzeżenie: rola nie nazwała tego
  narzędzia ani nie wykazała, że i ono jest zablokowane, więc „nie dało się" jest
  **niedowiedzione**, choć wniosek trafny.

### Mój własny ślad

Zmutowałem `modules/m1-sklep/typy.ts` (test negatywny) i przywróciłem z kopii —
`sha256` identyczny z przedwzorcem, `git status` poza `audyt/` pusty. Trzy sondy
żyją wyłącznie w scratchpadzie sesji, pracowały na `db1_kursy_test` (schemat
`DROP`/`migruj`, tak jak `npm test`), dev `db1_kursy` bez śladów. **`npm run dev`
NIE uruchamiany. `wc -l CLAUDE.md`: 4164 na starcie i 4164 na końcu, `git status`
czysty poza nieśledzonymi `audyt/migawki/` i `audyt/wyniki/`.**
