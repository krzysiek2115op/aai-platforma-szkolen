#!/usr/bin/env bash
# Jak nagraj.sh, ale w ODIZOLOWANYM HOME — komendy `--global` nie dotykają
# konfiguracji właściciela. Wyjście nadal pochodzi z realnego wykonania.
set -uo pipefail
DOM="$1"; KAT="$2"; shift 2
WY=$(cd "$KAT" && HOME="$DOM" script -qec "$*" /dev/null 2>&1 | sed 's/\r$//')
python3 -c "
import json,sys
print(json.dumps({'cmd': sys.argv[1], 'out': sys.stdin.read().rstrip('\n')}, ensure_ascii=False))
" "$*" <<< "$WY"
