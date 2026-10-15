import type { CardDef, Accent } from "../game/types";
import { cn } from "../utils/cn";

const A: Record<Accent, { text: string; border: string; glow: string; chip: string; wash: string }> = {
  cyan: {
    text: "text-neon-cyan", border: "border-neon-cyan/45", glow: "shadow-[0_18px_40px_-22px_#3ce7ff]",
    chip: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40", wash: "from-neon-cyan/18",
  },
  magenta: {
    text: "text-neon-magenta", border: "border-neon-magenta/45", glow: "shadow-[0_18px_40px_-22px_#ff3d8b]",
    chip: "bg-neon-magenta/15 text-neon-magenta border-neon-magenta/40", wash: "from-neon-magenta/18",
  },
  amber: {
    text: "text-neon-amber", border: "border-neon-amber/45", glow: "shadow-[0_18px_40px_-22px_#ffc65c]",
    chip: "bg-neon-amber/15 text-neon-amber border-neon-amber/40", wash: "from-neon-amber/18",
  },
  lime: {
    text: "text-neon-lime", border: "border-neon-lime/45", glow: "shadow-[0_18px_40px_-22px_#8dff5a]",
    chip: "bg-neon-lime/15 text-neon-lime border-neon-lime/40", wash: "from-neon-lime/18",
  },
  violet: {
    text: "text-neon-violet", border: "border-neon-violet/45", glow: "shadow-[0_18px_40px_-22px_#a98bff]",
    chip: "bg-neon-violet/15 text-neon-violet border-neon-violet/40", wash: "from-neon-violet/18",
  },
  red: {
    text: "text-neon-red", border: "border-neon-red/60", glow: "shadow-[0_18px_44px_-20px_#ff4d4d]",
    chip: "bg-neon-red/20 text-neon-red border-neon-red/50", wash: "from-neon-red/25",
  },
};

const CATEGORY_LABEL: Record<CardDef["category"], string> = {
  math: "ОПЕРАЦІЯ",
  transform: "ТРАНСФОРМАЦІЯ",
  helper: "ТЕОРЕМА",
  rescue: "ПОРЯТУНОК",
  forbidden: "ЗАБОРОНЕНО",
};

interface Props {
  def: CardDef;
  playable: boolean;
  reason?: string;
  selected?: boolean;
  onClick?: () => void;
  affordable?: boolean;
}

export function CardView({ def, playable, reason, selected, onClick, affordable = true }: Props) {
  const a = A[def.accent];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!playable}
      title={playable ? undefined : reason}
      className={cn(
        "group relative h-[150px] w-[104px] shrink-0 select-none rounded-lg border text-left transition-all duration-200 sm:h-[168px] sm:w-[116px]",
        a.border,
        playable
          ? cn("cursor-pointer bg-[linear-gradient(165deg,rgba(16,26,44,.95),rgba(6,10,20,.98))] hover:-translate-y-4 hover:scale-[1.06]", a.glow)
          : "cursor-not-allowed bg-[linear-gradient(165deg,rgba(12,16,26,.85),rgba(6,8,14,.9))] opacity-40 saturate-50",
        selected && "-translate-y-6 scale-[1.09] ring-2 ring-white/85",
      )}
    >
      <div className={cn("card-sheen pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b to-transparent", a.wash)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-2 pt-1.5">
        <span className={cn("rounded border px-1.5 py-[1px] font-mono text-[10px] font-bold leading-tight", a.chip)}>{def.cost} ОО</span>
        <span className="font-mono text-[7.5px] tracking-[0.14em] text-white/30">{CATEGORY_LABEL[def.category]}</span>
      </div>

      <div className="relative flex h-[64px] items-center justify-center pt-4">
        <span
          className={cn("font-mono text-[30px] font-extrabold leading-none transition-transform duration-300 group-hover:scale-110", a.text)}
          style={{ textShadow: `0 0 22px currentColor` }}
        >
          {def.symbol}
        </span>
      </div>

      <div className="relative px-2 pb-2">
        <div className="font-display text-[10.5px] font-bold uppercase leading-tight tracking-wide text-white/90">{def.name}</div>
        <div className="mt-1 line-clamp-3 font-body text-[9px] leading-[1.25] text-white/45">{def.desc}</div>
      </div>

      {/* підказка при наведенні */}
      <div className="pointer-events-none absolute bottom-[104%] left-1/2 z-40 w-56 -translate-x-1/2 scale-95 rounded-lg border border-white/15 bg-[#080d18]/97 p-2.5 opacity-0 shadow-2xl backdrop-blur transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
        <div className={cn("font-display text-[11px] font-extrabold uppercase tracking-wider", a.text)}>{def.name}</div>
        <div className="mt-1 font-body text-[11px] leading-snug text-white/70">{def.desc}</div>
        <div className="mt-1.5 border-t border-white/10 pt-1.5 font-mono text-[10px] leading-snug text-white/45">{def.rule}</div>
        {!playable && reason && <div className="mt-1.5 font-mono text-[10px] font-bold text-neon-red">✕ {reason}</div>}
        {!affordable && playable && <div className="mt-1 font-mono text-[10px] text-neon-amber">не вистачає ОО</div>}
      </div>
    </button>
  );
}

export function CardBack({ i = 0 }: { i?: number }) {
  return (
    <div
      className="relative h-[52px] w-[38px] shrink-0 rounded-md border border-neon-magenta/25 bg-[linear-gradient(150deg,#150c1c,#0a0710)] shadow-lg"
      style={{ transform: `rotate(${(i % 5) - 2}deg) translateY(${(i % 3) * 2}px)` }}
    >
      <div className="absolute inset-[3px] rounded border border-white/5" />
      <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-black text-neon-magenta/50">0</div>
    </div>
  );
}
