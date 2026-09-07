/**
 * Strażnik obietnic: strona sprzedażowa nie ma prawa obiecywać czegoś,
 * czego kurs nie dowozi.
 *
 * PO CO TO ISTNIEJE (audyt 2026-08-24). Sekcje sprzedażowe powstały przy B4/B5
 * jako TREŚĆ ROBOCZA, przed Działem 7. Program obu kursów zmienił się potem
 * dwa razy (D7, potem cięcie Kursu 2), a teksty sprzedażowe — nie. Skutek:
 * publiczny podgląd obiecywał „7 modułów wideo (31 lekcji)” przy realnych
 * 6 modułach i 41 lekcjach, „6 modułów wideo (26 lekcji)” przy 32 lekcjach
 * oraz „moduł ratunkowy: restore, revert, reset”, którego w Kursie 2 nie ma
 * (te trzy komendy nie padają w nim ANI RAZU). Do tego słowo „wideo”, choć
 * decyzją właściciela z 2026-08-19 kurs jest TEKSTOWY — nagrań nie ma.
 *
 * Wymóg właściciela brzmi: „strona nie może obiecywać niczego spoza programu”.
 * Ten strażnik zamienia go w kontrolę mechaniczną.
 *
 * CO SPRAWDZA (na `tools/seed/seed-przyklady.ts` — repozytorialnym źródle
 * sekcji, importowanym BEZ uruchamiania zapisu):
 *   1. żadna sekcja nie twierdzi, że kurs jest wideo („N modułów wideo”,
 *      „godzin wideo”, „nagrywamy poprawki”, „lekcje wideo”). Zaprzeczenia
 *      w rodzaju „to NIE jest nagranie webinaru” są dozwolone — sprawdzamy
 *      frazy twierdzące, nie samo słowo;
 *   2. każda liczba modułów i lekcji podana w sekcjach zgadza się z programem
 *      TEGO kursu w tym samym pliku (a program jest lustrem bazy);
 *   3. deklarowany czas („N minut na M lekcji”) zgadza się z sumą duration_min;
 *   4. deklarowana liczba zrzutów zgadza się z liczbą obrazów w prozie kursu;
 *   5. obietnica „prompty w N lekcjach” zgadza się z liczbą lekcji, które
 *      naprawdę mają sekcję „Prompty z tej lekcji”.
 *
 * CO SPRAWDZA POZA SEEDEM (dopisane 2026-08-25, po przeglądzie agent+krytyk
 * przy bramce B7). Sekcje sprzedażowe to nie jedyne miejsce, w którym strona
 * coś obiecuje: teksty marketingowe siedzą też WPROST W KODZIE widoków.
 * Przegląd znalazł tam dwie nieprawdy, których ten strażnik nie widział, bo
 * czytał wyłącznie seed: katalog `/szkolenia` obiecywał „Lekcje wideo krok po
 * kroku” przy kursie TEKSTOWYM oraz „pliki źródłowe — do pobrania”, podczas
 * gdy 0 z 73 lekcji ma jakikolwiek materiał (sprawdzone w bazie). Dlatego
 * te same wzorce lecą teraz po `app/**` i `components/**`.
 *
 * Użycie: node tools/straznicy/straznik-obietnic.mjs
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const { KURSY_SEED } = await import("../seed/seed-przyklady.ts");
const KATALOG_TRESCI = "tresc-kursow";
const bledy = [];
const pominiete = [];

/**
 * WARUNEK WSTĘPNY TRZECH KONTROLI (dopisane 2026-09-07).
 *
 * Kontrole „N zrzutów”, „prompty w N lekcjach” i „N lekcji z pytaniami”
 * porównują obietnicę sprzedażową z PROZĄ KURSU w `tresc-kursow/`. W publicznej
 * kopii pokazowej (`krzysiek2115op/aai-platforma-szkolen`) tej prozy NIE MA
 * i nie będzie — to sprzedawany produkt, wycięty z całej historii gita przed
 * upublicznieniem. Bez wejścia te trzy kontrole porównują obietnicę z zerem
 * i zapalają się ZAWSZE, niezależnie od tego, czy teksty są poprawne.
 *
 * Dlatego, gdy prozy danego kursu nie ma, te trzy kontrole są POMIJANE
 * i wypisane jawnie na końcu — nie wyciszone po cichu. Pozostałe kontrole
 * (wideo, liczba modułów, liczba lekcji, czas, obietnice w widokach) czytają
 * `seed-przyklady.ts` i widoki, więc działają BEZ ZMIAN także tutaj.
 *
 * W prywatnym oryginale, gdzie proza jest, komplet kontroli działa jak wcześniej
 * — ten warunek nigdy się tam nie uruchamia.
 */

