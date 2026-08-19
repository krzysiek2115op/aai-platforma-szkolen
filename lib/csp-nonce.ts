import { headers } from "next/headers";
import { PODGLAD_STATYCZNY } from "@/lib/podglad";

/**
 * Nonce bieżącego żądania — dla znaczników, które piszemy MY.
 *
 * Next sam nadaje nonce swoim skryptom (framework, chunki strony,
 * dane hydratacji) i arkuszom, które hoistuje. NIE nadaje go trzem
 * rzeczom, które są nasze, co widać w wygenerowanym HTML-u:
 *   1. wyłącznikowi animacji z `app/layout.tsx` (inline `<script>`),
 *   2. danym strukturalnym `application/ld+json` (components/seo/JsonLd),
 *   3. arkuszowi `@font-face` wstawianemu przez `<style precedence>`.
 * Bez nonce'a polityka bez `unsafe-inline` po prostu je blokuje —
 * a przy `strict-dynamic` blokuje też każdy skrypt, który by z nich
 * wynikał. Stąd ta funkcja: każdy nasz znacznik bierze nonce stąd.
 *
 * W PODGLĄDZIE STATYCZNYM zwraca `undefined` i musi to zrobić PRZED
 * dotknięciem `headers()` — z tego samego powodu, dla którego brama
 * kreatora sprawdza tryb przed `cookies()`: w eksporcie nie ma żądania,
 * więc build wywróciłby się na próbie odczytu nagłówków. Podgląd nie
 * używa nonce'ów w ogóle — jego polityka stoi na hashach.
 *
 * SKUTEK UBOCZNY, KTÓRY JEST TU CELEM: wywołanie `headers()` w układzie
 * korzenia przestawia trasy renderowane statycznie (strona 404) na
 * renderowanie na żądanie. Bez tego 404 zostawała z prerenderu — jej
 * skrypty nie miały nonce'a i pod `strict-dynamic` nie wykonałby się
 * ani jeden (zmierzone: 24 skrypty, zero nonce'ów).
 */
export async function nonceCsp(): Promise<string | undefined> {
  if (PODGLAD_STATYCZNY) return undefined;
  return (await headers()).get("x-nonce") ?? undefined;
}
