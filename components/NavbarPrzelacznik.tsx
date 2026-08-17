"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

/**
 * Strona kursu /szkolenia/[slug] ma WŁASNY pasek menu (PasekKursu —
 * feedback właściciela do B5: „totalnie nowy pasek, nie stary") —
 * globalny navbar renderuje się wszędzie poza nią.
 */
export default function NavbarPrzelacznik() {
  const sciezka = usePathname();
  if (/^\/szkolenia\/[^/]+$/.test(sciezka)) return null;
  return <Navbar />;
}
