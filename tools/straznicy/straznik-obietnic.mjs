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
 * Użycie: node tools/straznicy/straznik-obietnic.mjs
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const { KURSY_SEED } = await import("../seed/seed-przyklady.ts");
const KATALOG_TRESCI = "tresc-kursow";
const bledy = [];

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
      if (+n !== zPytaniami)
        bledy.push(`${gdzie}: obiecuje ${n} lekcji z pytaniami do wykonawcy, sekcję „Pytania do wykonawcy” ma ${zPytaniami}.`);
      doSum = doSum.replace(caly, "");
    }
    for (const [caly, n] of tekst.matchAll(/prompty w (\d+)\s+lekcjach/gi)) {
      if (+n !== zPromptami)
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
      if (+n !== zrzuty) bledy.push(`${gdzie}: obiecuje ${n} zrzutów, proza kursu ma ${zrzuty}.`);

  }
}

if (bledy.length > 0) {
  console.error("straznik-obietnic:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`straznik-obietnic: OK (kursów: ${KURSY_SEED.length})`);
