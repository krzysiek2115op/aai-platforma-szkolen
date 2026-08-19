import { NextResponse } from "next/server";
import { obsluzAkcje } from "@/modules/m1-sklep";
import { tokenZCiastka } from "@/lib/kreator-dostep";
import {
  adresKlienta,
  KARA_MS,
  limiter,
  LIMIT_UWIERZYTELNIEN,
  LIMIT_WYSTRZALU,
} from "@/lib/limiter";

/**
 * JEDYNY endpoint AJAX Pluginu 1 — wystrzał (WYTYCZNE §8).
 *
 * Cienka warstwa HTTP nad dyspozytorem działu: przyjmuje JSON akcji
 * (zapisz / usun / publikuj), oddaje JSON wyniku. Cała logika, walidacja
 * Zod i dostęp do bazy żyją w module (modules/m1-sklep) — ten plik nie
 * ma prawa dotknąć SQL (straznik-granic), a drugi taki endpoint nie ma
 * prawa powstać (straznik-ajax).
 *
 * Token: transport jest sprawą HTTP, więc gdy klient go nie podał,
 * bierzemy go z ciastka bramy kreatora (HttpOnly — strona kreatora nie
 * musi trzymać sekretu w JavaScripcie). Ocena tokenu należy dalej
 * wyłącznie do dyspozytora — tu nic się nie autoryzuje.
 *
 * OGRANICZANIE TEMPA (0.27.0) też jest sprawą transportu, bo adres IP
 * jest pojęciem transportu — dlatego siedzi tutaj, a nie w module.
 * Dwa liczniki, bo bronią przed dwiema różnymi rzeczami:
 *
 *  1. `wystrzal:` — wszystkie POST-y z adresu (zalew żądaniami);
 *  2. `uwierzytelnienie:` — WYŁĄCZNIE próby chybione (zgadywanie
 *     tokenu), próg dużo ostrzejszy.
 *
 * Drugi licznik pyta o wynik dyspozytora, zamiast oceniać token sam:
 * dzięki temu żądanie z POPRAWNYM tokenem nigdy nie ma jak w niego
 * wpaść, choćby ktoś przed chwilą zgadywał z tego samego adresu.
 * Zgadującego to nie ratuje — on z definicji nie ma poprawnego tokenu.
 */

/**
 * Sufit ciała żądania. Pomiar z 2026-08-19: największy dzisiejszy zapis
 * kursu (treść sekcji + program 7 modułów / 50 lekcji) ma **17 kB**,
 * więc 2 MB to ponad stukrotny zapas. Nie jest to liczba z sufitu:
 * proza obu kursów waży dziś 1307 kB, a kreator ma dostać TREŚĆ LEKCJI
 * (krok 3 planu domknięcia) — wtedy jeden zapis realnie zbliży się do
 * megabajta. Gdy to nastąpi, sufit przeliczyć POMIAREM albo rozbić
 * zapis na akcję per lekcja; limit ma odcinać nadużycie, nie pracę.
 */
const MAKS_CIALO_B = 2 * 1024 * 1024;

/**
 * Ciało żądania z twardym sufitem, czytane STRUMIENIEM.
 *
 * `content-length` sprawdzamy najpierw, bo tanio odrzuca uczciwie
 * zadeklarowany zalew — ale mu nie ufamy: nagłówek może kłamać, a przy
 * transferze porcjowanym w ogóle go nie ma. Dlatego liczymy bajty
 * naprawdę i przerywamy W TRAKCIE, zamiast wczytać wszystko do pamięci
 * i dopiero wtedy zmierzyć (to ostatnie byłoby limitem, który sam
 * wykonuje atak).
 *
 * Zwraca `null`, gdy ciało przekroczyło sufit.
 */
async function cialoZSufitem(
  request: Request,
  maks: number
): Promise<string | null> {
  const zadeklarowana = Number(request.headers.get("content-length"));
  if (Number.isFinite(zadeklarowana) && zadeklarowana > maks) return null;
  if (!request.body) return "";

  const czytnik = request.body.getReader();
  const kawalki: Uint8Array[] = [];
  let rozmiar = 0;
  try {
    for (;;) {
      const { done, value } = await czytnik.read();
      if (done) break;
      rozmiar += value.byteLength;
      if (rozmiar > maks) {
        await czytnik.cancel();
        return null;
      }
      kawalki.push(value);
    }
  } finally {
    czytnik.releaseLock();
  }

  const scalone = new Uint8Array(rozmiar);
  let przesuniecie = 0;
  for (const kawalek of kawalki) {
    scalone.set(kawalek, przesuniecie);
    przesuniecie += kawalek.byteLength;
  }
  return new TextDecoder().decode(scalone);
}

/** Odmowa z powodu tempa — treść generyczna, powód w `Retry-After`. */
function odmowaTempa(ponowZaS: number): NextResponse {
  return NextResponse.json(
    { ok: false, blad: "za-duzo-prob" },
    { status: 429, headers: { "Retry-After": String(ponowZaS) } }
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const adres = adresKlienta(request.headers);

  const tempo = limiter.odnotuj(`wystrzal:${adres}`, LIMIT_WYSTRZALU);
  if (!tempo.dozwolone) return odmowaTempa(tempo.ponowZaS);

  const surowe = await cialoZSufitem(request, MAKS_CIALO_B);
  if (surowe === null) {
    return NextResponse.json(
      { ok: false, blad: "za-duze-zadanie" },
      { status: 413 }
    );
  }

  let dane: unknown;
  try {
    dane = JSON.parse(surowe);
  } catch {
    return NextResponse.json(
      { ok: false, blad: "nieprawidlowy-json" },
      { status: 400 }
    );
  }

  if (dane && typeof dane === "object" && !Array.isArray(dane)) {
    const zapytanie = dane as Record<string, unknown>;
    if (typeof zapytanie.token !== "string") {
      const token = await tokenZCiastka();
      if (token) zapytanie.token = token;
    }
  }

  const wynik = await obsluzAkcje(dane);

  if (!wynik.ok && wynik.blad === "brak-dostepu") {
    const proba = limiter.odnotuj(
      `uwierzytelnienie:${adres}`,
      LIMIT_UWIERZYTELNIEN
    );
    // Po wyczerpaniu limitu odpowiadamy NATYCHMIAST, bez kary czasowej:
    // trzymanie połączenia otwartego przez 700 ms jest przy zalewie
    // pomocą dla atakującego, nie przeszkodą (zajęte gniazda to nasz
    // koszt, nie jego).
    if (!proba.dozwolone) return odmowaTempa(proba.ponowZaS);
    // Kara czasowa poza formularzem logowania — do 0.26.0 zgadywanie
    // tokenu tą drogą było darmowe, choć formularz obok płacił 700 ms.
    await new Promise((r) => setTimeout(r, KARA_MS));
    return NextResponse.json(wynik, { status: 403 });
  }

  // Token przeszedł (błędem może być już tylko kształt danych albo brak
  // rekordu) — kasujemy historię chybionych prób, żeby właściciel, który
  // pomylił token, nie pracował dalej z prawie pełnym licznikiem.
  limiter.zapomnij(`uwierzytelnienie:${adres}`);

  const status = wynik.ok
    ? 200
    : wynik.blad === "nie-znaleziono"
      ? 404
      : 400;
  return NextResponse.json(wynik, { status });
}
