import { NextResponse } from "next/server";
import { obsluzAkcje } from "@/modules/m1-sklep";
import { tokenZCiastka } from "@/lib/kreator-dostep";

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
 */
export async function POST(request: Request): Promise<NextResponse> {
  let dane: unknown;
  try {
    dane = await request.json();
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
  const status = wynik.ok
    ? 200
    : wynik.blad === "brak-dostepu"
      ? 403
      : wynik.blad === "nie-znaleziono"
        ? 404
        : 400;
  return NextResponse.json(wynik, { status });
}
