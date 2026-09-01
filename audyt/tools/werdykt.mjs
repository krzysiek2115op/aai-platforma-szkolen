/**
 * WERDYKT — jedyna droga, którą zgłoszenie przechodzi z DO WERYFIKACJI
 * do ZWERYFIKOWANE.
 *
 * DLACZEGO POWSTAŁO DOPIERO PRZY E6. Do próby na sucho ścieżka sektora nie
 * miała czym dojechać do końca: `zgloszenie.mjs` zapisuje `status` i `werdykt`
 * RAZ, przy tworzeniu wpisu, a `status.mjs` prowadzi stan ROLI, nie stan
 * zgłoszenia. Krytyk i weryfikator mogli więc wydać werdykt wyłącznie
 * w rozmowie — a rozmowa nie przeżywa `/clear`. Pozycja 7 definicji
 * ukończenia sektora ("próba na sucho jednej roli → status ZWERYFIKOWANE")
 * była przez to nieosiągalna, a nie widziała tego ani reguła 5 strażnika
 * (pyta o `id`, `dowod`, `miejsce`, `hash`), ani żadna z 24 mutacji, które
 * wtedy istniały.
 * Znalazła to dopiero próba — czyli dokładnie to, po co się ją robi.
 *
 * DWA WERDYKTY, NIE JEDEN. Krytyk roli ocenia PRACĘ AGENTA (czy znalezisko
 * ma podstawę), weryfikator ocenia ZJAWISKO (czy istnieje) — §16 stawia go
 * poza audytem właśnie po to, żeby agent wykrywający nie był jedynym, kto
 * uznaje problem za prawdziwy. Status ZWERYFIKOWANE wymaga OBU.
 *
 * KOLEJNOŚCI NIE WYMUSZAMY. Schemat cyklu życia w `audyt/STRUKTURA.md` rysuje
 * krytyka, Goldena i weryfikatora jako trzy gałęzie z tego samego węzła, nie
 * jako łańcuch. Wymuszenie kolejności byłoby regułą, której nie ma w niczym,
 * co właściciel zaakceptował.
 *
 * WERDYKTU NIE DA SIĘ NADPISAĆ. Odrzucone zgłoszenie ZOSTAJE z werdyktem —
 * druga fala musi trafić na to samo miejsce i dojść do tego samego wniosku,
 * a wpis poprawiony po fakcie zafałszowałby porównanie fal (K4').
 *
 * Użycie:
 *   node audyt/tools/werdykt.mjs --id=AUD-PIK-001 --kto=krytyk --werdykt=PRZEPUSZCZAM
 *   node audyt/tools/werdykt.mjs --id=AUD-PIK-001 --kto=krytyk --werdykt=ODRZUCAM --powod="…"
 *   node audyt/tools/werdykt.mjs --id=AUD-PIK-001 --kto=weryfikator --werdykt=ISTNIEJE
 *   node audyt/tools/werdykt.mjs --pokaz
 *   node audyt/tools/werdykt.mjs --test
 *
 * Kod wyjścia 0 = zapisane, 1 = odmowa (z powodem na wyjściu).
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZGLOSZENIA, czytajJSON, wszystkieZgloszenia, zapiszJSON, znormalizuj } from "./wspolne.mjs";

/**
 * Kto może wydać jaki werdykt. Zbiory są ROZŁĄCZNE celowo: "PRZEPUSZCZAM"
 * od weryfikatora znaczyłoby co innego niż od krytyka, a jedno słowo o dwóch
 * znaczeniach w dzienniku audytu jest gorsze od dwóch słów.
 */
export const WERDYKTY = {
  krytyk: ["PRZEPUSZCZAM", "ODRZUCAM"],
  weryfikator: ["ISTNIEJE", "ODRZUCONE"],
};

/** Werdykty odmowne — te MUSZĄ nieść powód. */
const ODMOWNE = ["ODRZUCAM", "ODRZUCONE"];

/**
 * Sprawdza JEDEN werdykt wobec istniejącego wpisu. Zwraca listę powodów
 * odmowy — pusta znaczy "wolno zapisać". Funkcja jest CZYSTA (nie czyta dysku,
 * nie pisze, nie kończy procesu), żeby samokontrola `--test` i strażnik mogły
 * jej użyć bez dotykania katalogu zgłoszeń. Ta sama zasada co `powodyOdmowy()`
 * w `zgloszenie.mjs`.
 */
