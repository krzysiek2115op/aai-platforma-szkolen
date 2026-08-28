#!/usr/bin/env bash
#
# Stawia lokalne środowisko etapu WordPress: WP + MariaDB + Tutor LMS
# + WooCommerce + motyw Automatic AI + treść strony 1:1, i wpina NASZE
# wtyczki wprost z repo.
#
# PO CO SKRYPT, A NIE INSTRUKCJA W README. Poprzednie środowisko WP
# (`mp-test-env/wp-tutor`) powstało ręcznymi `podman run` i nie da się go
# odtworzyć — a właśnie na nim stały dowody migracji do WP. Środowisko,
# którego nikt nie umie postawić drugi raz, jest dowodem jednorazowym.
#
# Idempotentny: można puszczać wielokrotnie, każdy krok sprawdza, czy
# nie jest już zrobiony. Kończy WERYFIKACJĄ ARTEFAKTU (czy strona
# naprawdę odpowiada i czy ma nawigację), nie samym „polecenia poszły".
#
# Użycie:
#   ./postaw.sh              # postaw / dociągnij do stanu docelowego
#   ./postaw.sh --pobierz    # wymuś ponowne pobranie motywu i treści
#   ./postaw.sh --zatrzymaj  # zatrzymaj kontenery (dane zostają)
#   ./postaw.sh --skasuj     # skasuj kontenery I DANE (pełny reset)

set -euo pipefail
cd "$(dirname "$0")"

STACK="${STACK_NAZWA:-aai_wp}"
PORT="${WP_PORT:-8892}"
ADRES="http://127.0.0.1:${PORT}"
ZRODLO_MOTYWU="https://github.com/MatthewPlugins/automatic-ai.git"
ODPOWIEDZ="$(mktemp -t aai-weryfikacja.XXXXXX.html)"

# WARSZTAT (motyw + treść strony głównej) leży POZA REPO — świadomie.
# Strażnicy tego projektu skanują DYSK, nie zawartość gita, więc cudze
# pliki w drzewie repo trafiają im pod skanowanie nawet wtedy, gdy są
# w .gitignore. Przy pierwszym podejściu `straznik-seo` znalazł blok
# danych strukturalnych w generatorze motywu strony głównej i oskarżył
# nasz projekt o cudzy kod. Trzymanie tego poza repo zamyka całą klasę.
WARSZTAT="${WARSZTAT:-${XDG_CACHE_HOME:-$HOME/.cache}/automatic-ai-warsztat}"
export WARSZTAT

komunikat() { printf '\n\033[1m» %s\033[0m\n' "$*"; }
blad() { printf '\033[31mBŁĄD: %s\033[0m\n' "$*" >&2; exit 1; }

wpcli() { podman exec -u 33:33 "${STACK}_cli" wp --path=/var/www/html "$@"; }

# --- 0. narzędzia ----------------------------------------------------------

for narzedzie in podman podman-compose git curl; do
  command -v "$narzedzie" >/dev/null 2>&1 || blad "brak narzędzia: $narzedzie"
done

case "${1:-}" in
  --zatrzymaj) komunikat "Zatrzymuję ${STACK}"; podman-compose down; exit 0 ;;
  --skasuj)
    komunikat "Kasuję ${STACK} RAZEM Z DANYMI"
    podman-compose down -v
    exit 0 ;;
esac

# --- 1. motyw i treść strony głównej ---------------------------------------
#
# Repo strony głównej jest u nas TYLKO DO ODCZYTU (WYTYCZNE, po BLAD-007),
# więc bierzemy sparse checkout do katalogu poza gitem — nie kopiujemy
# cudzych plików do naszej historii i nie dotykamy niczyjego klonu.

if [ "${1:-}" = "--pobierz" ] || [ ! -d "$WARSZTAT/wp/theme" ]; then
  komunikat "Pobieram motyw i treść strony głównej do $WARSZTAT"
  rm -rf "$WARSZTAT" "$WARSZTAT.tmp"
  mkdir -p "$(dirname "$WARSZTAT")"
  git clone --depth 1 --filter=blob:none --sparse "$ZRODLO_MOTYWU" "$WARSZTAT.tmp"
  ( cd "$WARSZTAT.tmp" && git sparse-checkout set wordpress )
  mv "$WARSZTAT.tmp/wordpress" "$WARSZTAT"
  rm -rf "$WARSZTAT.tmp"
