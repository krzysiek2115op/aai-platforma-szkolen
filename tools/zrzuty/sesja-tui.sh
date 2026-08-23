#!/usr/bin/env bash
# Nagrywa REALNĄ sesję Claude Code przez PTY i zostawia surowy strumień
# terminala (z ANSI) do wyrenderowania przez tools/zrzuty/tui.mjs.
#
#   sesja-tui.sh <scenariusz.txt> <wyjscie.raw> [katalog-roboczy]
#
# Scenariusz to plik poleceń, po jednym w wierszu:
#   CZEKAJ <sekundy>     — odczekaj (na start sesji, na odpowiedź modelu)
#   WPISZ <tekst>        — wyślij tekst bez Entera
#   ENTER                — wyślij Enter
#   KLAWISZ <esc|tab|shift-tab|ctrl-o|ctrl-e|up|down|left|right|backspace|?>
#   WYCZYSC              — podwójne stuknięcie Esc: czyści pole wpisywania,
#                          a przy PUSTYM polu otwiera menu cofania (Rewind)
#   KASUJ <n>            — n backspace'ów jednym zapisem; kasowanie pewne,
#                          niezależne od tego, co akurat wisi nad polem
#   SUROWO <\xNN…>       — wyślij dowolną sekwencję (printf %b)
#   ZNACZNIK <nazwa>     — zapisz BIEŻĄCE przesunięcie w strumieniu do
#                          <wyjscie>.znaczniki; tui.mjs umie wyrenderować
#                          prefiks do znacznika, więc JEDNA sesja daje wiele
#                          ekranów (mniej startów, mniej tokenów).
#
# ZASADY (brief przelotu):
#  * sesja startuje z `--setting-sources project`, więc TUI jest STOCKOWE —
#    bez statusline'a, hooków, skilli i pluginów właściciela;
#  * katalog roboczy jest neutralny (/tmp/oliwia-demo), żeby na ekranie nie
#    było ścieżek domowych właściciela;
#  * na końcu ubijamy sesję SIGKILL-em — inaczej sekwencje wyjścia zamazują
#    ekran, który chcemy zrzucić.
#
# CZYSZCZENIE POLA (BLAD złapany 2026-08-23). Panel zamyka POJEDYNCZY Esc, ale
# tekst zostawiony w polu wpisywania kasuje dopiero PODWÓJNE STUKNIĘCIE — i to
# stuknięcie, nie dwa naciśnięcia w odstępie. `KLAWISZ esc` usypia po każdym
# klawiszu 0,6 s, więc dwa takie wiersze NIE mieszczą się w oknie double-tapu:
# pole zostaje pełne, kolejne komendy doklejają się do poprzednich (`/co` + `/sum`
# + `@` + `/hooks` = `/co/sum@/hooks`) i taka skleina zostaje WYSŁANA DO MODELU
# zamiast otworzyć panel. Stąd osobne WYCZYSC, które wysyła oba Esc jednym
# zapisem.
#
# WYCZYSC nie jest jednak uniwersalne: jego skutek zależy od tego, co wisi nad
# polem (menu podpowiedzi połyka pierwszy Esc) i czy pole jest puste (wtedy
# podwójny Esc OTWIERA MENU COFANIA i połyka wszystko, co wpiszemy dalej).
# Do zwykłego sprzątania po sobie służy więc KASUJ <n> — tyle backspace'ów, ile
# znaków wpisaliśmy. Na pustym polu backspace nic nie robi, więc KASUJ jest
# bezpieczne niezależnie od stanu ekranu.
set -u
SCEN=${1:?scenariusz}; WY=${2:?wyjscie.raw}; KAT=${3:-/tmp/oliwia-demo}

# STRAŻ NAD KONFIGURACJĄ WŁAŚCICIELA (brief, zasada 5 — rozszerzona 2026-08-23).
# HOME musi zostać prawdziwy (tylko w nim żyje uwierzytelnienie), więc sesja
# nagraniowa ma pełny dostęp do ustawień Claude Code. Panel `/config` da się
# przy tym przestawić PRZYPADKIEM: gdy scenariusz nie domknie panelu, kolejne
# `WPISZ` ląduje w polu wyszukiwania, a `ENTER` przełącza podświetlony
# przełącznik. Tak zniknął właścicielowi `autoCompactEnabled` (2026-08-23).
# Dlatego robimy migawkę PRZED i przywracamy PO — zmiana ustawień właściciela
# nigdy nie jest celem nagrania.
USTAWIENIA="$HOME/.claude/settings.json"
MIGAWKA=$(mktemp /tmp/sesja-tui-ustawienia-XXXX.json)
[ -f "$USTAWIENIA" ] && cp "$USTAWIENIA" "$MIGAWKA"
KOLUMNY=${TUI_KOLUMNY:-120}; WIERSZE=${TUI_WIERSZE:-40}
FIFO=$(mktemp -u /tmp/tui-in-XXXX); mkfifo "$FIFO"; rm -f "$WY" "$WY.znaczniki"

