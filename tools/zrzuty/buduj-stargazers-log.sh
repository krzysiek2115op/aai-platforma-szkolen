#!/usr/bin/env bash
# Budowniczy repozytorium stargazers-log — stany kursu „Jak używać GitHuba".
# Etapowy i odtwarzalny: ./buduj.sh <etap>  (etapy: m1 m2 m3 m4 m5)
# Treści są SPECYFIKACJĄ z prozy lekcji — nie zmieniać bez zajrzenia do lekcji.
set -euo pipefail
WLASC=krzysiek2115op
REPO=stargazers-log
KATALOG="$(dirname "$0")/klon"
AUTOR_NAZWA="oliwia-dev"
AUTOR_MAIL="oliwia-dev@users.noreply.github.com"

g() { git -C "$KATALOG" -c user.name="$AUTOR_NAZWA" -c user.email="$AUTOR_MAIL" "$@"; }

etap_m1() {
  gh repo create "$WLASC/$REPO" --public \
    --description "A log of the repositories I've starred." --add-readme
  sleep 2
  rm -rf "$KATALOG"
  gh repo clone "$WLASC/$REPO" "$KATALOG"
  # lekcja 1.4: index.html przez „Create new file" (komunikat domyślny web UI)
  cat > "$KATALOG/index.html" <<'HTML'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Stargazers log</title>
  </head>
  <body>
    <h1>Stargazers log</h1>
    <p>A log of the repositories I've starred.</p>
  </body>
</html>
HTML
  g add index.html && g commit -m "Create index.html" && g push origin main
  # lekcja 1.7: pierwszy commit z terminala
  printf '\nA log of the repositories I have starred.\n' >> "$KATALOG/README.md"
  g add README.md && g commit -m "pierwsza migawka z terminala" && g push origin main
}

etap_m2() {
  # lekcja 2.1: gałąź add-starred-list + commit „Add starred list note"
  g checkout -b add-starred-list
  printf '\nWkrótce: lista gwiazdkowanych repozytoriów.\n' >> "$KATALOG/README.md"
  g add README.md && g commit -m "Add starred list note" && g push -u origin add-starred-list
  g checkout main
  # lekcja 2.3: pliki dodane „na GitHubie" (u nas: osobne commity web-style)
  printf 'Notatki robocze projektu.\n' > "$KATALOG/notatki.md"
  g add notatki.md && g commit -m "Create notatki.md" && g push origin main
  printf 'Druga porcja notatek.\n' > "$KATALOG/notatki2.md"
  g add notatki2.md && g commit -m "Create notatki2.md" && g push origin main
  # lekcja 2.4: .gitignore w kolejności z lekcji
  printf 'szkic.txt\n' > "$KATALOG/.gitignore"
  touch "$KATALOG/szkic.txt"
  g add .gitignore && g commit -m "dodaj .gitignore" && g push origin main
  g rm --cached notatki2.md >/dev/null
  printf 'notatki2.md\n' >> "$KATALOG/.gitignore"
  g add .gitignore && g commit -m "ignoruj notatki2.md" && g push origin main
}

