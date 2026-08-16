import { redirect } from "next/navigation";

// Ta aplikacja obsługuje wyłącznie poddrzewo /szkolenia — korzeń
// przekierowuje tam; resztą serwisu zarządza strona główna.
export default function StronaGlowna() {
  redirect("/szkolenia");
}
