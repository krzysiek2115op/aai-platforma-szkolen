# Migracja danych Postgres → WordPress

Krok 4.2 [planu domknięcia Pluginu 1](PLAN-FINAL-PLUGINU-1.md). Decyzja
właściciela (2026-08-25): **robimy skrypt jeszcze w Pluginie 1, ale
NAJPIERW poznajemy docelowy schemat MySQL, żeby nie przepisywać go
później.** Ten dokument jest zapisem tego rozpoznania — mapowaniem pole po
polu, wyprowadzonym z **żywej instalacji**, nie z dokumentacji.

## Dwie drogi z jednego eksportu

Eksport z prototypu (`tools/eksport-wp.mjs`) ma **dwóch odbiorców**, i to
nie jest dublowanie — to dwie różne role tych samych danych:

| Droga | Czym jest | Kto wykłada |
|---|---|---|
| Postgres → **tabele `wp_aai_sklep_*`** | **ŹRÓDŁO PRAWDY** o kursie w docelowej instalacji | `wp aai-sklep import` (krok W2) |
| Postgres → **wpisy Tutor LMS** | **KOPIA** dla LMS-a, który dostarcza materiał za logowaniem | `wordpress/import-kursy.php`, docelowo nasza wtyczka przy publikacji (krok W5) |

Dlatego **eksport nie wie nic o Tutorze** (od 0.39.0, format 2): oddaje
wierny zrzut naszych tabel, w którym nazwa pola jest nazwą kolumny — tej
samej w Postgresie i w MySQL. Słowniki Tutora (statusy, poziomy, cztery
sekcje, które Tutor ma u siebie) mieszkają po stronie PHP, w kodzie, który
ich używa. Każde mapowanie po drodze jest miejscem, w którym dana może
wyjechać pod inną nazwą; im mniej ich na drodze do źródła prawdy, tym
lepiej.

## Skąd wzięte liczby i nazwy

Środowisko dowodowe: `/home/krzysiek/mp-test-env/wp-tutor/`
(podman: `tutor-db` + `tutor-wp`, `http://localhost:8091`), **WordPress
7.0.1 + Tutor LMS 4.0.6 + WooCommerce 11.0.1**, MariaDB 11.8. Klucze meta
odczytane z KODU wtyczki Tutora (`grep` po `classes/`, `models/`), nie
z poradników — poradniki bywają o wersję do tyłu.

Uruchomienie środowiska: `podman start tutor-db tutor-wp`.

## Jak Tutor trzyma kurs

Wszystko siedzi w `wp_posts` jako trzy typy postów spięte przez `post_parent`,
a kolejność niesie `menu_order`:

```
courses (kurs)
└── topics (moduł)   post_parent = ID kursu,  menu_order = pozycja
    └── lesson       post_parent = ID modułu, menu_order = pozycja
```

Treść lekcji leży wprost w `post_content` — sprawdzone na 73 lekcjach
(929 831 znaków), łącznie z lekcją 59 kB. Tutor nie ma własnych tabel na
treść; jego tabele (`wp_tutor_orders`, `wp_tutor_quiz_*`, `wp_tutor_carts`)
obsługują sprzedaż i quizy, czyli obszar Pluginu 2.

## Mapowanie — kolumna po kolumnie

### Kurs (`courses` → post typu `courses`)

| Nasze (Postgres) | Docelowe (WordPress) | Uwaga |
|---|---|---|
| `id` (uuid) | meta `_aai_zrodlo_uuid` | **klucz idempotencji** — patrz niżej |
| `slug` | `post_name` | |
| `title` | `post_title` | |
| `short_desc` | `post_excerpt` | |
| `status` | `post_status` | `draft`→`draft`, `published`→`publish`, `archived`→`private` |
| `level` | meta `_tutor_course_level` | `podstawowy`→`beginner`, `sredniozaawansowany`→`intermediate`, `zaawansowany`→`expert` |
| `price_grosze` | meta `_aai_cena_grosze` | **NIE tworzymy produktu WooCommerce** — cena wchodzi z decyzją o sprzedaży (Plugin 2); tu dana tylko nie ginie |
| `cover_url` | meta `_aai_okladka_url` | plik wchodzi osobno, przez bibliotekę mediów |
| `badge` | meta `_aai_badge` | Tutor nie ma odpowiednika |
| `type` (`kurs`/`ebook`) | meta `_aai_typ` | rozstrzygnięcie „ebook osobno czy jako dodatek" wisi w [ETAP-WP.md](../ETAP-WP.md) |

### Moduł (`course_modules` → post typu `topics`)

