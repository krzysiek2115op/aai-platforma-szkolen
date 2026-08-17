import { Check, Lock, Play } from "lucide-react";
import type { SzczegolyKursu } from "@/modules/m1-sklep";

/**
 * Mockup „produktu od środka": okno odtwarzacza kursu zbudowane
 * z PRAWDZIWYCH danych kursu (moduły/lekcje z bazy) — nie stockowa
 * grafika. Postęp jest dekoracją mockupu (deterministyczny od indeksu),
 * ale tytuły i liczby są realne.
 */
export default function OknoKursu({ kurs }: { kurs: SzczegolyKursu }) {
  const lekcje = kurs.modules.flatMap((m) => m.lessons);
  const naglowne = lekcje.slice(0, 4);
  // deterministyczny „postęp" mockupu: maleje z indeksem
  const postep = [100, 60, 0, 0];

  return (
    <div className="panel overflow-hidden text-left shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      {/* pasek okna */}
      <div className="flex items-center gap-2 border-b border-line bg-void/60 px-4 py-2.5">
        <span aria-hidden className="size-2.5 rounded-full bg-steel/40" />
        <span aria-hidden className="size-2.5 rounded-full bg-steel/40" />
        <span aria-hidden className="size-2.5 rounded-full bg-volt/70" />
        <span className="ml-3 truncate font-mono text-label tracking-[0.12em] text-steel">
          matthewplugins.pl/szkolenia/{kurs.slug}
        </span>
      </div>

      <div className="grid sm:grid-cols-[11rem_1fr]">
        {/* sidebar modułów — realne tytuły z bazy */}
        <nav
          aria-label="Moduły kursu (podgląd)"
          className="hidden border-r border-line bg-void/40 p-3 sm:block"
        >
          <p className="font-mono text-micro tracking-[0.25em] text-steel uppercase">
            Program
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {kurs.modules.slice(0, 4).map((m, i) => (
              <li
                key={m.id}
                className={`truncate rounded px-2 py-1.5 text-xs ${
                  i === 0 ? "bg-volt/10 text-volt" : "text-steel"
                }`}
              >
                <span className="font-mono tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>{" "}
                {m.title}
              </li>
            ))}
          </ul>
        </nav>

        {/* lista lekcji z paskami postępu */}
        <div className="p-4">
          <p className="truncate text-sm font-semibold tracking-tight">
            {kurs.title}
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {naglowne.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                    postep[i] === 100
                      ? "border-volt/40 bg-volt/15 text-volt"
                      : postep[i] > 0
                        ? "border-line text-fg"
                        : "border-line text-steel/60"
                  }`}
                >
                  {postep[i] === 100 ? (
                    <Check className="size-3" />
                  ) : postep[i] > 0 ? (
                    <Play className="size-3" />
                  ) : (
                    <Lock className="size-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-fg">
                    {l.title}
                  </span>
                  <span className="mt-1 block h-1 rounded-full bg-line">
                    <span
                      className="pasek-postepu block"
                      style={{ width: `${postep[i]}%` }}
                    />
                  </span>
                </span>
                {l.duration_min ? (
                  <span className="font-mono text-micro text-steel tabular-nums">
                    {l.duration_min} min
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