fi
[ -f "$WARSZTAT/wp/theme/automatic-ai/style.css" ] || blad "motyw nie pobrał się poprawnie"

# --- 2. sekrety instancji roboczej -----------------------------------------

if [ ! -f .env ]; then
  komunikat "Generuję .env (hasła instancji roboczej)"
  {
    echo "DB_PASSWORD=$(openssl rand -hex 16)"
    echo "DB_ROOT_PASSWORD=$(openssl rand -hex 16)"
    echo "WP_ADMIN_HASLO=$(openssl rand -hex 16)"
  } > .env
  chmod 600 .env
fi
# shellcheck disable=SC1091
set -a; . ./.env; set +a

# --- 3. kontenery ----------------------------------------------------------

komunikat "Podnoszę kontenery (${STACK}, port ${PORT})"
podman-compose up -d >/dev/null

komunikat "Czekam na bazę"
for i in $(seq 1 60); do
  podman exec "${STACK}_db" mariadb -uwordpress -p"${DB_PASSWORD}" -e "SELECT 1" wordpress >/dev/null 2>&1 && break
  [ "$i" = 60 ] && blad "baza nie wstała w 60 s"
  sleep 1
done

komunikat "Czekam na WordPressa"
for i in $(seq 1 60); do
  curl -sf -o /dev/null "$ADRES" && break
  [ "$i" = 60 ] && blad "WordPress nie odpowiada na ${ADRES}"
  sleep 1
done

# --- 4. instalacja WordPressa ----------------------------------------------

if ! wpcli core is-installed >/dev/null 2>&1; then
  komunikat "Instaluję WordPressa"
  wpcli core install \
    --url="$ADRES" \
    --title="Automatic AI (środowisko robocze)" \
    --admin_user=admin \
    --admin_password="${WP_ADMIN_HASLO}" \
    --admin_email=admin@example.test \
    --skip-email
  wpcli option update blog_public 0   # instancja robocza nie idzie do wyszukiwarek
  wpcli rewrite structure '/%postname%/' --hard
fi

# --- 5. motyw --------------------------------------------------------------

if [ "$(wpcli theme get automatic-ai --field=status 2>/dev/null || echo brak)" != "active" ]; then
  komunikat "Włączam motyw Automatic AI"
  wpcli theme activate automatic-ai
fi

# --- 6. Tutor LMS + WooCommerce --------------------------------------------
#
# Podział odpowiedzialności z ETAP-WP.md: konta i dostęp do materiału
# bierze Tutor, koszyk i płatności WooCommerce. Nasze wtyczki nie
# przepisują tego, co te dwie mają z pudełka.

for wtyczka in woocommerce tutor; do
  if [ "$(wpcli plugin get "$wtyczka" --field=status 2>/dev/null || echo brak)" = "brak" ]; then
    komunikat "Instaluję ${wtyczka}"
    wpcli plugin install "$wtyczka" --activate
  elif [ "$(wpcli plugin get "$wtyczka" --field=status)" != "active" ]; then
    wpcli plugin activate "$wtyczka"
  fi
done

# --- 7. treść strony głównej (menu, strony, blog) --------------------------
#
# Bez niej nie da się sprawdzić najważniejszej rzeczy w tym etapie:
# czy pozycja „Szkolenia" wchodzi w PRAWDZIWĄ nawigację motywu.

# Warunek pyta o KONKRETNĄ stronę z importu, nie o liczbę stron: Tutor
# i WooCommerce same tworzą po kilka własnych (dashboard, koszyk, kasa,
# moje konto), więc licznik był spełniony, zanim cokolwiek zaimportowaliśmy
# — i import po cichu się nie odbywał. Złapane przy pierwszym uruchomieniu.
if ! wpcli post list --post_type=page --name=uslugi --format=count | grep -q '^1$'; then
  komunikat "Importuję treść strony (idempotentnie)"
  wpcli eval-file /praca/skrypty/import-strony.php || true
  wpcli eval-file /praca/skrypty/import-blog.php || true
fi

# --- 8. nasza wtyczka ------------------------------------------------------

