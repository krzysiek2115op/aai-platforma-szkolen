/**
 * Kreator kursów — zachowanie panelu w kokpicie.
 *
 * CO TEN PLIK ROBI I DLACZEGO TAK:
 *
 *  1. SKŁADA SEKCJE I PROGRAM W JEDEN JSON tuż przed wysyłką. Kontrolki nie
 *     mają atrybutu `name` — są opisane atrybutami `data-aai-*`. Powód jest
 *     twardy: `max_input_vars` (domyślnie 1000) ucina POST W MILCZENIU, a kurs
 *     z 41 lekcjami wystawiłby setki pól. Ucięty POST to cicha utrata treści.
 *  2. Pola ukryte z JSON-em SĄ JUŻ WYPEŁNIONE stanem z bazy, zanim ten skrypt
 *     wystartuje. Gdyby nie wystartował, zapis odsyła to, co przed chwilą
 *     wczytano — czyli jest pusty w skutkach zamiast czyścić kurs.
 *  3. Kolejność zmieniają STRZAŁKI, nie przeciąganie: działa z klawiatury
 *     i mówi, co robi. Pozycje ZAMIENIAMY MIĘDZY SOBĄ, zamiast przenumerowywać
 *     od zera — w bazie są dziury w `position` (decyzja właściciela
 *     2026-08-23), a zapis ma ruszać tylko to, czego właściciel dotknął.
 *
 * Bez zależności — WordPress ma jQuery, ale nie ma powodu ciągnąć go do
 * czterech pętli po DOM-ie.
 */
