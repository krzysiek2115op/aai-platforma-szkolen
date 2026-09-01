---
name: prototype-audit
description: Wyłącznie jako rola PROTO sektora AUDYT: sprawdzenie prototypu jako specyfikacji wykonawczej i publicznego podglądu — obietnice, jeden AJAX, tryby budowania, artefakt publikacji. Używać przy pozycjach PROTO-01…PROTO-12.
---

# Audyt prototypu Next.js — umiejętność roli PROTO

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

Przy pozycjach **PROTO-06, PROTO-08 i PROTO-11** — czyli tam, gdzie odpowiedź
wymaga porównania **dwóch stron** albo obejrzenia **artefaktu**, a nie kodu.

Przy PROTO-01…PROTO-05 wystarczy grep i odczyt.

## Procedura

1. **Rozstrzygnij, czy pytanie dotyczy KODU, czy ARTEFAKTU.** To jest najważniejszy
   krok tej roli: build zielony i weryfikacja procesu zielona nie dowodzą niczego
   o pliku, który trafia do przeglądarki.
   *Wynik:* jedno słowo — „kod" albo „artefakt" — i dalej idziesz inną drogą.

2. **Dla pytań o obietnice porównaj TRZY miejsca:** prototyp, wtyczkę WP i decyzje
   właściciela. Rozjazd między prototypem a wtyczką jest Twoim znaleziskiem tylko
   w części prototypowej.
   *Wynik:* cytat z każdego z trzech miejsc, z `plik:linia`.

3. **Dla pytań o tryby budowania czytaj `pageExtensions` i nazwy plików**, nie treść
   komponentów. Rozgałęzienie poza jednym źródłem prawdy jest usterką samo w sobie.
   *Wynik:* lista plików `*.serwer.*` i `*.statyczny.*` + miejsce, w którym rozstrzyga
   się tryb.

4. **Dla pytań o artefakt obejrzyj WYNIK, nie komendę.** Zawartość `out/`, nagłówki
   odpowiedzi, obecność pliku — nie to, że skrypt zakończył się zerem.
   *Wynik:* nazwa pliku i jego właściwość, albo status HTTP.

5. **Sprawdź, czy Twoje sprawdzenie nie przechodzi po pustce.** Wzorzec, który nie łapie
   niczego, i pętla po pustej liście wyglądają jak sukces.
   *Wynik:* liczba dopasowań — zero jest wynikiem podejrzanym, nie dobrym.

## Komendy

```
# obietnice i typy produktu
grep -rni "ebook\|wideo\|pobier" app components lib tools/seed

# jeden AJAX i dostęp do bazy
git ls-files 'app/api/**'
grep -rn "pg\|Pool" app components

# tryby budowania
grep -rn "export const dynamic\|dynamicParams\|generateStaticParams" app
grep -n "pageExtensions" next.config.ts

# kontrakt i sufity
grep -n "max(\|length(" modules/m1-sklep/typy.ts
```

**Bramki prototypu** (tylko czytają, ale przebudowują `.next` — patrz pułapki):

```
npm run check          # strażnicy, testy, lint, tsc, build, 7 smoke'ów
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia kodu wtyczek WP** (→ SEC, BE, BD, FE, INT, PERF wg pytania);
- **nie ocenia treści kursów** — 73 lekcje prozy są poza zakresem audytu (D4);
- **nie zgłasza tego samego dwa razy**: rozjazd prototyp↔wtyczka to dwa zgłoszenia,
  ale każde w swoim dziale i o swojej stronie.

## Znane pułapki

- **`npm run dev` pisze do tego samego `.next`, co produkcyjny build.** Smoke'i padają
  wtedy na braku nagłówka i wygląda to jak regresja kodu, którego nikt nie tknął.
  Przed pomiarem: `fuser -k 3001/tcp`, `rm -rf .next`, `npm run build`.
- **Kolejność smoke'ów ma znaczenie:** `smoke-seo` i `smoke-podglad` przebudowują `.next`
  na eksport statyczny, więc bramka uruchomiona PO nich dostaje 404 z `NoFallbackError`.
  Uruchamiaj `npm run smoke`.
- **Smoke'i wymagają `node --env-file=.env`** — bez tego padają na braku `DB1_URL`.
- **Nazwy chunków Next NIE pochodzą z treści** — zmiana samego CSS zostawia identyczne
  nazwy plików, więc weryfikacja po jednym pliku przechodzi przeciw STAREMU deployowi.
- **Konwencja plikowa Next nie dziedziczy się w dół** — `/szkolenia` nie dostało obrazka
  z `app/opengraph-image.tsx`.
- **Padnięty smoke zostawia kursy `smoke-podglad-*` w bazie** — sprzątnij przed powtórką.
