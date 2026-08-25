/**
 * Strażnik kreatora: właściciel musi mieć dostęp do KAŻDEGO pola,
 * które kontrakt pozwala zapisać — w sekcjach sprzedażowych
 * I w treści lekcji (krok 3).
 *
 * PO CO. Treść stron kursów siedzi w JSONB (`course_sections.content`),
 * a jej kształt opisują schematy Zod modułu (SCHEMATY_SEKCJI). Strona
 * renderuje to, co znajdzie; kreator pokazuje to, co ma opisane
 * w components/kreator/opis-sekcji.ts. To dwa różne pliki — i dokładnie
 * dlatego potrafią się rozjechać: ktoś dokłada pole do kontraktu
 * (jak przy B5: TrescHero.dla_kogo, TrescAutor.cytat, TrescPakiet.w_cenie,
 * TrescDlaKogo.nie_dla), strona zaczyna je renderować, a w panelu nie
 * ma go czym wypełnić. Objaw jest paskudny, bo niewidoczny: sekcja
 * po prostu nigdy nie dostaje tej treści.
 *
 * CO ŁAPIE:
 *   1. rodzaj sekcji bez edytora w kreatorze (i odwrotnie — edytor
 *      dla rodzaju, którego nie ma w kontrakcie),
 *   2. pole w schemacie Zod bez odpowiednika w opisie kreatora
 *      (i odwrotnie — pole opisane w kreatorze, którego kontrakt nie zna),
 *   3. rozjazd wymagalności: pole obowiązkowe w Zod, a opcjonalne
 *      w kreatorze (właściciel zapisze sekcję, której baza nie przyjmie)
 *      lub odwrotnie,
 *   4. to samo dla pól zagnieżdżonych (listy obiektów, obiekt `link`),
 *   5. treść lekcji: `TrescLekcji` ↔ components/kreator/opis-lekcji.ts
 *      (te same cztery reguły co wyżej — materiał kursu jest towarem,
 *      więc pole, którego właściciel nie ma czym wypełnić, to dziura
 *      w produkcie),
 *   6. lista zamknięta („wybor") bez opcji albo z opcjami innymi niż
 *      enum kontraktu — panel podpowiadałby wartość, której baza nie
 *      przyjmie, albo ukrywał wartość, którą przyjmuje.
 *
 * Dopóki nie ma pliku opisu, strażnik przechodzi — pilnuje kodu,
 * nie planów.
 *
 * Użycie: node tools/straznicy/straznik-kreatora.mjs
 */
import { existsSync } from "node:fs";

const OPIS = "components/kreator/opis-sekcji.ts";
const OPIS_LEKCJI_PLIK = "components/kreator/opis-lekcji.ts";
const bledy = [];