# CLAUDE_CODE_* z sesji-rodzica muszą zniknąć: dziedziczony znacznik sesji
# potomnej wypisuje w TUI ostrzeżenie o wyłączonym zapisie transkryptu.
( cd "$KAT" && env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_CHILD_SESSION \
    -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_SIMPLE -u ANTHROPIC_API_KEY \
    script -q -f -c "stty rows $WIERSZE cols $KOLUMNY; claude --setting-sources project ${CLAUDE_DODATKOWE:-}" \
    "$WY" ) < "$FIFO" > /dev/null 2>&1 &
NADZORCA=$!
exec 3>"$FIFO"

klawisz() { case "$1" in
  esc) printf '\033' >&3 ;;            tab) printf '\t' >&3 ;;
  shift-tab) printf '\033[Z' >&3 ;;    enter) printf '\r' >&3 ;;
  ctrl-o) printf '\017' >&3 ;;         ctrl-e) printf '\005' >&3 ;;
  ctrl-r) printf '\022' >&3 ;;         ctrl-c) printf '\003' >&3 ;;
  up) printf '\033[A' >&3 ;;           down) printf '\033[B' >&3 ;;
  left) printf '\033[D' >&3 ;;         right) printf '\033[C' >&3 ;;
  backspace) printf '\177' >&3 ;;      '?') printf '?' >&3 ;;
  *) echo "sesja-tui: nieznany klawisz '$1'" >&2; return 1 ;;
esac; }

while IFS= read -r linia || [ -n "$linia" ]; do
  case "$linia" in
    ''|'#'*)      continue ;;
    'CZEKAJ '*)   sleep "${linia#CZEKAJ }" ;;
    'WPISZ '*)    printf '%s' "${linia#WPISZ }" >&3; sleep 0.35 ;;
    'ENTER')      klawisz enter; sleep 0.6 ;;
    'KLAWISZ '*)  klawisz "${linia#KLAWISZ }"; sleep 0.6 ;;
    'WYCZYSC')    printf '\033\033' >&3; sleep 0.8 ;;
    'KASUJ '*)    n=${linia#KASUJ }; i=0
                  while [ "$i" -lt "$n" ]; do printf '\177' >&3; i=$((i+1)); done
                  sleep 0.6 ;;
    'SUROWO '*)   printf '%b' "${linia#SUROWO }" >&3; sleep 0.5 ;;
    'ZNACZNIK '*) sleep 0.4; printf '%s %s\n' "${linia#ZNACZNIK }" "$(stat -c%s "$WY")" >> "$WY.znaczniki" ;;
    *) echo "sesja-tui: nie rozumiem wiersza: $linia" >&2 ;;
  esac
done < "$SCEN"

exec 3>&-
# SIGKILL, nie SIGTERM: Claude Code przy łagodnym wyjściu przerysowuje ekran.
pkill -9 -P "$NADZORCA" 2>/dev/null
kill -9 "$NADZORCA" 2>/dev/null
wait 2>/dev/null
rm -f "$FIFO"
# `script` dokleja własny nagłówek i stopkę („Skrypt uruchomiony/wykonany…") —
# to NIE jest część ekranu Claude Code i nie może wejść do materiału kursu.
# UWAGA (BLAD złapany 2026-08-23): `-q` NIE tłumi tego nagłówka, a skasowanie go
# PRZESUWA CAŁY STRUMIEŃ W LEWO — wszystkie ZNACZNIK-i zapisane w trakcie sesji
# wskazują wtedy o `naglowek` bajtów ZA DALEKO i każdy ekran jest o krok późniejszy
# (kadr „pusta sesja" miał już wpisaną komendę). Dlatego mierzymy nagłówek PRZED
# usunięciem i odejmujemy go od zapisanych przesunięć. Stopka leży na końcu pliku,
# więc prefiksów nie rusza.
NAGLOWEK=0
if head -1 "$WY" 2>/dev/null | grep -qE '^(Skrypt uruchomiony |Script started )'; then
  NAGLOWEK=$(head -1 "$WY" | wc -c)
fi
sed -i -e '/^Skrypt uruchomiony /d' -e '/^Skrypt wykonany /d' \
       -e '/^Script started /d' -e '/^Script done /d' "$WY" 2>/dev/null
if [ "$NAGLOWEK" -gt 0 ] && [ -f "$WY.znaczniki" ]; then
  awk -v h="$NAGLOWEK" '{ o = $2 - h; if (o < 0) o = 0; print $1, o }' \
      "$WY.znaczniki" > "$WY.znaczniki.tmp" && mv "$WY.znaczniki.tmp" "$WY.znaczniki"
  printf 'znaczniki przesunięte o nagłówek script (-%s B)\n' "$NAGLOWEK"
fi
if [ -f "$MIGAWKA" ] && [ -f "$USTAWIENIA" ] && ! cmp -s "$MIGAWKA" "$USTAWIENIA"; then
  cp "$MIGAWKA" "$USTAWIENIA"
  echo "sesja-tui: UWAGA — sesja zmieniła $USTAWIENIA; przywrócono stan sprzed nagrania." >&2
  echo "sesja-tui: to znaczy, że scenariusz nie domknął panelu i ENTER trafił w przełącznik." >&2
fi
rm -f "$MIGAWKA"
printf 'nagrane %s (%s B)\n' "$WY" "$(stat -c%s "$WY")"