export function powodyOdmowyWerdyktu(wpis, { kto, werdykt, powod } = {}) {
  const bledy = [];

  if (!wpis || typeof wpis !== "object") return ["zgłoszenie o tym ID nie istnieje — werdykt nie ma czego dotyczyć"];
  if (!WERDYKTY[kto]) return [`nieznana rola "${kto}" — werdykt wydaje "krytyk" albo "weryfikator"`];
  if (!WERDYKTY[kto].includes(werdykt)) {
    bledy.push(`rola "${kto}" wydaje werdykt ${WERDYKTY[kto].join(" albo ")}, podano "${werdykt}"`);
    return bledy;
  }

  const dotychczas = wpis.werdykt && typeof wpis.werdykt === "object" ? wpis.werdykt : {};
  if (dotychczas[kto]) {
    bledy.push(
      `werdykt roli "${kto}" jest już zapisany (${dotychczas[kto].werdykt}) — nie nadpisujemy go. ` +
      "Odrzucone zgłoszenie ZOSTAJE z werdyktem, bo druga fala musi dojść do tego samego wniosku (K4')"
    );
  }

  // Odrzucenie bez powodu nie da się odtworzyć w drugiej fali — jest ciszą,
  // nie wynikiem. Próg długości ten sam co dla dowodu w `zgloszenie.mjs`.
  if (ODMOWNE.includes(werdykt) && znormalizuj(powod ?? "").length < 20) {
    bledy.push(`werdykt "${werdykt}" wymaga powodu — odrzucenie bez powodu jest ciszą, nie wynikiem`);
  }

  return bledy;
}

/** Czy wpis ma komplet werdyktów — warunek statusu ZWERYFIKOWANE. */
export function komplet(wpis) {
  const w = wpis?.werdykt && typeof wpis.werdykt === "object" ? wpis.werdykt : {};
  return Boolean(w.krytyk && w.weryfikator);
}

/* ── samokontrola ── */

function samokontrola() {
  const bazowy = { id: "AUD-PIK-001", status: "DO WERYFIKACJI", werdykt: null };
  const poKrytyku = { ...bazowy, werdykt: { krytyk: { werdykt: "PRZEPUSZCZAM", powod: null } } };

  const przypadki = [
    ["krytyk przepuszcza", bazowy, { kto: "krytyk", werdykt: "PRZEPUSZCZAM" }, true],
    ["krytyk odrzuca Z POWODEM", bazowy, { kto: "krytyk", werdykt: "ODRZUCAM", powod: "Dowód cytuje sąsiednią linię, nie tę, o której mówi stwierdzenie." }, true],
    ["weryfikator potwierdza istnienie", poKrytyku, { kto: "weryfikator", werdykt: "ISTNIEJE" }, true],
    ["weryfikator odrzuca Z POWODEM", poKrytyku, { kto: "weryfikator", werdykt: "ODRZUCONE", powod: "Ścieżka wywołania jest zamknięta wcześniej — zjawisko nie jest czynne." }, true],
    ["ID, którego nie ma", null, { kto: "krytyk", werdykt: "PRZEPUSZCZAM" }, false],
    ["nieznana rola", bazowy, { kto: "kierownik", werdykt: "PRZEPUSZCZAM" }, false],
    ["werdykt spoza zbioru swojej roli", bazowy, { kto: "krytyk", werdykt: "ISTNIEJE" }, false],
    ["odrzucenie BEZ powodu", bazowy, { kto: "krytyk", werdykt: "ODRZUCAM" }, false],
    ["odrzucenie z powodem-atrapą", bazowy, { kto: "weryfikator", werdykt: "ODRZUCONE", powod: "nie" }, false],
    ["nadpisanie cudzego werdyktu", poKrytyku, { kto: "krytyk", werdykt: "ODRZUCAM", powod: "Zmieniam zdanie po ponownym otwarciu pliku." }, false],
  ];

  let zle = 0;
  for (const [nazwa, wpis, opcje, maPrzejsc] of przypadki) {
    const powody = powodyOdmowyWerdyktu(wpis, opcje);
    const ok = (powody.length === 0) === maPrzejsc;
    if (!ok) zle++;
    process.stdout.write(`  ${ok ? "✓" : "✗"} ${maPrzejsc ? "ZAPISAĆ " : "ODMÓWIĆ"}  ${nazwa}\n`);
    if (!ok && powody.length) process.stdout.write(`      ${powody[0]}\n`);
    if (!ok && !powody.length) process.stdout.write("      (zapisane, choć miało zostać odrzucone)\n");
  }

  // Komplet dwóch werdyktów, i tylko komplet, przestawia status.
  const kontrola = [
    ["sam krytyk NIE domyka", poKrytyku, false],
    ["krytyk i weryfikator domykają", { ...poKrytyku, werdykt: { ...poKrytyku.werdykt, weryfikator: { werdykt: "ISTNIEJE" } } }, true],
    ["sam weryfikator NIE domyka", { ...bazowy, werdykt: { weryfikator: { werdykt: "ISTNIEJE" } } }, false],
  ];
  for (const [nazwa, wpis, oczekiwane] of kontrola) {
    const ok = komplet(wpis) === oczekiwane;
    if (!ok) zle++;
    process.stdout.write(`  ${ok ? "✓" : "✗"} KOMPLET   ${nazwa}\n`);
  }

  const razem = przypadki.length + kontrola.length;
  process.stdout.write(`\nSamokontrola werdyktów: ${razem - zle}/${razem}\n`);
  return zle === 0;
}

