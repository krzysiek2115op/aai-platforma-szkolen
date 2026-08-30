<div align="center">

# Pod strona Szkolenia

**Sklep z kursami dla Automatic AI** (dawniej matthewplugins.pl)
— podstrona `/szkolenia`: katalog kursów, strony sprzedażowe, płatności
z dostawą na e-mail i panel administratora. Trzy odizolowane moduły,
trzy osobne bazy danych.

[Plan projektu](docs/PLAN.md) ·
[Wytyczne](docs/WYTYCZNE.md) ·
[Współpraca i workflow](CONTRIBUTING.md) ·
[Dziennik zmian](CHANGELOG.md) ·
[Licencja MIT](LICENSE)

<br>

[![Podgląd katalogu /szkolenia](docs/zrzuty/podglad-szkolenia.png)](https://matthewplugins.github.io/szkolenia-podglad/szkolenia)

*Podgląd lokalny: [`http://localhost:3001/szkolenia`](http://localhost:3001/szkolenia)
— `npm run db1:up && npm run db1:migruj && npm run dev`
([pełny start](#szybki-start-nowa-maszyna-od-zera))*

</div>

---

<details>
<summary><b>Spis treści</b></summary>

- [Stan projektu](#stan-projektu)
- [Moduły („pluginy")](#moduły-pluginy)
- [Stack](#stack)
- [Wytyczne projektu](#wytyczne-projektu)
- [Jak tu się pracuje](#jak-tu-się-pracuje)
- [Skrypty](#skrypty)
- [Strażnicy i CI](#strażnicy-i-ci)
- [SEO i bezpieczeństwo](#seo-i-bezpieczeństwo)
- [Szybki start (nowa maszyna, od zera)](#szybki-start-nowa-maszyna-od-zera)
- [Treść kursów (Dział 7)](#treść-kursów-dział-7)
- [Kreator kursów (Dział 6)](#kreator-kursów-dział-6)

</details>

## Stan projektu

| | |
|---|---|
| **Wersja** | **0.56.0** |
| **Etap** | Prototyp UKOŃCZONY i scalony na `main` (0.37.0, B1–B7 zaliczone). Trwa **etap WordPressa** ([decyzje i plan](docs/ETAP-WP.md)). **Wtyczka `aai-sklep` SKOŃCZONA** (kroki W1–W6, `v0.45.0`): środowisko `wordpress/srodowisko/` (WP + motyw + Tutor + Woo na `:8892`), własne tabele i warstwa zapisu, oba kursy w tabelach (**73 lekcje zgodne co do znaku**), `/szkolenia` i strony sprzedażowe z NASZYCH tabel, kreator w kokpicie, kopia kursu w Tutorze po każdym zapisie i materiał w NASZYM szablonie. Trwa **Plugin 2 — płatności** (`aai-platnosci`, SZEW do WooCommerce, nie własna kasa): **P0–P3a zrobione** (schemat, fundament, produkt z ceny, silnik `wc` z zamkniętą sprzedażą), **P3b** (cena efektywna na froncie i w danych strukturalnych, przycisk w czterech stanach, domykanie zamówienia) i **P4** — konto przy zakupie, dwa maile („Ustaw hasło” przy powstaniu konta, „Twój kurs jest gotowy” po opłacie), dziennik dostarczenia i otwarcie sprzedaży komendą. **P5** — zwroty i przypadki brzegowe: strona przestaje obiecywać gwarancję 30 dni (decyzja właściciela: zwrotów nie realizujemy), a to, że klik „Refund” w WooCommerce ODBIERA dostęp do kursu, jest zmierzone i utrwalone smoke'em; kasa nie powołuje się już na nieistniejący regulamin, a produkt w koszyku ma okładkę kursu. **P6 (test ręczny właściciela) ZALICZONY 2026-08-30 — wtyczka `aai-platnosci` SKOŃCZONA** (`v0.53.0`): jeden mail przy płatności natychmiastowej, „Moje konto” w menu, cisza rdzenia o hasłach. Trwa **Plugin 3 — monitoring** (`aai-monitor`; „panel” znaczy w tym repo kreator): schemat zaakceptowany po krytyce i domknięciu uwag, **kroki T1 i T2 zrobione** (`0.56.0`) — dwie tabele, warstwa zapisu, ekran w kokpicie, kontrola oraz **działający dziennik logowań**: trzy haki rdzenia zapisują, kto i skąd wchodził na konta, rozróżniając logowanie formularzem od automatycznego wejścia z kasy WooCommerce, a nieudane próby zasilają jedyny alarm ekranu — licznik z ostatnich 7 dni. Hasła nie zapisujemy nigdy, adresy IP znikają do 90 dni od ostatniej aktywności, a wpis o tym trafia do polityki prywatności. Ten moduł tylko PATRZY: rejestruje logowania i ruch, **nikogo nie blokuje** |
| **Aktywny moduł** | **Plugin 3 — monitoring** (`aai-monitor`): [schemat po krytyce](docs/plugin-3/DIAGRAM.md), [werdykty krytyki T0](docs/plugin-3/KRYTYKA-T0.md); krok T1 zrobiony, następny T2 (dziennik logowań). Plugin 2 ZAMKNIĘTY ([schemat](docs/plugin-2/DIAGRAM.md), [test ręczny P6](docs/plugin-2/TEST-RECZNY-P6.md)), Plugin 1 zamknięty ([diagram działów i bramek](docs/plugin-1/DIAGRAM.md)) |
| **Gałąź domyślna** | `main` — wrócił nią 2026-08-25 razem ze scaleniem ukończonego Pluginu 1 (PR #62, tag `v0.37.0`). Do tego dnia domyślną była `plugin-1-sklep-kursow`, bo `main` stał celowo na 0.3.4 ([PLAN.md §5](docs/PLAN.md): moduł wchodzi na gałąź główną po ukończeniu i akceptacji całości). Gałąź modułu zostaje jako historia — jej drzewo jest identyczne z `main` |
| **Localhost** | strona główna: `:3000` (klon, tylko podgląd) · Plugin 1: `:3001` (`npm run dev`) |
| **Podgląd na żywo** | [matthewplugins.github.io/szkolenia-podglad/szkolenia](https://matthewplugins.github.io/szkolenia-podglad/szkolenia) — statyczny eksport katalogu i stron kursów (`npm run deploy:podglad`), **bez kreatora i AJAX-a**, z `noindex` na czas prac. Służy do pomiarów SEO i wydajności narzędziami Google; **oba kursy są kompletne** (73 lekcje), a teksty sprzedażowe zgodne z produktem (0.33.0) — placeholderami zostają wyłącznie opinie, do pierwszych sprzedaży |
| **Licencja** | MIT ([LICENSE](LICENSE)) — jak repo strony głównej; fonty Geist osobno na SIL OFL 1.1 ([public/fonts/LICENSE-Geist-OFL.txt](public/fonts/LICENSE-Geist-OFL.txt)) |
| **Produkcja** | brak — **docelowo WordPress na wykupionym hostingu i domenie** (decyzja zespołu 2026-08-18): sklep zostanie przepisany na wtyczkę WP (PHP + MySQL), a obecny kod Next.js jest prototypem-specyfikacją ([szczegóły](docs/PLAN.md#decyzja-zespołu-2026-08-18--produkcja-na-wordpressie-zastępuje-plan-hosting-nodejs--vps)) |

> [!IMPORTANT]
> To repozytorium jest budowane OSOBNO od strony głównej.
> Repo [automatic-ai](https://github.com/MatthewPlugins/automatic-ai)
> (dawniej `matthewplugins.pl`) służy wyłącznie jako źródło wzorców
> (stack, design, strażnicy) — **nie wprowadzamy tam żadnych zmian**
> do czasu ukończenia i oceny tego projektu.

## Moduły („pluginy")

Każdy moduł ma własny branch, własną bazę PostgreSQL i własne API.
Moduły nie sięgają do cudzych tabel.

| # | Moduł | Branch | Baza | Zakres | Stan |
|---|-------|--------|------|--------|------|
| 1 | Sklep z kursami | `plugin-1-sklep-kursow` | `db1_kursy` | katalog `/szkolenia`, strona sprzedażowa kursu, kreator kursów, dziennik zmian (audyt CRUD) | 🔨 B1–B6 ✓, treść D7 kompletna (91 scenariuszy, golden treści); zostaje: kursy złożone w narzędziu + B7 |
| 2 | Płatności | `plugin-2-platnosci` | `db2_klienci` | bramka płatności (adapter operatora), zamówienia, wysyłka kursu i potwierdzenia na e-mail | 🔒 po module 1 |
| 3 | Panel admina | `plugin-3-admin-panel` | `db3_monitoring` | podstrona tylko dla admina, log logowań (kto, kiedy, skąd), timer wizyt na stronie | 🔒 po module 2 |

Szczegóły — schematy tabel, podstrony, kryteria ukończenia — w
[docs/PLAN.md](docs/PLAN.md).

## Stack

Prototyp budujemy na stacku strony głównej; produkcyjnie (decyzja zespołu
2026-08-18) sklep zostanie przepisany na **wtyczkę WordPress (PHP + MySQL)**
— prototyp jest wtedy specyfikacją wyglądu i zachowania 1:1.

| Warstwa | Technologia (prototyp) | Docelowo (etap WP) |
|---|---|---|
| Framework | Next.js 16 — App Router, **z serwerem** (API routes / Server Actions) | wtyczka WordPress (PHP) |
| Język | TypeScript (`strict`) | PHP |
| UI | React 19 + Tailwind CSS 4, design dziedziczony ze strony głównej Automatic AI | ten sam design, szablony wtyczki |
| Bazy | PostgreSQL ×3 (lokalnie podman) | MySQL (hosting WP), migracja danych skryptem |
| Walidacja | Zod na granicach API | sanitizacja/walidacja WP |
| Hosting | localhost (dev) | wykupiony hosting z WordPressem + domena |

## Wytyczne projektu

Wiążące zasady od właściciela — pełna treść w [docs/WYTYCZNE.md](docs/WYTYCZNE.md):

- **naprawa wsteczna `.bak`** — błąd z przeszłości naprawiamy z migawki
  (gałąź `bak/…`), bez kolizji, z wpisem do [rejestru błędów](rejestr/znane-bledy.json)
  i nowym strażnikiem przeciw nawrotom;
- **statusy GitHuba są wiążące** — czerwone CI/audyt = stop, żadnego merge;
- **goldeny** — wzorcowe wyniki chronią naprawy przed psuciem reszty,
  a agentów przed spadkiem jakości;
- **każdy agent ma krytyka** — nigdy agent sam;
- **każdy dział dostaje oryginalną dokumentację techniczną** pobraną z sieci
  (`docs/dokumentacja-techniczna/<dział>/`);
- **weryfikacja co każdy krok** — workflow Weryfikacja-PR poniżej.

## Jak tu się pracuje

Pełny opis: [CONTRIBUTING.md](CONTRIBUTING.md). W skrócie — **Weryfikacja-PR**:

```
branch → commit → push → PR → CI zielone → merge → (release, deploy gdy potrzebne)
```

- każdy większy krok kończy się tagiem `vX.Y.Z` i releasem na GitHubie,
- wersję i historię trzyma [CHANGELOG.md](CHANGELOG.md),
- README jest aktualizowane przy każdym kroku, który zmienia stan projektu
  — pilnuje tego strażnik wersji.

## Skrypty

Codzienne — opisane pytaniem, na które odpowiadają:

| Komenda | Na jakie pytanie odpowiada |
|---|---|
| `npm run dev` | jak wygląda strona teraz? → `http://localhost:3001/szkolenia` |
| `npm test` | czy logika modułów działa? (**sam podnosi bazę**, gdy kontener leży — pretest `tools/db1-gotowa.mjs`) |
| `npm run build` | czy produkcyjny build w ogóle przechodzi? |
| `npm run check` | czy WSZYSTKO naraz jest zdrowe? — jedna bramka: strażnicy → lint → tsc → testy → build → wszystkie smoke'i (to, co przechodzi CI, jedną komendą; praktyka z repo strony głównej) |
| `npm run smoke` | siedem smoke'ów po kolei (d4 → d5 → d6 → lekcje → csp → podgląd → seo, kolejność jak w CI — dwa ostatnie nadpisują `out/`); wymaga wcześniejszego `npm run build` i bazy |
| `npm run build:podglad` | jak wygląda podstrona jako STATYCZNE pliki? → `out/` (katalog i strony kursów z bazy w czasie builda, **bez kreatora i AJAX-a**; po buildzie: rozszerzenia miniatur OG i wstrzyknięcie polityki CSP — dlatego zawsze ta komenda, nigdy `next build` wprost) |
| `npm run deploy:podglad` | opublikuj podgląd na GitHub Pages (wymaga czystego drzewa i działającej bazy) |
| `npm run start` | jak strona zachowuje się na produkcyjnym serwerze? (`:3001`) |
| `npm run lint` | ESLint |
| `npm run db1:up` | postaw kontener bazy (podman compose) |
| `npm run db1:migruj` | doprowadź schemat bazy do aktualnego stanu (sha256 w `_migracje`) |
| `npm run db1:seed` | odtwórz oba kursy od zera: program (lustro bazy) + sekcje sprzedażowe. **UWAGA: najpierw KASUJE kursy o tych slugach**, czyli razem z prozą 73 lekcji — po nim trzeba wgrać treść `npm run db1:tresc` |
| `npm run db1:sekcje` | wgraj do bazy SAME sekcje sprzedażowe z seeda — bez programu i bez prozy. Do poprawek treści sprzedażowej; `db1:seed` do tego **nie służy**, bo zaczyna od skasowania kursu. **Po każdym przebiegu uruchom `npm run wp:import`**: sekcje podmieniają się parą DELETE + INSERT, więc dostają nowe identyfikatory, a WordPress zostaje ze starymi |
| `npm run db1:tresc` | wgraj prozę lekcji z `tresc-kursow/**/proza-*.md` do bazy — drogą kreatora (jedyny AJAX); `-- --sprawdz` sam sprawdza, nic nie wysyła |
| `npm run wp:eksport` | zrzuć oba kursy z Postgresa do `eksport-wp/kursy.json` (format 2: nazwa pola = nazwa kolumny) |
| `npm run wp:import` | przenieś kursy do tabel wtyczki WordPressa: eksport → kopia do kontenera → `wp aai-sklep import`. **Jedna komenda dla człowieka i dla skryptu** — rozjazd tych dwóch dróg kosztował nas już wydanie (0.24.0, BLAD-012) |
| `npm run wp:sprawdz` | czy obie bazy niosą tę samą treść? — porównuje Postgres z MySQL wtyczki, lekcja po lekcji (`sha256`), i kończy się kodem wyjścia |
| `npm run wp:sync` | kopiuje kursy z naszych tabel do wpisów Tutor LMS — normalnie robi to sam zapis w kreatorze, ta komenda jest do pierwszego wypełnienia i do naprawy po awarii |
| `npm run wp:sync-platnosci` | zakłada produkty WooCommerce z naszych cen i wiąże je z kopiami kursów w Tutorze (Plugin 2) — **czwarta komenda odtworzenia środowiska**: import wystrzeliwuje zapis kursu, ZANIM powstanie kopia w Tutorze, więc produkty zostają wtedy szkicami i to ta komenda je domyka |
| `npm run wp:tutor` | czy kopia w Tutorze zgadza się z naszymi tabelami? — wypisuje rozjazdy, sieroty po skasowanych lekcjach i wpisy zrobione poza kreatorem; kończy się kodem wyjścia |
| `npm run wp:zrzuty` | wgrywa 148 zrzutów z lekcji do biblioteki mediów WordPressa (idempotentnie, po `sha256`); renderer podmienia ścieżkę z prozy na adres załącznika dopiero przy wyświetlaniu, więc treść w bazie zostaje nietknięta |
| `npm run wp:proza` | dowód różnicowy renderera: te same 73 lekcje przez PHP wtyczki i przez `marked` z podglądu — tekst musi zgadzać się CO DO SŁOWA, struktura co do znacznika (wymaga riga z `marked`) |
| `npm run wp:klient` | zakłada konto **klienta** (`klient-test`, rola `subscriber`, pasek narzędzi zgaszony) i zapisuje je na wszystkie opublikowane kursy — do testu ręcznego W6, bo administrator widzi materiał z definicji i testowałby nie to pytanie; hasło ląduje w `wordpress/srodowisko/.env` (poza gitem), a dostęp jest weryfikowany w OSOBNYM żądaniu, bo Tutor trzyma zapisy w pamięci żądania. `--usun` kasuje konto po teście |
| `npm run smoke:wp` | czy warstwa zapisu wtyczki znosi przestawianie kolejności, przenoszenie lekcji między modułami i odmawia skasowania napisanej treści? (wymaga `wordpress/srodowisko/postaw.sh`; poza CI — tam nie ma podmana) |
| `npm run smoke:wp-front` | czy `/szkolenia` i `/szkolenia/<slug>` na WordPressie pokazują to, co jest W BAZIE? — tytuły, ceny, moduły i lekcje, sekcje sprzedażowe, kanonik i dane strukturalne, 404 na nieistniejącym kursie, 301 z `/courses/*`, pozycja „Szkolenia" w obu nawigacjach motywu, a „Moje kursy" i „Moje konto" NIE pokazują się gościowi (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |
| `npm run smoke:wp-motyw` | czy wszystko wygląda jak motyw? — mierzy w prawdziwej przeglądarce **dziewięć stron** (katalog, strona kursu, widok lekcji, „Moje kursy", konto WooCommerce, dwie strony Tutora oraz — z produktem kursu w koszyku gościa i blokadą sprzedaży otwieraną wyłącznie na czas pomiaru — koszyk `/koszyk/` i kasę `/kasa/`): nachodzenie nagłówka, kontrast każdego napisu, jasne plamy i kolizje klas motywu z cudzym CSS-em (wymaga riga: `ZRZUTY_RIG` z `puppeteer-core`; poza CI) |
| `npm run smoke:wp-kreator` | czy kreator w kokpicie zapisuje to, co właściciel wpisał — i NIC poza tym? logowanie prawdziwą sesją, odmowa dla gościa i dla konta bez uprawnień, żądanie bez nonce'a, runda „zapisz → odczytaj" dla wszystkich 12 rodzajów sekcji (treść generowana z OPISU PÓL, więc nowe pole samo wchodzi do próby), zapis programu nietykający prozy 73 lekcji, odmowa skasowania napisanej treści bez jawnej zgody i brak wycieku materiału na publiczne strony (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |
| `npm run smoke:wp-tutor` | czy kopia kursu w Tutor LMS nadąża za KAŻDĄ drogą zapisu? — na własnym kursie: powstanie kopii, idempotencja, zmiana tytułu i kolejności, treść lekcji co do znaku, publikacja, skasowana lekcja bez sieroty, usunięcie całego kursu; do tego trzy testy negatywne (ręczna zmiana w Course Builderze, sierota, wpis spoza kreatora) i dowód, że synchronizacja NIE kasuje cudzych wpisów (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |
| `npm run smoke:wp-lekcja` | czy widok lekcji oddaje materiał TYLKO uprawnionym? — gość nie widzi ani zdania prozy (i dostaje zaproszenie), zalogowany widzi pierwszy i ostatni akapit z bazy, komplet sekcji, ikony bloków i zrzuty, które naprawdę się pobierają; do tego WSZYSTKIE 73 lekcje składają się bez zatrzymania renderera, a nawigacja i program prowadzą tam, gdzie mówią; menu zalogowanego z kursem ma „Moje kursy" i „Moje konto" (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |
| `npm run smoke:wp-panel` | czy panel wysyła to, co właściciel WIDZI na ekranie? — mierzy kolektor kreatora w prawdziwej przeglądarce (kontrolki nie mają atrybutu `name`, więc wysyłkę składa JavaScript i żaden smoke POST-owy jej nie dotyka): tytuł modułu bierze się z pola modułu, tytuły lekcji z pól lekcji, a zapis, przy którym niczego nie dotknięto, odpowiada „bez zmian”, nie rusza stanu kursu i nie dopisuje się do dziennika (wymaga `wordpress/srodowisko/postaw.sh` i riga z `puppeteer-core`; poza CI) |
| `npm run smoke:wp-platnosci` | czy fundament Pluginu 2 (`aai-platnosci`) trzyma się na żywej instalacji? — idempotentna aktywacja, ATOMOWY znacznik dostawy (duplikat = `false`), odmowa powiązania zajętego produktu z drugim kursem (B4), deaktywacja przestawiająca produkt na `draft` bez kasowania (L4), `wp aai-platnosci sprawdz` z kodem 1 bez tabel i kodem 0 przy wyłączonym Woo, migawka `monetize_by` z SUROWEJ bazy przed i po (filtr B17 maskowałby zmianę) ze sprzątaniem przez `sync --napraw`; smoke sprząta po sobie do zera (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |
| `npm run smoke:wp-produkty` | czy szew kurs → produkt WooCommerce trzyma się na żywej instalacji? — na WŁASNYM kursie testowym: produkt `publish` + `hidden` + cena z naszej tabeli, **KOLEJNOŚĆ powiązania mierzona hakiem na meta** (`price_type` przed `product_id` — odwrotna rozdaje kurs za darmo, B2), trzy przebiegi synchronizacji z niezmienionym `sha256` wiersza produktu z meta, przywracanie `_tutor_product` po CUDZYM zapisie (B13, z asercją wstępną `monetize_by = wc` — przy innym silniku test mierzyłby własny kod zamiast cudzego handlera), pięć stanów kursu z tabeli 9.3, kontrola z kodem 1 na siedmiu rodzajach rozjazdu i naprawa `_price` komendą `sync --napraw-cene` bez ruszania promocji, **tekst widoczny klientowi w kasie** (krótki opis i nazwa produktu z naszej tabeli, opis z backslashem zgodny CO DO ZNAKU — bez `wp_slash()` ginie `C:\Users`, a `sync` cofa cudzą edycję opisu) (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |
| `npm run smoke:wp-zakup` | czy ścieżka zakupu trzyma się na żywej instalacji? — na WŁASNYM kursie testowym: cena promocyjna z WooCommerce widoczna JEDNOCZEŚNIE na stronie, na karcie katalogu i w danych strukturalnych (K2), a cena w naszej tabeli nietknięta; cztery stany przycisku (kontakt / kasa z produktem / „Zamówienie w toku” / „Przejdź do kursu”) razem ze zgodną z nimi dostępnością oferty (`PreOrder` ↔ `InStock`); domykanie zamówienia obiema ścieżkami — `payment_complete()` i ręczne przestawienie na „w realizacji” — z DOSTĘPEM sprawdzanym osobnym żądaniem, przy czym zamówienie mieszane i zamówienie z samym cudzym produktem zostają w `processing`; powtórny zakup nie tworzy drugiego zapisu ani nie odbiera dostępu (B16) (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |, **koszyk trzyma JEDEN kurs** (BLAD-023: dwa kliknięcia „Dołączam” dawały w kasie sumę obu kursów) — mierzony prawdziwą sesją ciasteczkową przez Store API, z cudzym produktem w koszyku jako dowodem, że reguła nie rusza niczego poza naszymi kursami
| `npm run smoke:wp-jezyk` | czy klient płaci po polsku? — przechodzi w prawdziwej przeglądarce całą ścieżkę (kasa, koszyk, logowanie, **ekran ustawiania hasła z naszego maila**, konto, zamówienia, edycja danych, „Moje kursy”) i pada na każdej z 35 angielskich fraz zmierzonych przed naprawą (BLAD-024), plus tematy maili WooCommerce czytane z samego Woo, nie ze skrzynki; każda strona ma asercję zakresu, żeby pomiar nie przeszedł po stronie odmowy (wymaga `wordpress/srodowisko/postaw.sh`, konta `npm run wp:klient` i riga z puppeteer-core; poza CI) |
| `npm run smoke:wp-maile` | czy klient NAPRAWDĘ dostaje to, za co zapłacił? — wiadomości czytane z łapacza poczty (Mailpit), nie z podstawionego filtra: mail „Ustaw hasło” dokładnie raz i na adres KONTA (nie rozliczeniowy — B9), bez hasła w treści, z terminem ważności i z linkiem, który otwiera formularz hasła w naszym wyglądzie; mail WooCommerce „nowe konto” już NIE wychodzi (dwa klucze resetu unieważniają się nawzajem — B8); mail „kurs gotowy” dopiero po opłacie (bramka statusu sprawdzana wprost, na zapisie bez dostępu), jeden na ZAMÓWIENIE nawet przy dwóch kursach, i na ścieżce „admin klika Processing”, gdzie wysyłka jedzie z wnętrza odroczonego domknięcia; powtórzony hak nie wysyła drugi raz (B6); awaria wysyłki zapala kontrolę (kod 1), a ponowienie z wiersza poleceń ją gasi; przy płatności natychmiastowej idzie JEDEN mail (pominięcie maila 1 zapisane w dzienniku), przy padniętym mailu 2 mail 1 MUSI wyjść (K1), a rdzeń nie mailuje już admina o każdej zmianie hasła (wymaga `wordpress/srodowisko/postaw.sh` z łapaczem poczty; poza CI) |, **jeden nadawca poczty** (BLAD-025: powiadomienia rdzenia szły od `WordPress <wordpress@127.0.0.1>`, czyli z adresu, który na produkcji odpada na SPF) — mierzony na WYSŁANEJ wiadomości, z kontrprzykładem, że nadawcy ustawionego świadomie (wtyczka SMTP) nie nadpisujemy
| `npm run smoke:wp-zwroty` | czy klik „Refund” w panelu WooCommerce NAPRAWDĘ odbiera dostęp do kursu — sprawdzane na czterech drogach, którymi klient go widzi (zapis w Tutorze, `is_enrolled`, lista „Moich kursów”, treść lekcji), plus powrót przycisku do sprzedaży, ponowny zakup po zwrocie, anulowanie, zwrot CZĘŚCIOWY (dostępu NIE odbiera — zachowanie udokumentowane, nie usterka), mail Woo o zwrocie adresowany do klienta, odporność na zwrot cudzego produktu oraz niezmiennik 14 (kolejność powiązania B2 w dwóch scenach). Mechanizmu zwrotu NIE piszemy — ten smoke utrwala cudze zachowanie jako nasze wymaganie, żeby aktualizacja Tutora nie zabrała go po cichu (wymaga `wordpress/srodowisko/postaw.sh`; poza CI) |
| `npm run smoke:wp-monitor` | bramka fundamentu Pluginu 3: czy tabela RUCHU jest naprawdę anonimowa (kolumny czytane z `DESCRIBE`, nie ze źródła — między jednym a drugim stoi `dbDelta`), czy porażka logowania zostawia `user_id` NULL zamiast zera udającego konto, czy czas ponad sufitem jest PRZYCINANY (nie odrzucany), czy moment wejścia liczy SERWER, czy retencja ma dwa wyzwalacze, czy `sprawdz` ma kod 1 przy awarii w kanale błędów i **nie zmienia ani jednego wiersza** (N16 mierzone licznikami, nie czytane z kodu), czy ekran wpuszcza admina a odmawia klientowi i gościowi, czy w oddanym HTML-u nie ma formularza POST ani nonce'a czy kotwica cudzej pozycji „Automatic AI” dalej celuje w `page=aai-sklep`, a od T2 także TRZY ŚCIEŻKI DZIENNIKA mierzone na żywo: logowanie formularzem daje DOKŁADNIE JEDEN wiersz ze źródłem „formularz” (dwa znaczyłyby zepsuty dedup pary haków), zły login zostawia wiersz „nieudane” z podanym loginem, a auto-login z kasy WooCommerce — wiersz „sesja” (bez tego haka ścieżka każdego nowego klienta byłaby dla dziennika niewidzialna); do tego hasło nie występuje w ŻADNYM wierszu przebiegu i przy dzienniku schowanym `RENAME`-em logowanie ma dalej działać, a kontrola świecić kod 1 (wymaga `wordpress/srodowisko/postaw.sh` i konta `npm run wp:klient`; poza CI) |

> [!NOTE]
> **Baza nie jest źródłem prawdy — jest kopią roboczą, z której renderuje
> się strona.** Źródłem prozy są pliki `tresc-kursow/**/proza-*.md` (decyzja
> właściciela 2026-08-19), a programu i sekcji sprzedażowych —
> `tools/seed/seed-przyklady.ts`. Utrata wolumenu bazy nic nie kosztuje:
> `db1:migruj` → `db1:seed` → `db1:tresc` odtwarzają całość z repo.
> Dlatego poprawki idą NAJPIERW do repo, dopiero stamtąd do bazy.

Narzędzia uruchamiane ręcznie:

| Komenda | Co sprawdza / robi |
|---|---|
| `node tools/straznicy/uruchom-wszystkie.mjs` | wszyscy strażnicy naraz (runner sam znajduje pliki `straznik-*.mjs`) |
| `ZRZUTY_RIG=<katalog> node tools/zrzuty/test-asercji.mjs` | 15 testów bramek rigu zrzutów (asercja treści i prywatność — BLAD-016). Rig to katalog spoza repo z `puppeteer-core`, `sharp`, `@xterm/xterm` i `@xterm/addon-serialize`; przeglądarka jest systemowa (`/usr/bin/firefox`), więc nic się nie pobiera. Bez `ZRZUTY_RIG` testy padają na braku rigu, nie na kodzie |
| `ZRZUTY_RIG=<katalog> node tools/podglad-kursow.mjs --wyjscie <katalog poza repo>` | składa **widok treści kursu** — to, co klient dostaje PO zakupie — z tych samych plików `tresc-kursow/`, przez tę samą funkcję, którą wgrywarka wysyła lekcje do bazy. Wygląd w design systemie „Volt”, tokeny 1:1 z `app/globals.css`; arkusz i szablony mieszkają w [tools/podglad-kursow/](tools/podglad-kursow/) — `styl.css` jest zwykłym plikiem CSS, żeby dało się go przenieść do szablonów Tutora przez skopiowanie. Rig potrzebuje tylko `marked`. **Katalog wyjściowy MUSI być poza repo** — narzędzie odmawia zapisu do drzewa projektu, bo `public/` wchodzi w całości do eksportu statycznego (klasa BLAD-007), a treść kursu jest towarem |
| `PODGLAD_KURSOW=<katalog> node tools/straznicy/straznik-podgladu-kursow.mjs` | sprawdza WYGENEROWANY podgląd kursów (odsyłacze, wymiary obrazów, podpisy, klikalność, komplet wobec źródła). Bez wskazanego katalogu szuka `/tmp/podglad-kursow`; bez podglądu pomija się zamiast kłamać zielenią |
| `node tools/zrzuty/manifest.mjs` | stan przelotu zrzutów ekranu w kursach — liczony z prozy, nie z osobnej listy (brief: [docs/plugin-1/PRZELOT-ZRZUTOW.md](docs/plugin-1/PRZELOT-ZRZUTOW.md)) |
| `node tools/smoke/smoke-d4.ts` | katalog renderuje kursy z bazy na produkcyjnym serwerze + golden + nagłówki bezpieczeństwa |
| `node tools/smoke/smoke-d5.ts` | strona sprzedażowa renderuje pełny kurs z bazy + golden programu |
| `node tools/smoke/smoke-d6.ts` | brama kreatora (403), wystrzał AJAX z ciastka, cykl szkic → publikacja → usunięcie, **brama tempa**: seria chybionych tokenów → 429 z `Retry-After`, a poprawny token z tego samego adresu przechodzi, **sufit ciała**: 413 dla żądania ponad 2 MB — także bez `content-length` |
| `node tools/smoke/smoke-seo.ts` | SEO na zbudowanych plikach: robots/sitemapa spójne z przełącznikiem, kanonik = własny adres, jeden `h1`, obraz OG istnieje, **dane strukturalne zgodne z bazą** (cena, tytuł, liczba modułów) |
| `node tools/smoke/smoke-csp.ts` | polityka CSP na ARTEFAKCIE: nagłówek z jednorazowym nonce'em na każdej trasie HTML (także 404 — prerender zostawiłby skrypty bez nonce'a), zero słów unieważniających ochronę w `script-src`, komplet hashy skryptów w plikach podglądu (buduje sam) |
| `node tools/smoke/smoke-podglad.ts` | statyczny podgląd: szkic NIE wycieka do publicznych plików, kreator i AJAX nieobecni, `basePath` spójny (buduje sam) |
| `node tools/pobierz-dokumentacje-d7.mjs` | odtwarza 55 MB dokumentacji źródłowej kursów (jest poza gitem) |
| `node tools/wyciag-zrodla.mjs --do <kat> <plik…>` | odchudza źródło do prozy i tabel przed pisaniem scenariusza |
| `node tools/straznicy/straznik-goldenu-tresci.mjs --zapisz "powód"` | świadoma regeneracja goldenu treści (wymaga podania powodu) |
| `node tools/straznicy/audyt-straznikow.mjs` | czy strażnicy NAPRAWDĘ łapią to, co deklarują (mutacje + kontrprzykłady; chwilowo psuje pliki, więc tylko ręcznie) |

> [!NOTE]
> Kody wyjścia smoke'ów sprawdzaj bez potoku — `node skrypt \| tail`
> maskuje kod wyjścia (lekcja z Działu 5, potwierdzona ponownie przy
> nagłówkach bezpieczeństwa: smoke „wyglądał na zielony", a padał).

## Strażnicy i CI

Zasada przejęta ze strony głównej Automatic AI: *kontrola jest warta tyle, ile jej
podpięcie*. Runner `tools/straznicy/uruchom-wszystkie.mjs` sam wykrywa
każdy plik `straznik-*.mjs` — nowego strażnika nie da się „zapomnieć podpiąć".

> [!TIP]
> Zielona bramka nic nie znaczy, dopóki nie sprawdzisz, że umie zapalić
> się na czerwono. `node tools/straznicy/audyt-straznikow.mjs` psuje repo na
> 255 sposobów (mutacje + kontrprzykłady „strażnik ma milczeć”)
> i oczekuje właściwej reakcji. Pierwsze uruchomienie znalazło realną
> dziurę: po wycięciu kroku lint z CI `straznik-ci` dalej był zielony,
> bo jego wzorzec `eslint` pasował do… filtra ścieżek w nowym jobie
> „Zakres zmian". Reguła: dopisujesz strażnika → dopisujesz mutację.

| Kontrola | Gdzie działa | Co łapie |
|---|---|---|
| `straznik-wersji` | pre-commit + CI | rozjazd wersji README ↔ CHANGELOG |
| `straznik-linkow` | pre-commit + CI | martwe linki względne w Markdown |
| `straznik-licencji` | pre-commit + CI | brak/podmiana LICENSE (MIT), brak deklaracji w README, brak noty OFL przy plikach fontów |
| `straznik-granic` | pre-commit + CI | klient SQL / connection string poza `modules/`, importy między modułami, import z bebechów modułu (BAZA → DZIAŁ → STRONA) |
| `straznik-ci` | pre-commit + CI | package.json bez kroków `npm ci` → lint → tsc → build → test w CI |
| `straznik-migracji` | pre-commit + CI | migracje SQL z dziurą w numeracji albo zmienione po fakcie (sha256 ↔ MANIFEST.json) |
| `straznik-ajax` | pre-commit + CI | drugi endpoint AJAX modułu albo endpoint poza działem (WYTYCZNE §8: jedna baza = jeden wystrzał) |
| `straznik-fontow` | pre-commit + CI | import pakietu `geist` (psuł hydratację — BLAD-001); fonty tylko przez next/font/local |
| `straznik-fixed` | pre-commit + CI | `transform`/`filter` w klasie opakowującej treść — łamie `position: fixed` potomków (BLAD-003); a także animacja z wypełnieniem `forwards`/`both`, która zostawia trwały kontekst układania i chowa te elementy pod stopką (BLAD-004) |
| `straznik-odmiany` | pre-commit + CI | ręczna odmiana polskich liczebników (ternar „kurs"/„kursy") zamiast `lib/odmiana.ts` — dwie formy nie wystarczą, polski ma trzy |
| `straznik-kreatora` | pre-commit + CI | pole lub rodzaj sekcji, który strona kursu potrafi wyrenderować, a kreator nie pozwala go wypełnić (rozjazd `SCHEMATY_SEKCJI` ↔ opis pól panelu, także w polach zagnieżdżonych) |
| `straznik-hydratacji` | pre-commit + CI | wzorce psujące hydratację Reacta (rozjazd HTML serwera i klienta) |
| `straznik-scenariuszy` | pre-commit + CI | scenariusz lekcji D7 bez kompletnej metryki, ze wskazaniem na nieistniejący plik cytatów albo źródła, bez którejś z pięciu sekcji, bez ani jednej narracji do kamery, z tabelą „Zgodność ze źródłem" krótszą niż 8 wierszy albo ze śmieciami po zapisie pliku (`</content>`, `</invoke>` poza blokiem kodu — BLAD-008); warunek bezpieczeństwa dla równoległego pisania treści |
| `straznik-odsylaczy-kursu` | pre-commit + CI | wierność WŁASNEMU kursowi: odsyłacz „lekcja N.M" do lekcji, której nie ma, albo temat przypisany do złego modułu (finał Kursu 2 pomylił trzy — mapa tematów czyta się z metryk lekcji, więc nie starzeje się) |
| `straznik-goldenu-tresci` | pre-commit + CI | CICHA utrata treści kursów: suma kontrolna + bajty/wiersze/sceny/wiersze zgodności każdej z 91 lekcji przeciw `goldeny/d7-tresc.json`; różnica pokazywana per pole, regeneracja wymaga powodu |
| `straznik-podgladu` | pre-commit + CI | statyczny podgląd zabierający ze sobą panel właściciela: trasa kreatora lub AJAX bez wariantu `serwer.*`, wariant `statyczny.*` bez pary, pomieszane listy `pageExtensions`, brama kreatora nieodcinająca się w podglądzie (build z tokenem wypisałby SZKICE do publicznych plików) oraz drugie miejsce czytające `PODGLAD_STATYCZNY` |
| `straznik-podgladu-kursow` | pre-commit + CI (warunkowo) | usterki w WYGENEROWANYM widoku treści kursu — tym, co klient dostaje po zakupie: martwy odsyłacz (strona wejściowa bez fontu — `../zasoby/` z korzenia celowało poza katalog wyjściowy), `<img>` bez `width`/`height` (148 zrzutów przesuwałoby treść, a README obiecuje CLS = 0), podwójna ucieczka w podpisie (`&amp;quot;` widoczne jako tekst), lekcja bez odsyłacza ze spisu albo bez powrotu do spisu, liczba stron/zrzutów rozjechana ze źródłem. Wymaga wygenerowanego podglądu (`marked` z riga); bez niego mówi wprost, że pominął — jak `straznik-scenariuszy` bez dokumentacji D7 |
| `straznik-csp` | pre-commit + CI | osłabienie polityki bezpieczeństwa treści: `script-src` bez nonce'a lub bez `strict-dynamic`, `unsafe-inline`/`unsafe-eval` w skryptach, brak dyrektywy zamykającej we wspólnej polityce, `proxy.ts` zamiast `proxy.serwer.ts` (wywraca build podglądu), nazwany eksport zamiast domyślnego (Next 16 go nie widzi), podgląd bez kroku wstrzykującego politykę albo z krokiem w złej kolejności (martwe hashe), nasz `<script>` bez `nonce`, druga polityka w `next.config.ts` |
| `straznik-limitera` | pre-commit + CI | brama AJAX bez kosztu: jedyny wystrzał bez limitu tempa (albo z limitem sprawdzanym dopiero PO sparsowaniu ciała) lub bez OSOBNEGO licznika chybionych uwierzytelnień, odmowa bez 429 z `Retry-After`, chybione uwierzytelnienie bez kary czasowej, logowanie bez limitu prób, dyspozytor porównujący token operatorem `===` zamiast w stałym czasie albo tracący samowystarczalność (import z `lib/`), limiter wciągający `next/*` (przestaje dać się testować jednostkowo), znikające ostrzeżenie o podrabianiu `x-forwarded-for` |
| `straznik-limitow` | pre-commit + CI | pole wejścia bez górnej granicy: `z.string()`, `z.array(` albo `z.url()` bez `.max(` w kontraktach WEJŚCIA (kanał odczytu świadomie pominięty), cena bez sufitu (kolumna `integer` wywaliłaby się surowym błędem bazy), token bez limitu długości, treść sekcji zapisywana bez oczyszczania schematem (jeden nieznany klucz omija wszystkie limity), trasa bez odpowiedzi 413, `request.json()` zamiast czytania strumieniem z licznikiem, sufit ciała sprawdzany po parsowaniu, surowy komunikat Postgresa w odpowiedzi, brak testów limitów |
| `straznik-seo` | pre-commit + CI | ciche zniknięcie SEO: widok bez kanonika lub bez OpenGraphu, własny blok `application/ld+json` z pominięciem ucieczki znaków (treść z `</script>` zamknęłaby blok skryptu), drugie miejsce czytające przełącznik indeksowania (rozjazd metatagu z `robots.txt`), obraz OG bez `contentType`/`size`, układ bez `metadataBase` |
| `straznik-obietnic` | pre-commit + CI | strona sprzedażowa obiecująca coś spoza produktu: liczba modułów, lekcji, minut albo zrzutów rozjechana z programem kursu, obietnica wideo w kursie TEKSTOWYM (decyzja 2026-08-19), zawyżona obietnica podzbioru („prompty w N lekcjach”, „N lekcji z pytaniami do wykonawcy”) — klasa wykryta audytem 2026-08-24, gdy publiczny podgląd obiecywał „7 modułów wideo (31 lekcji)” przy 6 modułach i 41 lekcjach |
| `straznik-sciezek` | pre-commit + CI | adres URL pliku użyty jako ścieżka systemowa: sklejka `file://${process.argv[1]}` i `.pathname` z `new URL(…, import.meta.url)`. W katalogu ze spacją (`Pod strona Szkolenia `) narzędzie milczy z kodem 0 albo nie znajduje własnych plików — tak zamilkł `manifest.mjs`, jedyne źródło prawdy o stanie zrzutów (BLAD-014) |
| `straznik-readme` | pre-commit + CI | README kłamiące o stanie repo: strażnik bez wiersza w tabeli (i martwe wiersze), skrypt npm poza sekcją „Skrypty", zła liczba scenariuszy, kotwica spisu treści donikąd — złapał własną nieobecność w tej tabeli przy pierwszym uruchomieniu |
| `straznik-wagi-dokumentacji` | pre-commit + CI | masa dokumentacji producentów (55 MB, ~2200 plików) wpuszczona do gita — także przez `git add -f`; git trzyma każdą wersję na stałe, więc pomyłka jest nieodwracalna |
| `straznik-tresci-lekcji` | pre-commit + CI | materiał kursu wychodzący zza bramki: wspólny odczyt strony wybierający z lekcji `content`/`materials` (wyciek treści 91 lekcji do publicznego HTML-a katalogu i strony sprzedażowej) albo kontrakt `LekcjaKursu` z polem treści; pełny tekst oddaje wyłącznie `trescLekcji()` |
| `straznik-frontu-wp` | pre-commit + CI | front wtyczki bez ochron, których brak nie objawia się błędem: rodzaj sekcji z kontraktu bez szablonu albo POLE kontraktu, którego żaden szablon nie renderuje (treść wpisana kreatorem, której klient nie zobaczy), sekcja poza listą renderowanych (szablon istnieje, ale nikt go nie woła — i tak samo milczą dane strukturalne), wstrzyknięcie pozycji menu zakotwiczone na klasie Tailwinda zamiast na treści (motyw jest GENEROWANY, więc klasy się zmienią i pozycja zniknie po cichu), brak rezerwy miejsca pod nagłówek `fixed` motywu (72 px, którego motyw pod siebie nie rezerwuje), element `position: fixed` emitowany wewnątrz `<main>` (BLAD-003/004 — przodek z transformacją odbiera mu ekran jako układ odniesienia), brak trwałego 301 z `/courses/*` oraz klasa z animacją bez wygaszenia w `prefers-reduced-motion` |
| `straznik-kreatora-wp` | pre-commit + CI | kreator w kokpicie bez ochron, których brak nie objawia się błędem: pole z kontraktu prototypu nieznane kontraktowi wtyczki (właściciel nie ma go czym wypełnić, a odczyt po cichu je odsieje), pole bez ETYKIETY (panel rysuje się z tej samej tablicy, więc wyglądałoby jak klucz bazy), rodzaj sekcji poza kolejnością panelu, akcja `admin-post` bez nonce'a albo bez uprawnienia (jedno bez drugiego to otwarte drzwi) i akcja zarejestrowana dla niezalogowanych, pole treści lekcji bez opisu, **zapis programu nierozróżniający braku klucza `content` od pustki** (jedno kliknięcie „Zapisz kurs" czyściłoby prozę wszystkich lekcji i meldowało sukces), adres pola treści sprawdzany funkcją od WYCHODZĄCYCH żądań (BLAD-017 — link do niekupionej domeny znikał ze strony) oraz szablon frontu sięgający po treść lekcji |
| `straznik-wtyczki-wp` | pre-commit + CI | wtyczka WordPressa bez ochron, których brak nie objawia się błędem: plik PHP wykonywalny wprost z przeglądarki (bez `ABSPATH`), nazwa tabeli wklepana na sztywno zamiast jednego źródła, odinstalowanie kasujące treść kursów bez jawnej zgody, WARTOŚĆ wklejona do SQL-a zamiast przez `prepare()` (nazwę tabeli wolno — to identyfikator z kodu), kolumna treści jako `text` (65 kB — MySQL utnie dłuższą lekcję w milczeniu) oraz **zapis do naszych tabel z pominięciem warstwy zapisu** — tam mieszkają transakcja, dziennik audytu i odmowa skasowania napisanych lekcji, a zapis obok nich niczego nie zgłasza |
| `straznik-platnosci-wp` | pre-commit + CI | Plugin 2 (`aai-platnosci`) łamiący zaakceptowany schemat w sposób, który NIE objawia się błędem: własny AJAX (decyzja właściciela 2026-08-28: zero `wp_ajax_*`), własna trasa zamiast `PODSTRONY` Pluginu 1 (BLAD-021), droga powrotna do danych Pluginu 1 (koniec jednokierunkowości ceny), kasowanie produktu WooCommerce (produkt kupiony to historia zamówień), cena zapisana metą zamiast `set_regular_price()+save()` (kasa liczyłaby STARĄ cenę, a kontrola tego nie widzi), `_sale_price` w jakiejkolwiek formie, słuchacz haków `aai_sklep_*` bez `catch(Throwable)`, zapis produktu poza warstwą zapisu, **odwrócona kolejność powiązania z Tutorem** (`product_id` przed `price_type` — w stanie pośrednim Tutor uznaje kurs za darmowy i rozdaje dostęp bez zapłaty), produkt rodzący się jako `publish` (kupowalny, zanim powstanie powiązanie) oraz produkt widoczny w katalogu Woo (druga ścieżka zakupu w cudzym wyglądzie) |
| `straznik-tutora` | pre-commit + CI | kopia kursu w Tutor LMS bez ochron, których brak NIE objawia się błędem: synchronizacja niepodpięta w pliku głównym (kod żyje, ale nikogo nie słucha), droga POWROTNA z Tutora do naszych tabel (dwa źródła prawdy zamiast jednego), droga zapisu, która nie ogłasza zmiany (poprawiona proza nie dojedzie do materiału za logowaniem), wpisy Tutora ruszane poza jednym miejscem, `update_post_meta` bez `wp_slash` (WordPress zjada backslashe), spłaszczenie sekcji bez asercji (JSON wyjeżdża na stronę dla człowieka) oraz słuchacz bez `catch` — awaria cudzej wtyczki nie ma prawa wywalić właścicielowi zapisu własnej treści |
| `straznik-higieny-smokow` | pre-commit + CI | bramka, która sprząta CUDZE albo nie sprząta po sobie — w skrzynce łapacza poczty wspólnej z właścicielem: hurtowe kasowanie (`DELETE /api/v1/messages` bez listy `IDs` znaczy u Mailpita „skasuj wszystko”), brak migawki i sprzątania w bramce, która składa zamówienia albo zakłada konta, brak rozliczenia się ze skrzynki i z zapisów na kursy liczonych GLOBALNIE (kasowanie zamówienia NIE kasuje zapisu w Tutorze — tak przeżył wpis #2153), a sam moduł `tools/smoke/poczta.mjs` sprawdzany URUCHOMIENIOWO podstawionym `fetch`: pusta lista nie wysyła żądania kasującego, kasowane są wyłącznie identyfikatory spoza migawki, a niepełny odczyt zatrzymuje przebieg. **Od kroku T2 to samo dla DZIENNIKA LOGOWAŃ** (`tools/smoke/dziennik.mjs`): bramka, która się loguje, zostawia w nim wpisy, więc musi wziąć migawkę, posprzątać i rozliczyć się z liczby wierszy. Bramki rozpoznajemy po zachowaniu ORAZ z listy zmierzonych — `smoke-wp-zakup` i `smoke-wp-produkty` nie logują się ani jedną własną instrukcją, bo sesję zakłada im WooCommerce w środku składania zamówienia, więc żaden wzorzec czytający nasz plik ich nie widzi |
| `straznik-monitora-wp` | pre-commit + CI | Plugin 3 (`aai-monitor`) przestający być modułem, który tylko PATRZY — a każde z tych złamań jest ciche, bo ekran dalej się otwiera: akcja zapisu albo nonce w module monitoringu (N1), kontrola `sprawdz()` lub klasa odczytu, które PISZĄ (N16 — kontrola naprawiająca po drodze nie umie powiedzieć, jaki był stan przed nią), zapis do cudzej mety/wpisu albo podmiana funkcji pluggable (N14), kolumna `ip`/`login`/`agent`/`user_id` w tabeli RUCHU (N7 — anonimowy pomiar zamienia się w profilowanie, decyzja D3), sięgnięcie po hasło z żądania (N5 — dziennik zapisuje kto i skąd, nigdy czym), cichy `catch ( Throwable )` w warstwie zapisu (N15 — uszkodzona tabela udaje pustą listę, czytaną jako „nikt nie próbował”), brak DRUGIEGO wyzwalacza retencji przy renderze ekranu (P7 — przy ciszy adresy IP żyją dłużej, niż obiecuje polityka prywatności) oraz ekran twierdzący, co zbiera, zamiast pytać o zameldowane czujki (P13). Od T2 dochodzą cztery reguły o samych hakach: handler biegnący w CUDZYM żądaniu bez `catch ( Throwable )` (N4 — wyjątek z haka `set_logged_in_cookie` wychodzi z kasy WooCommerce, czyli daje HTTP 500 i przerwany zakup), hak `wp_login` dopisujący drugi wiersz zamiast doprecyzować pierwszy (N2 — każde logowanie liczone podwójnie), zdjęta rejestracja któregokolwiek z trzech haków (N2/N3 — po `set_logged_in_cookie` znika ścieżka każdego nowego klienta) i producent, który przestał meldować czujkę (P13 — ekran twierdzi „nic nie zbiera” przy działających hakach) |
| `straznik-lekcji-wp` | pre-commit + CI | widok lekcji — czyli TOWAR — bez ochron, których brak nie objawia się błędem: niepodpięty widok (klient dostaje stronę Tutora), dostęp sprawdzany własną regułą zamiast pytaniem do Tutora, treść składana PRZED bramką (materiał wczytany dla każdego), renderer bez działającej asercji na nieprzetworzony Markdown albo z asercją nieomijającą bloków kodu (kurs o GitHubie uczy Markdownu), skład nieuciekający treści, zrzuty bez `width`/`height` oraz reguła arkusza lekcji bez zakotwiczenia w klasie strony — nasze reguły stoją poza warstwami kaskady, więc sięgnęłyby na cudze strony |
| `straznik-prozy` | pre-commit + CI | proza lekcji dla klienta (`tresc-kursow/**/proza-*.md`) bez kompletnego frontmatteru zgodnego ze ścieżką, bez tabeli „Zgodność ze źródłem" o wymaganej głębokości, poza limitami kontraktu `TrescLekcji`, bez odpowiadającego jej scenariusza, ze znacznikami nagrania (`[EKRAN]`, `[NARRACJA]`) zamiast tekstu, z niedomkniętym znacznikiem `<!-- ZRZUT: … -->` albo ze śmieciami po zapisie pliku (BLAD-008) |
| `straznik-asercji` | pre-commit + CI | zrzut kursu bez maszynowej asercji treści: specyfikacja w `tools/zrzuty/spec/` bez niepustego `wymagaTekstu` albo z wyjściem poza `tresc-kursow/**/zrzuty/*.webp`, porównanie z `asercje.mjs` przepuszczające fragment nieobecny na ekranie (albo odrzucające zdanie pocięte ramką panelu), narzędzie zrzutu ruszające mimo braku asercji i asercja postawiona ZA zapisem obrazu — „zrzut powstał" ma znaczyć „zrzut zawiera to, co obiecuje podpis" |
| `straznik-progow` | pre-commit + CI | liczba w tabeli pomiarów wpisana „na oko": każda ocena w README musi zgadzać się co do jednostki z `goldeny/pomiary-lighthouse.json`, golden musi mieć metryczkę (narzędzie, data, adres, liczba przebiegów) i co najmniej 5 przebiegów, a wiersz tabeli i wpis w goldenie muszą istnieć oba naraz — wynik, który zniknął z dokumentacji, jest tak samo groźny jak zmyślony |
| blokada sekretów | pre-commit | pliki `.env`, tokeny/klucze w diffie |
| gitleaks (pinowany po SHA-256) | CI | sekrety w całej historii repo |
| blokada pusha na `main` | pre-push | zmiany na `main` poza PR-em |

CI: cztery joby — strażnicy i skan sekretów chodzą ZAWSZE; „Kod
aplikacji" (lint → tsc → build) i „Baza" (83 testy na osobnej bazie
`db1_kursy_test`, migracje, build, siedem smoke'ów) tylko gdy zmiana
dotyka kodu. Rozstrzyga job „Zakres zmian" zwykłym `git diff` — commit
czysto treściowy (większość commitów D7) nie pali minut na build.

> [!NOTE]
> Minuty Actions są wspólne dla całej organizacji (plan Free:
> 2000/mies. na repozytoria prywatne). W sierpniu 2026 limit padł —
> 2072 minuty, z czego 1753 zużyła strona główna — i każde zadanie
> „padało" 2 sekundy po starcie bez logów, co do złudzenia przypomina
> awarię kodu. Stąd `cancel-in-progress`, job „Zakres zmian"
> i `timeout-minutes` na każdym jobie. Diagnoza limitu:
> `gh api "/organizations/MatthewPlugins/settings/billing/usage"`.

## SEO i bezpieczeństwo

Stan utrzymywany w [docs/security-checklist.md](docs/security-checklist.md)
(legenda pięciostanowa: ✅ w kodzie z dowodem / 🟡 częściowo / 🔧 poza
repo / ⛔ nie dotyczy z powodem / ⏳ etap WP). Skrót:

| Obszar | Stan | Dowód |
|---|---|---|
| Walidacja wejścia i wyjścia (Zod na granicach, 400 z mapą pól) | ✅ | testy dyspozytora, `straznik-kreatora` |
| SQL tylko parametryzowany, tylko w `modules/` | ✅ | `straznik-granic` |
| Audyt mutacji w bazie (niezmienny changelog, triggery) | ✅ | testy migracji, golden schematu |
| Brama kreatora: ciastko HttpOnly, porównanie w stałym czasie, kara czasowa — **w OBU kanałach** (formularz i AJAX) od 0.27.0 | ✅ | smoke D6, `straznik-limitera` |
| Nagłówki: nosniff, X-Frame-Options DENY + `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy | ✅ | `next.config.ts`, **smoke D4 sprawdza je na żywym serwerze** |
| Sekrety: gitleaks (pełna historia, pinowany SHA-256), `.env` poza repo | ✅ | job CI „Skan sekretów" |
| Pełne CSP: `script-src` z jednorazowym nonce'em i `strict-dynamic`, bez `unsafe-inline` (tryb serwerowy nagłówkiem, podgląd statyczny przez `<meta>` z hashami) | ✅ | `straznik-csp` (9 niezmienników, 10 mutacji), **smoke CSP sprawdza nagłówek i pliki**, zero naruszeń w przeglądarce na 4 trasach |
| Ograniczanie tempa na akcjach zapisu (okno przesuwne po IP+akcja, 429 z `Retry-After`) | ✅ | `straznik-limitera` (11 niezmienników, 14 mutacji), 8 testów jednostkowych limitera, **smoke D6 wywołuje limit po HTTP** |
| Twarde limity wejścia (długości, liczności, sufit ceny, 2 MB na ciało żądania mierzone przed parsowaniem) i generyczne komunikaty błędów | ✅ | `straznik-limitow` (10 niezmienników, 12 mutacji), 5 testów limitów, **smoke D6 dowodzi 413 dwiema drogami** |
| HTTPS/HSTS, RODO, honeypot, konta klientów | ⏳/🔧 | specyfikacja wtyczki WP i decyzje hostingowe |
| SEO na stronie: `robots.txt`, sitemapa, kanoniki, OpenGraph + miniatury, JSON-LD (Organization, ItemList, Course+Offer, BreadcrumbList, FAQPage) | ✅ | `straznik-seo` (6 niezmienników, 6 mutacji), **smoke SEO porównuje dane strukturalne Z BAZĄ** |
| Pomiar narzędziami Google na żywym adresie | ✅ | desktop 100/100/100/100; mobile 96–97 wydajności = artefakt symulacji Lantern przyjęty decyzją właściciela (tabela i protokół niżej), reszta kolumn 100 |

> [!NOTE]
> Tabela mówi „✅" wyłącznie tam, gdzie stoi za tym strażnik, test albo
> smoke — deklaracja bez dowodu nie dostaje haczyka. Wpisywanie wyników
> „na oko" łamałoby zasadę zero zmyślania, tę samą, która obowiązuje
> treść kursów.

### Pomiar wydajności i SEO — protokół

Cel właściciela: **100 w każdej kolumnie**, mierzone narzędziami Google
na żywym adresie, a wynik wpisany tutaj tabelą.

**Liczby do tabeli robi PageSpeed Insights** (`tools/pomiar-psi.mjs`,
klucz API w `.env` jako `PAGESPEED_KLUCZ`), czyli Lighthouse uruchamiany
NA SERWERACH GOOGLE — **nie lokalny Lighthouse**. Lokalny mierzy także
maszynę, na której chodzi: ta sama strona, ten sam build dawały TBT 96,
102 i 257 ms w trzech seriach (raz winowajcą był zawieszony proces
zajmujący cały rdzeń), a seria dziewięciu przebiegów pokazała rozrzut
88–98 z opadaniem w czasie — profil throttlingu termicznego laptopa.
Lokalny wariant (`tools/pomiar-lighthouse.mjs`) zostaje do szybkiej
pętli przy optymalizacji; przed jego użyciem sprawdzić
`ps -eo pcpu,comm --sort=-pcpu`, czy maszyna jest spokojna.

**Pomiar rozchodzi się na dwa buildy i trzeba wiedzieć dlaczego.** Podgląd
chodzi z `noindex` (decyzja właściciela — sklep nie ma jeszcze płatności
ani domeny docelowej, a opinie to jawne placeholdery). Lighthouse **punktuje**
audyt „Page is blocked from indexing", więc na żywym adresie kolumna SEO
nigdy nie pokaże 100, choćby wszystko inne było bez zarzutu. Mierzymy więc:

| Co | Gdzie | Dlaczego tam |
|---|---|---|
| Wydajność, dostępność, dobre praktyki, LCP/CLS/TBT | żywy adres podglądu (z `noindex`), przez PSI | prawda o sieci, hostingu i realnym transferze — zmierzona poza naszą maszyną |
| SEO | build z `SEO_INDEKSOWANIE=1`, lokalnie na `next start` | wynik nieprzykryty naszym własnym ustawieniem; audyty SEO patrzą na znaczniki, nie na czasy, więc lokalny pomiar tu nie kłamie |

Rytuał pomiaru (kolejność jest treścią protokołu):

1. `npm run deploy:podglad` — deploy sam weryfikuje, że żywy adres
   oddaje DOKŁADNIE ten build, **łącznie z każdym chunkiem** (nazwy
   chunków nie pochodzą z treści, więc porównanie samego HTML-a
   przechodziło kiedyś na zielono przeciw staremu deploymentowi).
2. **Odczekać ≥10 minut.** Edge cache Pages ma `max-age=600` i spod
   niezmienionych adresów oddaje starą treść; do tego zimny cache CDN
   zaniża wynik tuż po publikacji (widziane 91 tam, gdzie po chwili
   wychodziło 100). Pomiar minutę po deployu mierzy nie tę stronę.
3. `PAGESPEED_KLUCZ=… node tools/pomiar-psi.mjs` — **mediana z 5
   przebiegów** na stronę i tryb (mobile + desktop), zapis do
   `goldeny/pomiary-lighthouse.json` razem z datą i warunkami.
4. Kolumnę SEO mierzy się osobno na buildzie bez `noindex`
   i podaje przez `SEO_KATALOG`/`SEO_KURS` — golden notuje to jawnie.

| Podstrona | Tryb | Wydajność | Dostępność | Dobre praktyki | SEO | LCP | CLS | TBT |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/szkolenia` | mobile | 97 | 100 | 100 | 100 | 2101 ms | 0 | 23 ms |
| `/szkolenia` | desktop | 100 | 100 | 100 | 100 | 500 ms | 0 | 6 ms |
| `/szkolenia/[slug]` | mobile | 96 | 100 | 100 | 100 | 2179 ms | 0 | 0 ms |
| `/szkolenia/[slug]` | desktop | 100 | 100 | 100 | 100 | 476 ms | 0 | 19 ms |

> Pomiar: PageSpeed Insights (Lighthouse 13.4.1), 2026-08-19, mediana z 5
> przebiegów na stronę i tryb, żywy adres podglądu. Liczby wchodzą tu
> wyłącznie z zapisanego przebiegu (`goldeny/pomiary-lighthouse.json`)
> — pilnuje tego `straznik-progow`, co do jednostki.
>
> **Mobilne 96–97 to artefakt symulacji, przyjęty świadomie** (decyzja
> właściciela, 2026-08-19, łagodząca warunek „100 w każdej kolumnie"):
> raportowane LCP ~2,1 s liczy symulator Lantern, doliczając do tekstu
> pełen łańcuch webfontu; LCP OBSERWOWANE na serwerach Google to
> ~450 ms (TTFB 3 ms + render 444 ms), a wartość symulowana była
> identyczna co do milisekundy w czterech różnych buildach — to
> właściwość modelu, nie strony. Każda realna usterka z tej listy
> została naprawiona pomiarem: CLS 0,137–0,166 → 0 (fonty z preloadem
> i uzbrojoną korektą metryk), TBT ≤ 27 ms, dostępność, dobre praktyki
> i SEO = 100 wszędzie, desktop 100 w dziesięciu przebiegach z rzędu.
> Dla porównania: strona główna przy tym samym reżimie ma 94–98
> na wydajności.

## Szybki start (nowa maszyna, od zera)

Wymagania: Node 24+, podman (albo docker) compose, git. Kolejność jest
istotna — każdy krok zakłada poprzednie:

```bash
git clone <repo> && cd <repo>         # gałąź domyślna = plugin-1-sklep-kursow
git config core.hooksPath .githooks   # włącza haki — raz, obowiązkowo
npm ci                                # zależności (Node 24+)
cp .env.example .env                  # lokalna konfiguracja (baza, KREATOR_TOKEN)
npm run db1:migruj                    # migracje + triggery (bazę podniesie pretest)
npm test                              # 83 testy; sam podnosi kontener bazy
npm run db1:seed                      # program + sekcje sprzedażowe (UWAGA: kasuje kursy)
npm run dev                           # → http://localhost:3001/szkolenia
```

Weryfikacja, że maszyna jest zdrowa (to samo, co robi CI):

```bash
node tools/straznicy/uruchom-wszystkie.mjs   # komplet strażników
npm run build                                # produkcyjny build
node --env-file-if-exists=.env tools/smoke/smoke-d4.ts   # katalog + nagłówki
```

Do pracy nad TREŚCIĄ kursów dodatkowo:

```bash
node tools/pobierz-dokumentacje-d7.mjs   # ~15 min, 55 MB źródeł (poza gitem)
```

> [!TIP]
> Po `git clean`, na świeżym klonie i po każdym `/clear` agenta
> obowiązuje ta sama zasada: najpierw ten przepis, potem praca.
> Przewodnikiem stanu projektu jest CLAUDE.md (czyta się automatycznie),
> licznikiem treści — [tresc-kursow/POSTEP.md](tresc-kursow/POSTEP.md).
>
> Podgląd „wywalił się"? Prawie na pewno nikt go nie uruchomił po
> restarcie: `npm run db1:up && npm run dev` stawia wszystko z powrotem.


## Treść kursów (Dział 7)

Treść kursów powstaje wyłącznie z oryginalnej dokumentacji Anthropic
i GitHuba (WYTYCZNE §7 i N2). Same pliki — 2219 stron, 55 MB — **nie są
w repozytorium**: git przechowuje każdą wersję na stałe, więc obciążałyby
każde klonowanie już zawsze. Zamiast nich jedzie skrypt, który odtwarza
komplet co do pliku:

```bash
node tools/pobierz-dokumentacje-d7.mjs   # ~15 min; pomija to, co już jest
```

Zakres i uzasadnienie cięć (GitHub: 1466 z 3192 artykułów):
[docs/dokumentacja-techniczna/d7/ZRODLA.md](docs/dokumentacja-techniczna/d7/ZRODLA.md).

Do pisania scenariuszy źródła przepuszcza się przez odchudzacz — zostaje
proza, tabele i jeden przykład kodu na sekcję, znikają blobki SVG ikon,
odsyłacze do zrzutów, powtórzone warianty tej samej instrukcji
(`ghd-tool`) i ten sam przykład w ośmiu językach:

```bash
node tools/wyciag-zrodla.mjs --do /tmp/wyciag <plik.md …>   # −38% na module 4 K2
```

Narzędzie niczego nie streszcza — każde cięcie zostawia ślad w tekście
albo w stopce pliku, więc widać, że czyta się wersję odchudzoną.

## Kreator kursów (Dział 6)

Panel treści właściciela: `http://localhost:3001/szkolenia/kreator`.
Po zalogowaniu wejście jest też pod ręką na samych stronach sklepu —
dyskretna pigułka w rogu `/szkolenia` i strony kursu, widoczna
wyłącznie dla zalogowanego (gość nie ma jej nawet w źródle strony).
Pełna instrukcja obsługi: [docs/plugin-1/KREATOR.md](docs/plugin-1/KREATOR.md).
Wejście na token z `.env` (`KREATOR_TOKEN`) — trafia do ciastka
HttpOnly, więc nie ma go w JavaScripcie strony; pełne logowanie da
Plugin 3. Kreator czyta bazę kanałem JSON, a zmienia ją **wyłącznie**
przez jedyny wystrzał AJAX `app/api/szkolenia` — każda operacja
zostawia ślad w `course_changelog` (triggery bazy).

> [!IMPORTANT]
> Przy wdrożeniu za reverse proxy (nginx/Caddy) proxy MUSI przekazywać
> nagłówek `X-Forwarded-Proto` — z niego bierze się flaga `Secure`
> ciastka kreatora. Bez niego, gdy proxy przepisuje `Host` na
> `localhost`, ciastko z tokenem poleciałoby po https bez `Secure`.
