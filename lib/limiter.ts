/**
 * LIMITER OKNA PRZESUWNEGO — wspólny mechanizm dla obu kanałów, którymi
 * da się dobijać do bramy kreatora: jedynego AJAX-a (`/api/szkolenia`)
 * i formularza logowania (akcja serwerowa).
 *
 * PO CO. Do 0.26.0 zgadywanie tokenu miało cenę wyłącznie w formularzu
 * (700 ms kary w `app/szkolenia/kreator/akcje.ts`). Kanał sieciowy —
 * ten JEDYNY wystawiony na świat — nie miał ani kary, ani limitu, więc
 * zgadywanie tamtędy było darmowe i nieograniczone. Formularz chroniony,
 * a drzwi obok otwarte na oścież.
 *
 * DLACZEGO TEN PLIK NIE IMPORTUJE `next/*`. Ma być testowalny bez
 * serwera: `npm test` obejmuje `lib/**\/*.test.ts`, więc granice okna,
 * zwalnianie po czasie i rozdział kluczy sprawdzamy jednostkowo,
 * z wstrzykniętym czasem, zamiast zgadywać ze zrzutów żywego serwera.
 * Ten sam układ ma `lib/csp.ts` — czysta reguła osobno, wpięcie osobno.
 * Adres IP jest pojęciem TRANSPORTU, więc wpięcie siedzi w warstwie
 * HTTP, a nie w module `m1-sklep` (ten ma zostać niezależny od tego,
 * kto go woła — dziś Next, w wtyczce WordPressa PHP).
 *
 * CZEGO TO NIE JEST. Limit po adresie IP podnosi KOSZT ataku i nie jest
 * granicą bezpieczeństwa — patrz `adresKlienta()` niżej. Granicą jest
 * porównanie tokenu w stałym czasie (`modules/m1-sklep/dyspozytor.ts`,
 * `lib/kreator-dostep.ts`), a docelowo prawdziwe uwierzytelnianie
 * z Pluginu 3.
 *
 * STAN SIEDZI W PAMIĘCI PROCESU — świadomie. Prototyp obsługuje jednego
 * właściciela na jednym procesie; restart czyści liczniki, a przy wielu
 * instancjach każda liczyłaby po swojemu. Do specyfikacji wtyczki WP
 * idzie REGUŁA (okno przesuwne po adresie i akcji), nie ta
 * implementacja — tam nośnikiem będzie baza albo obiekt cache.
 */

/** Ile prób wolno w oknie o zadanej długości. */
export type Limit = { proby: number; oknoMs: number };

export type WynikLimitu = {
  /** Czy próbę wolno wykonać (i czy została policzona). */
  dozwolone: boolean;
  /** Ile jeszcze prób mieści się w bieżącym oknie. */
  pozostalo: number;
  /** Sekundy do zwolnienia miejsca — prosto do nagłówka `Retry-After`. */
  ponowZaS: number;
};

/**
 * Wystrzał AJAX ogółem: 60 żądań na minutę z jednego adresu. Próg jest
 * wysoko nad realnym użyciem (właściciel klika „Zapisz" kilka razy na
 * minutę), więc ma odcinać zalew, a nie pracę.
 */
export const LIMIT_WYSTRZALU: Limit = { proby: 60, oknoMs: 60_000 };

/**
 * NIEUDANE uwierzytelnienia — licznik osobny i dużo ostrzejszy: pięć
 * chybionych prób na dziesięć minut z adresu. Udane próby go nie
 * dotyczą (i zerują go, patrz wpięcia), więc praca w kreatorze nie ma
 * jak w niego wpaść — a zgadywanie tokenu owszem.
 */
export const LIMIT_UWIERZYTELNIEN: Limit = { proby: 5, oknoMs: 10 * 60_000 };

/**
 * Kara czasowa po chybionej próbie — jedno źródło dla obu kanałów.
 * Do 0.26.0 ta stała żyła w formularzu i tylko jego dotyczyła.
 * 700 ms jest niezauważalne dla człowieka, który się pomylił,
 * a zgadywanie spowalnia o rząd wielkości.
 */
export const KARA_MS = 700;

