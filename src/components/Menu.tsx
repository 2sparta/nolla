import { useEffect, useState } from "react";
import { Ambient } from "./Ambient";
import { HpPanel } from "./HpPanel";
import { MODES } from "../game/engine";
import { buildDeck, CARD_LIST } from "../game/cards";
import type { HpState, Mode, PlayerState } from "../game/types";
import { cn } from "../utils/cn";

const DEMO: { hp: HpState; caption: string }[] = [
  { hp: { kind: "number", value: 20 }, caption: "HP може бути цілим або дробовим. 1 ÷ 2 = 1/2, а не 0." },
  { hp: { kind: "number", value: -7 }, caption: "HP може бути від’ємним: 2 − 3 = −1. Критичний стан — лише рівно 0." },
  { hp: { kind: "number", value: 7 }, caption: "Карта «Модуль» |x|: |−7| = 7. Змінює знак від’ємного числа." },
  { hp: { kind: "equation", poly: [-20, 1] }, caption: "Карта «x»: HP перетворюється на рівняння x − 20 = 0." },
  { hp: { kind: "equation", poly: [0, -20, 1] }, caption: "Друга «x» підвищує степінь і додає смертельний корінь 0." },
  { hp: { kind: "graph", poly: [0, -20, 1] }, caption: "Карта «y»: битва переходить у площину графіка f(x)." },
];

const ORDER: Mode[] = ["classic", "speed", "equations", "graphs", "puzzle"];

