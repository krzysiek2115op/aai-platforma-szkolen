"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * Scena stopki: pył danych osiada na szynie zasilającej.
 *
 * Domknięcie historii hero — tam wir danych emituje wynik w górę, tutaj
 * resztki pyłu opadają i gasną w linii horyzontu. Ten sam język wizualny
 * (kolory, traile światła, drobne punkty na Canvas 2D), ale spokojny:
 * mało cząstek, wolny ruch, zero dramaturgii.
 *
 * Interakcje odkrywane, nie ogłaszane:
 * - kursor delikatnie przyciąga pył (przesunięcie rysowania, nie fizyka),
 * - dotknięcie wordmarku odpala impuls na szynie od razu i podrywa pył
 *   w jej pobliżu (throttling, żeby nie dało się z tego zrobić stroboskopu).
 *
 * Dyscyplina kosztów jak w HeroCanvas: pauza poza viewportem i przy ukrytej
 * karcie, DPR ≤ 1.5, limit cząstek wg pola i liczby rdzeni, pointermove
 * tylko zapisuje cel — cała praca dzieje się w jednej pętli rAF.
 * prefers-reduced-motion → scena rozgrzana i wyrenderowana raz, bez pętli.
 * Bez JavaScriptu canvas zostaje pusty, a stopka kompletna.
 */

type Pyl = {
  x: number;
  y: number;
  /** prędkość opadania px/s */
  sp: number;
  sz: number;
  /** indeks koloru: 0 biel / 1 volt / 2 steel */
  c: number;
  /** faza migotania */
  tw: number;
  /** pionowy zryw po impulsie (ujemny = w górę) */
  vk: number;
};

const COLORS = ["237, 238, 240", "191, 255, 56", "143, 146, 156"] as const;

