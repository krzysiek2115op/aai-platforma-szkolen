#!/usr/bin/env bash
# Publikuje STATYCZNY PODGLĄD podstrony /szkolenia na GitHub Pages.
#
# Kod źródłowy zostaje w PRYWATNYM repo (Pod-strona-Szkolenia);
# publikowany jest wyłącznie zbudowany katalog out/, do PUBLICZNEGO repo
# MatthewPlugins/szkolenia-podglad (gałąź gh-pages). Tak samo robi
# strona główna — publiczne repo widzi HTML, nie źródła.
#
# Publikujemy RĘCZNIE, nie z GitHub Actions: limit minut organizacji jest
# wyczerpany do 1 września (patrz CLAUDE.md), a deploy z katalogu
# roboczego nie zużywa ani minuty.
#
# BLAD-007, lekcja wpisana tu na stałe: `npm run deploy` buduje
# z KATALOGU ROBOCZEGO, a nie z commitów. Czysty `git status` w repo
# źródłowym niczego nie gwarantował — i właśnie dlatego niecommitowana
# zmiana wyciekła kiedyś na publiczny podgląd. Dlatego ten skrypt
# ODMAWIA publikacji z brudnego drzewa: to, co widzi git, ma być tym,
# co idzie do sieci.
#
# Użycie: npm run deploy:podglad
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="MatthewPlugins/szkolenia-podglad"
GALAZ="gh-pages"
export PAGES_BASE_PATH="/szkolenia-podglad"
ADRES="https://matthewplugins.github.io${PAGES_BASE_PATH}/"

# --- 1. drzewo musi być czyste (BLAD-007) ---------------------------
if [ -n "$(git status --porcelain)" ]; then
  echo "deploy: drzewo robocze NIE jest czyste." >&2
  echo "        Build bierze pliki z katalogu roboczego, nie z commitów," >&2
  echo "        więc opublikowałbyś coś, czego nie ma w historii (BLAD-007)." >&2
  echo "        Zacommituj albo schowaj zmiany i powtórz." >&2
  git status --short >&2
  exit 1
fi

# --- 2. baza musi odpowiadać ----------------------------------------
# Podgląd renderuje kursy Z BAZY w czasie builda. Bez bazy powstałby
# katalog z pustym stanem — czyli podgląd, który KŁAMIE o zawartości
# sklepu, a wygląda na udany.
if ! node tools/db1-gotowa.mjs >/dev/null 2>&1; then
  echo "deploy: baza db1_kursy nie odpowiada — uruchom 'npm run db1:up'." >&2
  echo "        Bez niej podgląd zbudowałby się PUSTY i nikt by tego nie zauważył." >&2
  exit 1
fi

# --- 3. build podglądu ----------------------------------------------
echo "deploy: buduję podgląd statyczny (basePath ${PAGES_BASE_PATH})…"
PODGLAD_STATYCZNY=1 npx next build

# --- 4. dowód, że build nadaje się do upublicznienia -----------------
# Kolejność jest istotna: sprawdzamy PRZED wysłaniem. Po wysłaniu
# publiczne repo ma już historię, z której nic się nie cofa.
echo "deploy: sprawdzam, co jest w out/…"
node tools/straznicy/straznik-podgladu.mjs
if grep -rlq "szkolenia/kreator" out --include="*.html"; then
  echo "deploy: w out/ jest odnośnik do kreatora — PRZERYWAM." >&2
  exit 1
fi

SHA=$(git rev-parse --short HEAD)

# Autor commita publikacji = osoba, która go uruchomiła. Publiczne repo
# zachowa ten wpis na stałe, więc prywatny adres e-mail nie ma prawa
# tam trafić — przepuszczamy wyłącznie adresy noreply.
NAZWA=$(git config user.name || echo "Automatic AI")
EMAIL=$(git config user.email || echo "")
case "$EMAIL" in
  *noreply*) ;;
  *)
    echo "deploy: '$EMAIL' nie jest adresem noreply — commit podpisze <deploy@automaticai.pl>." >&2
    echo "        Aby podpisywać własnym kontem: git config user.email ID+LOGIN@users.noreply.github.com" >&2
    EMAIL="deploy@automaticai.pl"
    ;;
esac

# --- 5. publikacja ---------------------------------------------------
cd out
touch .nojekyll          # bez tego Pages zjada katalogi zaczynające się od _
git init -q
git symbolic-ref HEAD "refs/heads/${GALAZ}"
git config user.name "$NAZWA"
git config user.email "$EMAIL"
git add -A
git commit -q -m "podgląd: ${SHA}"
GIT_TERMINAL_PROMPT=0 git push -q -f "https://github.com/${REPO}.git" "${GALAZ}"
rm -rf .git
cd ..

echo "deploy: czekam, aż GitHub Pages przebuduje…"
node tools/sprawdz-zywy.mjs "${ADRES}szkolenia" out/szkolenia.html 300

echo "✔ Podgląd opublikowany i zweryfikowany: ${ADRES}szkolenia"
