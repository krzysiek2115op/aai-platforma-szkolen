/**
 * Mikro-skrypt widoku kursu — cały JavaScript podglądu w jednym miejscu.
 *
 * ZASADA NADRZĘDNA: BEZ SKRYPTU MA DZIAŁAĆ WSZYSTKO, CO WAŻNE. Nawigacja po
 * lekcjach stoi na `<details>`, kotwice są zwykłymi odsyłaczami, treść jest
 * w HTML-u. Skrypt dokłada wyłącznie rzeczy, których statyczny dokument nie
 * umie: poświatę za kursorem, pasek postępu czytania, kopiowanie promptów
 * i pamięć przeczytanych lekcji. Ta sama zasada rządzi stroną
 * (`app/globals.css`: dekoracja nie decyduje o tym, czy da się przeczytać
 * lekcję) — i tu jest przepisana dosłownie.
 *
 * CZEGO TU CELOWO NIE MA: obserwatora wejść elementów w widok. Wejście miały
 * tylko dwie karty na stronie wejściowej, obie NAD zgięciem — czyli
 * IntersectionObserver odpalał się natychmiast po wczytaniu i nie robił nic,
 * czego nie zrobiłaby animacja CSS. Do tego stan ukryty przed wejściem
 * wymagał bramki na wypadek niewczytania skryptu. Zastąpione animacją
 * w arkuszu: mniej JavaScriptu i zero ryzyka, że treść zostanie niewidoczna.
 *
 * ZASADA DRUGA: ZERO BIBLIOTEK, ANIMACJE NA KOMPOZYTORZE. Wytyczna
 * wydajnościowa właściciela (2026-08-24). Poświata jedzie wyłącznie na
 * `transform`, pasek postępu na `scaleX`, nasłuchy scrolla są pasywne, a
 * pętla rAF chodzi tylko wtedy, gdy jest co animować.
 */

import { ikona } from "./ikony.mjs";

/**
 * Skrypt jako funkcja, bo wstawia ikony z `ikony.mjs`. Wcześniej kształt
 * przycisku kopiowania był tu przepisany drugi raz — dwa źródła prawdy
 * o tej samej ikonie rozjeżdżają się przy pierwszej korekcie rysunku.
 */
