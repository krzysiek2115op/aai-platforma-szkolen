# Etap WordPress — trzy wtyczki Automatic AI

Strona Automatic AI to **motyw** WordPressa (robi go kolega z zespołu,
generowany z Next.js). Nasza praca to **trzy wtyczki** do tej samej
instalacji — decyzja właściciela z 2026-08-25:

| Katalog | Wtyczka | Zakres |
|---|---|---|
| `wtyczki/aai-sklep` | **Plugin 1 — sklep z kursami** | katalog `/szkolenia`, strony sprzedażowe, kreator treści, audyt |
| _(jeszcze nie ma)_ | Plugin 2 — płatności | warstwa sprzedaży i dostawy na styku z WooCommerce |
| _(jeszcze nie ma)_ | Plugin 3 — panel admina | panel, monitoring, `page_visits` |

Czego te wtyczki **nie robią**, bo robią to gotowe rzeczy: kont i dostępu
do materiału (Tutor LMS), koszyka, płatności i faktur (WooCommerce).
Uzasadnienie podziału: [docs/ETAP-WP.md](../docs/ETAP-WP.md).

## Szybki start

```bash
cd wordpress/srodowisko
./postaw.sh                 # stawia całość i sam się weryfikuje
```

Po chwili masz na `http://127.0.0.1:8892` **żywą stronę Automatic AI**
z motywem, treścią, WooCommerce, Tutor LMS i naszą wtyczką. Dane do
panelu: `admin` + hasło z `wordpress/srodowisko/.env` (plik generuje się
sam i nie wchodzi do repo).

```bash
./postaw.sh --pobierz       # wymuś świeży motyw i treść strony głównej
./postaw.sh --zatrzymaj     # zatrzymaj (dane zostają)
./postaw.sh --skasuj        # skasuj RAZEM Z DANYMI
```

Kod wtyczek jest **montowany wprost z repo** — plik zapisany w edytorze
działa w WordPressie od razu, bez kopiowania i bez przebudowy.

## Kursy w tabelach wtyczki

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

Komendy wtyczki (`wp aai-sklep --help` w kontenerze):

| Komenda | Co robi |
|---|---|
| `import <plik>` | wykłada eksport formatu 2 do naszych tabel |
| `sprawdz [--format=json]` | oddaje stan tabel — materiał dla `npm run wp:sprawdz` |
| `usun <slug\|id>` | kasuje kurs; z napisanymi lekcjami wymaga `--pozwol-skasowac-tresc` |

Warstwę zapisu (transakcje, dziennik audytu, ochrona napisanej treści,
dwufazowe przestawianie pozycji) sprawdza `npm run smoke:wp` na własnym
kursie testowym, który sam po sobie sprząta. Mapowanie pole po polu
i dowody: [docs/plugin-1/MIGRACJA-DO-WP.md](../docs/plugin-1/MIGRACJA-DO-WP.md).

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
