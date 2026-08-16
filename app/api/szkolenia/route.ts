import { NextResponse } from "next/server";
import { obsluzAkcje } from "@/modules/m1-sklep";

/**
 * JEDYNY endpoint AJAX Pluginu 1 — wystrzał (WYTYCZNE §8).
 *
 * Cienka warstwa HTTP nad dyspozytorem działu: przyjmuje JSON akcji
 * (zapisz / usun / publikuj), oddaje JSON wyniku. Cała logika, walidacja
 * Zod i dostęp do bazy żyją w module (modules/m1-sklep) — ten plik nie
 * ma prawa dotknąć SQL (straznik-granic), a drugi taki endpoint nie ma
 * prawa powstać (straznik-ajax).
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
