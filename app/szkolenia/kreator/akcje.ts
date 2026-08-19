"use server";

import { cookies, headers } from "next/headers";
import {
  CIASTKO_KREATORA,
  opcjeCiastka,
  przezHttps,
  tokenPasuje,
} from "@/lib/kreator-dostep";
import {
  adresKlienta,
  KARA_MS,
  limiter,
  LIMIT_UWIERZYTELNIEN,
} from "@/lib/limiter";
import { odmien } from "@/lib/odmiana";

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
 *
 * Kara czasowa za chybiony token stoi tu od D6; od 0.27.0 dokłada się
 * do niej limit prób po adresie (wspólny mechanizm z jedynym AJAX-em,
 * `lib/limiter.ts`), bo sama kara ogranicza tempo zgadywania, ale go
 * nie kończy.
 */

export type StanBramy = { blad?: string };

export async function zaloguj(
  _poprzedni: StanBramy,
  dane: FormData
): Promise<StanBramy> {
  const token = String(dane.get("token") ?? "");
  if (!process.env.KREATOR_TOKEN) {
    return { blad: "Serwer nie ma ustawionego KREATOR_TOKEN (plik .env)." };
  }

  const klucz = `logowanie:${adresKlienta(await headers())}`;

  if (!tokenPasuje(token)) {
    const proba = limiter.odnotuj(klucz, LIMIT_UWIERZYTELNIEN);
    if (!proba.dozwolone) {
      // Bez kary czasowej — po wyczerpaniu limitu odmawiamy od razu
      // (trzymanie połączenia obciąża nas, nie zgadującego).
      const minuty = Math.ceil(proba.ponowZaS / 60);
      return {
        blad: `Za dużo nieudanych prób. Spróbuj ponownie za ${odmien(
          minuty,
          "minutę",
          "minuty",
          "minut"
        )}.`,
      };
    }
    await new Promise((r) => setTimeout(r, KARA_MS));
    return { blad: "Nieprawidłowy token." };
  }

  // Udane wejście kasuje historię chybionych prób — właściciel, który
  // za pierwszym razem wkleił zły token, nie pracuje dalej z licznikiem
  // na skraju wyczerpania.
  limiter.zapomnij(klucz);
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
