import { cookies, headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";

/**
 * Brama kreatora — tymczasowy dostęp na token (KREATOR_TOKEN w .env);
 * pełne uwierzytelnianie da Plugin 3 (PLAN §2.3).
 *
 * DLACZEGO CIASTKO, A NIE POLE W FORMULARZU. Kreator ma dwa kanały:
 * odczyt serwerowy (lista kursów, edytowany kurs) i wystrzał AJAX
 * (zapisz/usun/publikuj). Odczyt dzieje się w renderowaniu — token
 * musi być znany PRZED tym, jak strona cokolwiek pokaże, inaczej
 * szkice właściciela wyciekłyby do każdego, kto zna adres. Ciastko
 * HttpOnly załatwia oba kanały naraz i nigdy nie trafia do JS
 * przeglądarki (żaden skrypt na stronie go nie odczyta).
 *
 * Ten plik NIE dotyka bazy — sprawdza tylko tożsamość. Dostęp do bazy
 * ma wyłącznie moduł (straznik-granic), a jedyny AJAX to
 * app/api/szkolenia (straznik-ajax).
 */

export const CIASTKO_KREATORA = "kreator";

/** 8 godzin — dzień pracy właściciela nad treścią, potem ponowne wejście. */
const WAZNOSC_S = 60 * 60 * 8;

/**
 * `secure` zależy od PROTOKOŁU żądania, nie od NODE_ENV. Produkcyjny
 * build oglądany na localhost (`npm start`, smoke, ocena właściciela)
 * chodzi po http — ciastko z flagą Secure nigdy by tam nie doleciało
 * i logowanie wyglądałoby na zepsute. Poza localhostem domyślnie
 * WYMAGAMY https (bezpiecznie z automatu).
 */
export function opcjeCiastka(przezHttps: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: przezHttps,
    maxAge: WAZNOSC_S,
  } as const;
}

/** Czy bieżące żądanie przyszło po https (za proxy: X-Forwarded-Proto). */
export async function przezHttps(): Promise<boolean> {
  const naglowki = await headers();
  const proto = naglowki.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  const host = naglowki.get("host") ?? "";
  return !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
}

/**
 * Porównanie w stałym czasie — czas odpowiedzi nie zdradza, ile
 * pierwszych znaków tokenu zgadło się przy zgadywaniu.
 */
export function tokenPasuje(token: string | null | undefined): boolean {
  const wzorzec = process.env.KREATOR_TOKEN;
  if (!wzorzec || !token) return false;
  const podany = Buffer.from(token, "utf8");
  const oczekiwany = Buffer.from(wzorzec, "utf8");
  if (podany.length !== oczekiwany.length) return false;
  return timingSafeEqual(podany, oczekiwany);
}

/** Token z ciastka — używa go też jedyny AJAX, gdy klient go nie podał. */
export async function tokenZCiastka(): Promise<string | null> {
  return (await cookies()).get(CIASTKO_KREATORA)?.value ?? null;
}

/** Czy bieżące żądanie ma prawo widzieć i zmieniać kursy. */
export async function czyKreator(): Promise<boolean> {
  return tokenPasuje(await tokenZCiastka());
}
