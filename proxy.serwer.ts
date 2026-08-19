import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { politykaCsp, ZRODLA_STYLOW } from "@/lib/csp";

/**
 * POLITYKA BEZPIECZEŃSTWA TREŚCI (CSP) — tryb serwerowy.
 *
 * Do 0.25.0 wysyłaliśmy sam `frame-ancestors 'none'`, a pełną politykę
 * checklista odkładała do etapu WordPressa z uzasadnieniem „w prototypie
 * byłaby teatrem". Przegląd otwierający krok 2 pokazał, że to była zła
 * ocena: wszystkie trasy serwerowe z treścią są `force-dynamic`, więc
 * jedyny realny koszt nonce'ów — wymuszenie renderowania na żądanie —
 * już dawno ponosimy. Zostaje sama korzyść.
 *
 * DLACZEGO `proxy.serwer.ts`, A NIE `proxy.ts`. Nonce musi być inny
 * przy każdym żądaniu, więc polityka rodzi się w proxy — a Proxy jest
 * na liście „Unsupported Features" eksportu statycznego. Rozszerzenie
 * `serwer.*` trafia na `pageExtensions` wyłącznie w trybie serwerowym
 * (next.config.ts), więc build podglądu tego pliku NIE WIDZI i eksport
 * przechodzi. Ten sam trik rozdziela trasy kreatora i AJAX-a.
 *
 * Eksport MUSI być domyślny. Next 16.3.1 nie rozpoznaje nazwanego
 * eksportu `proxy` w pliku o niestandardowym rozszerzeniu — build pada
 * na „Middleware is missing expected function export name" — choć
 * dokumentacja opisuje `export function proxy`.
 *
 * `strict-dynamic` unieważnia `'self'` dla skryptów: wykonuje się
 * wyłącznie to, co ma nonce, i to, co takie skrypty same doładują.
 * Warunkiem jest, żeby ŻADNA trasa oddająca HTML nie szła z prerenderu
 * — inaczej jej skrypty nie mają nonce'a i strona jest martwa. Pilnuje
 * tego czytnik nonce'a w układzie korzenia (lib/csp-nonce.ts) razem
 * ze smoke'iem CSP, który sprawdza także stronę 404.
 */

export const config = {
  matcher: [
    {
      // Pliki statyczne nie oddają dokumentu i nie potrzebują polityki;
      // prefetch z `next/link` pobiera dane trasy, nie HTML. Nagłówki
      // niezależne od żądania (nosniff, X-Frame-Options, Referrer-Policy,
      // Permissions-Policy) obejmują te ścieżki i tak — są w next.config.ts.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // W trybie deweloperskim React odbudowuje ślady stosu przez `eval`.
  // Produkcja tego nie potrzebuje — i tam `script-src` nie ma ani
  // `unsafe-eval`, ani `unsafe-inline`. Pilnuje straznik-csp.
  const dev = process.env.NODE_ENV === "development";

  // Protokół bierzemy z nagłówka proxy, jak brama kreatora (przezHttps).
  const https =
    (request.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim() ===
    "https";

  const polityka = politykaCsp({
    skrypty: `'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    style: ZRODLA_STYLOW,
    https,
  });

  // Nonce jedzie do renderowania nagłówkiem żądania (`x-nonce` czyta
  // lib/csp-nonce.ts), a Next dodatkowo wyłuskuje go z nagłówka polityki
  // i sam nadaje swoim skryptom.
  const naglowkiZadania = new Headers(request.headers);
  naglowkiZadania.set("x-nonce", nonce);
  naglowkiZadania.set("Content-Security-Policy", polityka);

  const odpowiedz = NextResponse.next({ request: { headers: naglowkiZadania } });
  odpowiedz.headers.set("Content-Security-Policy", polityka);
  return odpowiedz;
}
