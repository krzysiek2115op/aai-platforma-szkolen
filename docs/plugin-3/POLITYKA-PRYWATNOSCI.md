# Polityka prywatności a Plugin 3 — co dopisać i co jest nieprawdą

Dokument powstał w kroku **T2** (dziennik logowań). Dwie rzeczy, których
nie należy mylić:

1. **Wpis o dzienniku logowań** — nasz obowiązek wynikający z tego kroku.
   Zrobiony dwiema drogami (niżej).
2. **Rozjazd całej polityki ze stanem witryny** — znaleziony przy okazji,
   **starszy od Pluginu 3** i wykraczający poza ten moduł. Decyzja
   właściciela (2026-08-30): **zgłosić jako pozycję, nie ruszać** — treść
   prawna jest jego, wymaga prawnika, a witryna nie jest jeszcze publiczna.

---

## 1. Wpis o dzienniku logowań — dwie drogi, obie zrobione

### Droga A: mechanizm WordPressa (w kodzie, działa od razu)

`Aai_Monitor_Prywatnosc` melduje tekst przez `wp_add_privacy_policy_content()`.
Administrator widzi go w **Narzędzia → Prywatność → Przewodnik po polityce**
i sam decyduje, czy go użyć.

**Zmierzone, nie zadeklarowane:** po zalogowaniu jako `admin` ekran
`options-privacy.php?tab=policyguide` zawiera sekcję „Automatic AI —
Monitoring" i naszą treść.

**Pułapka, która kosztowałaby ciszę** (zmierzona w rdzeniu,
`wp-includes/plugin.php:2429`): funkcja odmawia pracy poza `wp-admin`
i przed hakiem `admin_init` — w obu przypadkach woła `_doing_it_wrong()`
i **wychodzi bez dodania czegokolwiek**. Wywołanie z `plugins_loaded`,
gdzie rejestruje się reszta tej wtyczki, nie dodałoby więc NIC, a jedynym
objawem byłby wpis w logu przy włączonym `WP_DEBUG`. Pierwszy pomiar tego
kroku, robiony przez WP-CLI, pokazał dokładnie to: „BRAK WPISU" — bo
w WP-CLI `is_admin()` jest fałszem.

### Droga B: gotowy fragment do wklejenia w źródle strony głównej

Prawdziwa polityka Automatic AI mieszka w **treści motywu**, generowanego
ze źródła Next.js strony głównej — repozytorium, do którego mamy dostęp
**wyłącznie do odczytu**. Wtyczka nie ma prawa go zmieniać, a gdyby
zmieniała stronę w bazie, zmiana i tak przepadłaby przy najbliższej
regeneracji motywu.

Poniższy tekst jest gotowy do wklejenia. Jest identyczny z tym, który
melduje wtyczka (jedno źródło treści: `Aai_Monitor_Prywatnosc::tresc()`).

> ### Dziennik logowań
>
> Ta witryna prowadzi dziennik logowań do kont. Przy każdym udanym
> i nieudanym logowaniu zapisujemy: datę i godzinę, konto (a przy
> nieudanej próbie — login wpisany w formularzu), sposób zalogowania,
> adres IP oraz pełny identyfikator przeglądarki (tak zwany User-Agent —
> nazwę i wersję przeglądarki oraz systemu operacyjnego, dokładnie w tej
> postaci, w jakiej przysyła je przeglądarka). Nie zapisujemy haseł ani
> ich fragmentów.
>
> Robimy to wyłącznie w celu bezpieczeństwa kont — żeby zobaczyć, czy
> ktoś próbuje włamać się na konto klienta lub administratora (art. 6
> ust. 1 lit. f RODO — prawnie uzasadniony interes administratora).
> Danych z dziennika nie używamy do profilowania, marketingu ani
> analityki i nie przekazujemy ich nikomu.
>
> Wpisy w dzienniku usuwamy automatycznie do 90 dni od ostatniej
> aktywności na koncie. Sformułowanie „do 90 dni” jest tu dosłowne:
> sprzątanie uruchamia się przy kolejnym logowaniu i przy otwarciu panelu
> administratora, więc na witrynie, na którą przez dłuższy czas nikt się
> nie loguje, usunięcie następuje przy najbliższym z tych zdarzeń.
>
> ### Pomiar ruchu na stronach
>
> Osobno mierzymy ruch na stronach, i ten pomiar jest anonimowy. Przy
> wyjściu ze strony zapisujemy: jej adres, moment wejścia oraz czas,
> przez który strona była widoczna na ekranie. Do rozróżnienia kolejnych
> stron otwieranych w jednej karcie służy losowy identyfikator, który
> przeglądarka trzyma w pamięci karty i kasuje przy jej zamknięciu. Przy
> tych danych NIE zapisujemy adresu IP, konta ani nazwy przeglądarki
> i nie łączymy ich z żadnym kontem — po zapisaniu nie da się z nich
> ustalić, kto oglądał stronę.
>
> Ruch mierzymy po to, żeby wiedzieć, które strony i lekcje są czytane,
> a które nie (art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes).
> Nie używamy do tego zewnętrznych narzędzi analitycznych, nie budujemy
> profili i nie śledzimy nikogo poza tą witryną. Zapisy o ruchu usuwamy
> do 400 dni od ostatniej odsłony.
>
> ### Twoje prawa
>
> Masz prawo dostępu do tych danych, ich sprostowania, usunięcia
> i sprzeciwu wobec przetwarzania — wystarczy wiadomość na adres
> kontaktowy podany w polityce.