/**
 * Adres klienta z nagłówków żądania.
 *
 * `x-forwarded-for` JEST DO PODROBIENIA. Dopóki przed aplikacją nie stoi
 * zaufany proxy, który ten nagłówek NADPISUJE, każdy może wysłać dowolną
 * wartość i tym samym trafiać za każdym razem do innego kubełka —
 * czyli obejść limit jednym dopisanym nagłówkiem. Trzymamy to zdanie
 * w kodzie, a nie tylko w rozmowie, bo limiter po adresie łatwo pomylić
 * z zabezpieczeniem: to jest podniesienie kosztu ataku (skanowanie
 * z jednego adresu przestaje być darmowe), nie granica bezpieczeństwa.
 * To samo zastrzeżenie wchodzi do specyfikacji wtyczki WP (§8
 * checklisty) — tam nagłówek trzeba będzie brać wyłącznie od hostingu,
 * o którym wiadomo, że go nadpisuje.
 *
 * Wartość PRZYCINAMY do 45 znaków (długość najdłuższego adresu IPv6),
 * bo to jest tekst sterowany przez klienta, a trafia do klucza mapy —
 * bez przycięcia dałoby się zająć pamięć procesu samymi kluczami.
 *
 * Parametr jest interfejsem strukturalnym (`{ get(nazwa) }`), żeby
 * pasował zarówno do `Headers` z żądania, jak i do `headers()` Next-a,
 * a plik dalej nie zależał od frameworka.
 */
export function adresKlienta(naglowki: {
  get(nazwa: string): string | null;
}): string {
  const przekazany = naglowki.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (przekazany) return przekazany.slice(0, 45);
  const realny = naglowki.get("x-real-ip")?.trim();
  if (realny) return realny.slice(0, 45);
  // Bez nagłówków (localhost, testy) wszyscy dzielą jeden kubełek —
  // wybór konserwatywny: wolimy policzyć razem niż nie policzyć wcale.
  return "bez-adresu";
}

export type Limiter = {
  /**
   * Odnotowuje próbę i mówi, czy mieści się w limicie. Jedna funkcja,
   * nie „sprawdź" + „policz", bo dwie osobne dałyby się wykonać w złej
   * kolejności — a wtedy limiter przepuszcza dokładnie tyle żądań, ile
   * ich naraz przyjdzie.
   */
  odnotuj(klucz: string, limit: Limit, teraz?: number): WynikLimitu;
  /** Kasuje historię klucza — po udanym uwierzytelnieniu. */
  zapomnij(klucz: string): void;
  /** Liczba pilnowanych kluczy (do testów i do kontroli pamięci). */
  rozmiar(): number;
};

/**
 * Fabryka, a nie sam singleton, bo test musi dostać CZYSTY licznik —
 * inaczej kolejność testów zmieniałaby ich wynik. Aplikacja bierze
 * wspólną instancję `limiter` (niżej).
 *
 * `maksKluczy` chroni przed drugą stroną tego samego problemu: mapa
 * rosnąca po adresie jest sama w sobie wektorem wyczerpania pamięci.
 * Po przekroczeniu progu wyrzucamy najpierw klucze wygasłe, a gdy to
 * nie wystarczy — najdawniej aktywne. To jest świadomy kompromis:
 * rozproszony atak z tysięcy adresów wymyka się takiej amnestii, ale
 * wtedy granicą i tak jest hosting albo CDN, a nie ten plik.
 *
 * DLACZEGO KLUCZ PAMIĘTA DŁUGOŚĆ SWOJEGO OKNA (poprawka 0.37.0,
 * znalezisko A przeglądu B7). Do 0.36.0 sprzątanie dostawało okno
 * BIEŻĄCEGO żądania i tym oknem mierzyło WSZYSTKIE klucze. Ponieważ
 * ruch idzie głównie wystrzałem (okno 60 s), zalew kluczy sprzątał
 * blokady uwierzytelnień (okno 10 min) już po minucie bezczynności —
 * czyli kasował ochronę na dziewięć minut przed terminem, który sam
 * podał klientowi w `Retry-After`. Drugie pół tej samej usterki:
 * eksmisja przy przepełnieniu szła po kolejności WSTAWIENIA (`Map`),
 * więc świeżo nałożona blokada wypadała przed martwym kluczem sprzed
 * godziny. Od 0.37.0 każdy klucz jest mierzony WŁASNYM oknem,
 * a wypadają najdawniej aktywne. Reguła idzie w tej postaci do
 * specyfikacji wtyczki WP — z zastrzeżeniem, że tam nośnikiem musi być
 * TABELA, nie cache: obiekt cache eksmituje wpisy po swojemu i wraca
 * dokładnie ten sam problem.
 */
type Wpis = {
  /** znaczniki czasu prób mieszczących się w oknie */
  znaczniki: number[];
  /** długość okna TEGO klucza — sprzątanie mierzy każdy jego własnym */
  oknoMs: number;
  /** próg TEGO klucza — po nim widać, czy klucz trzyma czynną blokadę */
  proby: number;
};

