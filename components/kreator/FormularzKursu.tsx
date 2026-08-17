"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import {
  PoleCena,
  PoleObszar,
  PoleTekst,
  PoleWybor,
} from "@/components/kreator/Pola";
import { bledyPol, komunikat, wystrzel } from "@/components/kreator/wystrzal";

/**
 * Formularz danych podstawowych kursu — to, co widać na karcie
 * katalogu: slug, tytuł, typ, opis, cena, okładka, badge i poziom.
 * Treść stron sprzedażowych (sekcje) i program (moduły + lekcje)
 * dokłada osobny krok Działu 6.
 *
 * Zapis idzie jedynym wystrzałem AJAX. Formularz nie waliduje niczego
 * „po swojemu" — prawdą są kontrakty Zod dyspozytora, a błędy z bazy
 * wracają tu przypięte do konkretnych pól.
 */

export type StanKursu = {
  id?: string;
  slug: string;
  title: string;
  type: "ebook" | "kurs";
  short_desc: string;
  price_grosze: number;
  cover_url: string;
  badge: string;
  level: string;
};

export const PUSTY_KURS: StanKursu = {
  slug: "",
  title: "",
  type: "kurs",
  short_desc: "",
  price_grosze: 0,
  cover_url: "",
  badge: "",
  level: "",
};

const POZIOMY = [
  { wartosc: "", tekst: "— nie pokazuj poziomu —" },
  { wartosc: "podstawowy", tekst: "Podstawowy" },
  { wartosc: "sredniozaawansowany", tekst: "Średnio zaawansowany" },
  { wartosc: "zaawansowany", tekst: "Zaawansowany" },
];

const TYPY = [
  { wartosc: "kurs", tekst: "Kurs" },
  { wartosc: "ebook", tekst: "Ebook" },
];

