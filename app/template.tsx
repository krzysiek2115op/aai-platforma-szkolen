"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Subtelne przejście między podstronami (fade + rise, ~300 ms) — przejęte
 * ze strony głównej. template.tsx montuje się na nowo przy każdej nawigacji,
 * więc animacja CSS odtwarza się sama; `prefers-reduced-motion` obsługuje
 * reguła w globals.css.
 *
 * DLACZEGO PIERWSZE WEJŚCIE JEST BEZ ANIMACJI.
 *
 * `.page-enter` opakowuje CAŁĄ treść strony i zaczyna od `opacity: 0`.
 * Na katalogu nie miało to znaczenia, bo globalny navbar renderuje się
 * POZA tym opakowaniem i przeglądarka zawsze ma co namalować. Ale strona
 * kursu ma własny pasek menu WEWNĄTRZ treści (NavbarPrzelacznik zwraca
 * tam `null` — feedback właściciela do B5), więc poza `.page-enter` nie
 * zostaje nic prócz skryptów i odnośnika „przejdź do treści".
 *
 * Efekt: dopóki animacja nie ruszy, strona kursu jest CAŁKOWICIE pusta.
 * A Chrome wstrzymuje animacje CSS w dokumencie, który nie jest widoczny
 * — wtedy nie rusza wcale. Lighthouse zgłaszał to jako NO_FCP („strona
 * nie namalowała żadnej treści") i nie był to artefakt naszej maszyny:
 * PageSpeed Insights NA SERWERACH GOOGLE odmówił zmierzenia strony kursu
 * w trybie desktop trzy razy z rzędu. Strona, której narzędzie Google
 * nie potrafi wczytać, tak samo nie pokaże się części użytkowników.
 *
 * Dlatego animacja obejmuje wyłącznie nawigacje MIĘDZY podstronami —
 * czyli sytuację, w której użytkownik i tak już coś widzi. Pierwsze
 * wejście pokazuje treść od razu, przy okazji o te ~300 ms szybciej.
 *
 * „Czy to już nie pierwsze wejście" poznajemy po atrybucie `data-hydrated`
 * na <html>. Zwykła zmienna modułowa tu nie wystarcza — sprawdzone: Next
 * dzieli kod na chunki i przy przejściu na stronę kursu moduł dostaje
 * świeżą kopię, więc flaga wracała do wartości początkowej i animacja
 * nie odpalała się już nigdy. Atrybut siedzi na elemencie, który przeżywa
 * każdą nawigację kliencką, i jest ustawiany raz — niżej, po hydratacji.
 *
 * Hydratacja się zgadza, bo w pierwszym renderze na kliencie atrybutu
 * jeszcze nie ma (efekty biegną PO renderze), a serwer w ogóle nie widzi
 * dokumentu — obie strony dają więc „bez klasy".
 */
export default function Template({ children }: { children: ReactNode }) {
  const [animuj] = useState(
    () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-hydrated"),
  );

  // Potwierdzenie hydratacji dla wyłącznika bezpieczeństwa z layout.tsx:
  // inline skrypt czeka na ten atrybut, inaczej zdejmuje klasę `js`.
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "");
  }, []);

  return <div className={animuj ? "page-enter" : undefined}>{children}</div>;
}
