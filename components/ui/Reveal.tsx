"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wejścia elementów w widok — CSS + jeden IntersectionObserver.
 *
 * DLACZEGO NIE BIBLIOTEKA ANIMACJI. Poprzednia wersja opierała się na
 * framer-motion i renderowała stan początkowy do statycznego HTML jako
 * `style="opacity:0"` — na stronie głównej 85 elementów. Gdy JavaScript nie
 * doszedł do końca, strona była pusta. Dokładnie to raz się wydarzyło:
 * jeden zepsuty inline skrypt i cała treść przestała istnieć dla
 * użytkownika. Trzeba było dokładać regułę ratunkową w globals.css, która
 * wyłapywała te style po `[style*="opacity:0"]`.
 *
 * Teraz stan ukryty siedzi w CSS pod selektorem `html.js`, a klasę `js`
 * dokłada inline skrypt z layout.tsx. Brak JavaScriptu = treść widoczna od
 * pierwszej klatki, bez żadnej reguły ratunkowej. Awaria idzie w stronę
 * „widać wszystko, bez animacji", a nie „biała strona".
 *
 * Publiczne API (`Reveal`, `Cascade`, `CascadeItem`) zostało bez zmian —
 * 84 użycia w 25 plikach nie wymagały dotknięcia.
 *
 * Ta zamiana była pierwszym krokiem; framer-motion zniknął z projektu
 * dopiero wtedy, gdy przepisano wszystkie dziesięć miejsc, które go
 * używały. Połowa roboty nie dawała nic, bo biblioteka i tak lądowała
 * w bundlu.
 */

/** Kierunek wejścia elementu na ekran — choreografia wynika z układu sekcji. */
export type RevealFrom = "up" | "down" | "left" | "right" | "pop" | "none";

const SIDE_DISTANCE = 36;
const RISE_DISTANCE = 26;

/** Stan ukryty jako wartość `transform` — trafia do CSS przez `--reveal-from`. */
function hiddenTransform(from: RevealFrom, distance?: number): string {
  switch (from) {
    case "left":
      return `translateX(-${distance ?? SIDE_DISTANCE}px)`;
    case "right":
      return `translateX(${distance ?? SIDE_DISTANCE}px)`;
    case "down":
      return `translateY(-${distance ?? RISE_DISTANCE}px)`;
    case "pop":
      return `translateY(${distance ?? 14}px) scale(0.94)`;
    case "none":
      return "none";
    default:
      return `translateY(${distance ?? RISE_DISTANCE}px)`;
  }
}

/** Zmienne CSS w `style` — React je przepuszcza, TypeScript wymaga rzutowania. */
function zmienne(wartosci: Record<string, string>): CSSProperties {
  return wartosci as CSSProperties;
}

/* ————— obserwator ————— */

let obserwator: IntersectionObserver | null = null;

/*
 * Wyłącznik bezpieczeństwa dla samego obserwatora.
 *
 * Cała treść strony jest ukryta CSS-em do czasu, aż IntersectionObserver
 * zgłosi wejście w widok. Jeśli obserwator z jakiegokolwiek powodu nigdy nie
 * dostarczy wpisu — a takie środowiska istnieją, sam na jedno trafiłem
 * podczas pisania tego kodu — strona zostaje pusta MIMO poprawnej hydratacji.
 * Wyłącznik z layout.tsx tego nie złapie, bo on pilnuje hydratacji, a ta się
 * powiodła.
 *
 * Dlatego: jeśli w ciągu 3 sekund od pierwszej subskrypcji nie przyjdzie ANI
 * JEDEN wpis, uznajemy obserwator za niedziałający i odsłaniamy wszystko.
 *
 * Warunek jest celowo postawiony na „jakikolwiek wpis", nie „wpis widoczny":
 * działający obserwator melduje każdy obserwowany element od razu po
 * subskrypcji, także ten poza widokiem. Brak czegokolwiek oznacza awarię,
 * a nie stronę przewiniętą w nietypowe miejsce.
 */
let cokolwiekDostarczone = false;
let straznik: number | undefined;

function odslonWszystko() {
  if (cokolwiekDostarczone) return;
  obserwator?.disconnect();
  for (const el of document.querySelectorAll(".reveal")) {
    el.classList.add("reveal-in");
  }
}

/**
 * Uzbraja wyłącznik — ale dopiero, gdy dokument jest naprawdę oglądany.
 *
 * Reguły spekulacji renderują podstronę w tle, zanim ktokolwiek w nią
 * kliknie. Taki dokument jest ukryty: nie dostaje klatek, a obserwator
 * nie ma czego zgłosić, bo nie ma widoku. Odliczanie uruchomione od razu
 * uznałoby to za awarię i odsłoniło całą treść jeszcze przed wejściem —
 * użytkownik zobaczyłby gotową stronę bez ani jednej animacji wejścia.
 *
 * Dlatego licznik startuje przy pierwszym przejściu w stan widoczny.
 * Ta sama logika obsługuje kartę otwartą w tle.
 */
function uzbrojStraznik() {
  if (straznik !== undefined || cokolwiekDostarczone) return;

  if (document.visibilityState !== "visible") {
    document.addEventListener("visibilitychange", uzbrojStraznik, { once: true });
    return;
  }

  straznik = window.setTimeout(odslonWszystko, 3000);
}

/**
 * Odsłania element. Kontener kaskady zamiast siebie odsłania swoje dzieci,
 * rozdając im rosnące opóźnienia.
 */
