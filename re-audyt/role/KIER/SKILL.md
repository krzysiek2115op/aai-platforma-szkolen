---
name: kier-re-audit
description: Procedura roli Kierownik re-audytu sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Kierownik re-audytu — umiejętność roli KIER (sektor RE-AUDYT)

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

Na starcie fali, przy wejściu każdego Pogłębiacza do obszaru i przy zbieraniu wyników działu.

## Procedura

0. W fali 2 upewnij się, że pracujesz W WORKTREE fali 2 (`git branch --show-current`
   → `<sektor>/fala-2`; `fala.mjs --postaw=2` stawia go kierownik audytu po commicie
   fali 1). W pełnym drzewie `status.mjs` odmówi wejścia Pogłębiaczowi fali 2, dopóki
   widać wpis z polem `fala: 1` — to komenda, której nie uruchomiono, nie awaria.
   Po fali: commit w worktree, `fala.mjs --scal=2` z drzewa sektora.
1. Sprawdź, czy audyt WYSZEDŁ z działu: `status.mjs --pokaz`, rola audytu ma mieć `ZAKOŃCZONE`
   (narzędzie i tak odmówi postawienia Pogłębiacza przed `ZAKOŃCZONE` działu audytu
   tej samej fali — pozycja 3 E7.7; role procesowe re-audytu blokada nie dotyczy).
2. Postaw Pogłębiacza: `status.mjs --rola=<KOD> --sektor=re-audyt --fala=<N> --status="W TRAKCIE"`.
   Pogłębiacz działu X fali N czyta audyt działu X TEJ SAMEJ fali (R5: „lista klas
   z audytu tej fali") — zakaz dotyczy INNEJ fali, nie audytu własnej.
3. Po jego pracy przeczytaj werdykty: `werdykt.mjs --pokaz` — dział zamykasz na LICZBIE zgłoszeń z kompletem werdyktów, nie na zdaniu agenta.
4. Po fali: `polacz-sektory.mjs --fala=<N>` i zanotuj trzy liczby z wyjścia.
5. Przed zamknięciem fali: niezmiennik sektora i `status.mjs --pokaz` (kod 1 przy wiszących).

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
node audyt/tools/fala.mjs --postaw=2
node audyt/tools/fala.mjs --scal=2
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status.

## Czego ta umiejętność NIE robi

Ocena pojedynczego znaleziska należy do krytyka roli i do `WALID`. Kierownik nie wydaje werdyktów.

## Znane pułapki

- **Pomiar bez sprawdzenia kodu wyjścia mierzy ciszę, nie stan.** Bramka, która nie
  wystartowała, wygląda w liczniku identycznie jak bramka, która nic nie znalazła.
- **Sprawdzenie, które mówi „zero", bywa ślepe po OBU stronach.** Zanim uznasz zero
  za wynik, sprawdź, że komenda w ogóle trafia w swój przedmiot.
- **Przejście po pustce.** Zakres, który zwraca zero plików, przechodzi każdą pozycję
  checklisty i wygląda jak praca wykonana.
- **Bramka nie może sprzątać CUDZYCH danych.** Licz stan przed i po; usuwaj wyłącznie
  to, co sam założyłeś.
- **Wzorzec pytający o NAZWĘ zamiast o ROZSTRZYGNIĘCIE** zzieleniał strażnika przy
  zepsutym kodzie dziewięć razy w historii tego repozytorium.
