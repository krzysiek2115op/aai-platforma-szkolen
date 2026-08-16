# Wytyczne projektu (od właściciela, 2026-08-16)

Zasady obowiązują przez CAŁY projekt. Można je doprecyzowywać, ale nie zmieniać
bez decyzji właściciela. Stosujemy je zawsze, gdy sytuacja tego dotyczy.

---

## 1. Naprawa wsteczna z `.bak` + rejestr błędów

Gdy błąd powstał wcześniej (np. w commicie 5), a wykryto go później (np. w 8):

1. **Kopia bezpieczeństwa** — przed naprawą zabezpiecz obecny stan:
   `git branch bak/<data>-<opis>` (gałąź-migawka; nic nie zginie, nawet gdy
   naprawa pójdzie źle). Do plików roboczych wolno użyć kopii `*.bak`,
   ale NIE commitujemy ich — `.gitignore` je wyklucza; migawką jest gałąź.
2. **Zlokalizuj źródło** — `git log`/`git bisect`: który commit wprowadził błąd.
3. **Napraw bez kolizji** — naprawa na osobnym branchu `fix/...`; przed merge
   MUSZĄ przejść goldeny (§5) i strażnicy — dowód, że naprawa niczego nie psuje.
4. **Wpis do rejestru** — każdy realny błąd trafia do
   [rejestr/znane-bledy.json](../rejestr/znane-bledy.json)
   (schemat: klasa / dowód / skutek / test — jak w projekcie egzaminacyjnym).
5. **Nowy strażnik + instrukcja** — jeśli klasę błędu da się wykrywać
   automatycznie, powstaje `tools/straznicy/straznik-<nazwa>.mjs`
   z komentarzem-instrukcją (PO CO istnieje, JAK działa, CO łapie).
   Ten sam błąd nie ma prawa wrócić niezauważony.

## 2. Rekordy na GitHubie — pilnowanie statusów

Statusy (checks) przy commitach/PR-ach są wiążące:

- **czerwony status = STOP** — nie mergujemy, dopóki CI/audyt nie przejdzie;
- po każdym pushu na PR sprawdzamy wynik checków ZANIM ruszymy dalej
  (tak działał merge PR #1 — merge dopiero po zielonych checkach);
- odrzucenie przez audyt to informacja o błędzie, nie przeszkoda do obejścia.

## 3. Licencja

Projekt na licencji **GPL-2.0** — plik [LICENSE](../LICENSE) w korzeniu,
deklaracja w README. Pilnuje `straznik-licencji`.

## 4. Agenci: skill + golden dla ważnych zadań

Przy planowaniu pracy z agentami: agent, który ma **ważne, trudniejsze,
inne niż pozostali** zadanie, dostaje:

- **skill** — spisaną umiejętność/instrukcję roli (jak ma pracować, na co uważać),
- **golden** — wzorcowy przykład wejście → poprawne wyjście, z którym
  porównuje swoją pracę, żeby wydajność nie spadała.

Struktura (powstanie wraz z pierwszymi agentami):

```
agenci/<nazwa-agenta>/
  AGENT.md      ← rola, zadanie, granice
  KRYTYK.md     ← rola krytyka tego agenta (§8)
  SKILL.md      ← umiejętność (dla ważnych/trudnych zadań)
  goldeny/      ← wzorcowe pary wejście → wyjście
```

## 5. Goldeny regresji — naprawa nie może psuć

Przy KAŻDEJ naprawie błędu: zanim naprawa wejdzie do main, musi być dowód,
że nic innego nie zostało skolidowane (zepsute). Dowód = goldeny:
zapisane wzorcowe wyniki (strony, odpowiedzi API, zrzuty tabel), które po
naprawie muszą wyjść IDENTYCZNE — poza miejscem świadomie naprawianym.
Katalog `goldeny/` w korzeniu; porównanie robi strażnik/test, nie oko.

## 6. Weryfikacja co każdy krok

Każdy krok = pełna ścieżka **Weryfikacja-PR**
(branch → commit → PR → CI zielone → merge → release/deploy gdy potrzebne)
+ strażnicy lokalnie przed commitem. Szczegóły: [CONTRIBUTING.md](../CONTRIBUTING.md).

## 7. Dokumentacja techniczna — pobierana, nie zmyślana

Gdy potrzebna jest wiedza techniczna (API bramki płatności, Next.js,
PostgreSQL...), pobieramy ORYGINALNĄ dokumentację z sieci i zapisujemy
w repo, zamiast polegać na pamięci.

---

# NAJWAŻNIEJSZE (zasady nadrzędne)

## N1. Każdy agent ma KRYTYKA — nigdy agent sam

Żaden zbudowany agent nie pracuje bez pary: **agent wykonuje, krytyk ocenia**
(szuka błędów, sprawdza z goldenem i dokumentacją, odrzuca słabą robotę).
Dotyczy to każdego agenta w projekcie, bez wyjątków.

## N2. Każdy dział dostaje ORYGINALNĄ dokumentację techniczną z sieci

Do każdego budowanego działu pobieramy oryginalną dokumentację techniczną
i kładziemy ją w repo dla agentów:

```
docs/dokumentacja-techniczna/<dzial>/
  ZRODLA.md   ← skąd pobrano (URL, data, wersja)
  *.md        ← pobrana treść
```

Agent pracujący w dziale korzysta z NIEJ, nie z ogólnej pamięci modelu.

## N3. Diagram właściciela

Przed budową właściciel przysyła schemat/diagram swojego planu.
Można go ocenić i zaproponować zmiany, ale **wytyczne z tego pliku
zostają takie, jakie są**.
