import { Check } from "lucide-react";
import OknoKursu from "@/components/szkolenia/OknoKursu";
import { Reveal } from "@/components/ui/Reveal";
import type { SzczegolyKursu } from "@/modules/m1-sklep";
import { Sekcja } from "./Wspolne";

/**
 * Podgląd platformy (brief CDS pkt 7): „tak wygląda produkt po zakupie".
 * Mockup OknoKursu budowany z PRAWDZIWYCH modułów i lekcji z bazy —
 * żadnych fałszywych screenshotów.
 */
export default function SekcjaPlatforma({
  etykieta,
  kurs,
}: {
  etykieta: string;
  kurs: SzczegolyKursu;
}) {
  const punkty = [
    "Moduły i lekcje w stałej kolejności — zawsze wiesz, gdzie jesteś.",
    "Widzisz swój postęp lekcja po lekcji.",
    "Wracasz do dowolnej lekcji, kiedy chcesz — dostęp bez limitu czasu.",
  ];

  return (
    <Sekcja
      etykieta={etykieta}
      tytul="Tak wygląda kurs od środka"
      opis="Podgląd zbudowany z prawdziwego programu tego kursu — to samo zobaczysz po zalogowaniu."
    >
      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <Reveal from="up">
          <OknoKursu kurs={kurs} />
        </Reveal>
        <ul className="grid gap-4">
          {punkty.map((punkt) => (
            <li key={punkt} className="flex items-start gap-3">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-volt" />
              <span className="text-base leading-relaxed text-fg">{punkt}</span>
            </li>
          ))}
        </ul>
      </div>
    </Sekcja>
  );
}
