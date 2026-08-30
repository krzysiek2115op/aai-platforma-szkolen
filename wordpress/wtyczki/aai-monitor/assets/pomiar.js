/**
 * Timer wizyt — jedyny kod monitoringu, który biegnie w przeglądarce.
 *
 * Mierzy CZAS AKTYWNY (zegar stoi, gdy karta jest ukryta) i wysyła
 * DOKŁADNIE JEDEN beacon na odsłonę, przy wyjściu ze strony.
 *
 * Wszystko poniżej wynika z pomiarów zrobionych PRZED napisaniem tego
 * pliku (docs/plugin-3/KROK-T3.md, sekcja 2) — nie z dokumentacji
 * i nie z rozsądku:
 *
 *  - `pagehide` i `visibilitychange` odpalają w TEJ SAMEJ milisekundzie,
 *    więc bez flagi każda odsłona zapisałaby się DWA razy;
 *  - powrót „wstecz" przywraca stronę z bfcache z ZACHOWANYM stanem JS,
 *    więc bez zdjęcia flagi na `pageshow.persisted` ta odsłona nie
 *    zapisałaby się WCALE;
 *  - `visibilitychange` → `hidden` jest ostatnim zdarzeniem wiarygodnie
 *    obserwowalnym przez stronę, a `pagehide` bywa pomijane na
 *    urządzeniach mobilnych — dlatego oba, ale z jedną wysyłką;
 *  - `sessionStorage` rzuca `SecurityError`, gdy odwiedzający blokuje
 *    ciasteczka — bez `try/catch` pomiar milczałby u części ludzi;
 *  - ścieżka i podpis PRZYCHODZĄ Z SERWERA i wracają nietknięte:
 *    gdyby ścieżkę wyprowadzał tu `location.pathname`, każda różnica
 *    w normalizacji (ukośnik, procent-kodowanie, wielkość liter)
 *    kasowałaby beacon po cichu.
 */
(function () {
	"use strict";

	var dane = window.aaiMonitorPomiar;
	if (!dane || !dane.adres || !dane.sciezka || !dane.podpis) {
		return;
	}

	// Automaty nie są ruchem (F6). Bramki jakości nadpisują tę flagę
	// preloadem i dzięki temu para N9/N10 dowodzi obu stron naraz:
	// z nadpisaniem wiersz JEST, bez nadpisania go NIE MA.
	if (navigator.webdriver) {
		return;
	}

	// Bez losowości nie ma identyfikatora sesji, a bez niego liczba
	// „sesji" na ekranie byłaby zmyślona. `getRandomValues` działa także
	// poza HTTPS — w odróżnieniu od `randomUUID`, który i tak dawałby
	// 36 znaków i nie przeszedłby przez sito.
	if (!window.crypto || !window.crypto.getRandomValues || !navigator.sendBeacon) {
		return;
	}

	var KLUCZ_SESJI = "aai_monitor_sesja";

	function losowe32() {
		var bajty = new Uint8Array(16);
		window.crypto.getRandomValues(bajty);
		var wynik = "";
		for (var i = 0; i < bajty.length; i++) {
			wynik += (bajty[i] + 0x100).toString(16).slice(1);
		}
		return wynik;
	}

	/**
	 * Identyfikator sesji: ten sam dla kolejnych stron w tej karcie.
	 *
	 * `sessionStorage` jest KOPIOWANY do karty otwartej z linku, więc
	 * dwie karty jednego człowieka bywają jedną „sesją" — liczba sesji
	 * znaczy więc „drzewa kart", nie „ludzi", i tak jest podpisana na
	 * ekranie. Gdy magazyn jest zablokowany, identyfikator żyje tylko
	 * w pamięci: sesja równa się wtedy odsłonie, ale pomiar DZIAŁA.
	 */
	function idSesji() {
		var id = null;
		try {
			id = window.sessionStorage.getItem(KLUCZ_SESJI);
		} catch (e) {
			id = null;
		}
		if (!id || !/^[0-9a-f]{32}$/.test(id)) {
			id = losowe32();
			try {
				window.sessionStorage.setItem(KLUCZ_SESJI, id);
			} catch (e) {
				/* magazyn zablokowany — mierzymy dalej, bez ciągłości sesji */
			}
		}
		return id;
	}

	var sesja = idSesji();

	var poczatek = performance.now(); // do wieku odsłony
	var aktywneOd = null;             // moment ostatniego przejścia w widoczny
	var aktywne = 0;                  // suma czasu widoczności
	var bylaWidoczna = false;         // czy człowiek w ogóle to zobaczył
	var wyslane = false;

	function ruszZegar() {
		if (null === aktywneOd) {
			aktywneOd = performance.now();
			bylaWidoczna = true;
		}
	}

	function stopZegar() {
		if (null !== aktywneOd) {
			aktywne += performance.now() - aktywneOd;
			aktywneOd = null;
		}
	}

	function wyslij() {
		if (wyslane) {
			return;
		}
		// Strona, której nikt nie zobaczył, nie jest odsłoną. Ten jeden
		// warunek obsługuje kartę otwartą w tle i zamkniętą bez
		// oglądania ORAZ stronę wstępnie renderowaną przez przeglądarkę
		// (obie są `hidden`, dopóki człowiek na nie nie spojrzy).
		if (!bylaWidoczna) {
			return;
		}
		stopZegar();
		wyslane = true;

		var ladunek = {
			sciezka: dane.sciezka,
			podpis: dane.podpis,
			sesja: sesja,
			// Czas AKTYWNY — ile realnie patrzyli.
			trwanie_ms: Math.round(aktywne),
			// Wiek odsłony — od wejścia do tej chwili. Z NIEGO serwer
			// liczy moment wejścia; czas aktywny by do tego nie służył,
			// bo karta czytana dwie minuty i zamknięta po ośmiu godzinach
			// miałaby „wejście" sprzed chwili.
			wiek_ms: Math.round(performance.now() - poczatek)
		};

		// Blob z jawnym typem: `sendBeacon` ze zwykłym łańcuchem wysyła
		// `text/plain`, a nasz endpoint takiego ciała nie przyjmuje —
		// bo to właśnie `text/plain` przechodzi cross-origin i pozwalałby
		// obcej witrynie zawyżać nasz ruch.
		navigator.sendBeacon(
			dane.adres,
			new Blob([JSON.stringify(ladunek)], { type: "application/json" })
		);
	}

	document.addEventListener("visibilitychange", function () {
		if ("visible" === document.visibilityState) {
			ruszZegar();
			return;
		}
		// Przejście w `hidden` to prawdopodobny koniec odsłony —
		// i ostatnia chwila, w której da się cokolwiek wysłać.
		wyslij();
	});

	// Zapas dla przeglądarek, które przy zamykaniu karty wołają tylko to.
	window.addEventListener("pagehide", wyslij);

	// Powrót z bfcache: strona wraca ŻYWA, z tym samym stanem JS. To jest
	// nowa odsłona, więc zerujemy wszystko. Bez tego nawigacja „wstecz"
	// — na kursie zupełnie zwyczajna — nie liczyłaby się ani razu.
	window.addEventListener("pageshow", function (zdarzenie) {
		if (!zdarzenie.persisted) {
			return;
		}
		wyslane = false;
		aktywne = 0;
		aktywneOd = null;
		bylaWidoczna = false;
		poczatek = performance.now();
		if ("visible" === document.visibilityState) {
			ruszZegar();
		}
	});

	if ("visible" === document.visibilityState) {
		ruszZegar();
	}
})();