/** Frazy TWIERDZĄCE o wideo. Zaprzeczenia („nie jest nagraniem”) są w porządku. */
const WIDEO = [
  /\d+\s+modułów?\s+wideo/i, /godzin[ay]?\s+wideo/i, /lekcj\w*\s+wideo/i,
  /kurs\w*\s+wideo/i, /nagrywamy/i, /nagramy/i,
];

function prozaKursu(slug) {
  const kat = join(KATALOG_TRESCI, slug);
  if (!existsSync(kat)) return [];
  const pliki = [];
  for (const m of readdirSync(kat).filter((d) => /^modul-\d+$/.test(d)))
    for (const f of readdirSync(join(kat, m)).filter((f) => f.startsWith("proza-")))
      pliki.push(readFileSync(join(kat, m, f), "utf8"));
  return pliki;
}

for (const kurs of KURSY_SEED) {
  const moduly = kurs.modules?.length ?? 0;
  const lekcje = (kurs.modules ?? []).reduce((n, m) => n + m.lessons.length, 0);
  const minuty = (kurs.modules ?? []).reduce(
    (n, m) => n + m.lessons.reduce((s, l) => s + (l.duration_min ?? 0), 0), 0);
  const proza = prozaKursu(kurs.slug);
  const mamProze = proza.length > 0;
  if (!mamProze)
    pominiete.push(
      `${kurs.slug}: brak prozy w \`${KATALOG_TRESCI}/${kurs.slug}\` — pomijam kontrole ` +
      `„liczba zrzutów”, „prompty w N lekcjach” i „N lekcji z pytaniami”. ` +
      `Pozostałe kontrole tego kursu wykonane normalnie.`);
  const zrzuty = proza.reduce(
    (n, t) => n + (t.replace(/```[\s\S]*?```/g, "").match(/!\[[^\]]*\]\(zrzuty\//g) ?? []).length, 0);
  const zPromptami = proza.filter((t) => /^## Prompty z tej lekcji/m.test(t)).length;
  const zPytaniami = proza.filter((t) => /^## Pytania do wykonawcy/m.test(t)).length;

  for (const s of kurs.sections ?? []) {
    const tekst = JSON.stringify(s.content);
    const gdzie = `${kurs.slug} / sekcja „${s.kind}”`;

    for (const w of WIDEO)
      if (w.test(tekst)) bledy.push(`${gdzie}: obiecuje wideo (${w}) — kurs jest TEKSTOWY (decyzja 2026-08-19).`);

    for (const [, n] of tekst.matchAll(/(\d+)\s+modułów/g))
      if (+n !== moduly) bledy.push(`${gdzie}: mówi o ${n} modułach, program ma ${moduly}.`);

    // Obietnice PODZBIORU sprawdzamy osobno i wycinamy z tekstu, zanim policzymy
    // sumy — inaczej „10 lekcji o API” wyglądałoby jak zaniżona liczba lekcji kursu.
    let doSum = tekst;
    for (const [caly, n] of tekst.matchAll(/(\d+)\s+lekcj\w*[^"]{0,80}?pytań do firmy wdrażającej/g)) {
      if (mamProze && +n !== zPytaniami)
        bledy.push(`${gdzie}: obiecuje ${n} lekcji z pytaniami do wykonawcy, sekcję „Pytania do wykonawcy” ma ${zPytaniami}.`);
      // Wycinamy ZAWSZE, także przy pominiętej kontroli — inaczej „10 lekcji
      // z pytaniami” wpadłoby niżej jako zaniżona liczba lekcji kursu.
      doSum = doSum.replace(caly, "");
    }
    for (const [caly, n] of tekst.matchAll(/prompty w (\d+)\s+lekcjach/gi)) {
      if (mamProze && +n !== zPromptami)
        bledy.push(`${gdzie}: obiecuje prompty w ${n} lekcjach, sekcję „Prompty z tej lekcji” ma ${zPromptami}.`);
      doSum = doSum.replace(caly, "");
    }

    for (const [, n] of doSum.matchAll(/(\d+)\s+lekcj(?:i|e|ę)\b/g))
      if (+n !== lekcje) bledy.push(`${gdzie}: mówi o ${n} lekcjach, program ma ${lekcje}.`);

    for (const [, min, lek] of doSum.matchAll(/(\d+)\s+minut\w*\s+na\s+(\d+)\s+lekcj/g)) {
      if (+min !== minuty) bledy.push(`${gdzie}: deklaruje ${min} minut, suma duration_min to ${minuty}.`);
      if (+lek !== lekcje) bledy.push(`${gdzie}: deklaruje ${lek} lekcji przy ${lekcje} w programie.`);
    }

    for (const [, n] of tekst.matchAll(/(\d+)\s+zrzut\w*/g))
      if (mamProze && +n !== zrzuty) bledy.push(`${gdzie}: obiecuje ${n} zrzutów, proza kursu ma ${zrzuty}.`);

  }
}

// ---- 6. obietnice zaszyte w KODZIE widoków, nie w seedzie ----
// Tekst w JSX jest tak samo widoczny dla klienta jak tekst z bazy.
const PLIKI_WIDOKOW = [];
(function zbierz(kat) {
  if (!existsSync(kat)) return;
  for (const wpis of readdirSync(kat, { withFileTypes: true })) {
    const pelna = join(kat, wpis.name);
    if (wpis.isDirectory()) zbierz(pelna);
    else if (/\.tsx$/.test(wpis.name)) PLIKI_WIDOKOW.push(pelna);
  }
})("app");
(function zbierz(kat) {
  if (!existsSync(kat)) return;
  for (const wpis of readdirSync(kat, { withFileTypes: true })) {
    const pelna = join(kat, wpis.name);
    if (wpis.isDirectory()) zbierz(pelna);
    else if (/\.tsx$/.test(wpis.name)) PLIKI_WIDOKOW.push(pelna);
  }
})("components");

/** Obietnice, których produkt nie dowozi — sprawdzane w tekście widoków. */
const OBIETNICE_SPOZA_PRODUKTU = [
  ...WIDEO,
  // „do pobrania” obiecuje załącznik; materiałów jest 0 na 73 lekcje, a decyzja
  // właściciela z 2026-08-19 mówi: PDF to ewentualny DODATEK, nie rdzeń.
  /plik\w*\s+(?:źródłow\w*|do\s+pobrania)/i,
  /do\s+pobrania\s+i\s+u[żz]ycia/i,
];

for (const plik of PLIKI_WIDOKOW) {
  const tresc = readFileSync(plik, "utf8");
  // Komentarze mówią o kodzie, nie do klienta — pomijamy je, żeby strażnik
  // nie oskarżał własnego uzasadnienia (lekcja z straznik-seo, 0.26.0).
  const bezKomentarzy = tresc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const wzor of OBIETNICE_SPOZA_PRODUKTU) {
    const trafienie = bezKomentarzy.match(wzor);
    if (trafienie) {
      bledy.push(
        `${plik}: widok obiecuje „${trafienie[0].trim()}" — kurs jest TEKSTOWY (decyzja 2026-08-19), ` +
          `a materiałów do pobrania nie ma ani jednego.`
      );
    }
  }
}

// Pominięcia wypisujemy ZAWSZE i PRZED werdyktem — kontrola, która czegoś nie
// sprawdziła, ma to powiedzieć głośno. Cicha kontrola jest gorsza niż jej brak,
// bo daje fałszywe poczucie pokrycia.
if (pominiete.length > 0) {
  console.error("straznik-obietnic — KONTROLE POMINIĘTE (brak wejścia):");
  for (const p of pominiete) console.error(`  ! ${p}`);
  console.error(
    "  Powód i uzasadnienie: nagłówek tools/straznicy/straznik-obietnic.mjs.\n" +
    "  W prywatnym oryginale, gdzie proza kursów istnieje, żadna kontrola nie jest pomijana.");
}

if (bledy.length > 0) {
  console.error("straznik-obietnic:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(
  `straznik-obietnic: OK (kursów: ${KURSY_SEED.length}, widoków: ${PLIKI_WIDOKOW.length}` +
  (pominiete.length > 0 ? `, kursów z pominiętymi kontrolami: ${pominiete.length}` : "") + ")");