function odslon(el: HTMLElement, self: IntersectionObserver) {
  const krok = el.dataset.cascade;
  if (krok === undefined) {
    el.classList.add("reveal-in");
    return;
  }

  const odstep = Number(krok) || 0;
  const start = Number(el.dataset.cascadeDelay) || 0;

  /*
   * `closest` odsiewa elementy należące do zagnieżdżonej kaskady — bez tego
   * wewnętrzna grupa dostałaby opóźnienia dwa razy, każde z innej numeracji.
   */
  const dzieci = [...el.querySelectorAll<HTMLElement>("[data-cascade-item]")].filter(
    (dziecko) => dziecko.closest("[data-cascade]") === el,
  );

  dzieci.forEach((dziecko, i) => {
    dziecko.style.setProperty("--reveal-delay", `${start + i * odstep}s`);
    dziecko.classList.add("reveal-in");
    // dziecko ma własną subskrypcję jako zabezpieczenie — już niepotrzebna
    self.unobserve(dziecko);
  });
}

/**
 * Jeden obserwator na cały dokument zamiast komponentu animacji na element.
 * Poprzednio 84 użycia oznaczały 84 osobne subskrypcje i 84 komponenty
 * liczące własne przejścia w rAF.
 */
function dolacz(el: HTMLElement): IntersectionObserver {
  obserwator ??= new IntersectionObserver(
    (wpisy, self) => {
      cokolwiekDostarczone = true;
      window.clearTimeout(straznik);

      const widoczne = wpisy.filter((w) => w.isIntersecting);

      /*
       * Kontenery kaskady idą pierwsze. Dziecko ma własną subskrypcję na
       * wypadek użycia poza kaskadą; gdyby jego wpis trafił do obsługi przed
       * wpisem rodzica, odsłoniłoby się natychmiast i cała choreografia
       * grupy zniknęłaby na rzecz jednoczesnego wejścia.
       */
      widoczne.sort(
        (a, b) =>
          Number((b.target as HTMLElement).dataset.cascade !== undefined) -
          Number((a.target as HTMLElement).dataset.cascade !== undefined),
      );

      for (const wpis of widoczne) {
        odslon(wpis.target as HTMLElement, self);
        self.unobserve(wpis.target); // wejście jest jednorazowe
      }
    },
    // ten sam margines, co poprzedni `viewport={{ margin: "-60px" }}`
    { rootMargin: "-60px" },
  );

  uzbrojStraznik();
  obserwator.observe(el);
  return obserwator;
}

/** Ref-callback z czyszczeniem (React 19) — element wypisuje się przy odmontowaniu. */
function przypnij(el: HTMLElement | null) {
  if (!el) return;
  const o = dolacz(el);
  return () => o.unobserve(el);
}

/* ————— komponenty ————— */

type RevealProps = {
  children: ReactNode;
  /** kierunek wejścia */
  from?: RevealFrom;
  /** dystans wejścia w px (nadpisuje domyślny dla kierunku) */
  distance?: number;
  /** opóźnienie animacji w sekundach */
  delay?: number;
  /** @deprecated alias `distance` dla kierunku pionowego */
  y?: number;
  className?: string;
};

/**
 * Wejście elementu z zadanego kierunku przy pierwszym pojawieniu się
 * w widoku. Przy `prefers-reduced-motion` treść jest widoczna od razu —
 * decyduje o tym CSS, nie ten komponent.
 */
export function Reveal({
  children,
  from = "up",
  distance,
  delay = 0,
  y,
  className,
}: RevealProps) {
  return (
    <div
      ref={przypnij}
      className={cn("reveal", className)}
      style={zmienne({
        "--reveal-from": hiddenTransform(from, distance ?? y),
        ...(delay ? { "--reveal-delay": `${delay}s` } : {}),
      })}
    >
      {children}
    </div>
  );
}

/* ————— kaskada: elementy listy/siatki wpadają jeden po drugim ————— */

type CascadeTag = "div" | "ul" | "ol" | "dl";
type CascadeItemTag = "div" | "li";

type CascadeProps = {
  children: ReactNode;
  /** element kontenera (zachowuje semantykę listy) */
  as?: CascadeTag;
  /** odstęp między elementami kaskady (s) */
  interval?: number;
  /** opóźnienie startu całej kaskady (s) */
  delay?: number;
  className?: string;
};

/**
 * Kontener kaskady: wejście w widok wyzwala dzieci jedno po drugim.
 * Wyzwalaczem jest grupa, nie pojedynczy element — inaczej przy dłuższej
 * liście dolne pozycje czekałyby na własne przewinięcie i rytm by się rozjechał.
 */
export function Cascade({
  children,
  as = "div",
  interval = 0.07,
  delay = 0,
  className,
}: CascadeProps) {
  // unia tagów rozjeżdża typ `ref`; zawężenie jest bezpieczne, bo wszystkie
  // warianty to zwykłe elementy blokowe HTML
  const Tag = as as "div";

  return (
    <Tag
      ref={przypnij}
      className={className}
      data-cascade={interval}
      data-cascade-delay={delay || undefined}
    >
      {children}
    </Tag>
  );
}

type CascadeItemProps = {
  children: ReactNode;
  as?: CascadeItemTag;
  from?: RevealFrom;
  distance?: number;
  className?: string;
};

/** Pojedynczy element kaskady — kierunek wejścia per element. */
export function CascadeItem({
  children,
  as = "div",
  from = "up",
  distance,
  className,
}: CascadeItemProps) {
  const Tag = as as "div";

  return (
    <Tag
      // własna subskrypcja to zabezpieczenie na wypadek użycia poza kaskadą:
      // bez niej element zostałby ukryty na zawsze
      ref={przypnij}
      data-cascade-item=""
      className={cn("reveal", className)}
      style={zmienne({ "--reveal-from": hiddenTransform(from, distance) })}
    >
      {children}
    </Tag>
  );
}
