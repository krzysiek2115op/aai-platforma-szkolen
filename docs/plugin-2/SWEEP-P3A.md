# Sweep przed `/clear` — krok P3a Pluginu 2 (2026-08-29)

Log sweepu wg goldena przed-clear: stan kroku, dowody z POMIARU, przegląd
i to, co zostaje otwarte. Gałąź `feat/p3a-ustawienia-kasa` (wersja 0.48.0),
środowisko `:8892`.

Rodzeństwo: [KROK-P3A.md](KROK-P3A.md) (plan i wynik kroku),
[SWEEP-P2.md](SWEEP-P2.md) (poprzedni sweep + walidacja sześciu klas błędów),
[DIAGRAM.md](DIAGRAM.md) (zaakceptowany schemat).

## 1. Co jest zrobione

| Etap planu P3a | Stan |
|---|---|
| ustawienia jako kod + filtry B17 | **zrobione** (`Aai_Platnosci_Ustawienia`, rejestracja przy include) |
| blokada sprzedaży do P4 | **zrobiona** (`add_to_cart_validation`, flaga domyślnie pusta = zamknięte) |
| polskie adresy + strony Tutora 151/152 | **zrobione** (`/koszyk/`, `/kasa/`, tamte na `draft`) |
| wygląd koszyka i kasy | **zrobiony** (`has-dark-controls` + sekcja 9 `woo-motyw.css`) |
| kontrola rozjazdu ustawień | **zrobiona** (rozjazd = kod 1, stan sprzedaży NAZWANY) |
| dowody (strażnik, mutacje, smoke) | **zrobione** — tabela niżej |

## 2. Dowody (wszystkie z uruchomienia, nie z deklaracji)

