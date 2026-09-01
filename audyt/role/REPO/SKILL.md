---
name: repo-truth-audit
description: Wyłącznie jako rola REPO sektora AUDYT: porównywanie zdań z dokumentacji ze stanem kodu i historią wydań, ze szczególnym naciskiem na prozę, której strażnik README nie czyta. Używać przy pozycjach REPO-01…REPO-11.
---

# Audyt prawdy repozytorium — umiejętność roli REPO

---

## TRZY ZASADY NADRZĘDNE

### 1. NIE MA WYMYŚLANIA BŁĘDÓW
Każde zgłoszenie ma podstawę i możliwość potwierdzenia. **Brak dowodu = brak
zgłoszenia.**

### 2. AUDYT I RE-AUDYT NIE NAPRAWIAJĄ
Sektory **znajdują i wskazują, nigdy nie poprawiają**.

### 3. SWÓJ ZAKRES — DRĄŻYĆ, NIE PRZEKAZYWAĆ
Audytor pracuje nad własnym znaleziskiem sam, **nie przekazuje go innemu
działowi** i nie naprawia.

---

## Kiedy używać

Przy pozycjach **REPO-02, REPO-06, REPO-07 i REPO-08** — czyli tam, gdzie trzeba
porównać zdanie z HISTORIĄ, a nie z plikiem.

Przy REPO-01, REPO-03, REPO-04, REPO-05 i REPO-10 istnieją strażniki, które to mierzą;
Twoim zadaniem jest sprawdzić, czy mierzą to, co obiecują — a nie powtórzyć ich pracę.

## Procedura

1. **Przejdź CAŁY plik, nie sekcję, od której zacząłeś.** Ta sama nieprawda żyje zwykle
   w kilku miejscach; pierwszy przelot higieny naprawił jedną sekcję i zatrzymał się nad
   nią, a właściciel znalazł tę samą nieprawdę sto linii niżej.
   *Wynik:* liczba przejrzanych linii pliku — nie „przejrzałem README".

2. **Dla każdego zdania o STANIE ustal wersję, w której to się stało.** „W toku",
   „następny krok", „PR nieotwarty" przy rzeczy wydanej to znalezisko.
   *Wynik:* zdanie `plik:linia` + tag albo commit, w którym rzecz weszła.

3. **Dla każdej liczby wskaż POMIAR, który ją daje.** Liczba bez komendy jest deklaracją.
   *Wynik:* liczba w prozie + komenda + jej wynik.

4. **Dla każdej bramki ręcznej znajdź ZAPISANY wynik.** Zaliczona, niezaliczona, kiedy,
   przez kogo.
   *Wynik:* `plik:linia` zapisu albo słowo BRAK.

5. **Dla każdej twardej reguły policz, ile razy została złamana.** Reguła z nazwanym
   wyjątkiem jest w porządku; reguła łamana bez wyjątku jest znaleziskiem.
   *Wynik:* reguła + liczba złamań + czy wyjątek jest nazwany.

6. **Rozstrzygnij, czy to REPO, czy PIK.** „README podaje 62 testy przy 83" jest Twoje;
   „pozycja definicji ukończenia odhaczona, choć niezrobiona" jest ich.
   *Wynik:* jedno słowo i zdanie uzasadnienia.

## Komendy

```
# deklaracje stanu wobec historii
grep -n "W TOKU\|NIEOTWARTY\|NASTĘPNY KROK\|planowane\|do zrobienia" CLAUDE.md README.md docs/*.md
git tag --sort=-creatordate | head -20
git log --oneline <tag1>..<tag2>

# liczby i ich pomiary
node tools/straznicy/straznik-readme.mjs
ls tools/straznicy/*.mjs | wc -l
grep -rc "test(\|it(" tests 2>/dev/null

# kody błędów wobec rejestru
grep -roh "BLAD-[0-9]*" --include="*.md" --include="*.mjs" --include="*.php" . | sort -u
python3 -c "import json;print(sorted(b['kod'] for b in json.load(open('rejestr/znane-bledy.json'))))" 2>/dev/null

# wyniki bramek ręcznych
grep -rn "ZALICZONY\|ZALICZONA\|zaliczył\|akceptuj" docs/**/TEST-RECZNY*.md CHANGELOG.md
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia zgodności schematów z kodem jako architektury** (→ ARCH): „klasa spoza
  schematu" jest ich, „schemat nieaktualny" — Twoje;
- **nie ocenia obietnic z pierwotnego planu** (→ PIK);
- **nie ocenia instrukcji instalacji jako PROCEDURY** (→ WDR): „martwa kotwica
  w instrukcji" jest Twoja, „krok, którego nie da się wykonać" — ich;
- **nie poprawia dokumentacji** — wskazujesz zdanie i miejsce, w którym jest nieprawdziwe.

## Znane pułapki

- **`straznik-readme` może być zielony i mieć rację, a dokument i tak kłamie.** Liczby
  pilnowane maszynowo bywają prawdziwe, gdy proza obok nich jest nieaktualna.
- **CLAUDE.md jest DZIENNIKIEM, nie instrukcją** — rośnie od góry ku dołowi, a zapisy
  nieaktualne są oznaczane jako „Zapis historyczny", nie kasowane. Zdanie sprzeczne
  z późniejszym nie zawsze jest błędem; sprawdź, czy jest oznaczone.
- **Jedna linia CLAUDE.md jest nieaktualna ŚWIADOMIE** i nie wolno jej ruszyć:
  niezmiennik sektora zabrania zmian poza `audyt/`. To jest zapisane w
  `audyt/PLAN-BUDOWY.md` jako pozycja do decyzji właściciela — **nie zgłaszaj jej
  jako nowej**, potwierdź, że nadal jest opisana.
- **Git nie przechowuje dat modyfikacji plików** — aktualność podglądów i generatów
  sprawdza się przez `sha256`, nie przez datę.
