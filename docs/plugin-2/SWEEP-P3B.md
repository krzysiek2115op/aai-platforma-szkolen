# Sweep przed `/clear` — krok P3b Pluginu 2 (2026-08-29)

Log sweepu wg goldena przed-clear: co zostało zrobione, gdzie leży nośnik
trwały każdej decyzji, co zostaje otwarte świadomie i od czego zaczyna
następna sesja.

Rodzeństwo: [KROK-P3B.md](KROK-P3B.md) (plan, pomiary, przegląd),
[SWEEP-P3A.md](SWEEP-P3A.md) (poprzedni krok), [DIAGRAM.md](DIAGRAM.md).

## 1. Co zamknięto w tej sesji

| Rzecz | Stan |
|---|---|
| **P3a** — PR #81 | **zmergowany** na dowodach lokalnych, tag `v0.48.0` + release, gałąź skasowana, artefakt (`git diff main <szczyt>`) **PUSTY** |
| **P3b** — plan + pytania | przedstawione, **zaakceptowane przez właściciela**, cztery rozstrzygnięcia zapisane w KROK-P3B.md §1 |
| **P3b** — implementacja | sześć etapów (E5 → E1 → E2 → E3 → E4 → E6), pięć commitów |
| **P3b** — przegląd przed PR-em | recenzent + krytyk, **cztery znaleziska, wszystkie naprawione** i potwierdzone uruchomieniowo PRZED naprawą |
| **P3b** — PR #82 | **zmergowany** na dowodach lokalnych za zgodą właściciela, tag `v0.49.0` + release, gałąź skasowana, artefakt **PUSTY** |

## 2. Decyzje właściciela z tej sesji i ich nośnik trwały

| Decyzja | Gdzie zapisana |
|---|---|
| merge P3a i P3b na dowodach lokalnych (CI stoi do 1 września) | CHANGELOG 0.48.0/0.49.0, treść release'ów, CLAUDE.md |
| przy przelewie dostęp **dopiero po potwierdzeniu wpłaty** | KROK-P3B.md §1, CLAUDE.md (z konsekwencją dla P4), pamięć projektu |
| bramka testowa = `bacs` | KROK-P3B.md §1 |
| cena efektywna z Woo na stronie kursu **i** w katalogu | KROK-P3B.md §1 i §6, CHANGELOG |
| w kreatorze zdanie, że to cena katalogowa | KROK-P3B.md §1 |
| zamówienie kursu w `processing` domykamy **automatycznie** | KROK-P3B.md §4, CLAUDE.md |
| przegląd przez recenzenta na **zamkniętej liście pytań** | KROK-P3B.md §9 |

**Wymaganie, które P4 dziedziczy i którego nie wolno zgubić:** mail „Ustaw
hasło" MUSI wyjść przy `on-hold`, a nie przy `completed` — inaczej klient
płacący przelewem ma przez dwa dni konto, do którego nie umie wejść (klasa K1).
Zapisane w KROK-P3B.md §1, CLAUDE.md i pamięci projektu.

## 3. Dowody na koniec kroku (z uruchomienia)

| Kontroler | Wynik |
|---|---|
| `npm run check` | **kod 0** (strażnicy 35/35, testy 83/83, lint, tsc, build, 7 smoke'ów prototypu) |
| audyt mutacyjny | **191** mutacji, **189 złapanych, 0 przeoczonych, 0 martwych**, 2 pominięte |
| `smoke:wp-zakup` (nowy) | **32** sprawdzenia |
| `smoke:wp-produkty` · `wp-front` · `wp-kreator` | 71 · 84 · 96 |
| `smoke:wp-motyw` · `wp-panel` · `wp-tutor` | 89 · 54 · 44 |
| `smoke:wp-lekcja` · `wp-dane` · `wp-platnosci` | 35 · 30 · 23 |
| `postaw.sh` | **kod 0** |
| `wp:sprawdz` / `wp:tutor` | 73/73 co do znaku / 87 obiektów, **0 różnic** |
| środowisko `:8892` po wszystkim | produkty 2, powiązania 2, dostawy 0, zamówienia 0, sprzedaż ZAMKNIĘTA, VAT wyłączony |

## 4. Co zostaje otwarte — świadomie

- **Sprzedaż jest ZAMKNIĘTA** (`aai_platnosci_sprzedaz_otwarta` puste). Otwiera
  ją P4, gdy dostarczanie (konto + mail) będzie gotowe. `smoke-wp-zakup`
  otwiera ją wyłącznie na czas pomiaru i przywraca stan.
- **VAT wyłączony.** Cena na stronie idzie z `get_price()`, czyli bez podatku;
  włączenie naliczania przed przeliczeniem ceny efektywnej zapala kontrolę
  (kod 1). VAT jest odłożony do etapu po P6.
- **Jedno ostrzeżenie ESLint** — istnieje tak samo na `main` sprzed tego kroku
  (odnotowane już w SWEEP-P2.md §9), nie jest regresją.
- **CI stoi do 1 września** (wyczerpane minuty Actions; zadania padają w 2 s
  z zerem kroków). Po jego powrocie potwierdzić **gitleaks** — jako jedyny nie
  ma lokalnego odpowiednika.

## 5. Rzeczy obiecane w tej sesji a niezrobione

Brak. Plan P3b zrealizowany w całości: sześć etapów, przegląd, PR, merge, tag,
release. Nic nie zostało przesunięte „na potem" poza tym, co powyżej nazwane
jako świadomie otwarte.

## 6. Następny krok

**P4 — konto przy zakupie, dwa maile, tabela `dostawy`, zdjęcie blokady
sprzedaży.** Zgodnie z regułą właściciela (2026-08-28): **najpierw plan
przebiegu kroku (z tym, czego krok NIE dotyka) i pytania doprecyzowujące,
czekać na zgodę, dopiero potem kod.**

Wymagania, które P4 dziedziczy z P3b:

1. mail „Ustaw hasło" przy `on-hold`, nie przy `completed` (K1);
2. flaga `aai_platnosci_sprzedaz_otwarta` na `tak` dopiero, gdy dostarczanie
   działa — dziś przycisk prowadzi do kasy tylko przy otwartej sprzedaży;
3. mail Woo `customer_new_account` zostaje WŁĄCZONY do czasu, aż powstanie nasz
   (wyłączony wcześniej zostawia konto bez żadnego linku do hasła);
4. każda nowa podstrona sklepu wchodzi przez `Aai_Sklep_Trasy::PODSTRONY`
   (BLAD-021), nigdy własnym `add_rewrite_rule`.
