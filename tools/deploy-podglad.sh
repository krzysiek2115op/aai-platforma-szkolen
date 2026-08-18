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
# Wołamy KOMENDĘ Z package.json, a nie `next build` wprost. Powód nie jest
# kosmetyczny: `build:podglad` uruchamia po buildzie `og-rozszerzenie.mjs`,
# który nadaje miniaturom OG rozszerzenie `.png`. Pierwsza wersja tego
# skryptu wołała `next build` bezpośrednio, więc krok nie zachodził
# i opublikowany podgląd oddawał 404 na KAŻDEJ miniaturze — build był
# zielony, weryfikacja żywego adresu też. Jedna komenda = jedna prawda
# o tym, jak powstaje podgląd.
npm run build:podglad

# --- 4. dowód, że build nadaje się do upublicznienia -----------------
# Kolejność jest istotna: sprawdzamy PRZED wysłaniem. Po wysłaniu
# publiczne repo ma już historię, z której nic się nie cofa.
echo "deploy: sprawdzam, co jest w out/…"
node tools/straznicy/straznik-podgladu.mjs
if grep -rlq "szkolenia/kreator" out --include="*.html"; then
  echo "deploy: w out/ jest odnośnik do kreatora — PRZERYWAM." >&2
  exit 1
fi

# Każdy adres miniatury OG w HTML-u musi wskazywać na PLIK, który
# naprawdę leży w out/. Ten test dopisano po tym, jak opublikowany
# podgląd oddał 404 na wszystkich czterech miniaturach: HTML wskazywał
# `.png`, a pliki `.png` nie powstały. Sprawdzanie „czy build przeszedł"
# tego nie widziało — sprawdzamy więc ARTEFAKT, nie proces.
#
# UWAGA NA WZORZEC: Next dokleja do adresu miniatury sygnaturę
# (`…opengraph-image.png?455fcc13`). Pierwsza wersja tego testu miała
# w klasie znaków `[^"?]*`, więc nie dopasowywała NICZEGO i pętla
# przebiegała po pustce — test „przechodził" nie sprawdzając nic.
# Zapytanie ucinamy dopiero po dopasowaniu.
BRAKI=0
while read -r adres; do
  SCIEZKA="out${adres#"${PAGES_BASE_PATH}"}"
  if [ ! -f "$SCIEZKA" ]; then
    echo "deploy: og:image wskazuje na nieistniejący plik: $SCIEZKA" >&2
    BRAKI=$((BRAKI + 1))
  fi
done < <(grep -rho 'property="og:image" content="[^"]*"' out --include="*.html" \
         | sed 's/.*content="//; s/"$//' \
         | sed 's/?.*$//' \
         | sed 's#^https\?://[^/]*##' | sort -u)
if [ "$BRAKI" -gt 0 ]; then
  echo "deploy: $BRAKI miniatur OG bez pliku — PRZERYWAM." >&2
  exit 1
fi
echo "deploy: miniatury OG mają swoje pliki."

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
