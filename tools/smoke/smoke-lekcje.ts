import { spawn } from "node:child_process";
import assert from "node:assert/strict";

/**
 * Smoke test PISANIA LEKCJI (krok 3, etap 2 — panel).
 *
 * NAJWAŻNIEJSZY DOWÓD: materiał kursu jest towarem zza logowania.
 * Test pisze treść lekcji jedynym wystrzałem AJAX, a potem sprawdza
 * po HTTP, że tekst widać WYŁĄCZNIE w kreatorze z ciastkiem — nie ma
 * go ani w katalogu, ani na stronie sprzedażowej OPUBLIKOWANEGO kursu,
 * ani na stronie edytora bez tokenu. Test modułu tego nie dowiedzie:
 * on sprawdza kontrakt, a wyciek zrobiłby dopiero render strony.
 *
 * Wymaga: `npm run build` + skonfigurowanej bazy (jak testy modułów).
 * Uruchomienie: node tools/smoke/smoke-lekcje.ts   (liczy się KOD WYJŚCIA)
 */

process.env.KREATOR_TOKEN ??= "smoke-lekcje-token-testowy-nie-sekret";
const TOKEN = process.env.KREATOR_TOKEN;
const PORT = 3008;
const BAZOWY = `http://localhost:${PORT}`;
const CIASTKO = `kreator=${encodeURIComponent(TOKEN)}`;

const { obsluzAkcje, szczegolyKursuPoId, zamknijDb1 } = await import(
  "../../modules/m1-sklep/index.ts"
);

/** Zdanie, którego NIE MA prawa być w żadnym publicznym HTML-u. */
const TAJNA_TRESC =
  "## Krok 1\n\nTo jest platny material lekcji, tylko dla kupujacego.";
const TYTUL_MATERIALU = "Sciagawka do lekcji smoke";

const KURS_SMOKE = {
  slug: "smoke-lekcje-tresc",
  title: "Kurs smoke lekcji",
  type: "kurs" as const,
  short_desc: "Szkic seedowany przez smoke test pisania lekcji.",
  price_grosze: 9900,
  sections: [
    { kind: "hero" as const, position: 0, content: { obietnica: "Obietnica lekcji" } },
  ],
  modules: [
    {
      position: 0,
      title: "Modul smoke",
      lessons: [{ position: 0, title: "Lekcja smoke", duration_min: 9, preview: false }],
    },
  ],
};

