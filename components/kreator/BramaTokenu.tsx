"use client";

import { useActionState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { zaloguj, type StanBramy } from "@/app/szkolenia/kreator/akcje";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Brama kreatora: bez poprawnego tokenu strona nie pokazuje ANI JEDNEGO
 * kursu — również szkiców, bo lista kreatora czyta bazę już przy
 * renderowaniu. Formularz jest zwykłym `<form action={...}>`, więc
 * działa też bez JavaScriptu.
 */
export default function BramaTokenu() {
  const [stan, akcja, wTrakcie] = useActionState<StanBramy, FormData>(
    zaloguj,
    {}
  );

  return (
    <div className="container-site flex min-h-[70vh] items-center justify-center py-24">
      <Reveal from="pop">
        <div className="w-full max-w-md rounded-xl border border-line bg-panel/60 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <span className="inline-flex size-11 items-center justify-center rounded-full border border-volt/25 bg-volt/10 text-volt">
            <KeyRound aria-hidden className="size-5" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Kreator kursów
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-steel">
            Panel treści Pluginu 1. Wejście na token z pliku{" "}
            <code className="font-mono text-xs text-fg">.env</code> —
            pełne logowanie da Plugin 3.
          </p>

          <form action={akcja} className="mt-7">
            <label className="block">
              <span className="font-mono text-label uppercase tracking-[0.25em] text-steel">
                Token dostępu
              </span>
              <input
                name="token"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                aria-invalid={stan.blad ? true : undefined}
                className={`mt-2 w-full rounded-md border bg-void/60 px-3 py-2.5 font-mono text-sm text-fg outline-none transition-colors focus:bg-void ${
                  stan.blad
                    ? "border-red-500/60"
                    : "border-line focus:border-volt/60"
                }`}
              />
            </label>

            {stan.blad ? (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {stan.blad}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={wTrakcie}
              className="btn-glow btn-sheen mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-volt text-sm font-medium text-void transition-colors hover:bg-[#d3ff70] disabled:opacity-60"
            >
              {wTrakcie ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <ShieldCheck aria-hidden className="size-4" />
              )}
              {wTrakcie ? "Sprawdzam…" : "Wejdź do kreatora"}
            </button>
          </form>
        </div>
      </Reveal>
    </div>
  );
}