if (existsSync(OPIS)) {
  const { SCHEMATY_SEKCJI } = await import("../../modules/m1-sklep/typy.ts");
  const { OPIS_SEKCJI } = await import("../../components/kreator/opis-sekcji.ts");

  /** Zod 4: pole jest opcjonalne, jeśli przyjmuje `undefined`. */
  const opcjonalne = (schemat) => schemat.safeParse(undefined).success;

  /** Zdejmuje opakowania (optional/nullable/default) do właściwego typu. */
  const rdzen = (schemat) => {
    let s = schemat;
    while (s?.def?.innerType || s?.def?.type === "default") {
      s = s.def.innerType ?? s.def.defaultType ?? s;
      if (!s?.def) break;
    }
    return s;
  };

  const opisy = new Map(OPIS_SEKCJI.map((o) => [o.rodzaj, o]));
  const rodzajeKontraktu = Object.keys(SCHEMATY_SEKCJI);

  for (const rodzaj of rodzajeKontraktu) {
    if (!opisy.has(rodzaj)) {
      bledy.push(
        `${OPIS}: rodzaj sekcji "${rodzaj}" istnieje w kontrakcie (SCHEMATY_SEKCJI), ale kreator nie ma dla niego edytora — właściciel nie wypełni tej sekcji.`
      );
    }
  }
  for (const rodzaj of opisy.keys()) {
    if (!rodzajeKontraktu.includes(rodzaj)) {
      bledy.push(
        `${OPIS}: kreator opisuje rodzaj "${rodzaj}", którego nie ma w SCHEMATY_SEKCJI — edytor zapisze treść, której strona nigdy nie odczyta.`
      );
    }
  }

  /** Wartości enuma z kontraktu (Zod 4 trzyma je w `def.entries`). */
  const wartosciEnuma = (schemat) => {
    const entries = schemat?.def?.entries;
    if (entries) return Object.values(entries);
    return Array.isArray(schemat?.options) ? schemat.options : null;
  };

  /** Porównuje zestaw pól schematu Zod z zestawem pól opisanym w kreatorze. */
  function porownajPola(gdzie, ksztaltZod, polaOpisu, plikOpisu = OPIS) {
    const OPIS = plikOpisu;
    const wZod = Object.keys(ksztaltZod);
    const wOpisie = polaOpisu.map((p) => p.pole);

    for (const pole of wZod) {
      if (!wOpisie.includes(pole)) {
        bledy.push(
          `${OPIS}: ${gdzie} — pole "${pole}" jest w kontrakcie, ale kreator go nie pokazuje. Strona potrafi je wyrenderować, a właściciel nie ma go czym wypełnić.`
        );
      }
    }
    for (const pole of wOpisie) {
      if (!wZod.includes(pole)) {
        bledy.push(
          `${OPIS}: ${gdzie} — kreator pokazuje pole "${pole}", którego kontrakt nie zna; walidacja Zod je odrzuci albo zignoruje.`
        );
      }
    }

    for (const opisPola of polaOpisu) {
      const schemat = ksztaltZod[opisPola.pole];
      if (!schemat) continue;

      const musiBycWymagane = !opcjonalne(schemat);
      if (musiBycWymagane !== Boolean(opisPola.wymagane)) {
        bledy.push(
          `${OPIS}: ${gdzie} — pole "${opisPola.pole}" jest ${
            musiBycWymagane ? "OBOWIĄZKOWE" : "opcjonalne"
          } w kontrakcie, a kreator traktuje je jako ${
            opisPola.wymagane ? "obowiązkowe" : "opcjonalne"
          }.`
        );
      }

      // lista zamknięta: opcje panelu MUSZĄ być tym samym zbiorem co
      // enum kontraktu — inaczej panel albo podpowiada wartość, której
      // baza nie przyjmie, albo chowa wartość, którą przyjmuje
      if (opisPola.typ === "wybor") {
        const dozwolone = wartosciEnuma(rdzen(schemat));
        const wPanelu = (opisPola.opcje ?? []).map((o) => o.wartosc);
        if (wPanelu.length === 0) {
          bledy.push(
            `${OPIS}: ${gdzie} — pole "${opisPola.pole}" ma typ "wybor" bez listy opcji; panel pokazałby pustą listę.`
          );
        } else if (dozwolone === null) {
          bledy.push(
            `${OPIS}: ${gdzie} — pole "${opisPola.pole}" jest listą zamkniętą w panelu, a kontrakt nie jest enumem; jedno z dwóch kłamie.`
          );
        } else {
          for (const wartosc of dozwolone) {
            if (!wPanelu.includes(wartosc)) {
              bledy.push(
                `${OPIS}: ${gdzie} — kontrakt dopuszcza "${wartosc}" w polu "${opisPola.pole}", a panel nie daje takiej opcji.`
              );
            }
          }
          for (const wartosc of wPanelu) {
            if (!dozwolone.includes(wartosc)) {
              bledy.push(
                `${OPIS}: ${gdzie} — panel podpowiada "${wartosc}" w polu "${opisPola.pole}", czego kontrakt nie przyjmie.`
              );
            }
          }
        }
      }

      // zagnieżdżenia: lista obiektów → element tablicy; obiekt → wprost
      const wewnetrzny = rdzen(schemat);
      if (opisPola.typ === "lista-obiektow") {
        const element = rdzen(wewnetrzny?.def?.element ?? {});
        if (element?.def?.shape) {
          porownajPola(
            `${gdzie} → element listy "${opisPola.pole}"`,
            element.def.shape,
            opisPola.pola,
            plikOpisu
          );
        }
      } else if (opisPola.typ === "obiekt" && wewnetrzny?.def?.shape) {
        porownajPola(
          `${gdzie} → obiekt "${opisPola.pole}"`,
          wewnetrzny.def.shape,
          opisPola.pola,
          plikOpisu
        );
      }
    }
  }

  for (const [rodzaj, schemat] of Object.entries(SCHEMATY_SEKCJI)) {
    const opis = opisy.get(rodzaj);
    if (!opis) continue;
    porownajPola(`sekcja "${rodzaj}"`, schemat.def.shape, opis.pola);
  }

  // --- treść lekcji (krok 3) ---
  // Ta sama reguła, inny kontrakt: materiał kursu też wchodzi kreatorem,
  // więc pole bez miejsca w panelu jest tak samo groźne jak w sekcji.
  if (existsSync(OPIS_LEKCJI_PLIK)) {
    const { TrescLekcji } = await import("../../modules/m1-sklep/typy.ts");
    const { OPIS_LEKCJI } = await import("../../components/kreator/opis-lekcji.ts");
    porownajPola(
      "treść lekcji",
      TrescLekcji.def.shape,
      OPIS_LEKCJI.pola,
      OPIS_LEKCJI_PLIK
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-kreatora:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
