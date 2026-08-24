# Migracja danych Postgres → WordPress (Tutor LMS)

Krok 4.2 [planu domknięcia Pluginu 1](PLAN-FINAL-PLUGINU-1.md). Decyzja
właściciela (2026-08-25): **robimy skrypt jeszcze w Pluginie 1, ale
NAJPIERW poznajemy docelowy schemat MySQL, żeby nie przepisywać go
później.** Ten dokument jest zapisem tego rozpoznania — mapowaniem pole po
polu, wyprowadzonym z **żywej instalacji**, nie z dokumentacji.

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
# 1. w prototypie — eksport z bazy (przez publiczne API modułu, nie po SQL)
node --env-file=.env tools/eksport-wp.mjs --do eksport-wp
node --env-file=.env tools/eksport-wp.mjs --sprawdz     # sam raport, bez zapisu

# 2. w instalacji WordPressa — import (WP-CLI)
wp eval-file wordpress/import-kursy.php /sciezka/kursy.json
```

## Dowód, że to działa (2026-08-25)

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