etap_m3() {
  # lekcja 3.2: README z pięcioma sekcjami; 3.3: plac zabaw Markdownu
  cat > "$KATALOG/README.md" <<'MD'
# stargazers-log

## Co robi

Strona, która śledzi i wyświetla repozytoria oznaczone przeze mnie gwiazdką — osobisty katalog narzędzi i projektów, na których mi zależy.

## Dlaczego jest przydatna

Zbiera w jednym miejscu projekty, do których chcę wracać — bez szukania po historii przeglądarki.

## Jak zacząć

Otwórz `index.html` w przeglądarce.

[Zobacz stronę projektu](index.html)

## Gdzie szukać pomocy

Pytania zadawaj w zakładce Issues tego repozytorium.

## Kto utrzymuje projekt

Projekt prowadzę samodzielnie i aktualizuję go w wolnych chwilach.

## Plac zabaw Markdownu

Pierwsza linia bez triku
druga linia zaraz po niej

Pierwsza linia z dwiema spacjami na końcu  
druga linia zaraz po niej

- [x] założyć repozytorium stargazers-log
- [ ] dodać listę gwiazdkowanych repozytoriów
- [ ] opublikować stronę projektu

> [!TIP]
> Listę zadań widać też w podglądzie issues i pull requestów.
MD
  g add README.md && g commit -m "Update README.md" && g push origin main
  # lekcja 3.5: reguła ochrony main — dwa domyślne zakazy, nic więcej
  gh api -X PUT "repos/$WLASC/$REPO/branches/main/protection" \
    --input - <<'JSON'
{"required_status_checks":null,"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}
JSON
  # lekcja 3.6: wydanie v1.0.0 z generowanymi notatkami
  gh release create v1.0.0 --repo "$WLASC/$REPO" --target main \
    --title "Pierwsze wydanie" --generate-notes
}

etap_m4() {
  # lekcja 4.2: issue z ćwiczenia
  gh issue create --repo "$WLASC/$REPO" \
    --title "Dodać opis projektu do README" \
    --body $'Sekcja „Dlaczego jest przydatna" ma dziś jedno zdanie.\n\n- dopisać, skąd biorą się dane\n- dopisać przykład użycia'
}

etap_m5() {
  # lekcja 5.2: workflow demo (treść co do znaku z lekcji)
  mkdir -p "$KATALOG/.github/workflows"
  cat > "$KATALOG/.github/workflows/github-actions-demo.yml" <<'YML'
name: GitHub Actions Demo
run-name: ${{ github.actor }} is testing out GitHub Actions 🚀
on: [push]
jobs:
  Explore-GitHub-Actions:
    runs-on: ubuntu-latest
    steps:
      - run: echo "🎉 The job was automatically triggered by a ${{ github.event_name }} event."
      - run: echo "🐧 This job is now running on a ${{ runner.os }} server hosted by GitHub!"
      - run: echo "🔎 The name of your branch is ${{ github.ref }} and your repository is ${{ github.repository }}."
      - name: Check out repository code
        uses: actions/checkout@v6
      - run: echo "💡 The ${{ github.repository }} repository has been cloned to the runner."
      - run: echo "🖥️ The workflow is now ready to test your code on the runner."
      - name: List files in the repository
        run: |
          ls ${{ github.workspace }}
      - run: echo "🍏 This job's status is ${{ job.status }}."
YML
  g add .github && g commit -m "Create github-actions-demo.yml" && g push origin main
}

etap_pr() {
  # PR otwarty z gałęzi z lekcji 2.1 (do zrzutów modułu 4)
  g checkout add-starred-list
  g merge -m "sync main" origin/main
  printf '\n- Lista gwiazdkowanych repozytoriów: wersja robocza.\n' >> "$KATALOG/README.md"
  g add README.md && g commit -m "Draft starred list section" && g push origin add-starred-list
  gh pr create --repo "$WLASC/$REPO" --base main --head add-starred-list \
    --title "Dodaj sekcję listy gwiazdkowanych repozytoriów" \
    --body $'Dopisuje do README zapowiedź listy gwiazdkowanych repozytoriów.\n\nProblem: sekcja „Dlaczego jest przydatna" nie mówi, co konkretnie projekt pokaże.\n\nCloses #1'
  g checkout main
}

etap_konflikt() {
  # PR, który konfliktuje z main (ta sama linia README)
  g checkout -b poprawa-opisu main
  sed -i 's/^Strona, która śledzi.*/Katalog repozytoriów z gwiazdką — zbiera narzędzia, do których wracam./' "$KATALOG/README.md"
  g add README.md && g commit -m "Przeredaguj opis projektu" && g push origin poprawa-opisu
  gh pr create --repo "$WLASC/$REPO" --base main --head poprawa-opisu \
    --title "Przeredaguj opis projektu w README" \
    --body "Krótszy opis w sekcji Co robi."
  g checkout main
  sed -i 's/^Strona, która śledzi.*/Strona, która śledzi repozytoria oznaczone gwiazdką i pokazuje je jako listę./' "$KATALOG/README.md"
  g add README.md && g commit -m "Doprecyzuj opis projektu" && g push origin main
}

etap_scalony() {
  # PR już scalony (do zrzutu „potwierdzenie udanego scalenia")
  g checkout -b dopisz-licencje main
  printf 'MIT\n' > "$KATALOG/LICENSE.txt"
  g add LICENSE.txt && g commit -m "Dodaj plik licencji" && g push origin dopisz-licencje
  local nr
  nr=$(gh pr create --repo "$WLASC/$REPO" --base main --head dopisz-licencje \
    --title "Dodaj plik licencji" --body "Krótki plik LICENSE.txt." | grep -o '[0-9]*$')
  sleep 3
  gh pr merge "$nr" --repo "$WLASC/$REPO" --merge --delete-branch
  g checkout main && g pull origin main
}

for etap in "$@"; do "etap_$etap"; done
echo "GOTOWE: $*"
