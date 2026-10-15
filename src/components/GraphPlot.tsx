import { useMemo } from "react";
import { evalPoly, fmtNum, polyToString, realRoots, type Poly } from "../game/math";

interface Props {
  poly: Poly;
  mode: "equation" | "graph";
  height?: number;
  animateKey?: string;
}

const W = 460;
const H = 250;
const PAD = 26;

export function GraphPlot({ poly, mode, height = 250, animateKey }: Props) {
  const data = useMemo(() => {
    const roots = realRoots(poly);
    let xMin = -6;
    let xMax = 6;
    if (roots.length) {
      const lo = Math.min(...roots);
      const hi = Math.max(...roots);
      const span = Math.max(4, (hi - lo) * 1.4);
      xMin = Math.min(-2, lo - span / 2);
      xMax = Math.max(2, hi + span / 2);
    }
    const N = 220;
    const pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const x = xMin + ((xMax - xMin) * i) / N;
      pts.push([x, evalPoly(poly, x)]);
    }
    const ys = pts.map((p) => p[1]).filter((y) => Number.isFinite(y));
    let yMin = Math.min(0, ...ys);
    let yMax = Math.max(0, ...ys);
    const padY = Math.max(2, (yMax - yMin) * 0.15);
    yMin -= padY;
    yMax += padY;
    if (yMax - yMin < 4) {
      const mid = (yMax + yMin) / 2;
      yMin = mid - 2;
      yMax = mid + 2;
    }
    const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - PAD * 2);
    const sy = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - PAD * 2);
    let d = "";
    let pen = false;
    for (const [x, y] of pts) {
      const px = sx(x);
      const py = sy(y);
      if (py < -200 || py > H + 200) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${px.toFixed(1)},${Math.max(-200, Math.min(H + 200, py)).toFixed(1)} `;
      pen = true;
    }
    const area = `${d} L${sx(xMax).toFixed(1)},${sy(0).toFixed(1)} L${sx(xMin).toFixed(1)},${sy(0).toFixed(1)} Z`;
    return {
      d,
      area,
      roots,
      sx,
      sy,
      xMin,
      xMax,
      yMin,
      yMax,
      ticksX: niceTicks(xMin, xMax, 8),
      ticksY: niceTicks(yMin, yMax, 5),
    };
  }, [poly]);

  const stroke = mode === "graph" ? "#8dff5a" : "#3ce7ff";
  const gid = `grad-${mode}`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.34" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow-plot" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {data.ticksX.map((t) => (
          <line key={`gx${t}`} x1={data.sx(t)} y1={PAD - 6} x2={data.sx(t)} y2={H - PAD + 6} stroke="#3ce7ff" strokeOpacity="0.08" strokeWidth="1" />
        ))}
        {data.ticksY.map((t) => (
          <line key={`gy${t}`} x1={PAD - 6} y1={data.sy(t)} x2={W - PAD + 6} y2={data.sy(t)} stroke="#3ce7ff" strokeOpacity="0.08" strokeWidth="1" />
        ))}

        {/* осі */}
        <line x1={PAD} y1={data.sy(0)} x2={W - PAD} y2={data.sy(0)} stroke="#6f8bb5" strokeWidth="1.4" strokeOpacity="0.75" />
        <line x1={data.sx(0)} y1={PAD - 6} x2={data.sx(0)} y2={H - PAD + 6} stroke="#6f8bb5" strokeWidth="1.4" strokeOpacity="0.75" />
        <text x={W - PAD + 2} y={data.sy(0) - 6} fill="#8aa4cc" fontSize="10" fontFamily="JetBrains Mono, monospace">x</text>
        <text x={data.sx(0) + 6} y={PAD - 2} fill="#8aa4cc" fontSize="10" fontFamily="JetBrains Mono, monospace">y</text>

        {data.ticksX.filter((t) => Math.abs(t) > 1e-9).map((t) => (
          <text key={`tx${t}`} x={data.sx(t)} y={data.sy(0) + 14} fill="#5f7ba6" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {fmtNum(t)}
          </text>
        ))}

        <path key={`area-${animateKey}`} d={data.area} fill={`url(#${gid})`} opacity="0.75" />
        <path
          key={`curve-${animateKey}`}
          d={data.d}
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
          strokeLinecap="round"
          filter="url(#glow-plot)"
          className="draw-stroke"
          style={{ ["--dash" as string]: "1600" }}
        />

        {data.roots.map((r, i) => {
          const isZero = Math.abs(r) < 1e-9;
          const cx = data.sx(r);
          const cy = data.sy(0);
          const col = isZero ? "#ff4d4d" : "#ffc65c";
          return (
            <g key={`r${i}`}>
              <circle cx={cx} cy={cy} r="12" fill={col} opacity="0.16" className="pulse-ring" style={{ transformOrigin: `${cx}px ${cy}px` }} />
              <circle cx={cx} cy={cy} r="5.4" fill="#04060d" stroke={col} strokeWidth="2.6" filter="url(#glow-plot)" />
              <text x={cx} y={cy - 12} fill={col} fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                {fmtNum(r)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute left-3 top-2 font-mono text-[11px] tracking-wider text-neon-cyan/70">
        f(x) = {polyToString(poly).replace(" = 0", "")}
      </div>
      {mode === "graph" && (
        <div className="pointer-events-none absolute right-3 top-2 rounded-full border border-neon-lime/40 bg-neon-lime/10 px-2 py-0.5 font-mono text-[10px] tracking-widest text-neon-lime">
          ПЛОЩИНА Y
        </div>
      )}
      {data.roots.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[11px] tracking-widest text-neon-red">
          НЕМАЄ ПЕРЕТИНІВ З ВІССЮ X
        </div>
      )}
    </div>
  );
}

function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(Math.round(t * 1000) / 1000);
  return out;
}