| Nasze | Docelowe |
|---|---|
| `id` | meta `_aai_zrodlo_uuid` |
| `course_id` | `post_parent` |
| `position` | `menu_order` |
| `title` | `post_title` |
| `summary` | `post_content` |

### Lekcja (`course_lessons` → post typu `lesson`)

| Nasze | Docelowe | Uwaga |
|---|---|---|
| `id` | meta `_aai_zrodlo_uuid` | |
| `module_id` | `post_parent` | |
| `position` | `menu_order` | |
| `title` | `post_title` | |
| `content` | `post_content` | treść zza logowania; status dziedziczy po kursie |
| `duration_min` | meta `_course_duration` | Tutor trzyma to jako tablicę `hours`/`minutes`/`seconds` |
| `preview` | meta `_aai_zapowiedz` | |
| `materials` (jsonb) | meta `_aai_materialy` (JSON) | |

### Sekcje sprzedażowe (`course_sections`) — tu przebiega granica projektu

Tutor pokrywa **cztery z naszych dwunastu** rodzajów sekcji własnymi
kluczami meta. Pozostałe osiem nie ma tam odpowiednika — i to jest dokładnie
ta część sklepu, której gotowy LMS **nie robi**, czyli uzasadnienie istnienia
naszej wtyczki:

| Nasza sekcja | Docelowe | Czyje |
|---|---|---|
| `benefits` | `_tutor_course_benefits` | Tutor |
| `for_whom` | `_tutor_course_target_audience` | Tutor |
| `package` | `_tutor_course_material_includes` | Tutor |
| `problem` | `_tutor_course_requirements` | Tutor |
| `hero`, `faq`, `guarantee`, `opinions`, `author`, `positioning`, `transformation`, `comparison` | meta `_aai_sekcje` (JSON) | **nasza wtyczka** |

Struktury sekcji zapisujemy jako JSON, nie jako tekst z nowymi liniami
(czego Tutor używa w swoim UI) — nasza wtyczka i tak renderuje te sekcje
sama, a spłaszczenie do tekstu byłoby bezpowrotną utratą struktury.

**Sekcja NIE MA już pozycji** (decyzja właściciela 2026-08-25, migracja 008):
jeden rodzaj = jedna sekcja na kurs, `UNIQUE (course_id, kind)`. W MySQL
odpowiednikiem jest `UNIQUE KEY (course_id, kind)` — bez kolumny `position`
i bez odpowiadającego jej `menu_order`. Kolejność sekcji na stronie jest
kompozycją widoku, nie danymi; eksport oddaje `{rodzaj, tresc}`.

### Czego migracja świadomie NIE przenosi

- **`course_changelog`** — audyt prototypu zostaje w prototypie. Wtyczka WP
  prowadzi własny dziennik; przenoszenie historii zmian z narzędzia, które
  przestaje istnieć, nie ma odbiorcy.
- **Pliki okładek** — to zasoby, nie treść; wchodzą przez bibliotekę mediów
  WordPressa, a w meta zostaje adres źródłowy.
- **Ceny jako produkty WooCommerce** — świadomie w Pluginie 2, razem z decyzją
  o sprzedaży. Dana nie ginie (`_aai_cena_grosze`), ale sklep nie zaczyna
  sprzedawać przy imporcie treści.

## Dlaczego JSON, a nie zrzut SQL

Zrzut SQL wiąże się z prefiksem tabel, kolejnością identyfikatorów i wersją
silnika; przy pierwszej rozbieżności wysypuje się w środku i zostawia bazę
w połowie. Format pośredni to JSON, a wykłada go PHP **funkcjami
WordPressa** (`wp_insert_post`, `update_post_meta`), więc WP sam nadaje ID,
sam pilnuje rewizji i sam waliduje. Ten sam wzorzec działa na produkcji
w repo strony głównej (`wordpress/skrypty/import-blog.php`).

## Idempotencja stoi na UUID, nie na slugu

Import bloga na stronie głównej dopasowuje wpisy po slugu. Tu to za mało:
slug kursu wolno zmienić w kreatorze, a **moduły i lekcje slugów nie mają
w ogóle**. Kluczem jest `_aai_zrodlo_uuid` — identyfikator z Postgresa,
zapisany w meta każdego posta. Bez niego powtórny import duplikowałby
73 lekcje zamiast je aktualizować.

## Przepis

```bash
# ── droga 1: do NASZYCH tabel (źródło prawdy) ──
npm run wp:import        # eksport → kopia do kontenera → wp aai-sklep import
npm run wp:sprawdz       # dowód: 73 lekcje zgodne co do znaku (porównuje OBIE bazy)

# ── droga 2: kopia do Tutora ──
npm run wp:eksport
podman cp eksport-wp/kursy.json aai_wp_cli:/tmp/kursy.json
podman exec aai_wp_cli wp --path=/var/www/html eval-file /tmp/import-kursy.php /tmp/kursy.json
```

