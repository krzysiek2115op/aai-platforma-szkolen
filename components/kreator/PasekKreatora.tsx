import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { wyloguj } from "@/app/szkolenia/kreator/akcje";

/**
 * Pływający pasek kreatora — ten sam język co pasek strony kursu
 * (pigułka na tle, backdrop-blur, volt na akcentach), ale z zadaniami
 * panelu: powrót do katalogu, nazwa miejsca, wylogowanie.
 *
 * `position: fixed` działa, bo klasa opakowująca treść (.page-enter)
 * nie animuje transformu — pilnuje tego straznik-fixed (BLAD-003).
 * Wylogowanie to zwykły `<form>` z akcją serwerową: bez JavaScriptu
 * też zadziała.
 */
export default function PasekKreatora({
  tytul,
  wrocDo = "/szkolenia",
}: {
  tytul: string;
  wrocDo?: string;
}) {
  return (
    <header
      data-pasek-kreatora
      className="pasek-wjazd fixed inset-x-0 top-0 z-50 px-3 pt-3 md:pt-4"
    >
      <nav
        aria-label="Nawigacja kreatora"
        className="mx-auto flex h-12 w-full max-w-4xl items-center gap-2 rounded-full border border-line bg-void/80 px-2 shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-md md:h-13"
      >
        <Link
          href={wrocDo}
          aria-label="Wróć"
          className="group/wroc flex size-9 shrink-0 items-center justify-center rounded-full border border-volt/25 bg-volt/10 font-mono text-xs font-semibold text-volt transition-colors hover:bg-volt hover:text-void"
        >
          <span className="group-hover/wroc:hidden">MP</span>
          <ArrowLeft aria-hidden className="hidden size-4 group-hover/wroc:block" />
        </Link>

        <p className="flex-1 truncate px-1 text-sm text-fg">
          <span className="font-mono text-label uppercase tracking-[0.25em] text-volt">
            Kreator
          </span>
          <span className="mx-2 text-steel/40">/</span>
          <span className="text-steel">{tytul}</span>
        </p>

        <form action={wyloguj}>
          <button
            type="submit"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm text-steel transition-colors hover:border-fg/20 hover:text-fg"
          >
            <LogOut aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Wyloguj</span>
          </button>
        </form>
      </nav>
    </header>
  );
}