/* ── wejście ── */

/**
 * BRAMKA GŁÓWNEGO MODUŁU we wzorcu odpornym na SPACJĘ w nazwie katalogu:
 * `resolve(process.argv[1])` wobec `fileURLToPath`, nigdy sklejanie `file://`
 * (BLAD-014 — w katalogu "Pod strona Szkolenia " URL koduje spację jako %20,
 * więc porównanie NIGDY nie jest prawdziwe, a narzędzie milczy z kodem 0).
 */
const GLOWNY_MODUL =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (GLOWNY_MODUL) {
  const arg = process.argv.slice(2);
  const wartosc = (n) => arg.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);

  if (arg.includes("--test")) process.exit(samokontrola() ? 0 : 1);

  if (arg.includes("--pokaz")) {
    const wszystkie = wszystkieZgloszenia();
    if (!wszystkie.length) {
      process.stdout.write("Sektor nie ma jeszcze ani jednego zgłoszenia.\n");
      process.exit(0);
    }
    process.stdout.write("WERDYKTY\n\n");
    for (const z of wszystkie) {
      const w = z.werdykt && typeof z.werdykt === "object" ? z.werdykt : {};
      const opis = (kto) => (w[kto] ? w[kto].werdykt : "—");
      process.stdout.write(
        `  ${z.id.padEnd(14)} ${String(z.status).padEnd(15)} krytyk: ${opis("krytyk").padEnd(13)} weryfikator: ${opis("weryfikator")}` +
        `${z.proba ? `   [PRÓBA ${z.proba}]` : ""}\n`
      );
      for (const kto of ["krytyk", "weryfikator"]) {
        if (w[kto]?.powod) process.stdout.write(`      ${kto}: ${w[kto].powod}\n`);
      }
    }
    process.exit(0);
  }

  const id = wartosc("id");
  const kto = wartosc("kto");
  const werdykt = wartosc("werdykt");
  const powod = wartosc("powod");

  if (!id || !kto || !werdykt) {
    process.stdout.write(
      "Użycie: node audyt/tools/werdykt.mjs --id=<AUD-…> --kto=krytyk|weryfikator --werdykt=<…> [--powod=\"…\"]\n" +
      `  krytyk:      ${WERDYKTY.krytyk.join(" | ")}\n` +
      `  weryfikator: ${WERDYKTY.weryfikator.join(" | ")}\n` +
      "  --pokaz | --test\n"
    );
    process.exit(1);
  }

  const sciezka = join(ZGLOSZENIA, `${id}.json`);
  const wpis = existsSync(sciezka) ? czytajJSON(sciezka) : null;

  const powody = powodyOdmowyWerdyktu(wpis, { kto, werdykt, powod });
  if (powody.length) {
    process.stdout.write("WERDYKT ODRZUCONY.\n\n");
    for (const p of powody) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }

  const dotychczas = wpis.werdykt && typeof wpis.werdykt === "object" ? wpis.werdykt : {};
  wpis.werdykt = {
    ...dotychczas,
    [kto]: { werdykt, powod: powod ?? null, kiedy: new Date().toISOString() },
  };
  if (komplet(wpis)) wpis.status = "ZWERYFIKOWANE";

  zapiszJSON(sciezka, wpis);

  process.stdout.write(`${id}: ${kto} → ${werdykt}\n  status: ${wpis.status}\n`);
  if (!komplet(wpis)) {
    const brakuje = wpis.werdykt.krytyk ? "weryfikatora" : "krytyka";
    process.stdout.write(`  czeka na werdykt ${brakuje} — bez obu statusem zostaje DO WERYFIKACJI\n`);
  }
}
