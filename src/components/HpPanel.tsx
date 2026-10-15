import { useEffect, useRef, useState } from "react";
import { GraphPlot } from "./GraphPlot";
import { isCritical } from "../game/engine";
import { allRoots, degree, fmtNum, polyTerms, realRoots } from "../game/math";
import type { HpState, PlayerState, Side } from "../game/types";
import { cn } from "../utils/cn";

interface Props {
  player: PlayerState;
  startHp: number;
  side: Side;
  active: boolean;
  showGraph: boolean;
}

export function HpPanel({ player, startHp, side, active, showGraph }: Props) {
  const hp = player.hp;
  const crit = isCritical(hp);
  const prev = useRef<number>(hpValue(hp));
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const now = hpValue(hp);
    if (now !== prev.current) {
      setDelta(now - prev.current);
      prev.current = now;
      const t = setTimeout(() => setDelta(null), 1200);
      return () => clearTimeout(t);
    }
  }, [hp]);

  const accent = side === 0 ? "text-neon-cyan" : "text-neon-magenta";
  const ringColor = crit.critical ? "border-neon-red/70" : active ? "border-neon-cyan/45" : "border-white/10";

  return (
    <div
      className={cn(
        "panel relative overflow-hidden rounded-xl px-4 py-3 transition-all duration-500",
        ringColor,
        crit.critical && "danger-flash",
        active && !crit.critical && "shadow-[0_0_40px_-18px_rgba(60,231,255,0.9)]",
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-px", side === 0 ? "bg-gradient-to-r from-transparent via-neon-cyan/70 to-transparent" : "bg-gradient-to-r from-transparent via-neon-magenta/70 to-transparent")} />

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("font-display text-[11px] font-extrabold tracking-[0.2em]", accent)}>{player.name}</span>
        <KindBadge hp={hp} />
        {hp.kind !== "number" && <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/45">степінь {degree(hp.poly)}</span>}
        {crit.critical && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-neon-red/60 bg-neon-red/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-neon-red">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-neon-red" />
            {crit.reason}
          </span>
        )}
      </div>

      {hp.kind === "number" ? (
        <NumberHp value={hp.value} startHp={startHp} delta={delta} accent={accent} side={side} />
      ) : (
        <EquationHp hp={hp} delta={delta} showGraph={showGraph} />
      )}
    </div>
  );
}

function hpValue(hp: HpState): number {
  if (hp.kind === "number") return hp.value;
  const r = realRoots(hp.poly);
  return r.length ? Math.floor(Math.max(...r)) : -1;
}

function KindBadge({ hp }: { hp: HpState }) {
  const map = {
    number: { t: "ЧИСЛО", c: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime" },
    equation: { t: "РІВНЯННЯ", c: "border-neon-amber/40 bg-neon-amber/10 text-neon-amber" },
    graph: { t: "ГРАФІК", c: "border-neon-violet/40 bg-neon-violet/10 text-neon-violet" },
  } as const;
  const m = map[hp.kind];
  return <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-widest", m.c)}>{m.t}</span>;
}

function NumberHp({ value, startHp, delta, accent, side }: { value: number; startHp: number; delta: number | null; accent: string; side: Side }) {
  const max = Math.max(startHp, Math.abs(value), 1);
  const pct = Math.min(50, (Math.abs(value) / max) * 50);
  const zero = value === 0;
  const negative = value < 0;
  return (
    <div className="mt-1 flex items-end gap-4">
      <div className="relative">
        <div
          key={value}
          className={cn(
            "pop-in font-display text-5xl font-black leading-none tabular-nums sm:text-6xl",
            zero ? "text-neon-red neon-text" : negative ? "text-neon-violet neon-text" : accent,
          )}
          style={{ textShadow: zero ? "0 0 26px rgba(255,77,77,.8)" : undefined }}
        >
          {value}
        </div>
        {delta !== null && delta !== 0 && (
          <div
            key={`d${value}`}
            className={cn("pop-in absolute -right-10 top-1 font-mono text-sm font-bold", delta > 0 ? "text-neon-lime" : "text-neon-magenta")}
          >
            {delta > 0 ? `+${delta}` : delta}
          </div>
        )}
        {zero && <div className="mt-1 font-mono text-[10px] tracking-[0.3em] text-neon-red">ОБНУЛЕННЯ</div>}
        {negative && <div className="mt-1 font-mono text-[10px] tracking-wider text-neon-violet">ВІД’ЄМНЕ HP</div>}
      </div>

      <div className="mb-2 flex-1">
        <div className="relative h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/50" role="meter" aria-label="HP" aria-valuemin={-max} aria-valuemax={max} aria-valuenow={value} title="Від’ємне HP зліва, додатне справа; критичний стан лише в нулі">
          <div
            className={cn(
              "absolute h-full rounded-full transition-all duration-700 ease-out",
              negative ? "bg-neon-violet" : side === 0
                ? "bg-[linear-gradient(90deg,#0e7490,#3ce7ff,#8dff5a)]"
                : "bg-[linear-gradient(90deg,#7a1140,#ff3d8b,#ffc65c)]",
              zero && "bg-neon-red",
            )}
            style={{ left: `${negative ? 50 - pct : 50}%`, width: `${pct}%` }}
          />
          <div className="absolute inset-y-0 left-1/2 z-10 w-px bg-white/70" />
          <div className="shimmer absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)]" />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9px] text-white/30">
          <span>−{max}</span>
          <span className={zero ? "text-neon-red" : undefined}>0</span>
          <span>+{max}</span>
        </div>
      </div>
    </div>
  );
}

