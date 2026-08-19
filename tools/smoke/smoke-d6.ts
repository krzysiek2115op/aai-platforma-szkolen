import { spawn } from "node:child_process";
import assert from "node:assert/strict";

/**
 * Smoke test Działu 6 (dowód bramki B6, część 1): kreator na
 * produkcyjnym `next start` — brama trzyma, wystrzał AJAX działa
 * z samego ciastka, a cykl szkic → publikacja → katalog → usunięcie
 * przechodzi po HTTP, nie w pamięci testu.
 *
 * NAJWAŻNIEJSZY DOWÓD: bez ciastka strona kreatora NIE POKAZUJE
 * ŻADNEGO szkicu, a jedyny AJAX odpowiada 403 — panel czyta bazę już
 * przy renderowaniu, więc dziura w bramie oznaczałaby wyciek
 * nieopublikowanej treści właściciela.
 *
 * OD 0.27.0 smoke dowodzi też BRAMY TEMPA: seria chybionych tokenów
 * kończy się odpowiedzią 429 z `Retry-After`, a mimo wyczerpanego
 * licznika chybionych prób żądanie z POPRAWNYM tokenem z tego samego
 * adresu przechodzi normalnie. Limit ma kosztować zgadującego, nie
 * właściciela — i to jest sprawdzane po HTTP, nie w pamięci testu.
 *
 * Wymaga: `npm run build` + skonfigurowanej bazy (jak testy modułów).
 * Uruchomienie: node tools/smoke/smoke-d6.ts   (liczy się KOD WYJŚCIA)
 */

process.env.KREATOR_TOKEN ??= "smoke-d6";
const TOKEN = process.env.KREATOR_TOKEN;
const PORT = 3004;
const BAZOWY = `http://localhost:${PORT}`;
const CIASTKO = `kreator=${encodeURIComponent(TOKEN)}`;

const { obsluzAkcje, zamknijDb1 } = await import(
  "../../modules/m1-sklep/index.ts"
);

const KURS_SMOKE = {
  slug: "smoke-d6-kreator",
  title: "Kurs smoke D6",
  type: "kurs" as const,
  short_desc: "Szkic seedowany przez smoke test D6.",
  price_grosze: 12300,
  badge: "Smoke",
  level: "podstawowy" as const,
  sections: [
    { kind: "hero" as const, position: 0, content: { obietnica: "Obietnica D6" } },
  ],
  modules: [
    {
      position: 0,
      title: "Moduł smoke D6",
      lessons: [{ position: 0, title: "Lekcja smoke", duration_min: 7, preview: true }],
    },
  ],
};

/** Wystrzał AJAX po HTTP — dokładnie tak, jak robi to przeglądarka. */
async function ajax(
  tresc: Record<string, unknown>,
  ciastko?: string
): Promise<{
  status: number;
  body: { ok?: boolean; blad?: string };
  ponowPo: string | null;
}> {
  const odp = await fetch(`${BAZOWY}/api/szkolenia`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ciastko ? { cookie: ciastko } : {}),
    },
    body: JSON.stringify(tresc),
  });
  return {
    status: odp.status,
    body: await odp.json(),
    ponowPo: odp.headers.get("retry-after"),
  };
}

async function html(sciezka: string, ciastko?: string): Promise<Response> {
  return fetch(`${BAZOWY}${sciezka}`, {
    headers: ciastko ? { cookie: ciastko } : {},
    redirect: "manual",
  });
}

let serwer: ReturnType<typeof spawn> | undefined;
let idKursu: string | undefined;
let kodWyjscia = 0;

