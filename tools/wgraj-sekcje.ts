/**
 * Wgrywa do bazy Pluginu 1 (Postgres) WYŁĄCZNIE sekcje sprzedażowe z seeda.
 *
 * PO CO TO ISTNIEJE. `npm run db1:seed` zaczyna od `akcja: "usun"` — jest
 * idempotentny przez skasowanie kursu i utworzenie go od nowa. Odkąd na
 * lekcjach wisi proza obu kursów (73 lekcje, 693 tys. znaków), uruchomienie
 * seeda po to, żeby poprawić JEDNO zdanie na stronie sprzedażowej, kasuje
 * materiał, za który klient płaci. Przy audycie 0.33.0 obeszło się to
 * jednorazowym skryptem, którego nikt nie zachował — więc następna osoba
 * stała przed tym samym wyborem, mając pod ręką wyłącznie komendę kasującą.
 *
 * DLACZEGO TO JEST BEZPIECZNE (sprawdzone w kodzie, `dyspozytor.ts`):
 * warstwa zapisu podmienia program tylko wtedy, gdy wejście NIESIE klucz
 * `modules` (`if (kurs.modules)`), a sekcje tylko przy kluczu `sections`.
 * To narzędzie wysyła sekcje BEZ `modules` — program, lekcje i ich treść
 * pozostają nietknięte. Ta sama reguła „brak klucza znaczy nie ruszaj"
 * obowiązuje po stronie WordPressa (BLAD-018).
 *
 * Kurs musi już istnieć — narzędzie NIE zakłada nowych i przerywa, gdy
 * któregoś nie ma.
 *
 * PO KAŻDYM PRZEBIEGU URUCHOM `npm run wp:import`. To nie jest porada, tylko
 * warunek: warstwa zapisu podmienia sekcje parą DELETE + INSERT, więc każdy
 * przebieg nadaje im NOWE identyfikatory. WordPress trzyma stare i kontrola
 * `npm run wp:sprawdz` melduje wtedy „WordPress ma sekcję spoza prototypu"
 * dla każdej z nich — rozjazd po ID, przy treści zgodnej co do znaku.
 * Zmierzone przy P5: dwa przebiegi bez importu = 22 fałszywe rozjazdy.
 *
 * Użycie: npm run db1:sekcje && npm run wp:import
 *         (wymaga bazy i KREATOR_TOKEN w .env)
 */
import { obsluzAkcje, zamknijDb1, listaKursowKreatora } from "../modules/m1-sklep/index.ts";
import { KURSY_SEED } from "./seed/seed-przyklady.ts";

const TOKEN = process.env.KREATOR_TOKEN ?? "";
if (!TOKEN) {
  console.error("wgraj-sekcje: brak KREATOR_TOKEN — dyspozytor odmówi zapisu.");
  process.exit(1);
}

let kod = 0;
try {
  const lista = await listaKursowKreatora();

  for (const kurs of KURSY_SEED) {
    const istniejacy = lista.find((k) => k.slug === kurs.slug);
    if (!istniejacy) {
      throw new Error(
        `kursu „${kurs.slug}" nie ma w bazie. To narzędzie AKTUALIZUJE sekcje istniejących kursów; ` +
          `zakładanie kursu od zera to zadanie kreatora albo seeda (ten drugi kasuje treść lekcji).`
      );
    }

    // Klucz `modules` jest z wejścia USUWANY i to jest cała ostrożność tego
    // narzędzia. Seed niesie program (jest lustrem bazy), więc przepisanie
    // „całej reszty" wstawiłoby go z powrotem — a wtedy dyspozytor podmienia
    // program i kasuje prozę lekcji, których seed nie zna. Zmierzone przy
    // pisaniu tego narzędzia: pierwsza wersja robiła dokładnie to i została
    // zatrzymana przez bezpiecznik `tresc-do-skasowania` (decyzja D z 0.37.0)
    // z komunikatem „skasowałby napisaną treść 41 lekcji". Bezpiecznik pyta
    // o SKUTEK zapisu, nie o obecność klucza — dlatego złapał błąd, którego
    // sam komentarz nie zapobiegł.
    const wejscie: Record<string, unknown> = { ...kurs, id: istniejacy.id };
    delete wejscie.modules;

    const zapis = await obsluzAkcje(
      { akcja: "zapisz", token: TOKEN, kurs: wejscie },
      { aktor: "wgraj-sekcje" }
    );
    if (!zapis.ok) throw new Error(`${kurs.slug}: ${JSON.stringify(zapis)}`);
    console.log(`sekcje: ${kurs.slug} — ${kurs.sections.length} sekcji`);
  }
} catch (blad) {
  console.error("wgraj-sekcje: PORAŻKA —", blad instanceof Error ? blad.message : blad);
  kod = 1;
} finally {
  await zamknijDb1();
}
process.exit(kod);