export function Menu({ onStart, onRules }: { onStart: (mode: Mode) => void; onRules: () => void }) {
  const [sel, setSel] = useState<Mode>("classic");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % DEMO.length), 4200);
    return () => clearInterval(t);
  }, []);

  const demoPlayer: PlayerState = {
    side: 0, name: "ПОЛІГОН", hp: DEMO[step].hp, deck: [], hand: [], oo: 0,
    criticalAtTurnStart: false, discarded: 0, cardsPlayed: 0, damageDealt: 0,
  };

  return (
    <div className="relative min-h-screen">
      <Ambient intensity={1.3} />
      <div className="relative mx-auto flex min-h-screen max-w-[1400px] flex-col gap-8 px-5 py-8 lg:flex-row lg:items-center lg:gap-14 lg:px-10">
        {/* ліва колонка */}
        <div className="flex-1 rise-in">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-neon-cyan/60" />
            <span className="font-mono text-[10px] tracking-[0.42em] text-neon-cyan/80">КАРТКОВА ДУЕЛЬ · 14+</span>
          </div>

          <div className="relative mt-3 flex items-start gap-4">
            <div className="relative mt-2 h-24 w-24 shrink-0 sm:h-28 sm:w-28">
              <svg viewBox="0 0 100 100" className="spin-slow absolute inset-0 h-full w-full">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#3ce7ff" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="6 10" />
              </svg>
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <circle cx="50" cy="50" r="34" fill="none" stroke="#ff3d8b" strokeWidth="3" strokeOpacity="0.9" style={{ filter: "drop-shadow(0 0 12px #ff3d8b)" }} />
                <circle cx="50" cy="50" r="34" fill="none" stroke="#3ce7ff" strokeWidth="1.5" strokeDasharray="214" strokeDashoffset="150" className="pulse-ring" style={{ transformOrigin: "50px 50px" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-black text-white/90">0</div>
            </div>
            <h1 className="font-display text-[15vw] font-black leading-[0.78] tracking-tighter text-white sm:text-8xl lg:text-[7.5rem]">
              НО<span className="text-neon-magenta" style={{ textShadow: "0 0 42px #ff3d8b" }}>Л</span>Ь
            </h1>
          </div>

          <p className="mt-4 max-w-xl font-body text-[15px] leading-relaxed text-white/60">
            Двоє б'ються числами, рівняннями та графіками. Перемога — це <span className="font-mono text-neon-cyan">HP = 0</span>,{" "}
            <span className="font-mono text-neon-red">корінь 0</span>, <span className="font-mono text-neon-amber">відсутність розв'язків</span> або{" "}
            <span className="font-mono text-neon-magenta">ділення на нуль</span>.
          </p>

          <div className="mt-7 max-w-2xl">
            <div className="mb-2 font-mono text-[10px] tracking-[0.3em] text-white/30">ОБЕРІТЬ РЕЖИМ</div>
            <div className="flex flex-col gap-1.5">
              {ORDER.map((m, i) => {
                const cfg = MODES[m];
                const active = sel === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onMouseEnter={() => setSel(m)}
                    onFocus={() => setSel(m)}
                    onClick={() => setSel(m)}
                    className={cn(
                      "group relative flex items-center gap-4 overflow-hidden rounded-lg border px-4 py-3 text-left transition-all duration-300",
                      active ? "border-white/25 bg-white/[0.06]" : "border-white/8 bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.04]",
                    )}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-[3px] transition-all duration-300"
                      style={{ background: active ? cfg.accent : "transparent", boxShadow: active ? `0 0 18px ${cfg.accent}` : undefined }}
                    />
                    <span className={cn("font-mono text-[11px] tabular-nums transition-colors", active ? "text-white/80" : "text-white/25")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">
                      <span className="block font-display text-sm font-extrabold uppercase tracking-wide text-white">{cfg.title}</span>
                      <span
                        className={cn(
                          "block overflow-hidden font-body text-[12px] leading-snug text-white/50 transition-all duration-300",
                          active ? "max-h-16 opacity-100" : "max-h-0 opacity-0 sm:max-h-16 sm:opacity-60",
                        )}
                      >
                        {cfg.desc}
                      </span>
                    </span>
                    <span className="hidden shrink-0 rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-white/45 sm:block">{cfg.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStart(sel)}
              className="group relative overflow-hidden rounded-lg bg-neon-cyan px-8 py-3.5 font-display text-sm font-black uppercase tracking-[0.18em] text-ink-900 transition-all duration-200 hover:scale-[1.03] hover:bg-white active:scale-95"
              style={{ boxShadow: "0 18px 44px -18px #3ce7ff" }}
            >
              <span className="relative z-10">Почати дуель →</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
            <button
              type="button"
              onClick={onRules}
              className="rounded-lg border border-white/15 px-6 py-3.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-white/70 transition hover:border-neon-amber/60 hover:text-neon-amber"
            >
              Правила та карти
            </button>
          </div>
        </div>

        {/* права колонка — живий полігон */}
        <div className="w-full max-w-[520px] shrink-0 rise-in lg:w-[46%]" style={{ animationDelay: "120ms" }}>
          <div className="panel relative overflow-hidden rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.3em] text-white/35">ЖИВИЙ ПОЛІГОН</span>
              <div className="flex gap-1.5">
                {DEMO.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Стан ${i + 1}`}
                    onClick={() => setStep(i)}
                    className={cn("h-1.5 rounded-full transition-all duration-300", i === step ? "w-6 bg-neon-cyan" : "w-1.5 bg-white/20 hover:bg-white/40")}
                  />
                ))}
              </div>
            </div>
            <HpPanel player={demoPlayer} startHp={20} side={0} active showGraph />
            <p key={step} className="pop-in mt-3 border-l-2 border-neon-cyan/50 pl-3 font-body text-[12.5px] leading-relaxed text-white/55">
              {DEMO[step].caption}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 sm:grid-cols-4">
              {[
                ["10", "карт «x»"],
                ["2", "карти «y»"],
                [String(CARD_LIST.filter((c) => c.category === "helper").length), "теорем"],
                [String(buildDeck().length), "карт у колоді"],
              ].map(([n, l]) => (
                <div key={l} className="text-center">
                  <div className="font-display text-xl font-black text-white">{n}</div>
                  <div className="font-mono text-[9px] tracking-wider text-white/35">{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