async function ajax(
  tresc: Record<string, unknown>,
  ciastko?: string
): Promise<{ status: number; body: { ok?: boolean; blad?: string } }> {
  const odp = await fetch(`${BAZOWY}/api/szkolenia`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ciastko ? { cookie: ciastko } : {}),
    },
    body: JSON.stringify(tresc),
  });
  return { status: odp.status, body: await odp.json() };
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

  const kurs = await szczegolyKursuPoId(idKursu);
  const idLekcji = kurs!.modules[0].lessons[0].id;
  assert.equal(kurs!.modules[0].lessons[0].ma_tresc, false, "świeża lekcja ma flagę treści");

  serwer = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  serwer.stderr?.on("data", (d) => process.stderr.write(d));

  let wstal = false;
  for (let proba = 0; proba < 60; proba++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      if ((await html("/szkolenia/kreator")).ok) {
        wstal = true;
        break;
      }
    } catch {
      /* serwer jeszcze wstaje */
    }
  }
  assert.ok(wstal, "serwer nie wstał w 60 s");

  // 1. Wystrzał treści lekcji bez tokenu → 403 (nie 500, nie 200).
  const bezDostepu = await ajax({
    akcja: "zapisz-tresc-lekcji",
    id: idLekcji,
    tresc: { tresc: "wstrzykniete", materialy: [] },
  });
  assert.equal(bezDostepu.status, 403, "AJAX wpuścił zapis lekcji bez tokenu");
  assert.equal(bezDostepu.body.blad, "brak-dostepu");

  // 2. Zapis z SAMEGO ciastka — tak robi to panel (token nie jest w JS).
  const zapisLekcji = await ajax(
    {
      akcja: "zapisz-tresc-lekcji",
      id: idLekcji,
      tresc: {
        tresc: TAJNA_TRESC,
        materialy: [
          { rodzaj: "pdf", tytul: TYTUL_MATERIALU, url: "/dodatki/smoke.pdf" },
        ],
      },
    },
    CIASTKO
  );
  assert.equal(zapisLekcji.status, 200, "zapis treści lekcji z ciastka nie przeszedł");
  assert.equal(zapisLekcji.body.ok, true);

  // 3. Edytor lekcji BEZ ciastka: brama i ani śladu materiału.
  const bezCiastka = await (await html(`/szkolenia/kreator/lekcja/${idLekcji}`)).text();
  assert.ok(bezCiastka.includes("Token dostępu"), "brama edytora lekcji nie prosi o token");
  assert.ok(
    !bezCiastka.includes("platny material lekcji"),
    "WYCIEK: treść lekcji widoczna bez tokenu"
  );

  // 4. Z ciastkiem: właściciel widzi treść i materiał do poprawek.
  const zCiastkiem = await (
    await html(`/szkolenia/kreator/lekcja/${idLekcji}`, CIASTKO)
  ).text();
  assert.ok(zCiastkiem.includes("platny material lekcji"), "edytor nie wczytał treści z bazy");
  assert.ok(zCiastkiem.includes(TYTUL_MATERIALU), "edytor nie wczytał materiałów");
  assert.ok(zCiastkiem.includes("Lekcja smoke"), "edytor nie zna tytułu lekcji");
  assert.ok(zCiastkiem.includes("Modul smoke"), "edytor nie zna modułu lekcji");

  // 5. Śmieciowy i nieistniejący adres → 404, bez pytania bazy o byle co.
  const smiec = await html("/szkolenia/kreator/lekcja/nie-jest-uuid", CIASTKO);
  assert.equal(smiec.status, 404, "śmieciowy adres lekcji powinien dać 404");
  const nieistniejaca = await html(
    "/szkolenia/kreator/lekcja/00000000-0000-4000-8000-000000000000",
    CIASTKO
  );
  assert.equal(nieistniejaca.status, 404, "nieistniejąca lekcja powinna dać 404");

  // 6. Formularz kursu DOSTAJE identyfikator lekcji. To nie kosmetyka:
  //    dyspozytor kasuje wiersze, których nie ma w wejściu, więc panel
  //    bez id kazałby bazie skasować lekcje razem z treścią. Sprawdzamy
  //    dane, a nie sam przycisk „Treść" — zakładka Program rysuje się
  //    po stronie klienta, więc w HTML-u pierwszego żądania jej nie ma.
  const edytorKursu = await (await html(`/szkolenia/kreator/${idKursu}`, CIASTKO)).text();
  assert.ok(
    edytorKursu.includes(idLekcji),
    "formularz kursu nie dostał identyfikatora lekcji — zapis programu skasowałby jej treść"
  );
  assert.ok(
    !edytorKursu.includes("platny material lekcji"),
    "edytor kursu wozi ze sobą treść lekcji — to miała robić osobna trasa"
  );

  // 7. Licznik postępu na liście kreatora liczy z bazy.
  const lista = await (await html("/szkolenia/kreator", CIASTKO)).text();
  assert.ok(lista.includes("Treść lekcji"), "brak licznika treści na liście kursów");
  assert.ok(
    !lista.includes("platny material lekcji"),
    "lista kreatora wozi treść lekcji"
  );

  // 8. NAJWAŻNIEJSZE: kurs OPUBLIKOWANY, a materiału nie ma w publicznym HTML-u.
  const publikacja = await ajax({ akcja: "publikuj", id: idKursu }, CIASTKO);
  assert.equal(publikacja.body.ok, true, "publikacja nie przeszła");

  const katalog = await (await html("/szkolenia")).text();
  assert.ok(katalog.includes(KURS_SMOKE.title), "opublikowany kurs nie wszedł do katalogu");
  assert.ok(!katalog.includes("platny material lekcji"), "WYCIEK: materiał w katalogu");

  const stronaKursu = await (await html(`/szkolenia/${KURS_SMOKE.slug}`)).text();
  assert.ok(stronaKursu.includes("Lekcja smoke"), "program kursu zniknął ze strony");
  assert.ok(
    !stronaKursu.includes("platny material lekcji"),
    "WYCIEK: materiał lekcji na stronie sprzedażowej"
  );
  assert.ok(
    !stronaKursu.includes(TYTUL_MATERIALU),
    "WYCIEK: materiały dodatkowe na stronie sprzedażowej"
  );

  // 9. Zapis PROGRAMU z identyfikatorami nie kasuje napisanej treści.
  //    To ta sama droga, którą idzie panel (formularz odsyła id).
  const przedZapisem = await szczegolyKursuPoId(idKursu);
  const modul = przedZapisem!.modules[0];
  const ponowny = await ajax(
    {
      akcja: "zapisz",
      kurs: {
        id: idKursu,
        slug: KURS_SMOKE.slug,
        title: KURS_SMOKE.title,
        type: KURS_SMOKE.type,
        price_grosze: KURS_SMOKE.price_grosze,
        modules: [
          {
            id: modul.id,
            position: 0,
            title: "Modul smoke (poprawiony)",
            lessons: modul.lessons.map((l) => ({
              id: l.id,
              position: l.position,
              title: l.title,
              duration_min: l.duration_min,
              preview: l.preview,
            })),
          },
        ],
      },
    },
    CIASTKO
  );
  assert.equal(ponowny.body.ok, true, "ponowny zapis programu nie przeszedł");

  const poZapisie = await (
    await html(`/szkolenia/kreator/lekcja/${idLekcji}`, CIASTKO)
  ).text();
  assert.ok(
    poZapisie.includes("platny material lekcji"),
    "zapis programu skasował treść lekcji — wróciła pułapka sprzed migracji 006"
  );

  console.log("smoke lekcje: zaliczony (brama, wystrzał treści, brak wycieku, program nie kasuje treści)");
} catch (blad) {
  console.error("smoke lekcje NIE przeszedł:", blad);
  kodWyjscia = 1;
} finally {
  if (idKursu) {
    await obsluzAkcje({ akcja: "usun", token: TOKEN, id: idKursu });
  }
  serwer?.kill("SIGTERM");
  await zamknijDb1();
}

process.exit(kodWyjscia);
