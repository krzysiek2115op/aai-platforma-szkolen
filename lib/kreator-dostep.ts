import { cookies, headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { PODGLAD_STATYCZNY } from "@/lib/podglad";

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
 * MINIMALNA DŁUGOŚĆ SKONFIGUROWANEGO TOKENU.
 *
 * 24 znaki z alfabetu, jakiego używa `openssl rand -hex 16` czy
 * `uuidgen`, to sekret nie do zgadnięcia przy limicie 5 prób na
 * 10 minut. Poniżej tej granicy porównanie w stałym czasie i limiter
 * chronią hasło, którego i tak da się dobrać.
 */
export const MIN_DLUGOSC_TOKENU = 24;

/** Dosłowna wartość z `.env.example` — nigdy nie jest hasłem. */
export const TOKEN_PRZYKLADOWY = "ustaw-wlasny-token";

let ostrzezono = false;

/**
 * Czy KONFIGURACJA tokenu w ogóle nadaje się na hasło do panelu.
 *
 * Znalezisko B przeglądu B7 (2026-08-25): nic nie sprawdzało, czy
 * `KREATOR_TOKEN` przestał być wartością z przykładu. Scenariusz jest
 * banalny i cichy — `cp .env.example .env`, uzupełnienie adresu bazy,
 * zapomniany token — a hasłem do zapisu, publikacji i USUWANIA kursów
 * zostaje wtedy łańcuch leżący w repozytorium. Odmowa jest po stronie
 * KONFIGURACJI, nie podanego tokenu: dopóki wzorzec jest słaby, brama
 * nie wpuszcza NIKOGO (także właściciela), bo inaczej cisza wyglądałaby
 * jak działający panel.
 *
 * W etapie WordPressa ta reguła znika razem z własnym tokenem —
 * uwierzytelnia WP (role i nonce). Do tego czasu jest jedynym
 * sprawdzeniem, że hasło do panelu nie pochodzi z publicznego pliku.
 */
export function wzorzecTokenuMocny(wzorzec: string | undefined): boolean {
  const mocny =
    Boolean(wzorzec) &&
    wzorzec !== TOKEN_PRZYKLADOWY &&
    (wzorzec as string).length >= MIN_DLUGOSC_TOKENU;
  if (!mocny && !ostrzezono) {
    ostrzezono = true;
    console.error(
      "kreator: KREATOR_TOKEN jest pusty, przykładowy albo krótszy niż " +
        `${MIN_DLUGOSC_TOKENU} znaki — brama kreatora nie wpuści nikogo. ` +
        "Ustaw własny token w .env (np. `openssl rand -hex 16`)."
    );
  }
  return mocny;
}

/**
 * Porównanie w stałym czasie — czas odpowiedzi nie zdradza, ile
 * pierwszych znaków tokenu zgadło się przy zgadywaniu.
 */
export function tokenPasuje(token: string | null | undefined): boolean {
  const wzorzec = process.env.KREATOR_TOKEN;
  if (!wzorzecTokenuMocny(wzorzec)) return false;
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

/**
 * Czy bieżące żądanie ma prawo widzieć i zmieniać kursy.
 *
 * W PODGLĄDZIE STATYCZNYM odpowiedź brzmi ZAWSZE „nie" i musi paść
 * PRZED dotknięciem ciastek — z dwóch niezależnych powodów:
 *
 *  1. Techniczny: w eksporcie nie ma żądania, więc `cookies()` nie ma
 *     czego przeczytać i build by się wywrócił.
 *  2. Ważniejszy — bezpieczeństwa: gdyby ktoś zbudował podgląd mając
 *     w środowisku token, właściciel „byłby zalogowany" w czasie
 *     builda, a wtedy do PUBLICZNYCH plików w `out/` weszłyby SZKICE
 *     kursów i skrót do kreatora. Statyczny podgląd to zawsze widok
 *     gościa; kto ma tylko pliki, nie ma się przed czym uwierzytelnić.
 */
export async function czyKreator(): Promise<boolean> {
  if (PODGLAD_STATYCZNY) return false;
  return tokenPasuje(await tokenZCiastka());
}
