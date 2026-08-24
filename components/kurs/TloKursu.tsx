"use client";

import { useEffect, useRef } from "react";

/**
 * Żywe tło strony kursu (feedback B5: „więcej animacji kursora, więcej
 * w tle"): stała warstwa pod treścią z poświatą podążającą za kursorem
 * (jedna pętla rAF, transform-only) i dwoma dryfującymi blobami
 * (czyste keyframes CSS). pointer-events: none — zero wpływu na
 * klikalność; prefers-reduced-motion = warstwa statyczna.
 */
export default function TloKursu() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let celX = window.innerWidth * 0.7;
    let celY = window.innerHeight * 0.3;
    let x = celX;
    let y = celY;
    let raf = 0;
    let aktywna = false;

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    const petla = () => {
      x += (celX - x) * 0.09;
      y += (celY - y) * 0.09;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(celX - x) + Math.abs(celY - y) > 0.5) {
        raf = requestAnimationFrame(petla);
      } else {
        aktywna = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      celX = e.clientX;
      celY = e.clientY;
      if (!aktywna) {
        aktywna = true;
        raf = requestAnimationFrame(petla);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // -z-10: nad tłem <body>, pod całą treścią (ujemny z-index dziecka)
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* poświata za kursorem */}
      <div ref={glowRef} className="kursor-glow" />
      {/* dryfujące bloby — powolne życie tła niezależne od kursora */}
      <div className="dryf-a absolute top-[16%] -left-32 size-[26rem] rounded-full bg-volt/[0.035] blur-[110px]" />
      <div className="dryf-b absolute top-[58%] -right-36 size-[30rem] rounded-full bg-volt/[0.03] blur-[120px]" />
    </div>
  );
}