try {
  const zapis = await obsluzAkcje({ akcja: "zapisz", token: TOKEN, kurs: KURS_SMOKE });
  assert.equal(zapis.ok, true, `seed nie przeszedł: ${JSON.stringify(zapis)}`);
  idKursu = (zapis as { id: string }).id;

  serwer = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  serwer.stderr?.on("data", (d) => process.stderr.write(d));

  let start: Response | undefined;
  for (let proba = 0; proba < 60; proba++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const odp = await html("/szkolenia/kreator");
      if (odp.ok) {
        start = odp;
        break;
      }
    } catch {
      /* serwer jeszcze wstaje */
    }
  }
  assert.ok(start, "serwer nie wstał w 60 s");

  // 1. Brama: bez ciastka widać formularz tokenu i ANI ŚLADU szkicu.
  const bezCiastka = await start.text();
  assert.ok(bezCiastka.includes("Token dostępu"), "brama nie prosi o token");
  assert.ok(
    !bezCiastka.includes(KURS_SMOKE.title),
    "WYCIEK: szkic widoczny bez tokenu"
  );

  // 2. Z ciastkiem: pełna lista kreatora ze stanem kursu z bazy.
  const zCiastkiem = await (await html("/szkolenia/kreator", CIASTKO)).text();
  assert.ok(zCiastkiem.includes("data-pasek-kreatora"), "brak paska kreatora");
  assert.ok(zCiastkiem.includes(KURS_SMOKE.title), "brak kursu na liście kreatora");
  assert.ok(zCiastkiem.includes("Szkic"), "brak statusu szkicu");
  assert.ok(zCiastkiem.includes("123,00"), "brak ceny z bazy");
  assert.ok(zCiastkiem.includes("Smoke"), "brak badge z bazy");

  // 3. Edytor kursu po id — dane podstawowe wczytane z bazy do formularza.
  const edytor = await (await html(`/szkolenia/kreator/${idKursu}`, CIASTKO)).text();
  assert.ok(edytor.includes(KURS_SMOKE.slug), "edytor nie wczytał sluga");
  assert.ok(edytor.includes("Poziom"), "edytor nie ma pola poziomu");
  assert.ok(edytor.includes("Badge"), "edytor nie ma pola badge");

  // 3a. Trzy warstwy edycji z licznikami stanu treści z bazy:
  // sekcje X/12 i moduły/lekcje — właściciel widzi braki bez klikania.
  assert.ok(edytor.includes("Dane podstawowe"), "brak zakładki danych podstawowych");
  assert.ok(edytor.includes("Sekcje strony"), "brak zakładki sekcji");
  assert.ok(edytor.includes("Program"), "brak zakładki programu");
  assert.ok(edytor.includes("1/12"), "licznik sekcji nie liczy z bazy");

  const smiec = await html("/szkolenia/kreator/nie-jest-uuid", CIASTKO);
  assert.equal(smiec.status, 404, "śmieciowy adres edytora powinien dać 404");

  // 3b. PODGLĄD SZKICU: właściciel widzi stronę kursu przed publikacją,
  // gość dostaje 404 — ta sama treść, dwa różne światy.
  const szkicDlaGoscia = await html(`/szkolenia/${KURS_SMOKE.slug}`);
  assert.equal(szkicDlaGoscia.status, 404, "WYCIEK: gość widzi stronę szkicu");

  const szkicDlaAdmina = await html(`/szkolenia/${KURS_SMOKE.slug}`, CIASTKO);
  assert.equal(szkicDlaAdmina.status, 200, "właściciel nie ma podglądu szkicu");
  const trescPodgladu = await szkicDlaAdmina.text();
  assert.ok(trescPodgladu.includes("Obietnica D6"), "podgląd bez treści z bazy");
  assert.ok(
    trescPodgladu.includes("data-podglad-szkicu"),
    "brak ostrzeżenia, że to podgląd szkicu"
  );

  // 4. Wystrzał bez tokenu i bez ciastka → 403 (nie 500, nie 200).
  const bezDostepu = await ajax({ akcja: "publikuj", id: idKursu });
  assert.equal(bezDostepu.status, 403, "AJAX wpuścił żądanie bez tokenu");
  assert.equal(bezDostepu.body.blad, "brak-dostepu");

  // 4a. BRAMA TEMPA: zgadywanie tokenu przestaje być darmowe. Chybione
  // próby idą na osobny, ostry licznik — po jego wyczerpaniu odpowiedź
  // to 429 z Retry-After, a nie kolejne 403 do woli.
  let odmowa: { status: number; ponowPo: string | null } | undefined;
  for (let proba = 0; proba < 8 && !odmowa; proba++) {
    const zla = await ajax({
      akcja: "publikuj",
      id: idKursu,
      token: `zly-token-smoke-${proba}`,
    });
    if (zla.status === 429) odmowa = zla;
    else
      assert.equal(
        zla.status,
        403,
        `chybiony token dał ${zla.status} zamiast 403 lub 429`
      );
  }
  assert.ok(odmowa, "seria chybionych tokenów NIE wywołała limitu — zgadywanie jest darmowe");
  assert.ok(
    Number(odmowa.ponowPo) >= 1,
    `429 bez sensownego Retry-After (dostaliśmy: ${odmowa.ponowPo})`
  );

  // 5. Wystrzał z SAMYM ciastkiem — token nigdy nie musi być w JS strony.
  // Zarazem dowód, że limit trafia w zgadującego, a nie w pracę: licznik
  // chybionych prób z tego adresu jest właśnie wyczerpany, a poprawne
  // uwierzytelnienie i tak przechodzi.
  const publikacja = await ajax({ akcja: "publikuj", id: idKursu }, CIASTKO);
  assert.equal(publikacja.status, 200, "publikacja z ciastka nie przeszła");
  assert.equal(publikacja.body.ok, true);

  // 6. Skutek publikacji widać w katalogu — pełna droga kreator → strona.
  const katalog = await (await html("/szkolenia")).text();
  assert.ok(katalog.includes(KURS_SMOKE.title), "opublikowany kurs nie wszedł do katalogu");

  // 6a. Wejście do kreatora z katalogu: dla GOŚCIA nie ma go nawet
  // w źródle strony, dla właściciela jest. Ukrycie linku to wygoda,
  // nie ochrona — ale link widoczny dla wszystkich byłby zaproszeniem.
  assert.ok(
    !katalog.includes("data-wejscie-admina"),
    "gość widzi wejście do kreatora w źródle katalogu"
  );
  const katalogAdmina = await (await html("/szkolenia", CIASTKO)).text();
  assert.ok(
    katalogAdmina.includes("data-wejscie-admina"),
    "właściciel nie ma wejścia do kreatora w katalogu"
  );
  const stronaKursuAdmina = await (
    await html(`/szkolenia/${KURS_SMOKE.slug}`, CIASTKO)
  ).text();
  assert.ok(
    stronaKursuAdmina.includes(`/szkolenia/kreator/${idKursu}`),
    "brak skrótu do edycji tego kursu na jego stronie"
  );

  // 7. Usunięcie z ciastka — i kursu nie ma ani w kreatorze, ani na stronie.
  const usuniecie = await ajax({ akcja: "usun", id: idKursu }, CIASTKO);
  assert.equal(usuniecie.status, 200, "usunięcie z kreatora nie przeszło");
  idKursu = undefined;

  const poUsunieciu = await html(`/szkolenia/${KURS_SMOKE.slug}`);
  assert.equal(poUsunieciu.status, 404, "strona usuniętego kursu wciąż żyje");

  console.log("smoke D6: kreator zaliczony (brama, wystrzał, cykl życia kursu)");
} catch (blad) {
  console.error("smoke D6 NIE przeszedł:", blad);
  kodWyjscia = 1;
} finally {
  if (idKursu) {
    await obsluzAkcje({ akcja: "usun", token: TOKEN, id: idKursu });
  }
  serwer?.kill("SIGTERM");
  await zamknijDb1();
}

process.exit(kodWyjscia);