if [ -f ../wtyczki/aai-sklep/aai-sklep.php ]; then
  # Pytamy KONTENER, czy widzi wtyczkę — nie dysk.
  #
  # Bind mount trzyma INODE katalogu, więc kiedy katalog zostanie na dysku
  # odtworzony po starcie kontenera (przełączenie gałęzi, przeniesienie,
  # `git clean`), kontener widzi w tym miejscu pustkę. Na dysku plik jest,
  # `podman inspect` pokazuje poprawną ścieżkę, a WordPress po prostu
  # przestaje znać wtyczkę — objaw wygląda na błąd wtyczki, nie montażu.
  # Bez tego sprawdzenia następną linią leci `wp plugin activate`, które
  # mówi tylko „The 'aai-sklep' plugin could not be found".
  podman exec "${STACK}_cli" \
    test -f /var/www/html/wp-content/plugins/aai-sklep/aai-sklep.php \
    || blad "kontener nie widzi wtyczki aai-sklep, choć na dysku ona jest — martwy bind mount (katalog odtworzony po starcie kontenera). Napraw: podman-compose down && ./postaw.sh"

  if [ "$(wpcli plugin get aai-sklep --field=status 2>/dev/null || echo brak)" != "active" ]; then
    komunikat "Włączam wtyczkę aai-sklep"
    wpcli plugin activate aai-sklep
  fi
else
  komunikat "Wtyczki aai-sklep jeszcze nie ma — pomijam (to normalne na starcie)"
fi

# Plugin 2 — szew do WooCommerce i Tutora. Te same pułapki co wyżej,
# więc to samo pytanie do KONTENERA przed aktywacją.
if [ -f ../wtyczki/aai-platnosci/aai-platnosci.php ]; then
  podman exec "${STACK}_cli" \
    test -f /var/www/html/wp-content/plugins/aai-platnosci/aai-platnosci.php \
    || blad "kontener nie widzi wtyczki aai-platnosci, choć na dysku ona jest — martwy bind mount (nowy mount wymaga odtworzenia kontenerów). Napraw: podman-compose down && ./postaw.sh"

  if [ "$(wpcli plugin get aai-platnosci --field=status 2>/dev/null || echo brak)" != "active" ]; then
    komunikat "Włączam wtyczkę aai-platnosci"
    wpcli plugin activate aai-platnosci
  fi
else
  komunikat "Wtyczki aai-platnosci jeszcze nie ma — pomijam (to normalne przed krokiem P1)"
fi

# --- 9. WERYFIKACJA ARTEFAKTU ----------------------------------------------
#
# Nie „polecenia poszły", tylko „strona naprawdę oddaje to, co ma oddawać".
# Ta klasa błędu kosztowała nas już dwa razy (0.24.0 i BLAD-012).

komunikat "Weryfikacja"

# `-L` jest tu KONIECZNE, nie kosmetyczne: świeżo aktywowane WooCommerce
# i Tutor potrafią przekierować pierwsze żądanie, a `curl` bez podążania
# za przekierowaniem oddaje pustą treść — czyli weryfikacja twierdzi, że
# to nie ten motyw, choć motyw jest poprawny. Tak padł pierwszy przebieg.
kod=$(curl -sL -o "$ODPOWIEDZ" -w '%{http_code}' "$ADRES") \
  || blad "strona nie odpowiada"
[ "$kod" = "200" ] || blad "strona oddała HTTP $kod zamiast 200"

# Grepujemy PLIK, nie zmienną przez potok.
#
# `set -o pipefail` + `grep -q` to pułapka, która kosztowała tu przebieg:
# `grep -q` kończy pracę po PIERWSZYM trafieniu, więc `echo` z drugiej
# strony potoku dostaje SIGPIPE i zwraca 141 — a `pipefail` przepisuje
# ten kod na cały potok. Efekt: warunek zgłasza porażkę DOKŁADNIE WTEDY,
# gdy wzorzec został znaleziony, i to tym częściej, im większa strona
# (przy 142 kB za każdym razem). To ta sama rodzina co lekcja z D5:
# `node skrypt | tail` maskuje kod wyjścia.
grep -q 'aria-label="Nawigacja główna"' "$ODPOWIEDZ" \
  || blad "strona odpowiada, ale to NIE jest motyw Automatic AI (brak jego nawigacji)"