export function skrypt() {
  return `(function () {
  "use strict";

  var bezRuchu = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ————— pamięć przeczytanych lekcji —————
   * localStorage bywa niedostępny (tryb prywatny, zablokowane dane witryny),
   * a wtedy sam DOSTĘP rzuca wyjątkiem — nie tylko odczyt. Każde dotknięcie
   * jest więc w try/catch, a brak pamięci oznacza po prostu widok bez
   * odhaczeń, nie zepsutą stronę. */
  var KLUCZ = "automaticai:przeczytane";

  function przeczytane() {
    try {
      return JSON.parse(localStorage.getItem(KLUCZ) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function zapisz(mapa) {
    try {
      localStorage.setItem(KLUCZ, JSON.stringify(mapa));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ————— poświata za kursorem —————
   * Jedna pętla rAF, wyłącznie transform, uruchamiana dopiero pierwszym
   * ruchem myszy i zasypiająca, gdy dojedzie do celu. Odpowiednik
   * components/kurs/TloKursu.tsx. */
  var glow = document.querySelector(".tlo-glow");
  if (glow && !bezRuchu && window.matchMedia("(pointer: fine)").matches) {
    var celX = window.innerWidth * 0.7;
    var celY = window.innerHeight * 0.3;
    var x = celX;
    var y = celY;
    var klatka = 0;
    var chodzi = false;

    glow.style.transform = "translate3d(" + x + "px," + y + "px,0)";

    var petla = function () {
      x += (celX - x) * 0.09;
      y += (celY - y) * 0.09;
      glow.style.transform =
        "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      if (Math.abs(celX - x) + Math.abs(celY - y) > 0.5) {
        klatka = requestAnimationFrame(petla);
      } else {
        chodzi = false;
      }
    };

    window.addEventListener(
      "pointermove",
      function (e) {
        celX = e.clientX;
        celY = e.clientY;
        glow.classList.add("widoczna");
        if (!chodzi) {
          chodzi = true;
          klatka = requestAnimationFrame(petla);
        }
      },
      { passive: true }
    );
  }

  /* ————— pasek postępu czytania —————
   * Odczyt geometrii schodzi do rAF, żeby scroll nie wymuszał układu
   * synchronicznie (przy lekcji na kilkanaście tysięcy znaków to realny
   * koszt, nie teoria). */
  var postepCzytania = document.querySelector(".pigulka-postep");
  if (postepCzytania) {
    var czeka = false;
    var przelicz = function () {
      czeka = false;
      var doPrzewiniecia =
        document.documentElement.scrollHeight - window.innerHeight;
      var udzial =
        doPrzewiniecia > 0 ? Math.min(1, window.scrollY / doPrzewiniecia) : 0;
      postepCzytania.style.transform = "scaleX(" + udzial.toFixed(4) + ")";
    };
    window.addEventListener(
      "scroll",
      function () {
        if (czeka) return;
        czeka = true;
        requestAnimationFrame(przelicz);
      },
      { passive: true }
    );
    window.addEventListener("resize", przelicz, { passive: true });
    przelicz();
  }

  /* ————— kopiowanie bloków kodu —————
   * Przycisk dokłada skrypt, więc bez JavaScriptu nie ma martwego guzika,
   * który nic nie robi. Tekst bierzemy z DOM-u (textContent), nie z atrybutu
   * — kopiuje się dokładnie to, co widać. */
  var SVG_KOPIUJ = ${JSON.stringify(ikona("kopiuj"))};
  var SVG_PTASZEK = ${JSON.stringify(ikona("ptaszek"))};

  if (navigator.clipboard && window.isSecureContext) {
    document.querySelectorAll(".kod").forEach(function (blok) {
      var pasek = blok.querySelector(".kod-pasek");
      var kod = blok.querySelector("code");
      if (!pasek || !kod) return;

      var przycisk = document.createElement("button");
      przycisk.type = "button";
      przycisk.className = "kopiuj";
      przycisk.innerHTML = SVG_KOPIUJ + "<span>Kopiuj</span>";
      przycisk.addEventListener("click", function () {
        navigator.clipboard.writeText(kod.textContent).then(
          function () {
            przycisk.dataset.stan = "gotowe";
            przycisk.innerHTML = SVG_PTASZEK + "<span>Skopiowane</span>";
            setTimeout(function () {
              delete przycisk.dataset.stan;
              przycisk.innerHTML = SVG_KOPIUJ + "<span>Kopiuj</span>";
            }, 1800);
          },
          function () {
            przycisk.innerHTML = SVG_KOPIUJ + "<span>Nie udało się</span>";
          }
        );
      });
      pasek.appendChild(przycisk);
    });
  }

  /* ————— odhaczanie lekcji ————— */
  var mapa = przeczytane();

  document.querySelectorAll("[data-lekcja]").forEach(function (el) {
    if (mapa[el.dataset.lekcja]) el.dataset.przeczytana = "1";
  });

  var odhacz = document.querySelector(".odhacz");
  if (odhacz) {
    var klucz = odhacz.dataset.lekcja;
    var nota = document.querySelector(".odhacz-nota");

    var odswiez = function () {
      var jest = !!przeczytane()[klucz];
      odhacz.setAttribute("aria-pressed", jest ? "true" : "false");
      odhacz.querySelector("span").textContent = jest
        ? "Przeczytana"
        : "Oznacz jako przeczytaną";
    };

    odhacz.addEventListener("click", function () {
      var stan = przeczytane();
      if (stan[klucz]) delete stan[klucz];
      else stan[klucz] = 1;
      if (!zapisz(stan) && nota) {
        nota.textContent =
          "Ta przeglądarka nie pozwala zapisać postępu (tryb prywatny albo zablokowane dane witryny).";
        return;
      }
      odswiez();
    });

    odswiez();
  }

  /* ————— pasek ukończenia kursu ————— */
  var postepKursu = document.querySelector("[data-postep-kursu]");
  if (postepKursu) {
    var wszystkie = postepKursu.dataset.postepKursu.split(",").filter(Boolean);
    var zrobione = wszystkie.filter(function (id) {
      return !!mapa[id];
    }).length;
    var udzialKursu = wszystkie.length
      ? Math.round((zrobione / wszystkie.length) * 100)
      : 0;
    var wypelnienie = postepKursu.querySelector(".postep-wypelnienie");
    var etykieta = postepKursu.querySelector(".postep-etykieta");
    if (wypelnienie) wypelnienie.style.width = udzialKursu + "%";
    if (etykieta) {
      etykieta.textContent = zrobione + " / " + wszystkie.length;
    }
    postepKursu.hidden = false;
  }

  /* ————— rozwijane menu w pigułce —————
   * Kliknięcie poza menu i Escape zamykają je. Bez tego menu programu
   * zostaje otwarte po przejściu do kotwicy i zasłania treść. */
  var rozwijane = Array.prototype.slice.call(
    document.querySelectorAll(".rozwijane")
  );
  if (rozwijane.length) {
    document.addEventListener("click", function (e) {
      rozwijane.forEach(function (d) {
        if (d.open && !d.contains(e.target)) d.open = false;
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      rozwijane.forEach(function (d) {
        d.open = false;
      });
    });
    rozwijane.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        rozwijane.forEach(function (inne) {
          if (inne !== d) inne.open = false;
        });
        var aktywna = d.querySelector('[aria-current="page"]');
        if (aktywna) aktywna.scrollIntoView({ block: "center" });
      });
    });
  }
})();`;
}