/** Tytuł → slug: właściciel nie musi go wymyślać ręcznie. */
function slugZTytulu(tytul: string): string {
  const znaki: Record<string, string> = {
    ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  };
  return tytul
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (z) => znaki[z] ?? z)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function FormularzKursu({
  poczatkowy,
}: {
  poczatkowy: StanKursu;
}) {
  const router = useRouter();
  const [kurs, setKurs] = useState<StanKursu>(poczatkowy);
  const [bledy, setBledy] = useState<Record<string, string>>({});
  const [blad, setBlad] = useState<string | null>(null);
  const [zapisano, setZapisano] = useState(false);
  const [zapisuje, setZapisuje] = useState(false);
  const [odswiezanie, startOdswiezania] = useTransition();
  // slug „idzie za tytułem" tylko w nowym kursie i tylko dopóki
  // właściciel sam go nie tknął — inaczej edycja zmieniałaby adres
  // opublikowanej strony pod nogami.
  const [slugAuto, setSlugAuto] = useState(!poczatkowy.id && !poczatkowy.slug);

  function ustaw<K extends keyof StanKursu>(pole: K, wartosc: StanKursu[K]) {
    setKurs((p) => ({ ...p, [pole]: wartosc }));
    setZapisano(false);
  }

  async function zapisz() {
    setZapisuje(true);
    setBlad(null);
    setBledy({});

    const wynik = await wystrzel({
      akcja: "zapisz",
      kurs: {
        ...(kurs.id ? { id: kurs.id } : {}),
        slug: kurs.slug,
        title: kurs.title,
        type: kurs.type,
        short_desc: kurs.short_desc || null,
        price_grosze: kurs.price_grosze,
        cover_url: kurs.cover_url || null,
        badge: kurs.badge || null,
        level: kurs.level || null,
      },
    });
    setZapisuje(false);

    if (!wynik.ok) {
      setBlad(komunikat(wynik));
      setBledy(bledyPol(wynik));
      return;
    }
    setZapisano(true);
    setSlugAuto(false);
    if (!kurs.id) {
      // nowy kurs dostał id — dalsza praca to już edycja tego kursu
      router.replace(`/szkolenia/kreator/${wynik.id}`);
      return;
    }
    startOdswiezania(() => router.refresh());
  }

  const zajety = zapisuje || odswiezanie;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-xl border border-line bg-panel/40 p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <PoleTekst
            etykieta="Tytuł kursu"
            wymagane
            wartosc={kurs.title}
            zmien={(v) => {
              ustaw("title", v);
              if (slugAuto) ustaw("slug", slugZTytulu(v));
            }}
            placeholder="Jak poprawnie korzystać z Claude"
            blad={bledy.title}
            klasa="md:col-span-2"
          />

          <PoleTekst
            etykieta="Adres (slug)"
            wymagane
            wartosc={kurs.slug}
            zmien={(v) => {
              setSlugAuto(false);
              ustaw("slug", slugZTytulu(v));
            }}
            placeholder="jak-korzystac-z-claude"
            podpowiedz={`Strona kursu: /szkolenia/${kurs.slug || "…"}`}
            blad={bledy.slug}
            klasa="md:col-span-2"
          />

          <PoleWybor
            etykieta="Typ produktu"
            wartosc={kurs.type}
            zmien={(v) => ustaw("type", v as StanKursu["type"])}
            opcje={TYPY}
            blad={bledy.type}
          />

          <PoleCena
            etykieta="Cena"
            grosze={kurs.price_grosze}
            zmien={(v) => ustaw("price_grosze", v)}
            podpowiedz="0 zł = produkt darmowy."
            blad={bledy.price_grosze}
          />

          <PoleObszar
            etykieta="Krótki opis (karta katalogu)"
            wartosc={kurs.short_desc}
            zmien={(v) => ustaw("short_desc", v)}
            placeholder="Jedno–dwa zdania, które sprzedają kurs na liście."
            podpowiedz={`${kurs.short_desc.length}/500 znaków`}
            blad={bledy.short_desc}
            klasa="md:col-span-2"
          />

          <PoleTekst
            etykieta="Badge"
            wartosc={kurs.badge}
            zmien={(v) => ustaw("badge", v)}
            placeholder="Bestseller"
            podpowiedz="Plakietka na karcie katalogu. Puste = bez plakietki."
            blad={bledy.badge}
          />

          <PoleWybor
            etykieta="Poziom"
            wartosc={kurs.level}
            zmien={(v) => ustaw("level", v)}
            opcje={POZIOMY}
            blad={bledy.level}
          />

          <PoleTekst
            etykieta="Okładka (adres obrazka)"
            typ="url"
            wartosc={kurs.cover_url}
            zmien={(v) => ustaw("cover_url", v)}
            placeholder="/okladki/claude.png"
            podpowiedz="Adres pliku lub ścieżka w katalogu public/."
            blad={bledy.cover_url}
            klasa="md:col-span-2"
          />
        </div>
      </div>

      {/* pasek zapisu trzyma się widoku — przy długim formularzu
          właściciel nie musi wracać na górę, żeby zapisać */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-line bg-panel/40 p-6">
          <p className="font-mono text-label uppercase tracking-[0.25em] text-steel">
            Zapis
          </p>
          <p className="mt-3 text-sm leading-relaxed text-steel">
            {kurs.id
              ? "Zmiany trafiają do bazy od razu po zapisie. Każda operacja zostaje w changelogu."
              : "Nowy kurs powstaje jako szkic — nie zobaczy go nikt poza Tobą, dopóki go nie opublikujesz."}
          </p>

          <button
            type="button"
            onClick={zapisz}
            disabled={zajety}
            className="btn-glow btn-sheen mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-volt text-sm font-medium text-void transition-colors hover:bg-[#d3ff70] disabled:opacity-60"
          >
            {zajety ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : zapisano ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Save aria-hidden className="size-4" />
            )}
            {zajety ? "Zapisuję…" : zapisano ? "Zapisane" : "Zapisz kurs"}
          </button>

          {blad ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {blad}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
