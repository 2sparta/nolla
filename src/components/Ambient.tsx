import { useMemo } from "react";

const GLYPHS = ["∫", "π", "√", "∑", "÷", "×", "0", "x²", "∞", "Δ", "θ", "≠", "∂", "λ", "±", "f(x)", "⇒", "∛"];

export function Ambient({ intensity = 1 }: { intensity?: number }) {
  const glyphs = useMemo(
    () =>
      Array.from({ length: Math.round(18 * intensity) }, (_, i) => ({
        id: i,
        char: GLYPHS[i % GLYPHS.length],
        left: (i * 37) % 100,
        top: (i * 53) % 100,
        size: 12 + ((i * 13) % 34),
        dur: 16 + ((i * 7) % 22),
        delay: -((i * 3.3) % 20),
        color: i % 5 === 0 ? "#ff3d8b" : i % 3 === 0 ? "#ffc65c" : "#3ce7ff",
      })),
    [intensity],
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,#123047_0%,transparent_55%),radial-gradient(ellipse_at_85%_110%,#2a1030_0%,transparent_55%),linear-gradient(180deg,#04060d_0%,#060a14_60%,#04060d_100%)]" />
      <div className="bg-grid absolute inset-0 opacity-70" />
      <div className="bg-noise absolute inset-0 opacity-40" />
      {glyphs.map((g) => (
        <span
          key={g.id}
          className="drift-glyph"
          style={{
            left: `${g.left}%`,
            top: `${g.top}%`,
            fontSize: g.size,
            color: g.color,
            animationDuration: `${g.dur}s`,
            animationDelay: `${g.delay}s`,
            opacity: 0.25,
            textShadow: `0 0 18px ${g.color}`,
          }}
        >
          {g.char}
        </span>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#04060d] to-transparent" />
    </div>
  );
}