**Dlaczego „do 90 dni od ostatniej aktywności", a nie „90 dni".** Retencja
jest z definicji leniwa: biegnie przy zapisie i przy otwarciu ekranu
w kokpicie, bez WP-Cron (który na cichej stronie potrafi nie wstać całymi
dniami — pułapka P7). Obietnica twardych 90 dni byłaby więc na cichej
instalacji nieprawdziwa. Polityka ma opisywać MECHANIZM, nie zamiar.

**Od kroku T3 wpis mówi o DWÓCH rzeczach**, bo dwie zbieramy: dzienniku
logowań (dane osobowe, 90 dni) i pomiarze ruchu (anonimowo, 400 dni).
Akapit o ruchu opisuje mechanizm dosłownie — identyfikator karty żyje
w `sessionStorage` przeglądarki, nie w ciasteczku, i nie ma czego łączyć
z kontem, bo przy wizycie nie zapisujemy ani adresu IP, ani konta (D3).

**Ocena prawna `sessionStorage` zostaje otwarta** (ePrivacy): to nie jest
ciasteczko i nie służy profilowaniu, ale rozstrzygnięcie należy do
prawnika — pozycja „przed pierwszym klientem", razem z całą sekcją 2
niżej.

---

## 2. Znalezisko: polityka wypiera się rzeczy, które witryna już robi

Przeczytana na `:8892` (strona `polityka-prywatnosci`, treść z motywu),
**stan na 2026-08-30**. Dokument mówi wprost:

| Cytat z polityki | Stan faktyczny |
|---|---|
| „Ta strona nie używa cookies ani narzędzi analitycznych." | WooCommerce stawia ciastka koszyka i sesji, WordPress — ciastka logowania |
| „Strona nie zbiera żadnych danych automatycznie — nie używamy cookies, localStorage, analityki ani profilowania." | konta klientów, koszyk, zamówienia, dane rozliczeniowe; od T3 dojdzie `sessionStorage` i pomiar ruchu |
| „Strona nie używa cookies ani podobnych technologii — dlatego nie wyświetlamy banera zgody." | jw. — brak banera przestaje być uzasadniony |
| „Jakie dane zbieramy: wyłącznie dane, które podasz w formularzu kontaktowym" | doszły: konto, adres rozliczeniowy, historia zamówień, postęp w kursie, a od T2 dziennik logowań z adresem IP |
| „Formularz na stronie /kontakt nie wysyła danych na żaden serwer WWW" | dalej prawda dla formularza, ale kasa WooCommerce już wysyła |

**To NIE jest wina Pluginu 3.** Rozjazd powstał, gdy witryna-wizytówka
stała się sklepem — czyli przy Pluginach 1 i 2. Plugin 3 go pogłębia
(dziennik z pełnym IP), ale nie zaczyna.

Sama polityka zresztą się o tę aktualizację prosi, ostatnim akapitem:

> „Dokument odzwierciedla faktyczną implementację strony — zmiana
> architektury (np. dodanie analityki lub backendu formularza) zawsze
> pociąga za sobą aktualizację polityki."

### Co z tym robimy

**Pozycja „przed pierwszym klientem"**, obok regulaminu, zgody w kasie na
natychmiastowe dostarczenie treści cyfrowej, domeny, HTTPS i poczty
produkcyjnej. Wymaga decyzji właściciela i najlepiej opinii prawnika —
nie jestem prawnikiem i nie oceniam tu ryzyka prawnego, tylko zgodność
dokumentu z tym, co kod faktycznie robi.

Do rozstrzygnięcia przy tamtej pozycji: czy potrzebny jest baner zgody
na cookies (ciastka koszyka i logowania bywają traktowane jako niezbędne
do świadczenia usługi, `sessionStorage` z T3 — niekoniecznie).
