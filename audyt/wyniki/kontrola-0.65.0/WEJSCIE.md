# Wejście fali kontrolnej 0.65.0 — 33 wpisy o produkcie, policzone komendą

Kryterium (to samo, którym sesja napraw wybrała 33): wpis fali 1 bez `proba`, werdykt krytyka
`PRZEPUSZCZAM` **i** weryfikatora `ISTNIEJE`, `miejsce.plik` zaczyna się od `wordpress/`.
Odtworzenie: skrypt w sekcji o decyzjach fali kontrolnej w `audyt/PLAN-BUDOWY.md`.
Wygenerowane 2026-09-05 na drzewie sektora po scaleniu 0.65.0. Razem: **33**.

Działy bez ani jednego wpisu o produkcie: **QA, PROTO, PIK** — ich Pogłębiacz robi wyłącznie rundy
regresji w swoim zakresie.

| Dział | Wpis | Plik | Stwierdzenie (skrót) |
|---|---|---|---|
| ARCH | `AUD-ARCH-F1-001` | `wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-podpis.php` | Aai_Monitor_Podpis::sol() pisze surowym SQL INSERT wprost do $wpdb->options (cudza tabela WordPressa, nie wtyc |
| ARCH | `AUD-ARCH-F1-003` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-cta.php` | W aai-platnosci istnieje dwuwęzłowy cykl zależności statycznych: Aai_Platnosci_Ustawienia wywołuje Aai_Platnos |
| ARCH | `AUD-ARCH-F1-004` | `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-kontrakt.php` | W aai-sklep istnieje trzywęzłowy cykl zależności statycznych między Aai_Sklep_Trasy, Aai_Sklep_Panel i Aai_Skl |
| ARCH | `REA-ARCH-F1-002` | `wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-zapis.php` | AUD-ARCH-F1-002 nosi status ZWERYFIKOWANE mimo sprzecznych werdyktów (krytyk ODRZUCAM, weryfikator ISTNIEJE) — |
| ARCH | `REA-ARCH-F1-003` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-cta.php` | Aai_Platnosci_Cta::stan() (odbiorca publicznego filtra-szwu aai_sklep_cta_kursu) waliduje wejście `$domyslne`  |
| BD | `AUD-BD-F1-001` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php` | Aai_Platnosci_Zapis::synchronizuj_kurs() pisze bez transakcji do produktu WooCommerce (wp_posts+wp_postmeta) i |
| BD | `REA-BD-F1-001` | `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php` | Klasa z AUD-BD-F1-001 (zapis wielotabelowy/wielosystemowy bez transakcji) ma w pełnym zakresie BD DRUGIE wystą |
| BE | `AUD-BE-F1-001` | `wordpress/wtyczki/aai-sklep/aai-sklep.php` | Start wtyczki aai-sklep (funkcja rejestrowana na 'plugins_loaded' w aai-sklep.php) NIE jest opakowany w try/ca |
| BE | `REA-BE-F1-001` | `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php` | Aai_Sklep_Zapis::zapisz_tresc_lekcji() NIE stosuje reguły „brak klucza znaczy nie ruszaj” (BLAD-018) dla swoic |
| FE | `AUD-FE-F1-001` | `wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-ekran.php` | Kafelki 'Logowania' i 'Odsłony'/'Sesje' na ekranie monitoringu mają podpis okresu 'od początku pomiaru', ale l |
| FE | `AUD-FE-F1-002` | `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-widok.php` | Klient widzi cenę kursu w złotych na stronie sprzedażowej ('Dołączam za 299,00 zł'), ale po kliknięciu przez d |
| FE | `REA-FE-F1-002` | `wordpress/wtyczki/aai-sklep/szablony/panel/lista.php` | Zgłoszenie AUD-FE-F1-002 (ZWERYFIKOWANE) wskazuje niespójność waluty na ścieżce zakupu w JEDNYM miejscu (widok |
| INT | `AUD-INT-F1-001` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-dostarczanie.php` | Skasowanie zamówienia WooCommerce (nie zmiana statusu, lecz literalne usunięcie wiersza z wp_wc_orders) NIE od |
| INT | `REA-INT-F1-001` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-dostarczanie.php` | AUD-INT-F1-001 (skasowanie zamowienia WooCommerce nie odbiera dostepu Tutora) jest ODTWORZONE URUCHOMIENIOWO n |
| INT | `REA-INT-F1-003` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-dostarczanie.php` | Zasieg klasy z AUD-INT-F1-001 (skasowanie zamowienia WooCommerce nie cofa skutkow po stronie Tutora, bo Tutor  |
| PERF | `AUD-PERF-F1-001` | `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php` | Aai_Sklep_Tutor::dane_kursu() ma zapytanie SQL wewnątrz podwójnej pętli foreach: dla każdego modułu kursu wyko |
| PERF | `AUD-PERF-F1-002` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php` | Aai_Platnosci_Zapis::produkt_kursu() nie ma pamięci na czas żądania (brak static $pamiec, w odróżnieniu od sąs |
| PERF | `AUD-PERF-F1-003` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-cli.php` | Aai_Platnosci_Cli::osierocone() wykonuje zapytanie SQL wewnątrz foreach: dla każdego wiersza tabeli powiazania |
| PERF | `AUD-PERF-F1-005` | `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-lekcja.php` | Widok pojedynczej lekcji (szablony/lekcja.php, wybierany przez Aai_Sklep_Lekcja::wybierz_szablon() w class-aai |
| PERF | `REA-PERF-F1-002` | `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-odczyt.php` | Aai_Sklep_Odczyt::moduly() ma DOKŁADNIE tę samą klasę N+1 co AUD-PERF-F1-001 (jedno zapytanie o moduły, potem  |
| PERF | `REA-PERF-F1-003` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php` | AUD-PERF-F1-002 (Aai_Platnosci_Zapis::produkt_kursu() bez pamięci na czas żądania) jest ZWERYFIKOWANE, ale JEG |
| PERF | `REA-PERF-F1-004` | `wordpress/wtyczki/aai-sklep/assets/sklep.css` | Statyczne pliki CSS/JS wtyczek (w zakresie PERF: wordpress/wtyczki/aai-sklep/assets, wordpress/wtyczki/aai-mon |
| PRIV | `AUD-PRIV-F1-001` | `wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-logowania.php` | Aai_Monitor_Logowania::bezpieczny_login() maskuje nieznane wartosci wpisane w pole loginu, ale zwraca pierwsze |
| PRIV | `AUD-PRIV-F1-002` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-kasa.php` | Aai_Platnosci_Kasa::zdanie() sklada w kasie zdanie 'Kontynuujac zamowienie, wyrazasz zgode na nasza Polityke p |
| PRIV | `AUD-PRIV-F1-003` | `wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-zadanie.php` | Kolumna 'agent' tabeli wp_aai_monitor_logowania przechowuje SUROWY, PELNY naglowek User-Agent przegladarki (Aa |
| PRIV | `REA-PRIV-F1-001` | `wordpress/srodowisko/postaw.sh` | Klasa z AUD-PRIV-F1-004 ("polityka wypiera się cookies/localStorage, choć witryna je stawia") ma na :8892 CO N |
| PRIV | `REA-PRIV-F1-002` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-kasa.php` | AUD-PRIV-F1-002 (ZWERYFIKOWANE, krytyk PRZEPUSZCZAM + weryfikator ISTNIEJE) NIE ODTWARZA SIĘ dziś na :8892: zg |
| REPO | `AUD-REPO-F1-009` | `wordpress/README.md` | wordpress/README.md, tabela na początku pliku, opisuje Plugin 2 i Plugin 3 jako NIEISTNIEJĄCE ('_(jeszcze nie  |
| SEC | `REA-SEC-F1-003` | `wordpress/srodowisko/mu-plugins/aai-obwod.php` | Kolektor CSP w mu-pluginie obwodu jest publicznym, niezalogowanym punktem zapisu bez ŻADNEJ weryfikacji integr |
| USP | `AUD-USP-F1-001` | `wordpress/srodowisko/compose.yml` | Nie istnieje żadne narzędzie ani stała SAVEQUERIES pozwalające policzyć liczbę zapytań SQL na odsłonę żadnej z |
| WDR | `AUD-WDR-F1-002` | `wordpress/srodowisko/postaw.sh` | Na PRAWDZIWIE świeżej instalacji (`./postaw.sh --skasuj` + `./postaw.sh`, zweryfikowane uruchomieniowo) krok 4 |
| WDR | `AUD-WDR-F1-003` | `wordpress/wtyczki/aai-sklep/readme.txt` | Dwie usterki utrzymaniowe w standardowym pliku WordPressa `readme.txt`: (1) tylko `aai-sklep` MA plik `readme. |
| WDR | `AUD-WDR-F1-004` | `wordpress/srodowisko/postaw.sh` | Sklep rozlicza transakcje w USD (`woocommerce_currency = USD`), a strony sprzedażowe i strony sklepu (nasze sz |
