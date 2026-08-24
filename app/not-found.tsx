import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** 404 w języku wizualnym Volt — m.in. dla nieistniejących kursów. */
export default function NieZnaleziono() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid mask-fade-y absolute inset-0" />
      <div className="container-site relative flex min-h-[60vh] flex-col items-start justify-center py-28">
        <p className="font-mono text-xs tracking-[0.25em] text-volt uppercase">
          [ Błąd · 404 ]
        </p>
        <h1 className="mt-4 max-w-3xl text-page-title leading-[1.05] font-semibold tracking-[-0.03em]">
          Tej strony tu nie ma.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-steel">
          Adres jest nieaktualny albo kurs nie jest już dostępny.
        </p>
        <Link
          href="/szkolenia"
          className="group mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-volt px-5 text-sm font-medium text-void transition-colors hover:bg-[#d3ff70]"
        >
          Wróć do katalogu
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
