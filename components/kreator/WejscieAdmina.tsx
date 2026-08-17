import Link from "next/link";
import { PenLine } from "lucide-react";
import { czyKreator } from "@/lib/kreator-dostep";

/**
 * Dyskretne wejście do kreatora na PUBLICZNYCH stronach sklepu.
 *
 * Widzi je wyłącznie ten, kto ma ważne ciastko bramy — dla wszystkich
 * pozostałych komponent nie renderuje NICZEGO (nie ma go w HTML-u, więc
 * nie da się go „znaleźć w źródle strony"). To wygoda, nie zabezpieczenie:
 * dostępu pilnuje token na stronie kreatora i w dyspozytorze, a nie
 * ukrycie linku.
 *
 * Na stronie kursu pigułka prowadzi wprost do edycji TEGO kursu —
 * właściciel poprawia to, na co właśnie patrzy.
 */
export default async function WejscieAdmina({
  edytujId,
}: {
  edytujId?: string;
}) {
  if (!(await czyKreator())) return null;

  const cel = edytujId
    ? `/szkolenia/kreator/${edytujId}`
    : "/szkolenia/kreator";

  return (
    <Link
      href={cel}
      data-wejscie-admina
      className="fixed right-4 bottom-4 z-50 inline-flex h-11 items-center gap-2 rounded-full border border-volt/30 bg-void/85 px-4 text-sm text-volt shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-md transition-colors hover:bg-volt hover:text-void md:right-6 md:bottom-6"
    >
      <PenLine aria-hidden className="size-4" />
      {edytujId ? "Edytuj ten kurs" : "Kreator kursów"}
      <span className="font-mono text-label tracking-[0.2em] opacity-60">
        ADMIN
      </span>
    </Link>
  );
}
