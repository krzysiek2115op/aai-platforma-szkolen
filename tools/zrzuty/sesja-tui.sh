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
set -u
SCEN=${1:?scenariusz}; WY=${2:?wyjscie.raw}; KAT=${3:-/tmp/oliwia-demo}
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
sed -i -e '/^Skrypt uruchomiony /d' -e '/^Skrypt wykonany /d' \
       -e '/^Script started /d' -e '/^Script done /d' "$WY" 2>/dev/null
printf 'nagrane %s (%s B)\n' "$WY" "$(stat -c%s "$WY")"
