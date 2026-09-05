# Etap WordPress — trzy wtyczki Automatic AI

Strona Automatic AI to **motyw** WordPressa (robi go kolega z zespołu,
generowany z Next.js). Nasza praca to **trzy wtyczki** do tej samej
instalacji — decyzja właściciela z 2026-08-25. **Wszystkie trzy są
skończone**, każda po własnym teście ręcznym właściciela, a na koniec
sprawdzone razem ([test całości](../docs/TEST-CALOSCI-WP.md)):

| Katalog | Wtyczka | Zakres | Stan |
|---|---|---|---|
| `wtyczki/aai-sklep` | **Plugin 1 — sklep z kursami** | katalog `/szkolenia`, strony sprzedażowe, kreator treści, widok kupionej lekcji, dziennik zmian | ✅ kroki W1–W6 (wersja projektu `v0.45.0`) |
| `wtyczki/aai-platnosci` | **Plugin 2 — płatności** | SZEW do WooCommerce: kurs → produkt, konto przy zakupie, dostęp po opłacie, dwa maile, zwroty | ✅ kroki P0–P6 (wersja projektu `v0.53.0`) |
| `wtyczki/aai-monitor` | **Plugin 3 — monitoring** | dziennik logowań (kto, kiedy, skąd) i pomiar ruchu — ekran w kokpicie; tylko PATRZY, nikogo nie blokuje | ✅ kroki T0–T4 (wersja projektu `v0.58.0`) |

> [!NOTE]
> Moduł 3 nazywa się **`aai-monitor`, nie `aai-panel`** — „panel" znaczy
> w tym repozytorium KREATOR treści, a nie panel administracyjny. Rola
> „redaktora kursów" została **odrzucona definitywnie** (decyzja właściciela
> z 2026-08-30): kreator stoi na uprawnieniu `manage_options`, a konta
> klientów daje WooCommerce.

Czego te wtyczki **nie robią**, bo robią to gotowe rzeczy: kont i dostępu
do materiału (Tutor LMS), koszyka, płatności i faktur (WooCommerce).
Uzasadnienie podziału: [docs/ETAP-WP.md](../docs/ETAP-WP.md).

Wersje w tabeli to wersje PROJEKTU (`CHANGELOG.md` w korzeniu). Każda
wtyczka ma osobno swoją własną, mniejszą wersję w nagłówku pliku głównego
i w `readme.txt` — to dwie różne numeracje i nie należy ich porównywać.

## Szybki start

```bash
cd wordpress/srodowisko
./postaw.sh                 # stawia całość i sam się weryfikuje
```

Po chwili masz na `http://127.0.0.1:8892` **żywą stronę Automatic AI**
z motywem, treścią, WooCommerce, Tutor LMS i wszystkimi trzema naszymi
wtyczkami. Dane do panelu: `admin` + hasło z `wordpress/srodowisko/.env`
(plik generuje się sam i nie wchodzi do repo).

```bash
./postaw.sh --pobierz       # wymuś świeży motyw i treść strony głównej
./postaw.sh --zatrzymaj     # zatrzymaj (dane zostają)
./postaw.sh --skasuj        # skasuj RAZEM Z DANYMI
```

Kod wtyczek jest **montowany wprost z repo** — plik zapisany w edytorze
działa w WordPressie od razu, bez kopiowania i bez przebudowy. Z jednym
zastrzeżeniem: kontener ma `opcache.revalidate_freq = 2`, więc PHP sprawdza
czas modyfikacji pliku **najwyżej raz na dwie sekundy**. Zmiana zmierzona
natychmiast po zapisie pokazuje POPRZEDNI stan kodu — przy testach
negatywnych wygląda to jak „strażnik przepuścił mutację". Między zapisem
a pomiarem odczekaj ≥ 3 s.

## Kursy w tabelach wtyczki `aai-sklep`

Treść obu kursów żyje w prototypie (PostgreSQL). Do tabel `wp_aai_sklep_*`
przenosi ją jedna komenda — z repo, nie z kontenera:

```bash
npm run wp:import     # eksport z Postgresa → kopia do kontenera → wp aai-sklep import
npm run wp:sprawdz    # dowód: porównuje OBIE bazy, lekcja po lekcji
```

Import jest **idempotentny**: powtórzenie nie duplikuje niczego i nie
rusza wierszy, które się nie zmieniły — nie dopisuje wtedy nawet linii
do dziennika audytu. Dlatego „dziennik nie urósł" jest tu twardym testem,
a nie ozdobą.

Komendy wtyczki `aai-sklep` (`wp aai-sklep --help` w kontenerze):

| Komenda | Co robi |
|---|---|
| `import <plik>` | wykłada eksport formatu 2 do naszych tabel |
| `sprawdz [--format=json]` | oddaje stan tabel — materiał dla `npm run wp:sprawdz` |
| `usun <slug\|id>` | kasuje kurs; z napisanymi lekcjami wymaga `--pozwol-skasowac-tresc` |

Warstwę zapisu (transakcje, dziennik audytu, ochrona napisanej treści,
dwufazowe przestawianie pozycji) sprawdza `npm run smoke:wp` na własnym
kursie testowym, który sam po sobie sprząta. Mapowanie pole po polu
i dowody: [docs/plugin-1/MIGRACJA-DO-WP.md](../docs/plugin-1/MIGRACJA-DO-WP.md).

## Front: `/szkolenia` na WordPressie (krok W3)

Wtyczka renderuje katalog i strony sprzedażowe **z własnych tabel**, a nie
ze stron WordPressa — źródłem prawdy o kursie są nasze tabele, nie wpisy.