`npm run wp:import` jest **jedną komendą dla człowieka i dla skryptu** —
rozjazd tych dwóch dróg kosztował nas już wydanie (0.24.0: deploy wołał
`npx next build` zamiast komendy, więc pomijał krok po buildzie; BLAD-012
to nawrót tej samej klasy).

## Dowód drogi do Tutora (2026-08-25)

Na czystej instalacji (poprzedni import testowy skasowany przed próbą):

| Próba | Wynik |
|---|---|
| Import 1 | **87 utworzonych** (2 kursy + 12 modułów + 73 lekcje), 0 zaktualizowanych |
| Import 2 (po naprawie slashowania) | 0 utworzonych, 0 zaktualizowanych, **87 bez zmian** |
| Import 3 | 0 / 0 / **87 bez zmian** — idempotencja potwierdzona dwa razy z rzędu |
| Treść lekcji | **73 z 73 zgodne CO DO ZNAKU** (porównanie pełnych stringów, nie sum) |
| Struktura | Kurs 1: 6 modułów / 41 lekcji · Kurs 2: 6 / 32 · kolejność `menu_order` zachowana |

### Dwie pułapki złapane po drodze — obie warte zapamiętania

**1. WordPress zjada backslashe w meta.** `update_post_meta()` puszcza
wartość przez `wp_unslash()`, więc bez `wp_slash()` znika KAŻDY backslash.
Objaw był łagodny (drugi import raportował kursy jako „zaktualizowane", bo
zapisane `https://` nie równało się wysłanemu `https:\/\/`), ale klasa
usterki nie: w kursie o Gicie backslash to ścieżki `C:\Users` i sekwencje
`\n` w przykładach. **Złapane wyłącznie testem idempotencji** — pierwszy
import wyglądał na w pełni udany.

**2. `LENGTH()` w MySQL liczy BAJTY, a `.length` w JavaScripcie — jednostki
UTF-16.** Pierwsze porównanie sum pokazało 977 625 wobec 929 838 i wyglądało
jak utrata danych; po przejściu na `CHAR_LENGTH()` zostało 7 znaków różnicy.
To **siedem emoji spoza BMP**, które JS liczy podwójnie — zero utraty.
Wniosek ogólny: **sumy porównuj ostrożnie, treść porównuj znak w znak.**
Dowodem migracji jest tabela „73 z 73 zgodne co do znaku", nie zgodność sum.

**Powtórzone na formacie 2 (0.39.0), już na środowisku ODTWARZALNYM**
(`wordpress/srodowisko/postaw.sh`, `:8892`, WP 6.9.4 + Tutor 4.0.7 +
WooCommerce 11.0.1): 87 utworzonych → 0/0/87 → 0/0/87. Poprzednie
środowisko (`:8091`) powstało ręcznymi `podman run` i nie da się go
odtworzyć — dowód stojący na takiej instalacji jest dowodem jednorazowym.

## Dowód drogi do NASZYCH tabel — krok W2 (2026-08-25, wersja 0.39.0)

Tabele `wp_aai_sklep_*` są źródłem prawdy, więc bramka jest ostrzejsza:
porównujemy **dwie bazy**, nie import z własnym meldunkiem.

| Próba | Wynik |
|---|---|
| Import 1 | **111 utworzonych** (2 kursy + 24 sekcje + 12 modułów + 73 lekcje) |
| Import 2 | 0 / 0 / **111 bez zmian** |
| Import 3 | 0 / 0 / **111 bez zmian** — idempotencja potwierdzona dwa razy z rzędu |
| Dziennik audytu | **111 → 111 wierszy** przy imporcie 2 i 3 |
| Treść lekcji | **73 z 73 zgodne CO DO ZNAKU** (`sha256` pełnych łańcuchów, `npm run wp:sprawdz`) |
| Kodowanie | `CHAR_LENGTH()` z MySQL = `mb_strlen` z PHP = punkty kodowe z JS na każdej lekcji |
| Backslashe | 38 sztuk w 9 lekcjach — po obu stronach tyle samo |
| Struktura | Kurs 1: 6 modułów / 41 lekcji · Kurs 2: 6 / 32 · pozycje zachowane |
| Warstwa zapisu | `npm run smoke:wp` — **30 sprawdzeń** (przestawianie kolejności, przenoszenie lekcji między modułami, odmowa skasowania treści, kasowanie sekcji i kursu) |
| Ścieżka pełna | Postgres → nasze tabele → Tutor: **73/73 zgodne co do znaku na obu przeskokach** |

