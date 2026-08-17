"use server";

import { cookies } from "next/headers";
import {
  CIASTKO_KREATORA,
  opcjeCiastka,
  przezHttps,
  tokenPasuje,
} from "@/lib/kreator-dostep";

/**
 * Wejście i wyjście z kreatora. To JEDYNE dwie akcje serwerowe pluginu
 * i żadna z nich NIE dotyka bazy — ustawiają tylko ciastko sesji.
 * Wszystko, co rusza dane kursów, idzie jedynym wystrzałem AJAX
 * (app/api/szkolenia) — zasada „jedna baza = jeden AJAX" zostaje
 * nienaruszona (WYTYCZNE §8).
 *
 * Ciastka nie da się ustawić w trakcie renderowania strony (Next:
 * „Setting cookies is not supported during Server Component
 * rendering"), więc logowanie musi być akcją serwerową. Po ustawieniu
 * ciastka Next sam przerenderowuje trasę — brama znika, pojawia się
 * kreator, bez ręcznego odświeżania.
 */

export type StanBramy = { blad?: string };

/** Opóźnienie po błędzie — zgadywanie tokenu przestaje być tanie. */
const KARA_MS = 700;

export async function zaloguj(
  _poprzedni: StanBramy,
  dane: FormData
): Promise<StanBramy> {
  const token = String(dane.get("token") ?? "");
  if (!process.env.KREATOR_TOKEN) {
    return { blad: "Serwer nie ma ustawionego KREATOR_TOKEN (plik .env)." };
  }
  if (!tokenPasuje(token)) {
    await new Promise((r) => setTimeout(r, KARA_MS));
    return { blad: "Nieprawidłowy token." };
  }
  (await cookies()).set(
    CIASTKO_KREATORA,
    token,
    opcjeCiastka(await przezHttps())
  );
  return {};
}

export async function wyloguj(): Promise<void> {
  (await cookies()).delete(CIASTKO_KREATORA);
}
