/*
 * Skrypt stron sklepu — port zachowań z `components/ui/Reveal.tsx`,
 * `components/kurs/PasekKursu.tsx`, `TloKursu.tsx` i `HeroMotion.tsx`.
 *
 * TRZY ZASADY, KTÓRE TU OBOWIĄZUJĄ:
 *
 *  1. **Skrypt ULEPSZA, nie warunkuje.** Bez niego strona jest kompletna:
 *     treść widoczna, akordeony działają (natywne `<details>`), kotwice paska
 *     przewijają. Znika tylko odsłanianie przy przewijaniu, podświetlenie
 *     aktywnej sekcji i poświata za kursorem.
 *  2. **Zero zależności i zero kodu w atrybutach.** Żadnego `onclick`, żadnego
 *     `<script>` w treści — przyszłe CSP nie ma z czym walczyć.
 *  3. **`prefers-reduced-motion` wygasza ruch NA POZIOMIE NASŁUCHÓW**, nie
 *     tylko w CSS: przy ustawionym spokoju nie zakładamy nawet obserwatorów
 *     ruchu myszy, więc nie ma czego liczyć przy każdym pikselu.
 *
 * Uzupełnia to `assets/sklep.css`, który ukrywa elementy do odsłonięcia
 * WYŁĄCZNIE pod `html.js` — klasą dokładaną przez skrypt rozruchowy motywu.
 * Gdy skryptów nie ma wcale, nie ma też co odsłaniać: treść po prostu jest.
 */
(function () {
	"use strict";

	var d = document;
	var spokoj = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	/* ————————————————— odsłanianie przy przewijaniu ————————————————— */

	function odslon(el) {
		el.classList.add("aai-reveal-widoczny");
	}

	function odslonWszystko() {
		var wszystkie = d.querySelectorAll(".aai-reveal");
		for (var i = 0; i < wszystkie.length; i++) {
			odslon(wszystkie[i]);
		}
	}

	function uruchomOdslanianie() {
		if (!("IntersectionObserver" in window)) {
			odslonWszystko();
			return;
		}

		var obserwator = new IntersectionObserver(
			function (wpisy) {
				for (var i = 0; i < wpisy.length; i++) {
					if (!wpisy[i].isIntersecting) {
						continue;
					}
					var el = wpisy[i].target;
					obserwator.unobserve(el);

					var krok = parseFloat(el.getAttribute("data-aai-cascade"));
					if (krok > 0) {
						// Kontener kaskady sam się nie odsłania — rozdaje
						// opóźnienia dzieciom, żeby wchodziły po kolei.
						var dzieci = el.querySelectorAll("[data-aai-cascade-item]");
						for (var j = 0; j < dzieci.length; j++) {
							dzieci[j].style.setProperty("--aai-opoznienie-reveal", (j * krok).toFixed(2) + "s");
							odslon(dzieci[j]);
						}
						continue;
					}
					odslon(el);
				}
			},
			{ rootMargin: "-60px" }
		);

		var doOdsloniecia = d.querySelectorAll(".aai-reveal:not([data-aai-cascade-item]), [data-aai-cascade]");
		for (var i = 0; i < doOdsloniecia.length; i++) {
			obserwator.observe(doOdsloniecia[i]);
		}

		/*
		 * STRAŻNIK OSTATNIEJ SZANSY. Gdyby obserwator z jakiegoś powodu nie
		 * dostał ani jednego wpisu (karta przeglądarki otwarta w tle, dziwny
		 * kontener przewijania), po trzech sekundach pokazujemy wszystko.
		 * Niewidoczna oferta jest gorsza niż oferta bez animacji.
		 */
		window.setTimeout(odslonWszystko, 3000);
	}

	/* ————————————————— podświetlenie sekcji w pigułce ————————————————— */

	function uruchomPasek() {
		var pasek = d.querySelector("[data-aai-pasek]");
		if (!pasek || !("IntersectionObserver" in window)) {
			return;
		}

		var kotwice = pasek.querySelectorAll(".aai-pasek-kotwica");
		var sekcje = [];
		for (var i = 0; i < kotwice.length; i++) {
			var id = (kotwice[i].getAttribute("href") || "").slice(1);
			var sekcja = id ? d.getElementById(id) : null;
			if (sekcja) {
				sekcje.push({ kotwica: kotwice[i], sekcja: sekcja });
			}
		}
		if (!sekcje.length) {
			return;
		}

		var aktywna = null;
		var obserwator = new IntersectionObserver(
			function (wpisy) {
				for (var i = 0; i < wpisy.length; i++) {
					if (!wpisy[i].isIntersecting) {
						continue;
					}
					for (var j = 0; j < sekcje.length; j++) {
						if (sekcje[j].sekcja !== wpisy[i].target) {
							continue;
						}
						if (aktywna) {
							aktywna.removeAttribute("aria-current");
						}
						aktywna = sekcje[j].kotwica;
						aktywna.setAttribute("aria-current", "true");
					}
				}
			},
			// To samo okno co w prototypie: sekcja jest „aktywna", gdy zajmuje
			// środkowy pas ekranu, a nie gdy tylko dotknie krawędzi.
			{ rootMargin: "-35% 0px -55% 0px" }
		);

		for (var k = 0; k < sekcje.length; k++) {
			obserwator.observe(sekcje[k].sekcja);
		}
	}

	/* ————————————————— ruch: poświata za kursorem i paralaksa ————————————————— */

	function uruchomRuch() {
		if (spokoj) {
			return;
		}

		var glow = d.querySelector(".aai-tlo-kursor");
		var sceny = d.querySelectorAll("[data-aai-spotlight]");
		if (!glow && !sceny.length) {
			return;
		}

		var celX = window.innerWidth * 0.7;
		var celY = window.innerHeight * 0.3;
		var x = celX;
		var y = celY;
		var klatka = 0;

		function petla() {
			klatka = 0;

			if (glow) {
				// Wygładzanie: kursor prowadzi, poświata dogania. Bez tego
				// plama skacze razem z myszą i wygląda na usterkę.
				x += (celX - x) * 0.09;
				y += (celY - y) * 0.09;
				glow.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
				if (Math.abs(celX - x) > 0.5 || Math.abs(celY - y) > 0.5) {
					klatka = window.requestAnimationFrame(petla);
				}
			}
		}

		window.addEventListener(
			"pointermove",
			function (zdarzenie) {
				celX = zdarzenie.clientX;
				celY = zdarzenie.clientY;
				if (glow && !klatka) {
					klatka = window.requestAnimationFrame(petla);
				}

				for (var i = 0; i < sceny.length; i++) {
					var pole = sceny[i].getBoundingClientRect();
					if (pole.height <= 0) {
						continue;
					}
					var wzgledneX = (zdarzenie.clientX - pole.left) / pole.width;
					var wzgledneY = (zdarzenie.clientY - pole.top) / pole.height;
					sceny[i].style.setProperty("--aai-mx", (wzgledneX * 100).toFixed(1) + "%");
					sceny[i].style.setProperty("--aai-my", (wzgledneY * 100).toFixed(1) + "%");
					sceny[i].style.setProperty("--aai-par-x", (wzgledneX * 2 - 1).toFixed(3));
					sceny[i].style.setProperty("--aai-par-y", (wzgledneY * 2 - 1).toFixed(3));
				}
			},
			{ passive: true }
		);
	}

	function start() {
		uruchomOdslanianie();
		uruchomPasek();
		uruchomRuch();
	}

	if (d.readyState === "loading") {
		d.addEventListener("DOMContentLoaded", start);
	} else {
		start();
	}
})();
