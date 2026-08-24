import { redirect } from "next/navigation";

/**
 * Korzeń — wariant SERWEROWY.
 *
 * Ta aplikacja obsługuje wyłącznie poddrzewo /szkolenia; resztą serwisu
 * zarządza strona główna. Na serwerze przekierowanie robi HTTP.
 *
 * Wariant podglądu jest osobny (./page.statyczny.tsx), bo `redirect()`
 * w eksporcie statycznym nie ma czego wysłać — i, co gorsze, NIE psuje
 * builda: zamiast błędu produkuje `out/index.html` ze stroną błędu
 * Reacta. Wychwycił to dopiero podgląd wyjścia, więc smoke podglądu
 * sprawdza teraz korzeń wprost.
 */
export default function StronaGlowna() {
  redirect("/szkolenia");
}