const ostatniaProba = (wpis: Wpis): number =>
  wpis.znaczniki[wpis.znaczniki.length - 1] ?? 0;

/**
 * Klucz, który wyczerpał swój limit, TRZYMA czynną blokadę — jego
 * usunięcie nie zwalnia pamięci po kimś nieaktywnym, tylko zdejmuje
 * karę zgadującemu. Dlatego przy przepełnieniu wypada dopiero po
 * wszystkich pozostałych.
 */
const trzymaBlokade = (wpis: Wpis): boolean =>
  wpis.znaczniki.length >= wpis.proby;

export function utworzLimiter(opcje: { maksKluczy?: number } = {}): Limiter {
  const maksKluczy = opcje.maksKluczy ?? 10_000;
  const okna = new Map<string, Wpis>();

  function posprzataj(teraz: number): void {
    // 1. Wygasłe — każdy klucz mierzony WŁASNYM oknem.
    for (const [klucz, wpis] of okna) {
      if (ostatniaProba(wpis) <= teraz - wpis.oknoMs) okna.delete(klucz);
    }
    if (okna.size <= maksKluczy) return;

    // 2. Nadal za dużo → wypadają NAJDAWNIEJ AKTYWNE, a nie najdawniej
    //    wstawione. Blokada nałożona przed chwilą przeżywa zalew kluczy;
    //    bez tego wystarczyło zasypać limiter adresami, żeby zdjąć sobie
    //    karę za zgadywanie tokenu.
    //    Zwalniamy z zapasem (do 90% progu), żeby przy trwającym zalewie
    //    sortowanie nie powtarzało się przy każdym kolejnym żądaniu.
    const cel = Math.floor(maksKluczy * 0.9);
    const kolejnoscOfiar = [...okna].sort(
      (a, b) =>
        Number(trzymaBlokade(a[1])) - Number(trzymaBlokade(b[1])) ||
        ostatniaProba(a[1]) - ostatniaProba(b[1])
    );
    for (const [klucz] of kolejnoscOfiar) {
      if (okna.size <= cel) break;
      okna.delete(klucz);
    }
  }

  return {
    odnotuj(klucz, limit, teraz = Date.now()): WynikLimitu {
      const poczatekOkna = teraz - limit.oknoMs;
      const poprzedni = okna.get(klucz);
      const swieze = (poprzedni?.znaczniki ?? []).filter(
        (t) => t > poczatekOkna
      );
      // Ten sam klucz zawsze przychodzi z tym samym limitem (klucz to
      // `<akcja>:<adres>`), ale gdyby kiedyś przyszedł z dwoma — do
      // sprzątania bierzemy DŁUŻSZE okno. Pomyłka w tę stronę zostawia
      // klucz o chwilę za długo; w drugą kasowałaby czynną blokadę.
      const oknoMs = Math.max(limit.oknoMs, poprzedni?.oknoMs ?? 0);

      if (swieze.length >= limit.proby) {
        // Odrzuconej próby NIE dopisujemy. Gdyby dopisywać, ktoś walący
        // bez przerwy w zamknięte drzwi przesuwałby sobie okno w
        // nieskończoność, a `Retry-After` byłby zmyśloną liczbą. Tak
        // limiter ogranicza TEMPO (proby/okno) zamiast karać — i ma
        // z definicji ograniczoną pamięć: najwyżej `proby` znaczników.
        okna.set(klucz, { znaczniki: swieze, oknoMs, proby: limit.proby });
        return {
          dozwolone: false,
          pozostalo: 0,
          ponowZaS: Math.max(
            1,
            Math.ceil((swieze[0] + limit.oknoMs - teraz) / 1000)
          ),
        };
      }

      swieze.push(teraz);
      okna.set(klucz, { znaczniki: swieze, oknoMs, proby: limit.proby });
      if (okna.size > maksKluczy) posprzataj(teraz);
      return {
        dozwolone: true,
        pozostalo: limit.proby - swieze.length,
        ponowZaS: 0,
      };
    },

    zapomnij(klucz): void {
      okna.delete(klucz);
    },

    rozmiar(): number {
      return okna.size;
    },
  };
}

/**
 * Wspólna instancja dla warstwy HTTP. Klucze mają postać
 * `<akcja>:<adres>` — jeden adres ma osobne liczniki dla wystrzału,
 * dla chybionych uwierzytelnień AJAX-a i dla chybionych logowań.
 */
export const limiter = utworzLimiter();
