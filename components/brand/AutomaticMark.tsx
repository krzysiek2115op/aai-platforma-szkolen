/**
 * Sygnet Automatic AI — „A złożone z dwóch modułów i impulsu”.
 * Skopiowany 1:1 ze strony głównej (components/brand/AutomaticMark.tsx),
 * wariant statyczny (bez animacji wejścia) — podstrona nie ma potrzeby
 * odtwarzać `mark-modul`/`mark-impuls` z globalnego CSS strony głównej.
 */
export function AutomaticMark({
  className,
  wariant = "volt",
}: {
  className?: string;
  /** „mono” = cały znak jednym kolorem (druk, znak wodny). */
  wariant?: "volt" | "mono";
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={className}
      style={
        wariant === "mono"
          ? ({ "--mark-impuls": "currentColor" } as React.CSSProperties)
          : undefined
      }
    >
      <path
        d="M8 43 L26.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.2"
        strokeLinecap="butt"
      />
      <path
        d="M23.21 14.38 L40 43"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.2"
        strokeLinecap="butt"
      />
      <rect
        x="12.8"
        y="26.2"
        width="22.2"
        height="5.4"
        fill="var(--mark-impuls, var(--color-volt))"
      />
    </svg>
  );
}
