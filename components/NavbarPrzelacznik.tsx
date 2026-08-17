"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

/**
 * Strona kursu /szkolenia/[slug] ma WŁASNY pasek menu (PasekKursu —
 * feedback właściciela do B5: „totalnie nowy pasek, nie stary"), a cały
 * kreator swój (PasekKreatora) — globalny navbar renderuje się wszędzie
 * poza nimi. Kreator wyłączamy całym poddrzewem, inaczej lista kursów
 * (pasuje do wzorca [slug]) byłaby bez navbara, a edycja kursu miałaby
 * dwa paski naraz.
 */
export default function NavbarPrzelacznik() {
  const sciezka = usePathname();
  if (
    sciezka === "/szkolenia/kreator" ||
    sciezka.startsWith("/szkolenia/kreator/")
  ) {
    return null;
  }
  if (/^\/szkolenia\/[^/]+$/.test(sciezka)) return null;
  return <Navbar />;
}