grep -q 'aria-label="Nawigacja mobilna"' "$ODPOWIEDZ" \
  || blad "brak nawigacji mobilnej — pozycja w menu musi wejść do OBU"

if [ -f ../wtyczki/aai-sklep/aai-sklep.php ]; then
  [ "$(wpcli plugin get aai-sklep --field=status)" = "active" ] \
    || blad "wtyczka aai-sklep nie jest aktywna"
  wpcli eval 'echo Aai_Sklep_Tabele::czy_gotowe() ? "tabele-ok" : "tabele-brak";' \
    | grep -q "tabele-ok" || blad "wtyczka aktywna, ale jej tabele nie powstały"
fi

if [ -f ../wtyczki/aai-platnosci/aai-platnosci.php ]; then
  [ "$(wpcli plugin get aai-platnosci --field=status)" = "active" ] \
    || blad "wtyczka aai-platnosci nie jest aktywna"
  wpcli eval 'echo Aai_Platnosci_Tabele::istnieja() ? "tabele-ok" : "tabele-brak";' \
    | grep -q "tabele-ok" || blad "aai-platnosci aktywna, ale jej tabele (powiazania, dostawy) nie powstały"

  # PUNKT KONTROLNY (krok P2): środowisko nie melduje „gotowe", kiedy szew
  # jest rozjechany. Kontrola sama zna dwa progi — stan „w trakcie" i brak
  # Woo/Tutora kończą się kodem 0, więc czerwony kod TU znaczy prawdziwy
  # rozjazd: kurs płatny bez produktu, cena inna niż w naszej tabeli,
  # zerwane powiązanie albo kupowalna sierota.
  wpcli aai-platnosci sprawdz \
    || blad "szew kurs → produkt jest rozjechany (wp aai-platnosci sprawdz). Napraw: wp aai-platnosci sync"
fi

# HIGIENA ZASOBÓW — obie strony medalu, bo obie umieją się zepsuć osobno.
#
# (1) Strona MOTYWU nie może ładować arkuszy Tutora/Woo: `tutor-front.css`
# definiuje globalne `.text-label` z jasnym tłem, które kolidowało z klasą
# motywu o tej samej nazwie i łamało render (plakietki, marquee stopki —
# zrzuty właściciela z 2026-08-25). (2) Strona WOO musi swoje zasoby DALEJ
# dostawać — zdjęcie za szerokie wyglądałoby identycznie zielono, a psuło
# kasę sklepu. Wzorce celują w ADRESY plików, nie w uchwyty.
if [ -f ../wtyczki/aai-sklep/aai-sklep.php ]; then
  if grep -qE "plugins/tutor/[^\"']*\.(css|js)|woocommerce[^\"']*\.(css|js)|wc-blocks[^\"']*\.css|sourcebuster" "$ODPOWIEDZ"; then
    blad "strona motywu ładuje zasoby Tutora/WooCommerce — kolizja klas CSS wróci (np. .text-label z jasnym tłem)"
  fi
  KOSZYK="$(mktemp -t aai-koszyk.XXXXXX.html)"
  curl -sL -o "$KOSZYK" "$ADRES/cart/" || blad "koszyk nie odpowiada"
  grep -qE "woocommerce[^\"']*\.css" "$KOSZYK" \
    || blad "koszyk NIE dostaje arkuszy WooCommerce — higiena zasobów zdejmuje za szeroko"
  rm -f "$KOSZYK"
fi

liczba_pozycji=$(grep -o 'href="/[a-z-]*"' "$ODPOWIEDZ" | sort -u | wc -l)
rm -f "$ODPOWIEDZ"

printf '\n\033[32m✔ Środowisko gotowe\033[0m\n'
printf '  adres:    %s\n' "$ADRES"
printf '  admin:    %s/wp-admin (admin / patrz .env)\n' "$ADRES"
printf '  motyw:    %s\n' "$(wpcli theme list --status=active --field=name)"
printf '  wtyczki:  %s\n' "$(wpcli plugin list --status=active --field=name | tr '\n' ' ')"
printf '  nawigacja: %s pozycji w menu głównym\n' "$liczba_pozycji"