(function () {
	"use strict";

	var teksty = window.aaiSklepPanel || {};

	/** Wszystkie elementy pasujące do selektora, jako tablica. */
	function lista(korzen, selektor) {
		return Array.prototype.slice.call(korzen.querySelectorAll(selektor));
	}

	/**
	 * Bezpośrednie dzieci pasujące do selektora.
	 *
	 * Zagnieżdżenia są tu prawdziwe (sekcja → lista obiektów → pola elementu),
	 * więc `querySelectorAll` bez tego filtra wciągałby pola z wnętrza wierszy
	 * do obiektu nadrzędnego — i treść lądowałaby w złym miejscu.
	 */
	function wPolu(korzen, selektor) {
		return lista(korzen, selektor).filter(function (element) {
			return najblizszyKontener(element.parentNode, korzen) === korzen;
		});
	}

	/**
	 * Znaczniki, które ZAMYKAJĄ zakres zbierania pól.
	 *
	 * Każdy element z takim znacznikiem ma WŁASNY komplet pól, więc jego
	 * wnętrze nie należy do rodzica. Lista musi obejmować korzeń KAŻDEGO
	 * szablonu-partiala panelu, który niesie własne pola — inaczej pole
	 * o tej samej nazwie (`title` modułu i `title` lekcji) nadpisuje się
	 * po cichu, bez żadnego błędu. Tak powstał BLAD-019: wiersz lekcji
	 * (`data-aai-lekcja`) nie był granicą, więc zapis KURSU nadawał
	 * każdemu modułowi tytuł jego OSTATNIEJ lekcji.
	 *
	 * Kompletności tej listy pilnuje `straznik-kreatora-wp` (niezmiennik 10):
	 * wyprowadza znaczniki z samych szablonów, nie z drugiej listy tutaj.
	 */
	var GRANICE_ZAKRESU = [
		"data-aai-pole",
		"data-aai-wiersz",
		"data-aai-obiekt",
		"data-aai-sekcja",
		"data-aai-modul",
		"data-aai-lekcja",
	];

	/** Najbliższy przodek będący kontenerem pól — albo `korzen`. */
	function najblizszyKontener(element, korzen) {
		while (element && element !== korzen) {
			if (
				element.hasAttribute &&
				GRANICE_ZAKRESU.some(function (znacznik) {
					return element.hasAttribute(znacznik);
				})
			) {
				return element;
			}
			element = element.parentNode;
		}
		return korzen;
	}

	/** Wartość jednej kontrolki. */
	function wartoscKontrolki(pole) {
		var kontrolka = wPolu(pole, "[data-aai-wartosc]")[0];
		if (!kontrolka) {
			return "";
		}
		if (kontrolka.type === "checkbox") {
			return kontrolka.checked;
		}
		return kontrolka.value;
	}

	/** Treść jednego kontenera pól → obiekt. */
	function zbierzPola(korzen) {
		var wynik = {};
		wPolu(korzen, "[data-aai-pole]").forEach(function (pole) {
			if (pole.hasAttribute("data-aai-bez-serializacji")) {
				return;
			}
			var nazwa = pole.getAttribute("data-aai-pole");
			var typ = pole.getAttribute("data-aai-typ");

			if (typ === "lista_tekstow") {
				wynik[nazwa] = wierszeListy(pole).map(function (wiersz) {
					var kontrolka = wPolu(wiersz, "[data-aai-wartosc]")[0];
					return kontrolka ? kontrolka.value : "";
				});
				return;
			}
			if (typ === "lista_obiektow") {
				wynik[nazwa] = wierszeListy(pole).map(zbierzPola);
				return;
			}
			if (typ === "obiekt") {
				var obiekt = wPolu(pole, "[data-aai-obiekt]")[0];
				wynik[nazwa] = obiekt ? zbierzPola(obiekt) : {};
				return;
			}
			wynik[nazwa] = wartoscKontrolki(pole);
		});
		return wynik;
	}

	/** Wiersze listy — z pominięciem tych, które siedzą w szablonie. */
	function wierszeListy(pole) {
		var kontener = wPolu(pole, "[data-aai-lista]")[0];
		if (!kontener) {
			return [];
		}
		return lista(kontener, "[data-aai-wiersz]").filter(function (wiersz) {
			return !wSzablonie(wiersz);
		});
	}

	/** Czy element jest zawartością elementu `<template>`. */
	function wSzablonie(element) {
		return element.closest("template") !== null;
	}

	/* ————————————————————— zbieranie całego formularza ————————————————————— */

	/** Sekcje sprzedażowe → tablica dla kontraktu. */
	function zbierzSekcje(formularz) {
		return lista(formularz, "[data-aai-sekcja]")
			.filter(function (sekcja) {
				return sekcja.getAttribute("data-aai-dodana") === "1";
			})
			.map(function (sekcja) {
				return {
					id: sekcja.getAttribute("data-aai-id") || "",
					kind: sekcja.getAttribute("data-aai-sekcja"),
					content: zbierzPola(sekcja.querySelector(".inside")),
				};
			});
	}

	/** Program → tablica dla kontraktu. */
	function zbierzProgram(formularz) {
		return lista(formularz, "[data-aai-modul]")
			.filter(function (modul) {
				return !wSzablonie(modul);
			})
			.map(function (modul) {
				var pola = zbierzPola(modul.querySelector(".inside"));
				return {
					id: modul.getAttribute("data-aai-id") || "",
					position: Number(modul.getAttribute("data-aai-position") || 0),
					title: pola.title || "",
					summary: pola.summary || "",
					lekcje: lista(modul, "[data-aai-lekcja]")
						.filter(function (lekcja) {
							return !wSzablonie(lekcja);
						})
						.map(function (lekcja) {
							var polaLekcji = zbierzPola(lekcja);
							return {
								id: lekcja.getAttribute("data-aai-id") || "",
								position: Number(lekcja.getAttribute("data-aai-position") || 0),
								title: polaLekcji.title || "",
								duration_min: polaLekcji.duration_min === "" ? null : polaLekcji.duration_min,
								preview: polaLekcji.preview === true,
							};
						}),
				};
			});
	}

	/** Materiały lekcji → tablica dla kontraktu. */
	function zbierzMaterialy(formularz) {
		var pole = formularz.querySelector('[data-aai-pole="materialy"]');
		return pole ? wierszeListy(pole).map(zbierzPola) : [];
	}

	/* ————————————————————— stan sekcji (gotowa / brakuje) ————————————————————— */

	/**
	 * Odświeża plakietkę sekcji.
	 *
	 * Liczymy braki po polach OZNACZONYCH gwiazdką w znaczniku, a nie po
	 * własnej liście: gwiazdkę stawia PHP z opisu pól, czyli z tej samej
	 * tablicy, którą sprawdzana jest treść. Druga lista tutaj rozjechałaby
	 * się przy pierwszym nowym polu.
	 */
	function odswiezStanSekcji(sekcja) {
		var plakietka = sekcja.querySelector("[data-aai-stan-sekcji]");
		if (!plakietka) {
			return;
		}
		var braki = [];
		wPolu(sekcja.querySelector(".inside"), "[data-aai-pole]").forEach(function (pole) {
			if (!pole.querySelector(".aai-pole__gwiazdka")) {
				return;
			}
			var typ = pole.getAttribute("data-aai-typ");
			var etykieta = pole.querySelector(".aai-pole__etykieta");
			var nazwa = etykieta ? etykieta.textContent.replace("*", "").trim() : "";
			var puste;

			if (typ === "lista_tekstow") {
				puste = wierszeListy(pole).every(function (wiersz) {
					var kontrolka = wPolu(wiersz, "[data-aai-wartosc]")[0];
					return !kontrolka || kontrolka.value.trim() === "";
				});
			} else if (typ === "lista_obiektow") {
				puste = wierszeListy(pole).every(function (wiersz) {
					return wPolu(wiersz, ".aai-pole").some(function (podpole) {
						if (!podpole.querySelector(".aai-pole__gwiazdka")) {
							return false;
						}
						var kontrolka = wPolu(podpole, "[data-aai-wartosc]")[0];
						return !kontrolka || String(kontrolka.value).trim() === "";
					});
				});
			} else {
				puste = String(wartoscKontrolki(pole)).trim() === "";
			}

			if (puste) {
				braki.push(nazwa);
			}
		});

		if (braki.length === 0) {
			plakietka.textContent = "gotowa";
			plakietka.className = "aai-plakietka aai-plakietka--gotowa";
		} else {
			plakietka.textContent = "brakuje: " + braki.join(", ");
			plakietka.className = "aai-plakietka aai-plakietka--braki";
		}
	}

	/* ————————————————————— numeracja i liczniki ————————————————————— */

	/** Numeracja modułów i lekcji — liczy się sama, z kolejności. */
	function odswiezNumeracje(formularz) {
		lista(formularz, "[data-aai-modul]")
			.filter(function (modul) {
				return !wSzablonie(modul);
			})
			.forEach(function (modul, nrModulu) {
				var numer = modul.querySelector("[data-aai-numer-modulu]");
				if (numer) {
					numer.textContent = String(nrModulu + 1);
				}
				var lekcje = lista(modul, "[data-aai-lekcja]").filter(function (lekcja) {
					return !wSzablonie(lekcja);
				});
				lekcje.forEach(function (lekcja, nrLekcji) {
					var numerLekcji = lekcja.querySelector("[data-aai-numer-lekcji]");
					if (numerLekcji) {
						numerLekcji.textContent = nrModulu + 1 + "." + (nrLekcji + 1);
					}
				});
				var licznik = modul.querySelector("[data-aai-licznik-lekcji]");
				if (licznik) {
					licznik.textContent = lekcje.length + (lekcje.length === 1 ? " lekcja" : " lekcji");
				}
			});
	}

	/** Licznik znaków przy polach z limitem. */
	function odswiezLicznik(kontrolka) {
		var pole = kontrolka.closest(".aai-pole");
		var licznik = pole ? pole.querySelector(".aai-licznik") : null;
		if (!licznik) {
			return;
		}
		var limit = Number(kontrolka.getAttribute("data-aai-limit") || 0);
		var ile = kontrolka.value.length;
		licznik.textContent = (teksty.znakow || "Znaków: %1$s z %2$s")
			.replace("%1$s", ile.toLocaleString("pl-PL"))
			.replace("%2$s", limit.toLocaleString("pl-PL"));
		licznik.classList.toggle("aai-licznik--przekroczony", limit > 0 && ile > limit);
	}

	/* ————————————————————— kolejność ————————————————————— */

	/**
	 * Przesuwa element w rodzeństwie i ZAMIENIA pozycje z sąsiadem.
	 *
	 * Zamiana zamiast przenumerowania od zera: pozycje w bazie mają dziury
	 * (świadoma decyzja), a zapis, który przenumerowałby wszystko, ruszyłby
	 * wiersze, których właściciel nie tknął — i zaśmiecił dziennik audytu.
	 */
	function przesun(element, wGore, selektorRodzenstwa) {
		var rodzic = element.parentNode;
		var rodzenstwo = lista(rodzic, ":scope > " + selektorRodzenstwa);
		var gdzie = rodzenstwo.indexOf(element);
		var sasiad = rodzenstwo[wGore ? gdzie - 1 : gdzie + 1];
		if (!sasiad) {
			return;
		}
		var mojaPozycja = element.getAttribute("data-aai-position");
		element.setAttribute("data-aai-position", sasiad.getAttribute("data-aai-position"));
		sasiad.setAttribute("data-aai-position", mojaPozycja);
		if (wGore) {
			rodzic.insertBefore(element, sasiad);
		} else {
			rodzic.insertBefore(sasiad, element);
		}
	}

	/** Najwyższa pozycja w kontenerze + 1 — dla nowego wiersza. */
	function nastepnaPozycja(kontener, selektor) {
		var maks = -1;
		lista(kontener, selektor)
			.filter(function (element) {
				return !wSzablonie(element);
			})
			.forEach(function (element) {
				maks = Math.max(maks, Number(element.getAttribute("data-aai-position") || 0));
			});
		return maks + 1;
	}

	/* ————————————————————— obsługa zdarzeń ————————————————————— */

	function start() {
		var formularz = document.querySelector("[data-aai-formularz]");
		if (!formularz) {
			return;
		}

		var brudny = false;
		var wysylany = false;

		function zabrudz() {
			brudny = true;
			var znacznik = formularz.querySelector("[data-aai-niezapisane]");
			if (znacznik) {
				znacznik.hidden = false;
			}
		}

		/* zakładki — bez przeładowania, żeby niezapisany stan przeżył */
		lista(formularz, "[data-aai-zakladka]").forEach(function (przycisk) {
			przycisk.addEventListener("click", function () {
				var nazwa = przycisk.getAttribute("data-aai-zakladka");
				lista(formularz, "[data-aai-zakladka]").forEach(function (inny) {
					inny.classList.toggle("nav-tab-active", inny === przycisk);
				});
				lista(formularz, "[data-aai-widok]").forEach(function (widok) {
					widok.hidden = widok.getAttribute("data-aai-widok") !== nazwa;
				});
				var pole = formularz.querySelector("[data-aai-zakladka-pole]");
				if (pole) {
					pole.value = nazwa;
				}
			});
		});

		/* slug podpowiadany z tytułu — TYLKO dla nowego kursu */
		var zrodloSlugu = formularz.querySelector("[data-aai-zrodlo-slugu]");
		var poleSlugu = formularz.querySelector("[data-aai-slug]");
		if (zrodloSlugu && poleSlugu) {
			var tknietySlug = poleSlugu.value !== "";
			poleSlugu.addEventListener("input", function () {
				tknietySlug = true;
			});
			zrodloSlugu.addEventListener("input", function () {
				if (tknietySlug) {
					return;
				}
				poleSlugu.value = zrodloSlugu.value
					.toLowerCase()
					.replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
					.replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
					.replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "")
					.slice(0, 120);
			});
		}

		/* okładka z biblioteki mediów */
		var poleOkladki = formularz.querySelector("[data-aai-okladka]");
		var podgladOkladki = formularz.querySelector("[data-aai-podglad-okladki]");
		var wybierz = formularz.querySelector("[data-aai-wybierz-okladke]");
		var wyczysc = formularz.querySelector("[data-aai-wyczysc-okladke]");

		function pokazOkladke() {
			if (!podgladOkladki) {
				return;
			}
			podgladOkladki.innerHTML = "";
			if (poleOkladki.value.trim() !== "") {
				var obrazek = document.createElement("img");
				obrazek.src = poleOkladki.value;
				obrazek.alt = "";
				podgladOkladki.appendChild(obrazek);
			}
		}

		if (wybierz && poleOkladki && window.wp && window.wp.media) {
			var biblioteka = null;
			wybierz.addEventListener("click", function () {
				if (biblioteka === null) {
					biblioteka = window.wp.media({
						title: teksty.wybierzOkladke || "Wybierz okładkę kursu",
						button: { text: teksty.uzyjObrazka || "Użyj tego obrazka" },
						library: { type: "image" },
						multiple: false,
					});
					biblioteka.on("select", function () {
						var wybrany = biblioteka.state().get("selection").first().toJSON();
						poleOkladki.value = wybrany.url;
						pokazOkladke();
						zabrudz();
					});
				}
				biblioteka.open();
			});
		}
		if (wyczysc && poleOkladki) {
			wyczysc.addEventListener("click", function () {
				poleOkladki.value = "";
				pokazOkladke();
				zabrudz();
			});
		}

		/* jedno nasłuchiwanie na cały formularz — wierszy przybywa i ubywa */
		formularz.addEventListener("click", function (zdarzenie) {
			var cel = zdarzenie.target.closest("button");
			if (!cel) {
				return;
			}

			if (cel.hasAttribute("data-aai-dodaj")) {
				var polePrzycisku = cel.closest("[data-aai-pole]");
				var szablon = polePrzycisku.querySelector(":scope > template[data-aai-szablon]");
				var kontener = wPolu(polePrzycisku, "[data-aai-lista]")[0];
				if (szablon && kontener) {
					kontener.appendChild(szablon.content.cloneNode(true));
					zabrudz();
					odswiezWszystko(formularz);
				}
				return;
			}

			if (cel.hasAttribute("data-aai-usun")) {
				var wiersz = cel.closest("[data-aai-wiersz]");
				if (wiersz) {
					wiersz.parentNode.removeChild(wiersz);
					zabrudz();
					odswiezWszystko(formularz);
				}
				return;
			}

			if (cel.hasAttribute("data-aai-dodaj-sekcje") || cel.hasAttribute("data-aai-usun-sekcje")) {
				var sekcja = cel.closest("[data-aai-sekcja]");
				var dodana = cel.hasAttribute("data-aai-dodaj-sekcje");
				sekcja.setAttribute("data-aai-dodana", dodana ? "1" : "0");
				sekcja.classList.toggle("aai-sekcja--pusta", !dodana);
				zabrudz();
				return;
			}

			if (cel.hasAttribute("data-aai-dodaj-modul")) {
				var moduly = formularz.querySelector("[data-aai-moduly]");
				var szablonModulu = formularz.querySelector("[data-aai-szablon-modulu]");
				var nowyModul = szablonModulu.content.cloneNode(true);
				nowyModul.querySelector("[data-aai-modul]").setAttribute(
					"data-aai-position",
					String(nastepnaPozycja(moduly, "[data-aai-modul]"))
				);
				moduly.appendChild(nowyModul);
				zabrudz();
				odswiezWszystko(formularz);
				return;
			}

			if (cel.hasAttribute("data-aai-usun-modul")) {
				var doUsuniecia = cel.closest("[data-aai-modul]");
				var ileLekcji = lista(doUsuniecia, "[data-aai-lekcja]").filter(function (lekcja) {
					return !wSzablonie(lekcja);
				}).length;
				if (ileLekcji > 0 && !window.confirm("Usunąć moduł razem z " + ileLekcji + " lekcjami?")) {
					return;
				}
				doUsuniecia.parentNode.removeChild(doUsuniecia);
				zabrudz();
				odswiezWszystko(formularz);
				return;
			}

			if (cel.hasAttribute("data-aai-dodaj-lekcje")) {
				var modulLekcji = cel.closest("[data-aai-modul]");
				var lekcje = modulLekcji.querySelector("[data-aai-lekcje]");
				var szablonLekcji = modulLekcji.querySelector("[data-aai-szablon-lekcji]");
				var nowaLekcja = szablonLekcji.content.cloneNode(true);
				nowaLekcja.querySelector("[data-aai-lekcja]").setAttribute(
					"data-aai-position",
					String(nastepnaPozycja(lekcje, "[data-aai-lekcja]"))
				);
				lekcje.appendChild(nowaLekcja);
				zabrudz();
				odswiezWszystko(formularz);
				return;
			}

			if (cel.hasAttribute("data-aai-usun-lekcje")) {
				var lekcjaDoUsuniecia = cel.closest("[data-aai-lekcja]");
				lekcjaDoUsuniecia.parentNode.removeChild(lekcjaDoUsuniecia);
				zabrudz();
				odswiezWszystko(formularz);
				return;
			}

			if (cel.hasAttribute("data-aai-gora") || cel.hasAttribute("data-aai-dol")) {
				var wGore = cel.hasAttribute("data-aai-gora");
				var modul = cel.closest("[data-aai-modul]");
				var lekcja = cel.closest("[data-aai-lekcja]");
				var wiersz2 = cel.closest("[data-aai-wiersz]");
				if (wiersz2) {
					przesun(wiersz2, wGore, "[data-aai-wiersz]");
				} else if (lekcja) {
					przesun(lekcja, wGore, "[data-aai-lekcja]");
				} else if (modul) {
					przesun(modul, wGore, "[data-aai-modul]");
				}
				zabrudz();
				odswiezWszystko(formularz);
				return;
			}

			if (cel.hasAttribute("data-aai-potwierdz-utrate")) {
				var zgoda = formularz.querySelector("[data-aai-zgoda]");
				if (zgoda) {
					zgoda.value = "1";
				}
			}
		});

		formularz.addEventListener("input", function (zdarzenie) {
			zabrudz();
			if (zdarzenie.target.hasAttribute("data-aai-limit")) {
				odswiezLicznik(zdarzenie.target);
			}
			var sekcja = zdarzenie.target.closest("[data-aai-sekcja]");
			if (sekcja) {
				odswiezStanSekcji(sekcja);
			}
			var podglad = zdarzenie.target.closest("[data-aai-modul]");
			if (podglad && zdarzenie.target.closest('[data-aai-pole="title"]')) {
				var tytul = podglad.querySelector("[data-aai-podglad-tytulu]");
				if (tytul && !zdarzenie.target.closest("[data-aai-lekcja]")) {
					tytul.textContent = zdarzenie.target.value;
				}
			}
		});
		formularz.addEventListener("change", zabrudz);

		/* zbieranie stanu do JSON-a — jedyny moment, w którym powstaje wysyłka */
		formularz.addEventListener("submit", function () {
			wysylany = true;
			var sekcje = formularz.querySelector('[data-aai-json="sekcje"]');
			var moduly = formularz.querySelector('[data-aai-json="moduly"]');
			var materialy = formularz.querySelector('[data-aai-json="materialy"]');
			if (sekcje) {
				sekcje.value = JSON.stringify(zbierzSekcje(formularz));
			}
			if (moduly) {
				moduly.value = JSON.stringify(zbierzProgram(formularz));
			}
			if (materialy) {
				materialy.value = JSON.stringify(zbierzMaterialy(formularz));
			}
		});

		/* ostrzeżenie o niezapisanych zmianach */
		window.addEventListener("beforeunload", function (zdarzenie) {
			if (!brudny || wysylany) {
				return;
			}
			zdarzenie.preventDefault();
			zdarzenie.returnValue = teksty.niezapisane || "";
		});

		odswiezWszystko(formularz);
	}

	/** Potwierdzenia przy akcjach z listy kursów (usuwanie). */
	function potwierdzenia() {
		lista(document, "[data-aai-potwierdz]").forEach(function (przycisk) {
			przycisk.addEventListener("click", function (zdarzenie) {
				if (!window.confirm(przycisk.getAttribute("data-aai-potwierdz"))) {
					zdarzenie.preventDefault();
					return;
				}
				// Zgodę na utratę treści podnosi WYŁĄCZNIE świadome
				// potwierdzenie — bez niego warstwa zapisu odmawia.
				var zgoda = przycisk.form ? przycisk.form.querySelector("[data-aai-zgoda]") : null;
				if (zgoda) {
					zgoda.value = "1";
				}
			});
		});
	}

	function odswiezWszystko(formularz) {
		odswiezNumeracje(formularz);
		lista(formularz, "[data-aai-sekcja]").forEach(odswiezStanSekcji);
		lista(formularz, "[data-aai-limit]").forEach(odswiezLicznik);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			start();
			potwierdzenia();
		});
	} else {
		start();
		potwierdzenia();
	}
})();