export function FooterScene({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx = maybeCtx;

    let width = 0;
    let height = 0;
    let railY = 0;
    let particles: Pyl[] = [];
    let raf = 0;
    let running = false;
    // Startowo false: stan ustala IntersectionObserver niżej. Gdyby
    // ustawić true, `start()` z pierwszego zdarzenia (np. przebudowa
    // przy zmianie rozmiaru) rozgrzałby scenę, zanim ktokolwiek ją zobaczy
    // — czyli dokładnie to, czego ta bramka ma unikać. Canvas jest
    // dekoracją oznaczoną aria-hidden, więc brak wpisu z obserwatora
    // oznacza „stopka bez pyłu", nigdy „stopka bez treści".
    let inView = false;
    let last = performance.now();
    let time = 0;
    let resizeTimer = 0;

    // kursor: cel z pointermove, wygładzenie w pętli
    let mx = -9999;
    let my = -9999;
    let tmx = -9999;
    let tmy = -9999;
    let mouseGlow = 0;
    let mouseActive = false;
    let lastKick = -9999;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cores = navigator.hardwareConcurrency || 8;

    function noise(x: number, t: number): number {
      return Math.sin(x * 1.7 + t * 0.8) * 0.6 + Math.sin(x * 0.6 - t * 0.5) * 0.4;
    }

    /** pozycja szyny = linia w SVG wordmarku (y=94 z viewBoxu 96) */
    function measureRail() {
      const szyna = root!.querySelector("[data-szyna]");
      if (szyna) {
        const r = szyna.getBoundingClientRect();
        const rr = root!.getBoundingClientRect();
        railY = r.top - rr.top + r.height * (94 / 96);
      } else {
        railY = height * 0.9;
      }
    }

    function spawn(p: Pyl, odGory: boolean) {
      p.x = Math.random() * width;
      // start sceny: pył zagęszczony przy horyzoncie; respawn — z górnej strefy
      p.y = odGory
        ? Math.random() * railY * 0.35
        : railY * (1 - Math.pow(Math.random(), 1.7));
      p.sp = 4 + Math.random() * 9;
      p.sz = 0.6 + Math.random() * 1.3;
      const roll = Math.random();
      p.c = roll < 0.7 ? 0 : roll < 0.86 ? 1 : 2;
      p.tw = Math.random() * Math.PI * 2;
      p.vk = 0;
    }

    function targetCount(): number {
      let count = Math.round((width * railY) / 9000);
      if (cores <= 4) count *= 0.7;
      return Math.max(70, Math.min(Math.round(count), 240));
    }

    function makeParticles() {
      particles = [];
      const count = targetCount();
      for (let i = 0; i < count; i++) {
        const p: Pyl = { x: 0, y: 0, sp: 1, sz: 1, c: 0, tw: 0, vk: 0 };
        spawn(p, false);
        particles.push(p);
      }
    }

    function applySize() {
      const rect = root!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureRail();
      ctx.fillStyle = "rgb(8, 9, 11)";
      ctx.fillRect(0, 0, width, height);
    }

    function step(dt: number) {
      time += dt;
      mx += (tmx - mx) * 0.08;
      my += (tmy - my) * 0.08;
      mouseGlow += ((mouseActive ? 1 : 0) - mouseGlow) * 0.05;

      ctx.fillStyle = "rgba(8, 9, 11, 0.28)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      for (const p of particles) {
        p.vk *= Math.pow(0.04, dt);
        p.y += (p.sp + p.vk) * dt;
        p.x += noise(p.y * 0.012 + p.tw, time * 0.6) * dt * 7;
        if (p.x > width + 3) p.x = -3;
        if (p.x < -3) p.x = width + 3;

        const nadSzyna = railY - p.y;
        if (nadSzyna <= 0) {
          // zgaśnięcie w horyzoncie: krótki rozbłysk, traile dopalą resztę
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = `rgb(${COLORS[1]})`;
          ctx.fillRect(p.x - 2, railY - 0.8, 4, 1.4);
          spawn(p, true);
          continue;
        }
        if (p.y < -4) p.y = -4;

        let sx = p.x;
        let sy = p.y;
        const migot = 0.55 + 0.45 * Math.sin(p.tw + time * (0.5 + p.sp * 0.06));
        // im bliżej horyzontu, tym jaśniej i bardziej w stronę Volt
        const osad = nadSzyna < 64 ? 1 - nadSzyna / 64 : 0;
        let alpha = (0.07 + 0.2 * migot) * (0.55 + 0.45 * (p.y / railY)) + osad * 0.2;

        if (mouseGlow > 0.02) {
          const dx = mx - sx;
          const dy = my - sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 19600) {
            const d = Math.sqrt(d2) || 1;
            const k = (1 - d / 140) * mouseGlow;
            sx += (dx / d) * k * 12;
            sy += (dy / d) * k * 12;
            alpha += k * 0.22;
          }
        }

        ctx.globalAlpha = Math.min(alpha, 0.65);
        ctx.fillStyle = `rgb(${COLORS[osad > 0.4 ? 1 : p.c]})`;
        const size = p.sz * (0.8 + osad * 0.5);
        if (size < 1.4) {
          ctx.fillRect(sx, sy, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    /** scena od pierwszej klatki wygląda na trwającą od dawna */
    function prewarm() {
      for (let i = 0; i < 90; i++) step(0.016);
    }

    /*
     * Rozgrzewka kosztuje 90 przebiegów `step` po całej puli cząstek —
     * to najdłuższe pojedyncze zadanie, jakie ta strona wykonuje na
     * wątku głównym. Wykonywana przy montowaniu doliczała się do
     * Total Blocking Time (waga 30/100 w wydajności Lighthouse'a),
     * mimo że stopka leży wtedy kilka ekranów niżej i nikt jej nie widzi.
     *
     * Dlatego scena przygotowuje się dopiero przy pierwszym wejściu
     * w widok — tak samo, jak od zawsze bramkowana jest sama pętla
     * animacji. Efekt wizualny bez zmian: rozgrzewka kończy się przed
     * pierwszą klatką, więc pył nadal „opada od dawna", gdy stopka
     * pojawia się na ekranie.
     */
    let przygotowane = false;

    function przygotuj() {
      if (przygotowane) return;
      przygotowane = true;
      makeParticles();
      prewarm();
    }

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      step(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduce || !inView || document.hidden) return;
      przygotuj();
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // Samo tło maluje się od razu (jeden fillRect) — cząstek jeszcze nie
    // ma, bo te czekają na wejście stopki w widok (patrz `przygotuj`).
    applySize();

    const onPointerMove = (e: PointerEvent) => {
      const rect = root!.getBoundingClientRect();
      tmx = e.clientX - rect.left;
      tmy = e.clientY - rect.top;
      mouseActive = true;
    };
    const onPointerLeave = () => {
      mouseActive = false;
    };

    /** dotknięcie wordmarku: impuls na szynie od razu + zryw pyłu */
    const onHotspot = () => {
      const now = performance.now();
      if (now - lastKick < 2500) return;
      lastKick = now;
      const impuls = root!.querySelector<SVGElement>(".fw-impuls");
      if (impuls) {
        impuls.style.animation = "none";
        void impuls.getBoundingClientRect();
        impuls.style.animation = "";
      }
      for (const p of particles) {
        const nadSzyna = railY - p.y;
        if (nadSzyna >= 0 && nadSzyna < 150) {
          p.vk = -(24 + Math.random() * 70) * (1 - nadSzyna / 150);
        }
      }
    };

    const hotspot = root.querySelector<HTMLElement>("[data-fw-hotspot]");
    if (!reduce) {
      root.addEventListener("pointermove", onPointerMove, { passive: true });
      root.addEventListener("pointerleave", onPointerLeave, { passive: true });
      hotspot?.addEventListener("pointerenter", onHotspot);
      hotspot?.addEventListener("pointerdown", onHotspot);
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (Math.abs(w - width) < 24 && Math.abs(h - height) < 24) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        stop();
        applySize();
        // Przebudowa puli tylko wtedy, gdy scena już raz się przygotowała.
        // Zmiana rozmiaru zdarza się także wtedy, gdy stopka wciąż jest
        // poza widokiem (rozwijany akordeon wyżej, obrót telefonu) —
        // przygotowanie jej tutaj obchodziłoby bramkę widoku bokiem.
        if (przygotowane) {
          makeParticles();
          prewarm();
        }
        start();
      }, 160);
    });
    ro.observe(root);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        inView = entry.isIntersecting;
        if (!inView) {
          stop();
          return;
        }
        // Przy prefers-reduced-motion `start()` z założenia nic nie robi,
        // a scena ma być narysowana raz i stać — więc rozgrzewkę trzeba
        // tu odpalić wprost. Bez tego reduced-motion dostałoby pusty canvas.
        if (reduce) przygotuj();
        else start();
      },
      { threshold: 0.05 },
    );
    io.observe(root);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      hotspot?.removeEventListener("pointerenter", onHotspot);
      hotspot?.removeEventListener("pointerdown", onHotspot);
    };
  }, [reduce]);

  return (
    <div ref={rootRef} className="relative">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fw-canvas pointer-events-none absolute inset-0"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
