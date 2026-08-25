/*
 * Skrypt widoku lekcji — port `tools/podglad-kursow/skrypt.mjs`.
 *
 * ZASADA NADRZĘDNA: BEZ SKRYPTU DZIAŁA WSZYSTKO, CO WAŻNE. Nawigacja stoi na
 * `<details>`, kotwice są zwykłymi odsyłaczami, treść jest w HTML-u,
 * a odhaczenie lekcji to formularz POST do Tutora. Skrypt dokłada wyłącznie
 * rzeczy, których statyczny dokument nie umie: nitkę postępu czytania,
 * kopiowanie promptów i domykanie rozwijanych menu.
 *
 * CZEGO TU NIE MA, A BYŁO W PODGLĄDZIE: pamięci przeczytanych lekcji
 * w `localStorage`. Podgląd nie znał konta, więc podpisywał postęp „nie na
 * koncie". Tutaj klient jest zalogowany, a ukończenia prowadzi Tutor —
 * druga wersja tej samej prawdy w przeglądarce byłaby tylko okazją do
 * rozjazdu.
 *
 * ZERO BIBLIOTEK, ANIMACJE NA KOMPOZYTORZE: nitka postępu jedzie na
 * `scaleX`, nasłuch scrolla jest pasywny.
 */
(function () {
	"use strict";

	var d = document;

	/* ————————————————— nitka postępu czytania ————————————————— */

	function uruchomPostep() {
		var nitka = d.querySelector(".aai-pasek-postep");
		if (!nitka) {
			return;
		}
		var czeka = false;

		function przelicz() {
			czeka = false;
			var wysokosc = d.documentElement.scrollHeight - window.innerHeight;
			var udzial = wysokosc > 0 ? window.scrollY / wysokosc : 0;
			nitka.style.transform = "scaleX(" + Math.min(1, Math.max(0, udzial)) + ")";
		}

		window.addEventListener(
			"scroll",
			function () {
				if (!czeka) {
					czeka = true;
					window.requestAnimationFrame(przelicz);
				}
			},
			{ passive: true }
		);
		window.addEventListener("resize", przelicz, { passive: true });
		przelicz();
	}

	/* ————————————————— kopiowanie bloków kodu ————————————————— */

	function uruchomKopiowanie() {
		if (!navigator.clipboard) {
			return;
		}
		var bloki = d.querySelectorAll(".aai-kod");
		for (var i = 0; i < bloki.length; i++) {
			(function (blok) {
				var pasek = blok.querySelector(".aai-kod-pasek");
				var kod = blok.querySelector("code");
				if (!pasek || !kod) {
					return;
				}
				var przycisk = d.createElement("button");
				przycisk.type = "button";
				przycisk.className = "aai-kopiuj";
				przycisk.textContent = "Kopiuj";
				przycisk.addEventListener("click", function () {
					navigator.clipboard.writeText(kod.textContent || "").then(
						function () {
							przycisk.textContent = "Skopiowane";
							window.setTimeout(function () {
								przycisk.textContent = "Kopiuj";
							}, 1600);
						},
						function () {
							// Odmowa schowka (brak zgody, kontekst bez HTTPS) nie ma
							// prawa wyglądać jak udane kopiowanie.
							przycisk.textContent = "Nie udało się";
						}
					);
				});
				pasek.appendChild(przycisk);
			})(bloki[i]);
		}
	}

	/* ————————————————— rozwijane menu pigułki ————————————————— */

	function uruchomRozwijane() {
		var menu = d.querySelectorAll(".aai-rozwijane");
		if (!menu.length) {
			return;
		}

		function zamknijWszystkie(oprocz) {
			for (var i = 0; i < menu.length; i++) {
				if (menu[i] !== oprocz) {
					menu[i].removeAttribute("open");
				}
			}
		}

		d.addEventListener("click", function (zdarzenie) {
			for (var i = 0; i < menu.length; i++) {
				if (menu[i].contains(zdarzenie.target)) {
					return;
				}
			}
			zamknijWszystkie(null);
		});

		d.addEventListener("keydown", function (zdarzenie) {
			if (zdarzenie.key === "Escape") {
				zamknijWszystkie(null);
			}
		});

		for (var i = 0; i < menu.length; i++) {
			(function (element) {
				element.addEventListener("toggle", function () {
					if (!element.hasAttribute("open")) {
						return;
					}
					zamknijWszystkie(element);
					// Otwarty program ma pokazywać lekcję, na której właśnie
					// jesteś — inaczej przy 41 lekcjach trzeba jej szukać ręcznie.
					var aktywna = element.querySelector('[aria-current="page"]');
					if (aktywna && aktywna.scrollIntoView) {
						aktywna.scrollIntoView({ block: "nearest" });
					}
				});
			})(menu[i]);
		}
	}

	uruchomPostep();
	uruchomKopiowanie();
	uruchomRozwijane();
})();