| Kontroler | Wynik |
|---|---|
| `npm run check` | **kod 0** (strażnicy 35/35, testy 83/83, lint, tsc, build, 7 smoke'ów prototypu) |
| audyt mutacyjny | **181** mutacji, 0 przeoczonych, 0 martwych, 2 pominięte |
| `smoke:wp-motyw` | **89** sprawdzeń, **9 stron** (doszły koszyk i kasa Z PRODUKTEM) |
| `smoke:wp-produkty` | **71** (z asercją wstępną `monetize_by = wc`) |
| `smoke:wp-platnosci` · `wp-front` · `wp-tutor` | 23 · 84 · 44 |
| `smoke:wp-lekcja` · `wp-kreator` · `wp-panel` · `wp` | 35 · 96 · 54 · 30 |
| `wp aai-platnosci sprawdz` | **kod 0**; testy negatywne (slug, silnik) → kod 1 → `--napraw` → kod 0 |
| `postaw.sh` | **kod 0** (punkt kontrolny koszyka pyta instalację o adres) |
| `wp:sprawdz` / `wp:tutor` | 73/73 co do znaku / 87 obiektów, 0 różnic |
| środowisko po przebiegach | produkty 2, powiazania 2, dostawy 0 |

## 3. Pięć rzeczy zmierzonych w cudzym kodzie (nie z dokumentacji)

1. **Tutor czyta `monetize_by` w konstruktorze, przy include swojego pliku** —
   filtr B17 z `plugins_loaded` przychodzi PO odczycie i niczego nie broni.
2. **Zasłona „Coming soon" Woo jest dziurawa jako blokada** — zasłania strony,
   ale Store API dalej przyjmuje produkt do koszyka (201). Do tego podmienia
   koszyk i kasę na anglojęzyczną planszę w canvasie szablonów blokowych.
3. **Style komponentów bloków Woo drukują się w środku `<body>`**, więc są
   zawsze po arkuszach z `<head>` — wyścigu specyficzności nie da się wygrać
   zależnością enqueue; włączamy ICH ciemny wariant (`has-dark-controls`).
4. **Koszyk gościa jest niewidzialny dla zalogowanego** (Woo czyta sesję po
   `user_id`), a sesja przeniesiona z Node wygląda identycznie co do bajta
   i też nie działa — w smoke'u produkt dodaje sama przeglądarka.
5. **`wp_old_slug_redirect` nie obejmuje stron** — po zmianie sluga stary
   adres oddaje 404, nie 301 (stan przyjęty decyzją właściciela).

## 4. Znaleziska własne w trakcie kroku — wszystkie naprawione

| # | Znalezisko | Klasa | Dowód |
|---|---|---|---|
| 1 | `smoke-wp-platnosci` porównywał silnik PRZEZ filtr B17, więc maskował wyzerowanie bazy przez deaktywację Woo, a po teście zostawiał rozjazd | 5 + 6 z walidacji P2 | migawka z surowej bazy + sprzątanie `sync --napraw`; kontrola po smoke'u kod 0 |
| 2 | pisanie do wpisów stron poza warstwą zapisu | „jedyny pisarz" | złapał WŁASNY strażnik; trzy metody przeniesione do `Aai_Platnosci_Zapis` |
| 3 | punkt kontrolny koszyka w `postaw.sh` miał wpisany stary adres `/cart/` | L7 (twarde adresy) | adres z `get_permalink()`; test negatywny |
| 4 | niezmiennik „kontrola nie pisze" liczył SZTUKI wywołań `napraw()` — przeniesienie z `sync` do `sprawdz` zostawiało licznik na 1 i strażnik zieleniał | 3 (wzorzec na liczbę, nie na miejsce) | **zmierzone mutacją-pytaniem**: strażnik kod 0 na przeniesieniu; po naprawie pilnuje bloku metody, mutacja odtwarza ten wariant |

## 5. Przegląd przed PR-em — rozliczony

Recenzent na **Sonnecie** (zamknięta lista 10 pytań zamiast otwartego
przeglądu — decyzja właściciela o koszcie tokenów), krytyk = agent główny,
potwierdzenia URUCHOMIENIOWE. Trzy znaleziska, wszystkie naprawione; pełna
tabela w [KROK-P3A.md](KROK-P3A.md) §8.

**Najważniejsze:** `dopisz_klase_bloku()` podmieniał PREFIKS klasy i rozbijał
klasy bloków zagnieżdżonych — **13 uszkodzeń w koszyku, 22 w kasie na żywych
danych**, bez jednego objawu. Naprawione (granica atrybutu), treść przywrócona,
pilnują: reguła strażnika + mutacja + **kontrola danych** w `sprawdz`.

Siedem pytań bez znalezisk jest wypisanych w KROK-P3A.md §8 — nie szukać
tam drugi raz.

## 6. Stan na koniec sweepu

- **P3a gotowy.** (Zapis z chwili sweepu mówił: PR #81 OTWARTY, czeka na
  zgodę właściciela. PR #81 został zmergowany, tag `v0.48.0` + release.)
  Gałąź `feat/p3a-ustawienia-kasa`, wersja 0.48.0, wypchnięta, drzewo czyste.
- Dowody po naprawach przeglądu: strażnicy **35/35**, audyt **183**
  (0 przeoczonych, 0 martwych), smoke motyw **89**, produkty **71**,
  płatności 23, kontrola kod 0, `sync --napraw` idempotentny (0 zmian).
- Środowisko `:8892` stoi: produkty 2, powiazania 2, dostawy 0, strony
  koszyka i kasy zdrowe (0 rozbitych klas).

## 7. Następny krok po `/clear`

1. **Merge PR #81** (po zgodzie właściciela) → tag `v0.48.0` + release;
   artefakt weryfikować `git diff main <szczyt gałęzi>` = PUSTE.
2. Potem **P3b** wg DIAGRAM.md sekcja 16: CTA w trzech stanach, cena z Woo
   na froncie ORAZ w JSON-LD z tego samego wywołania (K2), `PreOrder →
   InStock`, mechanizm domykania zamówienia (`needs_processing` kontra
   `_downloadable` — POMIAREM, nie na słowo), przebieg zakupu obiema
   ścieżkami (`bacs` ręcznie oraz WP-CLI z `payment_complete()`).
   **Zgodnie z regułą właściciela: najpierw plan kroku + pytania
   doprecyzowujące, kod dopiero po zgodzie.**
3. Blokadę sprzedaży zdejmuje dopiero **P4** (konto, dwa maile, tabela
   `dostawy`) — wtedy flaga `aai_platnosci_sprzedaz_otwarta` na `tak`.
