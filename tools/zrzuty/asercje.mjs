/**
 * Maszynowa asercja treści zrzutu — wspólna dla rigu przeglądarkowego
 * (`zrob-zrzut.mjs`) i terminalowego (`tui.mjs`).
 *
 * PO CO (werdykt właściciela 2026-08-23, brief zasada 9). Zieleń pierwszej
 * partii niczego nie dowodziła: narzędzie zapisywało obraz zawsze, a jedyną
 * kontrolą treści było JEDNORAZOWE spojrzenie człowieka na stykówkę. Takiej
 * kontroli nie da się powtórzyć po sesji i nie łapie ona ani przesuniętego
 * znacznika, ani obrazu wyrenderowanego ze starego nagrania. Dlatego
 * specyfikacja zrzutu MUSI podać `wymagaTekstu` — fragmenty wyprowadzone
 * Z PODPISU w prozie — a narzędzie ODMAWIA ZAPISU OBRAZU, gdy ekran ich nie
 * zawiera. „Zrzut powstał" znaczy odtąd „zrzut zawiera to, co obiecuje podpis".
 *
 * DLACZEGO Z PODPISU, NIGDY Z OBRAZU. Asercja spisana z tego, co akurat wyszło,
 * betonuje błąd zamiast go łapać — to dokładnie ta klasa usterki, którą właściciel
 * unieważnił (cztery podpisy wyprzedzały ekran, a zrzuty i tak powstały).
 *
 * NORMALIZACJA — i dlaczego jest taka, a nie ściślejsza. Ten sam napis wygląda
 * inaczej w obu rigach:
 *   * TUI rysuje panele znakami ramek, więc zdanie w panelu jest POCIĘTE na
 *     wiersze, a między kawałkami stoją `│` i wyrównujące spacje;
 *   * przeglądarka wstawia twarde spacje i typograficzne apostrofy tam, gdzie
 *     dokumentacja ma zwykłe.
 * Dlatego przed porównaniem sprowadzamy oba teksty do wspólnej postaci (ramki
 * i twarde spacje → spacja, apostrofy i myślniki → ASCII, ciągi białych znaków
 * → jedna spacja). Drugie podejście — porównanie z CAŁKOWICIE usuniętymi
 * białymi znakami — jest po to, żeby zawijanie w środku słowa nie wywalało
 * asercji prawdziwego ekranu. Fałszywie pozytywne dopasowanie jest przy takich
 * fragmentach nierealne (to całe zdania interfejsu), a fałszywie NEGATYWNE
 * kosztowałoby ponowne nagranie sesji.
 */

/** Sprowadza tekst ekranu i wymagany fragment do jednej postaci. */
export function normalizuj(tekst) {
  return String(tekst)
    .normalize("NFC")
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[   ​‎‏]/g, " ")
    .replace(/[─-╿▀-▟▖-▟]/g, " ") // ramki paneli TUI
    .replace(/\s+/g, " ")
    .trim();
}

const bezOdstepow = (tekst) => normalizuj(tekst).replace(/\s+/g, "");

/** Zwraca fragmenty, których na ekranie NIE MA (pusta lista = ekran zgodny z podpisem). */
export function brakujace(tekstEkranu, wymagane) {
  const ekran = normalizuj(tekstEkranu);
  const ekranBezOdstepow = bezOdstepow(tekstEkranu);
  return wymagane.filter((fragment) => {
    if (fragment.startsWith("re:")) {
      const wzorzec = fragment.slice(3);
      try { return !new RegExp(wzorzec).test(ekran); }
      catch (e) { console.error(`asercje: zły wzorzec ${JSON.stringify(wzorzec)} — ${e.message}`); return true; }
    }
    const f = normalizuj(fragment);
    if (!f) return true;
    return !ekran.includes(f) && !ekranBezOdstepow.includes(bezOdstepow(fragment));
  });
}

/**
 * Bramka deklaracji: specyfikacja BEZ asercji jest błędem, nie wariantem
 * domyślnym. Inaczej zasada 9 zależałaby od pamięci autora specyfikacji —
 * a pierwsza partia pokazała, ile jest warta pamięć bez bramki.
 */
export function wymagajDeklaracji(spec, narzedzie) {
  const w = spec.wymagaTekstu;
  if (!Array.isArray(w) || w.length === 0 || w.some((f) => typeof f !== "string" || !f.trim())) {
    console.error(
      `${narzedzie}: specyfikacja bez pola "wymagaTekstu" — zrzut bez maszynowej asercji treści NIE JEST DOWODEM\n` +
        `  (brief przelotu, zasada 9). Podaj fragmenty WYPROWADZONE Z PODPISU w prozie, np.\n` +
        `  "wymagaTekstu": ["Claude Code won't ask before using allowed tools."]`
    );
    process.exit(7);
  }
  return w;
}