function EquationHp({ hp, delta, showGraph }: { hp: Extract<HpState, { kind: "equation" | "graph" }>; delta: number | null; showGraph: boolean }) {
  const roots = allRoots(hp.poly);
  const real = realRoots(hp.poly);
  const terms = polyTerms(hp.poly);
  return (
    <div className={cn("mt-2", showGraph && "grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]")}>
      <div>
        <div key={JSON.stringify(hp.poly)} className="pop-in flex flex-wrap items-baseline gap-x-2 font-mono text-2xl font-bold text-white sm:text-3xl">
          {terms.map((t, i) => (
            <span key={i} className="flex items-baseline gap-1.5">
              {t.sign && <span className="text-white/35">{t.sign}</span>}
              <span className={cn("neon-text", hp.kind === "graph" ? "text-neon-lime" : "text-neon-cyan")}>{t.body}</span>
              {t.sup && <sup className="text-[0.6em] text-white/70">{t.sup}</sup>}
            </span>
          ))}
          <span className="text-white/40">= 0</span>
          {delta !== null && delta !== 0 && (
            <span className={cn("pop-in font-mono text-sm", delta > 0 ? "text-neon-lime" : "text-neon-magenta")}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] tracking-widest text-white/35">КОРЕНІ:</span>
          {roots.length === 0 && <span className="rounded border border-neon-red/50 bg-neon-red/10 px-2 py-0.5 font-mono text-[11px] text-neon-red">немає розв'язків</span>}
          {roots.map((r, i) => {
            const complex = Math.abs(r.im) > 1e-7;
            const isZero = !complex && Math.abs(r.re) < 1e-9;
            return (
              <span
                key={i}
                className={cn(
                  "rounded px-2 py-0.5 font-mono text-[11px] font-bold transition-colors",
                  complex
                    ? "border border-dashed border-neon-violet/50 bg-neon-violet/10 text-neon-violet"
                    : isZero
                      ? "border border-neon-red/70 bg-neon-red/20 text-neon-red shadow-[0_0_18px_-4px_#ff4d4d]"
                      : "border border-neon-amber/40 bg-neon-amber/10 text-neon-amber",
                )}
                title={r.multiplicity > 1 ? `кратність ${r.multiplicity}` : undefined}
              >
                x = {complex ? `${fmtNum(r.re)} ${r.im > 0 ? "+" : "−"} ${fmtNum(Math.abs(r.im))}i` : fmtNum(r.re)}
                {r.multiplicity > 1 && <sup className="ml-0.5 text-[9px]">×{r.multiplicity}</sup>}
              </span>
            );
          })}
          {real.length > 0 && !real.some((r) => Math.abs(r) < 1e-9) && (
            <span className="font-mono text-[10px] text-neon-lime/70">→ HP {Math.floor(Math.max(...real))}</span>
          )}
        </div>
      </div>

      {showGraph && (
        <div className="rounded-lg border border-white/10 bg-black/35 p-1">
          <GraphPlot poly={hp.poly} mode={hp.kind} height={168} animateKey={JSON.stringify(hp.poly) + hp.kind} />
        </div>
      )}
    </div>
  );
}