| Adres | Co się dzieje |
|---|---|
| `/szkolenia/` | katalog: karty kursów z bazy, liczniki liczone SQL-em |
| `/szkolenia/<slug>/` | strona sprzedażowa: 12 rodzajów sekcji + program, oferta i domknięcie |
| `/szkolenia/<czego-nie-ma>/` | **404** z kodem odpowiedzi i naszą stroną (motyw nie ma `404.php`) |
| `/courses/<slug>/` | **301** na `/szkolenia/<slug>/` — klient nie ogląda wyglądu Tutora |
| `/courses/` | **301** na `/szkolenia/` |

Pozycję „Szkolenia" w menu motywu wstrzykuje `Aai_Sklep_Menu`: motyw ma
nawigację wpisaną na sztywno, bez `wp_nav_menu()`, więc standardowe API WP
nie ma się gdzie wpiąć. Wstrzyknięcie **klonuje ostatnią pozycję menu**
i kotwiczy na `aria-label`, nie na klasie Tailwinda — motyw jest generowany,
więc klasy zmienią się przy pierwszej regeneracji.

```bash
npm run smoke:wp-front      # trasy, treść vs baza, menu, 301, SEO (bez przeglądarki)
ZRZUTY_RIG=/tmp/rig npm run smoke:wp-motyw   # wygląd: nachodzenie, kontrast, jasne plamy
```

## Płatności i monitoring (Pluginy 2 i 3)

Obie wtyczki mają własne komendy WP-CLI, a ich **kontrole kończą się kodem
wyjścia 1**, gdy coś jest rozjechane — dlatego `postaw.sh` woła je w swojej
weryfikacji i cytuje ich własne wiersze, zamiast zgadywać powód po samym
kodzie.

| Komenda | Co robi |
|---|---|
| `wp aai-platnosci sync [<slug>]` | zbiorcza naprawa szwu kurs → produkt WooCommerce |
| `wp aai-platnosci sprawdz` | kontrola rozjazdu: cena, widoczność, powiązania, sieroty |
| `wp aai-platnosci dostawy [--ponow=<id>]` | dziennik dostarczenia (dostęp i maile), z ręczną ponowką |
| `wp aai-platnosci sprzedaz otworz\|zamknij` | otwiera i zamyka sprzedaż (blokada koszyka) |
| `wp aai-monitor sprawdz` | kontrola monitoringu; **nigdy niczego nie zapisuje** |
| `wp aai-monitor wyczysc-blad` | kasuje kanał błędów po naprawie |

Bramki obu wtyczek (wszystkie wymagają stojącego `:8892`):

```bash
npm run smoke:wp-platnosci   # fundament: tabele, warstwa zapisu, deaktywacja
npm run smoke:wp-produkty    # szew kurs → produkt: cena, kolejność, kontrola
npm run smoke:wp-zakup       # ścieżka zakupu i cztery stany przycisku
npm run smoke:wp-maile       # dwa maile dostarczenia i dziennik dostaw
npm run smoke:wp-zwroty      # zwrot odbiera dostęp, częściowy go nie rusza
ZRZUTY_RIG=/tmp/rig npm run smoke:wp-monitor   # dziennik logowań i pomiar ruchu (WYMAGA przeglądarki)
```

## Dlaczego skrypt, a nie instrukcja

Poprzednie środowisko WP (`mp-test-env/wp-tutor`) powstało ręcznymi
`podman run` i nie da się go odtworzyć — a to na nim stały dowody
migracji danych do WordPressa. Środowisko, którego nikt nie umie
postawić drugi raz, jest dowodem jednorazowym.

## Cztery pułapki, które ten skrypt już przeszedł

1. **Mount całego `wp-content/themes` jako read-only wywala kontener.**
   Obraz WordPressa przy pierwszym starcie rozpakowuje tam swoje motywy
   domyślne; montujemy więc sam katalog naszego motywu.
2. **`set -o pipefail` + `grep -q` na dużej stronie zawsze zgłasza
   porażkę.** `grep -q` kończy po pierwszym trafieniu, `echo` po drugiej
   stronie potoku dostaje SIGPIPE, a `pipefail` przepisuje to na cały
   potok — więc warunek wywala się DOKŁADNIE WTEDY, gdy wzorzec został
   znaleziony. Weryfikacja grepuje plik, nie zmienną przez potok.
3. **Cudze pliki nie mogą leżeć w drzewie repo**, nawet w `.gitignore`:
   strażnicy skanują DYSK, nie git. Motyw i treść strony głównej mieszkają
   w `~/.cache/automatic-ai-warsztat`, bo pobrane do repo wywołały fałszywy
   alarm `straznik-seo` (znalazł dane strukturalne w cudzym generatorze).
4. **Montaż wtyczki umie umrzeć po cichu.** Bind mount trzyma INODE
   katalogu, więc gdy katalog zostanie na dysku odtworzony po starcie
   kontenera (przełączenie gałęzi, przeniesienie, `git clean`), kontener
   widzi w tym miejscu pustkę. Na dysku pliki są, `podman inspect` pokazuje
   właściwą ścieżkę, a WordPress po prostu przestaje znać wtyczkę — objaw
   wygląda na błąd wtyczki, nie montażu. Skrypt pyta więc KONTENER, czy
   widzi plik główny, i mówi wprost, co naprawić: `podman-compose down`
   i `./postaw.sh` (dane w wolumenach zostają).

## Skąd bierze się motyw

Sparse checkoutem z `MatthewPlugins/automatic-ai` (katalog `wordpress/`).
**To repo jest u nas TYLKO DO ODCZYTU** — nie klonujemy go do siebie
i nie dotykamy niczyjego katalogu roboczego (WYTYCZNE, po BLAD-007).
