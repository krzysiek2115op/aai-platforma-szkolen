import { ChevronDown, Play } from "lucide-react";
import { Cascade, CascadeItem } from "@/components/ui/Reveal";
import type { SzczegolyKursu } from "@/modules/m1-sklep";
import { czasMaterialu, lekcje, moduly } from "@/lib/odmiana";
import { Sekcja } from "./Wspolne";

/**
 * Program kursu (brief CDS pkt 6) — pełna transparentność jak u wzoru:
 * wszystkie moduły i tytuły lekcji widoczne przed zakupem. Akordeon bez
 * JavaScriptu (details/summary), liczby liczone z danych z bazy.
 */
export default function SekcjaProgram({
  etykieta,
  kurs,
}: {
  etykieta: string;
  kurs: SzczegolyKursu;
}) {
  const liczbaLekcji = kurs.modules.reduce((n, m) => n + m.lessons.length, 0);
  const lacznyCzas = kurs.modules.reduce(
    (n, m) => n + m.lessons.reduce((s, l) => s + (l.duration_min ?? 0), 0),
    0
  );
  const opis = [
    moduly(kurs.modules.length),
    lekcje(liczbaLekcji),
    lacznyCzas > 0 ? `${czasMaterialu(lacznyCzas)} materiału` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Sekcja
      id="program"
      etykieta={etykieta}
      tytul="Program: dokładnie wiesz, co dostajesz"
      opis={`${opis} — każdy tytuł lekcji widzisz przed zakupem, żadnych niespodzianek.`}
    >
      <Cascade interval={0.05} className="mt-8 flex flex-col gap-3">
        {kurs.modules.map((modul, i) => {
          const czasModulu = modul.lessons.reduce(
            (s, l) => s + (l.duration_min ?? 0),
            0
          );
          return (
            <CascadeItem key={modul.id}>
              <details className="panel group/mod" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-4 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-xs text-steel tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold tracking-tight">
                    {modul.title}
                  </span>
                  {modul.summary ? (
                    <span className="mt-0.5 block text-sm text-steel">
                      {modul.summary}
                    </span>
                  ) : null}
                </span>
                <span className="hidden font-mono text-label tracking-[0.12em] text-steel uppercase sm:inline">
                  {lekcje(modul.lessons.length)}
                  {czasModulu > 0 ? ` · ${czasModulu} min` : ""}
                </span>
                <ChevronDown
                  aria-hidden
                  className="size-4 shrink-0 text-steel transition-transform group-open/mod:rotate-180"
                />
              </summary>
              {modul.lessons.length > 0 ? (
                <ul className="border-t border-line px-4 py-2 md:px-5">
                  {modul.lessons.map((lekcja) => (
                    <li
                      key={lekcja.id}
                      className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-b-0"
                    >
                      <Play aria-hidden className="size-3.5 shrink-0 text-steel" />
                      <span className="flex-1">{lekcja.title}</span>
                      {lekcja.preview ? (
                        <span className="font-mono text-label tracking-[0.12em] text-volt uppercase">
                          podgląd
                        </span>
                      ) : null}
                      {lekcja.duration_min ? (
                        <span className="font-mono text-label text-steel tabular-nums">
                          {lekcja.duration_min} min
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              </details>
            </CascadeItem>
          );
        })}
      </Cascade>
    </Sekcja>
  );
}