/**
 * Odmowa zapisu obrazu, gdy ekran nie niesie tego, co obiecuje podpis.
 * Wołane PRZED zapisem pliku — inaczej na dysku zostaje zrzut, który
 * licznik policzy jako zrobiony.
 */
export function sprawdzAsercje(tekstEkranu, wymagane, narzedzie) {
  const brak = brakujace(tekstEkranu, wymagane);
  if (brak.length === 0) {
    console.log(`asercje: ${wymagane.length}/${wymagane.length} fragmentów obecnych na ekranie`);
    return;
  }
  console.error(`${narzedzie}: EKRAN NIE ZAWIERA tego, co obiecuje podpis — obrazu NIE ZAPISANO:`);
  for (const f of brak) console.error(`  brak: ${JSON.stringify(f)}`);
  console.error("  Jeśli ekran jest prawdziwy, a fragment nierealny — poprawiamy PODPIS I PROZĘ, nie asercję.");
  console.error(`  Ekran (znormalizowany, ${normalizuj(tekstEkranu).length} zn.): ${normalizuj(tekstEkranu).slice(0, 600)}`);
  process.exit(8);
}

/**
 * REGUŁA PRYWATNOŚCI (brief, zasada 4) — sprawdzana MASZYNOWO, nie okiem.
 *
 * Rig podmienia dane właściciela na przykładowe, ale podmiana działa tylko na
 * to, co ktoś przewidział: lista miała login GitHuba i adres e-mail, a nie
 * NAZWĘ UŻYTKOWNIKA SYSTEMU — i pierwsze `ls -la` w nagraniu wypisało ją
 * w kolumnie właściciela pliku (2026-08-23). Dlatego zamiast ufać liście,
 * sprawdzamy GOTOWY EKRAN: jeśli po podmianach nadal niesie identyfikator
 * właściciela, obraz NIE POWSTAJE.
 *
 * Identyfikatory bierzemy ze ŚRODOWISKA (`USER`, katalog domowy), więc kontrola
 * działa na cudzej maszynie tak samo — plus dwa znane na stałe (login GitHuba
 * i adres e-mail), których w środowisku nie ma.
 */
const escapujRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function daneWlasciciela() {
  // Imię własne dochodzi do listy, bo claude.ai wita nim wprost („Evening,
  // krzysztof"), a Konsola stawia je w nagłówku konta — a w środowisku go nie ma.
  const dane = new Set(["krzysiek2115op", "krzysztof2006oskar@wp.pl", "krzysztof", "Krzysztof"]);
  const uzytkownik = process.env.USER ?? process.env.LOGNAME;
  if (uzytkownik && uzytkownik.length > 2) dane.add(uzytkownik);
  const dom = process.env.HOME;
  if (dom) dane.add(dom);
  return [...dane];
}

/**
 * `zastepniki` = wartości, którymi rig podmienił dane właściciela w DOM-ie.
 *
 * PO CO (2026-08-24). Podmiana chodzi po WĘZŁACH TEKSTOWYCH, więc dane rozbite
 * na dwa elementy (`<span>krzysztof2006</span><span>oskar@wp.pl</span>`) łata
 * tylko w połowie: na ekranie zostaje „oliwia2006oskar@wp.pl”, czyli fragment
 * prawdziwego adresu. Sam ciąg z listy właściciela już tam nie występuje, więc
 * kontrola całych ciągów przepuszczała taki zrzut. Rozpoznajemy to po tym, że
 * ZASTĘPNIK przykleił się do innych znaków słowa — znaczy, że podmiana weszła
 * w środek większego tokenu, którego nie widziała w całości. Test negatywny
 * „adres właściciela sklejony z dwóch elementów” w tools/zrzuty/test-asercji.mjs.
 */
export function sprawdzPrywatnosc(tekstEkranu, narzedzie, zastepniki = []) {
  const ekran = normalizuj(tekstEkranu);
  const znalezione = daneWlasciciela().filter((d) => ekran.includes(d));
  for (const z of zastepniki) {
    if (!z || z.length < 4) continue;
    const przyklejony = new RegExp(`(?:[0-9A-Za-z@._%+-]${escapujRe(z)}|${escapujRe(z)}[0-9A-Za-z@._%+-])`);
    const trafienie = ekran.match(przyklejony);
    if (trafienie && !znalezione.includes(trafienie[0])) znalezione.push(trafienie[0]);
  }
  if (znalezione.length === 0) return;
  console.error(`${narzedzie}: NA EKRANIE SĄ DANE WŁAŚCICIELA — obrazu NIE ZAPISANO (brief, zasada 4):`);
  for (const d of znalezione) console.error(`  ${JSON.stringify(d)}`);
  console.error("  Dopisz podmianę w rigu (w TUI musi zachować SZEROKOŚĆ) albo nagraj ekran bez tej danej.");
  process.exit(9);
}
