---
name: security-audit
description: Wyłącznie jako rola SEC sektora AUDYT: systematyczne przejście wejść do systemu (nonce, uprawnienie, SQL, wyjście do HTML, obwód) z dowodem plik:linia dla każdego. Używać przy pozycjach SEC-01…SEC-12.
---

# Audyt bezpieczeństwa — umiejętność roli SEC

---

## TRZY ZASADY NADRZĘDNE

### 1. NIE MA WYMYŚLANIA BŁĘDÓW
Każde zgłoszenie ma podstawę i możliwość potwierdzenia. **Brak dowodu = brak
zgłoszenia.**

### 2. AUDYT I RE-AUDYT NIE NAPRAWIAJĄ
Sektory **znajdują i wskazują, nigdy nie poprawiają**.

### 3. SWÓJ ZAKRES — DRĄŻYĆ, NIE PRZEKAZYWAĆ
Audytor pracuje nad własnym znaleziskiem sam, **nie przekazuje go innemu
działowi** i nie naprawia.

---

## Kiedy używać

Przy pozycjach **SEC-01…SEC-06** (wejścia i trasy) oraz **SEC-11** (obwód
instalacji) — czyli wtedy, gdy pytasz o **drogę, którą obcy może wejść**.

Nie wołasz jej przy SEC-10 (`.env.example`) ani SEC-09 (porównanie stałoczasowe):
tam wystarczy otworzyć plik i przeczytać jedną linię. **Skill wołany zawsze
przestaje cokolwiek znaczyć.**

## Procedura

Każdy krok kończy się czymś sprawdzalnym. Krok kończący się wrażeniem nie jest krokiem.

1. **Wypisz WSZYSTKIE wejścia, zanim ocenisz którekolwiek.** Handlery
   `admin_post_*` i `admin_post_nopriv_*`, trasy przez `template_include`,
   `pre_get_posts`, `register_post_type`, publiczne handlery cudzych wtyczek, na
   których stoi nasze zabezpieczenie.
   *Wynik:* lista `plik:linia` i **jej długość**. Ta liczba jest Twoim mianownikiem —
   bez niej nie wiesz, czy przeszedłeś całość.

2. **Dla każdego wejścia odpowiedz w tej kolejności:** nonce → uprawnienie →
   walidacja wejścia → uciekanie wyjścia.
   *Wynik:* tabela wejście × cztery odpowiedzi, każda z `plik:linia` albo słowem BRAK.

3. **Sprawdź, czy kontrola jest PRZED użyciem danych, nie po.** Sprawdzenie po
   pierwszym dotknięciu `$_POST` jest sprawdzeniem pozornym.
   *Wynik:* `plik:linia` kontroli i `plik:linia` pierwszego użycia danych — dwie liczby,
   nie zdanie.

4. **SQL: dla każdego `$wpdb->` pytaj o literał i `prepare()`.** Sklejenie
   konkatenacją omija wzorce pytające o literał w tej samej linii.
   *Wynik:* lista zapytań, w których treść nie jest literałem przy wywołaniu.

5. **Wyjście do HTML: dla każdego `echo` w szablonie pytaj o `esc_*` / `wp_kses`.**
   *Wynik:* lista `plik:linia` wyjść bez uciekania.

6. **ZANIM ZGŁOSISZ — sprawdź, czy zjawisko jest CZYNNE.** Coś na ścieżce wywołania
   może je blokować wcześniej; znalezisko zablokowane gdzie indziej jest innym
   znaleziskiem. To jest pytanie WER-03 i weryfikator i tak je zada.
   *Wynik:* ścieżka wywołania od wejścia do miejsca, `plik:linia` każdego ogniwa.

## Komendy

**Kody wyjścia mierzymy BEZ POTOKU.** `| tail` pokazuje status potoku, nie skryptu —
ta klasa kosztowała projekt czas od czasów D5 i wróciła przy pomiarze narzędzi w E4.

```
# wejścia
grep -rn "add_action( 'admin_post" wordpress/wtyczki
grep -rn "admin_post_nopriv" wordpress/wtyczki
grep -rn "template_include\|pre_get_posts\|register_post_type" wordpress/wtyczki

# uwierzytelnienie i uprawnienie
grep -rn "check_admin_referer\|wp_verify_nonce\|current_user_can" wordpress/wtyczki

# SQL i wyjście
grep -rn '\$wpdb->' wordpress/wtyczki
grep -rn 'echo \|<?= ' wordpress/wtyczki/aai-sklep/szablony

# obwód
cat wordpress/srodowisko/mu-plugins/aai-obwod.php
```

**Pomiar na żywej instalacji** (`http://127.0.0.1:8892`) wymaga postawionego
środowiska. Jeśli nie stoi — **napisz to wprost**, zamiast zakładać wynik.
Środowisko stawia `wordpress/srodowisko/postaw.sh`; **Ty go nie uruchamiasz** —
to zmiana stanu, a Ty tylko czytasz.

## Czego ta umiejętność NIE robi

- **nie ocenia wydajności** zapytań ani kosztu odsłony (→ PERF, `GRANICE.md`);
- **nie ocenia retencji ani zgodności z RODO** (→ PRIV): „czy obcy dostanie dane" jest
  Twoje, „czy my trzymamy dane, których nie wolno" jest ich;
- **nie ocenia poprawności kontraktu** — brak klucza kasujący sekcje mimo obietnicy
  „nie ruszaj" należy do BE, bo nikt tam nie atakuje: kod łamie własną obietnicę;
- **nie naprawia** — nigdy, także gdy poprawka jest jednoliniowa.

## Znane pułapki

- **Wzorzec pytający o OBECNOŚĆ napisu zamiast o rozstrzygnięcie** wracał w tym repo
  **dziewięć razy**. Gdy oceniasz strażnika albo sam budujesz sprawdzenie, pytaj
  o `return`, `if`, porównanie — nie o to, czy słowo występuje w pliku.
- **`\b` nie działa na polskich znakach.** `ę` w JS nie jest `\w`, więc
  `/\bwydaje mi si[ęe]\b/` nie łapie „Wydaje mi się,". W polskich wzorcach `\p{L}`
  z flagą `u`.
- **`wp_http_validate_url()` jest funkcją od SSRF, nie od odnośników** — rozwiązuje DNS,
  więc link do niekupionej domeny znikał po cichu (BLAD-017).
- **`opcache.revalidate_freq = 2`** w kontenerze: między zmianą pliku PHP a pomiarem
  odczekaj ≥ 3 s, inaczej mierzysz POPRZEDNI stan kodu.
- **Pomiar bez sprawdzenia kodu wyjścia mierzy ciszę, nie stan** — narzędzie, które
  padło przed pierwszą asercją, wygląda jak narzędzie, które nic nie znalazło.
