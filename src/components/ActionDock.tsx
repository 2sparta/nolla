import { CARDS } from "../game/cards";
import { rootOptions } from "../game/cards";
import { canCompleteMove, checkMove, hpLabel, isCritical, previewMove } from "../game/engine";
import { fmtNum } from "../game/math";
import type { GameState, Side, Zone } from "../game/types";
import { cn } from "../utils/cn";

export interface Pending {
  cardUid: string;
  target?: Side;
  zone?: Zone;
  root?: number;
}

interface Props {
  state: GameState;
  pending: Pending;
  onTarget: (t: Side) => void;
  onZone: (z: Zone) => void;
  onRoot: (r: number) => void;
  onCancel: () => void;
}

const ZONES: { id: Zone; label: string; hint: string }[] = [
  { id: "left", label: "Ліва частина", hint: "змінює вираз ліворуч від «=»" },
  { id: "right", label: "Права частина", hint: "змінює нуль праворуч — зсуває корінь" },
  { id: "both", label: "Обидві частини", hint: "зберігає рівновагу або створює тотожність" },
];

export function ActionDock({ state, pending, onTarget, onZone, onRoot, onCancel }: Props) {
  const inst = state.players[0].hand.find((c) => c.uid === pending.cardUid);
  if (!inst) return null;
  const def = CARDS[inst.id];
  const probe = checkMove(state, 0, pending);

  const step = probe.ok ? 0 : probe.needsTarget ? 1 : probe.needsZone ? 2 : probe.needsRoot ? 3 : 0;
  const total = (def.id === "swap" ? 0 : 1) + (probe.needsZone || step > 1 ? 1 : 0) + (def.needsRoot ? 1 : 0) || 1;

  return (
    <div className="panel pop-in relative z-30 rounded-xl border-neon-cyan/30 px-4 py-3">
      <div className="mb-2.5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded border border-neon-cyan/50 bg-neon-cyan/10 font-mono text-base font-bold text-neon-cyan">
          {def.symbol}
        </span>
        <div className="flex-1">
          <div className="font-display text-[12px] font-black uppercase tracking-[0.14em] text-white">{def.name}</div>
          <div className="font-mono text-[10px] tracking-wider text-white/40">
            {step > 0 ? `КРОК ${Math.min(step, total)} / ${total}` : "ГОТОВО"} · {def.cost} ОО
          </div>
        </div>
        {probe.reason && <div className="hidden max-w-[46%] text-right font-mono text-[10.5px] text-neon-amber sm:block">{probe.reason}</div>}
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-white/15 px-2.5 py-1.5 font-mono text-[11px] text-white/55 transition hover:border-neon-red/60 hover:text-neon-red"
        >
          СКАСУВАТИ ✕
        </button>
      </div>

      {step === 1 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {([0, 1] as Side[]).map((s) => {
            const p = state.players[s];
            const leg = checkMove(state, 0, { ...pending, target: s });
            const selectable = canCompleteMove(state, 0, { ...pending, target: s });
            const sim = leg.ok ? previewMove(state, 0, { ...pending, target: s }) : null;
            const after = sim ? hpLabel(sim.players[s].hp) : null;
            const crit = isCritical(p.hp);
            return (
              <button
                key={s}
                type="button"
                disabled={!selectable}
                onClick={() => onTarget(s)}
                className={cn(
                  "group rounded-lg border p-3 text-left transition-all duration-200",
                  selectable
                    ? "border-white/15 bg-white/[0.03] hover:-translate-y-0.5 hover:border-neon-cyan/70 hover:bg-neon-cyan/10"
                    : "cursor-not-allowed border-white/8 bg-black/30 opacity-40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("font-display text-[11px] font-black uppercase tracking-[0.16em]", s === 0 ? "text-neon-cyan" : "text-neon-magenta")}>
                    {s === 0 ? "→ На себе" : "→ На супротивника"}
                  </span>
                  <span className="font-mono text-[10px] text-white/35">{p.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 truncate font-mono text-[15px] font-bold text-white/90">
                  <span className="truncate">{hpLabel(p.hp)}</span>
                  {after && after !== hpLabel(p.hp) && (
                    <span className="truncate text-neon-lime">→ {after}</span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[10px] leading-snug">
                  {sim?.phase === "gameover" ? (
                    <span className={sim.winner === 0 ? "font-bold text-neon-lime" : "font-bold text-neon-red"}>
                      {sim.winner === 0 ? "★ МИТТЄВА ПЕРЕМОГА" : "✕ МИТТЄВА ПОРАЗКА"}
                    </span>
                  ) : selectable ? (
                    !leg.ok ? (
                      <span className="text-neon-amber">Далі: {leg.needsRoot ? "оберіть корінь" : "оберіть частину рівняння"}</span>
                    ) :
                    crit.critical ? (
                      <span className="text-neon-red">критичний стан: {crit.reason}</span>
                    ) : after && after !== hpLabel(p.hp) ? (
                      <span className="text-neon-lime/70">результат одразу після розіграшу</span>
                    ) : (
                      <span className="text-white/40">без змін або потребує вибору</span>
                    )
                  ) : (
                    <span className="text-neon-red/80">✕ {leg.reason}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {ZONES.map((z) => {
            const leg = checkMove(state, 0, { ...pending, zone: z.id });
            const selectable = canCompleteMove(state, 0, { ...pending, zone: z.id });
            const sim = leg.ok ? previewMove(state, 0, { ...pending, zone: z.id }) : null;
            const t = sim?.players[pending.target ?? 1];
            return (
              <button
                key={z.id}
                type="button"
                disabled={!selectable}
                onClick={() => onZone(z.id)}
                className={cn(
                  "rounded-lg border p-2.5 text-left transition-all duration-200",
                  selectable ? "border-white/15 bg-white/[0.03] hover:-translate-y-0.5 hover:border-neon-amber/70 hover:bg-neon-amber/10" : "cursor-not-allowed opacity-40",
                )}
              >
                <div className="font-display text-[11px] font-black uppercase tracking-wider text-white">{z.label}</div>
                <div className="font-mono text-[9.5px] text-white/35">{z.hint}</div>
                {t && (
                  <div className="mt-1.5 border-t border-white/10 pt-1.5">
                    <div className="font-mono text-[11.5px] text-neon-amber">{hpLabel(t.hp)}</div>
                    {isCritical(t.hp).critical && <div className="font-mono text-[9.5px] text-neon-red">критичний стан!</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {step === 3 && (() => {
        const th = state.players[pending.target ?? 0].hp;
        if (th.kind === "number") return null;
        const opts = rootOptions(def.id, th.poly);
        const isHorner = def.id === "horner";
        return (
          <div>
            <div className="mb-2 font-mono text-[10.5px] tracking-wider text-white/40">
              {isHorner ? "ОБЕРІТЬ КОРІНЬ a ДЛЯ ПОДІЛУ НА (x − a)" : "ОБЕРІТЬ КОРІНЬ — ВІН СТАНЕ НОВИМ HP"}
            </div>
            <div className="flex flex-wrap gap-2">
              {opts.map((o, i) => {
                const sim = previewMove(state, 0, { ...pending, root: o.value.re });
                const thp = sim?.players[pending.target ?? 0].hp;
                const complex = Math.abs(o.value.im) > 1e-7;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onRoot(o.value.re)}
                    className={cn(
                      "group min-w-[104px] rounded-lg border p-2 text-left transition-all duration-200 hover:-translate-y-1",
                      complex
                        ? "border-dashed border-neon-violet/50 bg-neon-violet/10 hover:bg-neon-violet/20"
                        : o.dangerous
                          ? "border-neon-red/60 bg-neon-red/15 hover:bg-neon-red/25"
                          : "border-neon-amber/40 bg-neon-amber/10 hover:bg-neon-amber/20",
                    )}
                  >
                    <div className={cn("font-mono text-lg font-extrabold", complex ? "text-neon-violet" : o.dangerous ? "text-neon-red" : "text-neon-amber")}>
                      x = {o.label}
                    </div>
                    <div className="font-mono text-[9.5px] text-white/45">{o.note ?? (isHorner ? "прибере цей корінь" : "безпечний корінь")}</div>
                    {thp && !isHorner && (
                      <div className="mt-1 border-t border-white/10 pt-1 font-mono text-[10px] text-white/60">HP → {fmtNum(thp.kind === "number" ? thp.value : 0)}</div>
                    )}
                    {isHorner && sim && (
                      <div className="mt-1 border-t border-white/10 pt-1 font-mono text-[10px] text-white/60">{hpLabel(sim.players[pending.target ?? 0].hp)}</div>
                    )}
                  </button>
                );
              })}
              {opts.length === 0 && <div className="font-mono text-[11px] text-neon-red">Немає доступних коренів</div>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
