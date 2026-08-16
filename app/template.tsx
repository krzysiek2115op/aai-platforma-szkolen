"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Subtelne przejście między podstronami (fade + rise, ~300 ms) — przejęte
 * ze strony głównej. template.tsx montuje się na nowo przy każdej nawigacji,
 * więc animacja CSS odtwarza się sama; `prefers-reduced-motion` obsługuje
 * reguła w globals.css.
 */
export default function Template({ children }: { children: ReactNode }) {
  // Potwierdzenie hydratacji dla wyłącznika bezpieczeństwa z layout.tsx:
  // inline skrypt czeka na ten atrybut, inaczej zdejmuje klasę `js`.
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "");
  }, []);

  return <div className="page-enter">{children}</div>;
}
