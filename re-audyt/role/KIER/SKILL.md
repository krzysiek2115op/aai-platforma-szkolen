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

1. Sprawdź, czy audyt WYSZEDŁ z działu: `status.mjs --pokaz`, rola audytu ma mieć `ZAKOŃCZONE`.
2. Postaw Pogłębiacza: `status.mjs --rola=<KOD> --sektor=re-audyt --fala=<N> --status="W TRAKCIE"`.
3. Po jego pracy przeczytaj werdykty: `werdykt.mjs --pokaz` — dział zamykasz na LICZBIE zgłoszeń z kompletem werdyktów, nie na zdaniu agenta.
4. Po fali: `polacz-sektory.mjs --fala=<N>` i zanotuj trzy liczby z wyjścia.
5. Przed zamknięciem fali: niezmiennik sektora i `status.mjs --pokaz` (kod 1 przy wiszących).

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
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
