"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Silnik interakcji hero: śledzi kursor i wystawia dzieciom zmienne CSS
 * (--mx/--my w %, --par-x/--par-y w -1..1). Same efekty (spotlight,
 * parallax, floaty) żyją w globals.css — ten komponent tylko mierzy.
 *
 * Dyscyplina jak na stronie głównej: pointermove wyłącznie zapisuje cel,
 * jedna pętla rAF wygładza; prefers-reduced-motion = zero nasłuchów,
 * a bez JavaScriptu wszystko po prostu stoi w miejscu — treść kompletna.
 */
export default function HeroMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let celX = 0.5;
    let celY = 0.35;
    let x = celX;
    let y = celY;
    let raf = 0;
    let aktywna = false;

    const petla = () => {
      x += (celX - x) * 0.12;
      y += (celY - y) * 0.12;
      el.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
      el.style.setProperty("--par-x", (x * 2 - 1).toFixed(3));
      el.style.setProperty("--par-y", (y * 2 - 1).toFixed(3));
      if (Math.abs(celX - x) + Math.abs(celY - y) > 0.001) {
        raf = requestAnimationFrame(petla);
      } else {
        aktywna = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      celX = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      celY = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
      if (!aktywna) {
        aktywna = true;
        raf = requestAnimationFrame(petla);
      }
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