### Dziennik audytu jako ŚWIADEK idempotencji

Wiersz, który się nie zmienił, nie dostaje nawet `UPDATE`-a, więc powtórny
import nie ma jak dopisać do dziennika ani jednej linii. To czyni z liczby
wierszy dziennika **ostry test**: „111 → 111" znaczy, że drugi import
naprawdę niczego nie tknął, a nie tylko że tak twierdzi.

Sprawdzone testem negatywnym: po dopisaniu jednego znaku do jednej lekcji
(`UPDATE … CONCAT(content, 'x')`) weryfikator wskazał tę lekcję po `sha256`
i po liczbie znaków, a kolejny import zameldował **dokładnie jedną**
zaktualizowaną pozycję i dziennik urósł **dokładnie o jeden** wiersz.

### Trzy rzeczy, których nie było widać z góry

**1. Pułapka `wp_slash` NIE dotyczy `$wpdb`.** Przy migracji do Tutora
`update_post_meta()` zjadał każdy backslash, bo puszcza wartość przez
`wp_unslash()`. `$wpdb->insert()`/`update()` tego nie robią, więc warstwa
zapisu wtyczki `wp_slash` nie potrzebuje — i pierwszy import przeszedł
idempotencję bez poprawek. Pułapka jest cechą **API postów i meta**, nie
WordPressa w ogóle.

**2. Sprawdzenie, które mówi „zero", bywa ślepe po OBU stronach.** Pierwsze
liczenie backslashy dało „0 i 0 — zgodne", a naprawdę oba wyrażenia szukały
DWÓCH backslashy zamiast jednego. Zgodność zer nie jest dowodem;
prawdziwe liczby (38 i 38) pojawiły się dopiero po poprawieniu wzorca.

**3. MySQL nie umie odroczyć `UNIQUE`.** Postgres miał
`DEFERRABLE INITIALLY IMMEDIATE` i `SET CONSTRAINTS ALL DEFERRED`; tutaj
zamiana kolejności dwóch modułów łamie ograniczenie w stanie pośrednim.
Warstwa zapisu przestawia więc pozycje **dwufazowo** — najpierw poniżej
zera, potem docelowo. Bez tego kroku smoke wywala się natychmiast:
`Duplicate entry '…-0' for key 'modul_pozycja'` (sprawdzone mutacją).

## Wymagania przeniesione z przeglądu B7 (decyzje właściciela 2026-08-25)

Pozycje, których świadomie NIE naprawiamy w prototypie, bo ich miejsce jest
w docelowej wtyczce. Pełen kontekst: [PRZEGLAD-B7.md](PRZEGLAD-B7.md).

| # | Wymaganie dla wtyczki | Dlaczego nie w prototypie |
|---|---|---|
| A | Licznik chybionych uwierzytelnień w **TABELI**, nie w cache'u; każdy klucz mierzony własnym oknem, a klucz z czynną blokadą eksmitowany ostatni | Obiekt cache eksmituje po swojemu — reguła „5 prób / 10 minut" znów przestałaby znaczyć to, co mówi |
| B | Uwierzytelnia **WordPress** (role + nonce); własny token znika razem z prototypem | Kontrola siły tokenu przestaje mieć przedmiot |
| F | Błędy pól widoczne w edytorze programu i w listach sekcji | Panel zastępuje **builder Tutora** — to jego UI, nie nasz |
| F | Ostrzeżenie przed utratą niezapisanej pracy w formularzu kursu | jw. |
| F | Konflikt unikalności rozróżniany po ograniczeniu, nie zawsze jako „slug zajęty" | W MySQL nazwy ograniczeń są inne; mapowanie powstaje razem ze schematem |
| F | **Przenoszenie lekcji między modułami** (`module_id` zmienia rodzica) | Builder Tutora na to pozwala, więc port MUSI to obsłużyć — dziś `WHERE module_id=` nigdy nie zmienia rodzica |
| F | Ważność sesji egzekwowana po stronie serwera, nie samym ciastkiem | W WP robi to warstwa sesji |

## Co z tego wynika dla etapu WP

- Struktura kurs → moduł → lekcja mapuje się **1:1**, bez kompromisów.
- Nasza wtyczka odpowiada za **osiem rodzajów sekcji sprzedażowych**, katalog
  i kreator; Tutor za dostarczenie materiału za logowaniem; WooCommerce za
  sprzedaż. To potwierdza podział z [ETAP-WP.md](../ETAP-WP.md) na danych,
  nie na deklaracjach.
- Migracja jest **powtarzalna**: można ją puszczać wielokrotnie w trakcie
  prac nad wtyczką, bo nie duplikuje i nie nadpisuje niezmienionego.
