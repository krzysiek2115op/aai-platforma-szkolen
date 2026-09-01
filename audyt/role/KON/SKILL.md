---
name: assumption-breaker
description: Wyłącznie jako rola KON sektora AUDYT: szukanie luk w samym audycie — plików bez właściciela, klas błędów bez pozycji, zakresów przechodzących po pustce i deklaracji bez kontrprzykładu. Używać w fazie A i fazie B.
---

# Łamanie założeń audytu — umiejętność roli KON

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

**Dwa razy w każdej fali:** w fazie A, zanim działy zaczną pracę (atakujesz zakresy),
i w fazie B, po ich raportach (atakujesz wyniki).

Nie wołasz jej w trakcie pracy działów — Twoje pytania dotyczą stanu zamkniętego,
nie procesu.

## Procedura

1. **Policz, zamiast czytać.** Każde Twoje znalezisko z fazy A wyszło z sumy, nie
   z lektury. Unia zakresów, zbiór wykluczeń, `git ls-files` — suma musi się zamykać
   co do pliku.
   *Wynik:* trzy liczby i ich suma wobec liczby plików w repo.

2. **Uruchom KAŻDY zakres i policz wynik.** Zakres zwracający zero przechodzi po pustce
   i wygląda jak zakres precyzyjny.
   *Wynik:* czternaście liczb wobec czternastu deklaracji z `ROLE.md`.

3. **Zestaw rejestr klas błędów z checklistami.** Klasa, która wróciła raz, wraca znowu
   — a wzorzec celujący w nazwę wracał dziewięć razy.
   *Wynik:* dla każdego `BLAD-*` pozycja checklisty albo słowo BRAK.

4. **Dla każdej pary działów o nakładających się zakresach sprawdź, czy tabela granic
   ma wiersz.** Cisza tabeli to Twoje `KON-A5`.
   *Wynik:* lista par bez wiersza, z liczbą wspólnych plików.

5. **Weź każdą pozycję checklisty i spróbuj odpowiedzieć BEZ otwierania pliku.**
   Jeśli się da — pozycja jest zepsuta.
   *Wynik:* lista pozycji, na które da się odpowiedzieć z pamięci.

6. **W fazie B: dla każdej deklaracji działu podaj KONTRPRZYKŁAD albo napisz, że go
   nie znalazłeś.** „Wygląda solidnie" nie jest wynikiem tej roli.
   *Wynik:* deklaracja + ścieżka, której nie objęła, albo jawne „nie znalazłem".

## Komendy

```
# pokrycie i sumy
node audyt/tools/mapa.mjs
git ls-files | wc -l

# każdy zakres uruchomiony i policzony
node -e 'import("./audyt/tools/wspolne.mjs").then(async m=>{const {execFileSync}=await import("node:child_process");for(const z of m.zakresyZRoleMd()){const n=execFileSync("bash",["-c",z.komenda],{cwd:m.KORZEN,encoding:"utf8"}).split("\n").filter(Boolean).length;console.log(z.kod,n)}})'

# klasy błędów wobec checklist
python3 -c "import json;print(len(json.load(open('rejestr/znane-bledy.json'))))"
grep -c "BLAD-" audyt/ROLE.md

# stan sektora
node audyt/tools/straznik-sektora-audytu.mjs
node audyt/tools/status.mjs --pokaz
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie łamie założeń SYSTEMU** — „co, jeśli baza nie odpowie" należy do działów (§7);
- **nie audytuje kodu produktu** — to jest praca czternastu działów, a Twoja polega na
  pytaniu, czy oni ją wykonali;
- **nie naprawia audytu** — luka w sektorze jest zgłoszeniem, nie zadaniem;
- **nie zastępuje krytyków ról** — oni oceniają JAKOŚĆ znalezisk, Ty KOMPLETNOŚĆ audytu.

## Znane pułapki

- **Test negatywny mutujący niewłaściwy plik przechodzi po pustce.** Zdarzyło się przy
  schematach: mutacja celowała w plik, który nie wymienia ani jednej nazwy klasy, `sed`
  nie zmienił nic i test „przeszedł".
- **Pomiar bez sprawdzenia kodu wyjścia mierzy ciszę.** Trzy bramki pokazały „zostawia 0",
  bo w ogóle się nie uruchomiły — brakowało zmiennej środowiskowej.
- **Grep jednoliniowy gubi wywołania łamane na kilka linii** — siedem szwów wyglądało
  na sześć.
- **`\w` w JS nie obejmuje polskich znaków**, a `\b` między `ę` a przecinkiem nie jest
  granicą. Wzorzec przepuszcza wtedy dokładnie to, czego miał zabraniać.
- **Deklaracja „sprawdziłem wszystko" jest hipotezą.** Twoim wynikiem jest kontrprzykład
  albo jawne stwierdzenie, że go nie znalazłeś — nie potwierdzenie cudzej deklaracji.
