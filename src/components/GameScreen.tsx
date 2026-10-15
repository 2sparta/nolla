import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ambient } from "./Ambient";
import { GraphPlot } from "./GraphPlot";
import { HpValue } from "./HpValue";
import { HpPanel } from "./HpPanel";
import { CardBack, CardView } from "./CardView";
import { ActionDock, type Pending } from "./ActionDock";
import { Rules } from "./Rules";
import { CARDS } from "../game/cards";
import { aiDecide } from "../game/ai";
import { PUZZLES } from "../game/puzzles";
import {
  MODES,
  checkMove,
  createGame,
  endTurn,
  hpLabel,
  isCritical,
  legalMoves,
  playMove,
} from "../game/engine";
import type { CardDef, GameState, Mode, Side, Zone } from "../game/types";
import { cn } from "../utils/cn";

interface Props {
  mode: Mode;
  puzzleIndex?: number;
  onExit: () => void;
  onOpenPuzzle?: (i: number) => void;
}

interface Flash {
  def: CardDef;
  key: number;
  side: Side;
}

export function GameScreen({ mode, puzzleIndex = 0, onExit, onOpenPuzzle }: Props) {
  const pz = mode === "puzzle" ? PUZZLES[puzzleIndex] : null;
  const [state, setState] = useState<GameState>(() => (pz ? pz.build() : createGame(mode)));
  const [pending, setPending] = useState<Pending | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const [puzzleResult, setPuzzleResult] = useState<"solved" | "failed" | null>(null);
  const [shake, setShake] = useState<{ side: Side; key: number } | null>(null);
  const [runId, setRunId] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  /* ---------- скидання ---------- */
  const reset = useCallback(() => {
    setState(pz ? pz.build() : createGame(mode));
    setPending(null);
    setPuzzleResult(null);
    setFlash(null);
    setRunId((r) => r + 1);
  }, [mode, pz]);

  /* ---------- похідні ---------- */
  const me = state.players[0];
  const foe = state.players[1];
  const over = state.phase === "gameover";
  const myTurn = state.turn === 0 && !over;
  const inFinalByMe = state.phase === "finalSeries" && state.finalSeriesBy === 0;
  const cfg = MODES[mode];

  const legal = useMemo(() => (myTurn ? legalMoves(state, 0) : []), [state, myTurn]);
  const legalUids = useMemo(() => new Set(legal.map((m) => m.cardUid)), [legal]);

  /* ---------- ефекти ---------- */
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1150);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!state.lastEvent) return;
    setShake({ side: state.lastEvent.side, key: state.lastEvent.at });
    const t = setTimeout(() => setShake(null), 520);
    return () => clearTimeout(t);
  }, [state.lastEvent]);

  // хід ШІ
  useEffect(() => {
    if (over || state.mode === "puzzle" || state.turn !== 1) return;
    const delay = state.phase === "finalSeries" ? 700 : 950;
    const timer = setTimeout(() => {
      const greedy = state.phase === "finalSeries" && state.finalSeriesBy === 1;
      const plan = aiDecide(state, { greedy });
      if (!plan) {
        setState((s) => (s.turn === 1 && s.phase !== "gameover" ? endTurn(s) : s));
        return;
      }
      const inst = state.players[1].hand.find((c) => c.uid === plan.move.cardUid);
      if (inst) setFlash({ def: CARDS[inst.id], key: Date.now(), side: 1 });
      setState(playMove(state, 1, plan.move));
    }, delay);
    return () => clearTimeout(timer);
  }, [state, over]);

  // авто-завершення ходу гравця
  useEffect(() => {
    if (over || state.mode === "puzzle" || state.turn !== 0) return;
    if (inFinalByMe) return;
    const exhausted = state.cardsThisTurn >= state.maxCards;
    const stuck = legal.length === 0 && !pending;
    if (!exhausted && !stuck) return;
    const t = setTimeout(
      () => setState((s) => (s.turn === 0 && s.phase !== "gameover" ? endTurn(s) : s)),
      exhausted ? 1000 : 1700,
    );
    return () => clearTimeout(t);
  }, [state, over, inFinalByMe, legal.length, pending]);

  // результат головоломки
  useEffect(() => {
    if (!pz || puzzleResult) return;
    if (pz.solved(state)) setPuzzleResult("solved");
    else if (over) setPuzzleResult(state.winner === 0 ? "solved" : "failed");
    else if (state.cardsThisTurn >= state.maxCards) setPuzzleResult("failed");
  }, [state, pz, over, puzzleResult]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.log.length]);

  // клавіатура: Esc — скасувати вибір, Enter/Space — завершити хід
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (rules || over) return;
      if (e.key === "Escape") {
        setPending(null);
        setRules(false);
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && myTurn && !pending && !pz) {
        e.preventDefault();
        setState((s) => (s.turn === 0 && s.phase !== "gameover" ? endTurn(s) : s));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [rules, over, myTurn, pending, pz]);

  /* ---------- дії ---------- */
  const doMove = useCallback(
    (m: Pending) => {
      const inst = state.players[0].hand.find((c) => c.uid === m.cardUid);
      if (inst) setFlash({ def: CARDS[inst.id], key: Date.now(), side: 0 });
      setPending(null);
      setState((s) => playMove(s, 0, m));
    },
    [state],
  );

  const onCardClick = (uid: string) => {
    if (!myTurn || over) return;
    if (pending?.cardUid === uid) {
      setPending(null);
      return;
    }
    const probe = checkMove(state, 0, { cardUid: uid });
    if (probe.ok) return doMove({ cardUid: uid });
    if (probe.needsTarget || probe.needsZone || probe.needsRoot || probe.needsSubstitution || probe.needsFractionPart) return setPending({ cardUid: uid });
    setToast(probe.reason);
  };

  const onTarget = (t: Side) => {
    if (!pending) return;
    const next: Pending = { ...pending, target: t };
    const probe = checkMove(state, 0, next);
    if (probe.ok) return doMove(next);
    if (probe.needsZone || probe.needsRoot || probe.needsSubstitution || probe.needsFractionPart) return setPending(next);
    setToast(probe.reason);
    setPending(next);
  };

  const onZone = (z: Zone) => {
    if (!pending) return;
    const next: Pending = { ...pending, zone: z };
    const probe = checkMove(state, 0, next);
    if (probe.ok) return doMove(next);
    if (probe.needsRoot) return setPending(next);
    setToast(probe.reason);
    setPending(next);
  };

  const onRoot = (r: number) => {
    if (!pending) return;
    doMove({ ...pending, root: r });
  };

  const onEndTurn = () => {
    if (!myTurn) return;
    setPending(null);
    setState((s) => (s.turn === 0 && s.phase !== "gameover" ? endTurn(s) : s));
  };

  const logEntries = [...state.log].reverse();
  const myCrit = isCritical(me.hp);
  const foeCrit = isCritical(foe.hp);

  return (
    <div className="relative flex min-h-screen flex-col">
      <Ambient intensity={0.55} />

      {/* ---------- шапка ---------- */}
      <header className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-black/35 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-black tracking-tighter text-white">
            НО<span className="text-neon-magenta">Л</span>Ь
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/35">{cfg.title.toUpperCase()}</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10.5px] text-white/45">
          <span className="rounded border border-white/10 px-2 py-0.5">РАУНД {state.round}</span>
          <span className="rounded border border-white/10 px-2 py-0.5">КОЛОДА {me.deck.length}</span>
          {state.phase === "finalSeries" && (
            <span className="rounded border border-neon-red/60 bg-neon-red/15 px-2 py-0.5 font-bold text-neon-red">ФІНАЛЬНА СЕРІЯ</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {pz && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={puzzleIndex === 0}
                onClick={() => onOpenPuzzle?.(puzzleIndex - 1)}
                className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-white/60 transition hover:border-neon-violet/60 hover:text-neon-violet disabled:opacity-30"
              >
                ←
              </button>
              <span className="px-1 font-mono text-[10px] text-white/40">
                {puzzleIndex + 1}/{PUZZLES.length}
              </span>
              <button
                type="button"
                disabled={puzzleIndex >= PUZZLES.length - 1}
                onClick={() => onOpenPuzzle?.(puzzleIndex + 1)}
                className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-white/60 transition hover:border-neon-violet/60 hover:text-neon-violet disabled:opacity-30"
              >
                →
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setRules(true)}
            className="rounded border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 transition hover:border-neon-amber/60 hover:text-neon-amber"
          >
            ПРАВИЛА
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 transition hover:border-neon-lime/60 hover:text-neon-lime"
          >
            ↻ ЗАНОВО
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 transition hover:border-neon-red/60 hover:text-neon-red"
          >
            МЕНЮ
          </button>
        </div>
      </header>

      {/* ---------- основна сітка ---------- */}
      <main className="relative z-10 mx-auto grid w-full max-w-[1500px] flex-1 gap-3 px-3 py-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          {pz && <PuzzleBanner pz={pz} />}

          {/* супротивник */}
          <section className={cn(shake?.side === 1 && "shake")} key={`foe-${runId}`}>
            <div className="mb-1.5 flex flex-wrap items-center gap-2 px-1">
              <span className="font-mono text-[10px] tracking-[0.28em] text-neon-magenta/70">СУПРОТИВНИК · ШІ</span>
              <StatChips p={foe} accent="magenta" />
              <div className="ml-auto hidden -space-x-2 sm:flex">
                {foe.hand.slice(0, 8).map((c, i) => (
                  <CardBack key={c.uid} i={i} />
                ))}
                {foe.hand.length > 8 && <span className="pl-3 font-mono text-[10px] text-white/40">+{foe.hand.length - 8}</span>}
              </div>
            </div>
            <HpPanel player={foe} startHp={cfg.startHp} side={1} active={state.turn === 1 && !over} showGraph={false} />
          </section>

          {/* арена — координатна площина бою */}
          <section className="panel relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(60,231,255,.08),transparent_65%)]" />
            <div className="relative flex items-center gap-3 border-b border-white/8 px-4 py-2">
              <Sigil side={0} size="sm" active={state.turn === 0 && !over} critical={myCrit.critical} />
              <div className="flex flex-1 flex-col items-center text-center">
                {flash ? <FlashTile flash={flash} /> : <TurnBanner state={state} myTurn={myTurn} inFinalByMe={inFinalByMe} />}
              </div>
              <Sigil side={1} size="sm" active={state.turn === 1 && !over} critical={foeCrit.critical} />
            </div>
            <Arena state={state} />
          </section>

          {/* гравець */}
          <section className={cn(shake?.side === 0 && "shake")} key={`me-${runId}`}>
            <div className="mb-1.5 flex flex-wrap items-center gap-2 px-1">
              <span className="font-mono text-[10px] tracking-[0.28em] text-neon-cyan/70">ВИ</span>
              <StatChips p={me} accent="cyan" />
              <div className="ml-auto flex items-center gap-2">
                <OoPips value={me.oo} cap={state.ooCap} />
                <button
                  type="button"
                  onClick={onEndTurn}
                  disabled={!myTurn}
                  className={cn(
                    "rounded-lg px-4 py-2 font-display text-[11px] font-black uppercase tracking-[0.16em] transition-all duration-200",
                    myTurn
                      ? inFinalByMe
                        ? "bg-neon-red text-ink-900 hover:scale-105"
                        : "bg-white/10 text-white hover:scale-105 hover:bg-neon-cyan hover:text-ink-900"
                      : "cursor-not-allowed bg-white/5 text-white/25",
                  )}
                >
                  {inFinalByMe ? "Завершити серію" : "Завершити хід"}
                </button>
              </div>
            </div>
            {myCrit.critical && myTurn && (
              <div className="danger-flash pop-in mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-neon-red/60 bg-neon-red/12 px-3 py-2">
                <span className="font-display text-[11px] font-black uppercase tracking-[0.16em] text-neon-red">⚠ критичний стан</span>
                <span className="font-mono text-[11px] text-white/70">
                  {myCrit.reason}. Виправте до кінця свого ходу — інакше поразка.
                </span>
                <span className="ml-auto font-mono text-[10px] text-neon-amber/80">
                  {me.hp.kind === "number" ? me.hp.divisionByZero ? "колапс після ÷0: зіграйте Відкат ↶ або Обмін ⇄" : "легальні лише 0!, x⁰ та ⇄" : "зсуньте корінь, виріжте нуль або розв'яжіть рівняння"}
                </span>
              </div>
            )}
            <HpPanel player={me} startHp={cfg.startHp} side={0} active={myTurn} showGraph={false} />
          </section>

          {/* док вибору */}
          {pending && myTurn && (
            <ActionDock
              state={state}
              pending={pending}
              onTarget={onTarget}
              onZone={onZone}
              onRoot={onRoot}
              onSubstitution={(substitution) => pending && doMove({ ...pending, substitution })}
              onFractionPart={(fractionPart) => pending && doMove({ ...pending, fractionPart })}
              onCancel={() => setPending(null)}
            />
          )}

          {/* рука */}
          <section className="panel relative rounded-xl px-3 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="font-mono text-[10px] tracking-[0.28em] text-white/35">РУКА · {me.hand.length}</span>
              {me.cardsPlayed === 0 && myTurn && !pz && (
                <span className="font-mono text-[10px] text-neon-cyan/60">клікніть карту → оберіть ціль → за потреби частину рівняння чи корінь</span>
              )}
              <span className="font-mono text-[10px] text-white/30">
                ДІЙ ЗАЛИШИЛОСЬ: {inFinalByMe ? "∞" : `${Math.max(0, state.maxCards - state.cardsThisTurn)}/${state.maxCards}`}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-3 px-1 pb-1 pt-4">
              {me.hand.length === 0 && <div className="py-10 font-mono text-xs text-white/30">Рука порожня</div>}
              {me.hand.map((c, i) => {
                const def = CARDS[c.id];
                const n = me.hand.length;
                const off = i - (n - 1) / 2;
                const st = cardStatus(c.uid);
                return (
                  <div
                    key={c.uid}
                    className="shrink-0 transition-transform duration-300"
                    style={{ transform: `rotate(${off * 1.1}deg) translateY(${Math.abs(off) * 2.5}px)` }}
                  >
                    <CardView
                      def={def}
                      playable={st.playable}
                      reason={st.reason}
                      affordable={me.oo >= def.cost}
                      selected={pending?.cardUid === c.uid}
                      onClick={() => onCardClick(c.uid)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* журнал */}
        <aside className="panel hidden min-h-0 rounded-xl xl:flex xl:flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="font-mono text-[10px] tracking-[0.28em] text-white/40">ЖУРНАЛ БИТВИ</span>
            <span className="font-mono text-[10px] text-white/25">{state.log.length}</span>
          </div>
          <div ref={logRef} className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 py-2" style={{ maxHeight: "62vh" }}>
            {logEntries.map((e) => (
              <div
                key={e.id}
                className={cn(
                  "rise-in border-l-2 pl-2 font-mono text-[11px] leading-snug",
                  e.tone === "danger" && "border-neon-red text-neon-red/90",
                  e.tone === "bad" && "border-neon-magenta text-white/60",
                  e.tone === "good" && "border-neon-lime text-neon-lime/85",
                  e.tone === "epic" && "border-neon-amber text-neon-amber font-bold",
                  e.tone === "info" && "border-white/15 text-white/50",
                )}
              >
                {e.text}
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* мобільний журнал */}
      <MobileLog entries={logEntries} />

      {/* тост */}
      {toast && (
        <div className="pop-in pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-neon-red/50 bg-[#160a10]/95 px-4 py-2.5 font-mono text-[12px] text-neon-red shadow-2xl">
          ✕ {toast}
        </div>
      )}

      {rules && <Rules onClose={() => setRules(false)} />}

      {over && <GameOver state={state} onRestart={reset} onExit={onExit} />}

      {pz && puzzleResult && (
        <PuzzleResult
          solved={puzzleResult === "solved"}
          pz={pz}
          onRetry={reset}
          onNext={() => {
            setPuzzleResult(null);
            onOpenPuzzle?.(Math.min(PUZZLES.length - 1, puzzleIndex + 1));
          }}
          onExit={onExit}
          isLast={puzzleIndex >= PUZZLES.length - 1}
        />
      )}
    </div>
  );

  function cardStatus(uid: string): { playable: boolean; reason: string } {
    if (!myTurn || over) return { playable: false, reason: "Зараз не ваш хід" };
    if (legalUids.has(uid)) return { playable: true, reason: "" };
    return { playable: false, reason: checkMove(state, 0, { cardUid: uid }).reason };
  }
}

/* ---------- дрібні блоки ---------- */

function TurnBanner({ state, myTurn, inFinalByMe }: { state: GameState; myTurn: boolean; inFinalByMe: boolean }) {
  if (state.phase === "finalSeries") {
    return (
      <div>
        <div className="font-display text-sm font-black uppercase tracking-[0.2em] text-neon-red">
          {inFinalByMe ? "ВАША ФІНАЛЬНА СЕРІЯ" : "ФІНАЛЬНА СЕРІЯ СУПРОТИВНИКА"}
        </div>
        <div className="font-mono text-[10.5px] text-white/45">Грайте всі карти — якщо не доб'єте, поразка</div>
      </div>
    );
  }
  return (
    <div>
      <div className={cn("font-display text-sm font-black uppercase tracking-[0.2em]", myTurn ? "text-neon-cyan" : "text-neon-magenta")}>
        {myTurn ? "ВАШ ХІД" : "ХІД СУПРОТИВНИКА"}
        {!myTurn && (
          <span className="ml-1 inline-flex gap-0.5">
            <Dot d="0ms" />
            <Dot d="160ms" />
            <Dot d="320ms" />
          </span>
        )}
      </div>
      <div className="font-mono text-[10.5px] text-white/40">
        {myTurn ? "оберіть карту з руки" : "супротивник рахує варіанти…"}
      </div>
    </div>
  );
}

function Dot({ d }: { d: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neon-magenta align-middle"
      style={{ animationDelay: d, animationDuration: "1s" }}
    />
  );
}

function FlashTile({ flash }: { flash: Flash }) {
  return (
    <div key={flash.key} className="pop-in flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg border-2 bg-black/60 font-mono text-lg font-extrabold",
          flash.side === 0 ? "border-neon-cyan text-neon-cyan" : "border-neon-magenta text-neon-magenta",
        )}
        style={{ boxShadow: `0 0 34px -8px ${flash.side === 0 ? "#3ce7ff" : "#ff3d8b"}` }}
      >
        {flash.def.symbol}
      </div>
      <div className="text-left">
        <div className="font-display text-[11px] font-black uppercase tracking-[0.16em] text-white">{flash.def.name}</div>
        <div className="font-mono text-[9.5px] tracking-wider text-white/40">
          {flash.side === 0 ? "ВАШ РОЗІГРАШ" : "РОЗІГРАШ СУПРОТИВНИКА"} · {flash.def.cost} ОО
        </div>
      </div>
    </div>
  );
}

/** Центральна площина: графіки обох бійців або числове протистояння */
function Arena({ state }: { state: GameState }) {
  const hasPlane = state.players.some((p) => p.hp.kind !== "number");

  if (!hasPlane) {
    const [a, b] = state.players;
    return (
      <div className="relative flex items-center justify-center gap-4 px-5 py-5 sm:gap-10">
        <ArenaNumber hp={a.hp} color="#3ce7ff" label={a.name} align="right" />
        <div className="relative flex flex-col items-center">
          <span className="h-8 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent" />
          <span className="my-1 rotate-45 border border-white/25 bg-black/50 p-1.5">
            <span className="block -rotate-45 font-display text-[10px] font-black tracking-widest text-white/70">VS</span>
          </span>
          <span className="h-8 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent" />
        </div>
        <ArenaNumber hp={b.hp} color="#ff3d8b" label={b.name} align="left" />
      </div>
    );
  }

  return (
    <div className="grid gap-2 p-2 md:grid-cols-2">
      {state.players.map((p) => (
        <div
          key={p.side}
          className={cn(
            "relative overflow-hidden rounded-lg border bg-black/30 p-1.5 transition-colors",
            isCritical(p.hp).critical ? "border-neon-red/50" : p.side === 0 ? "border-neon-cyan/20" : "border-neon-magenta/20",
          )}
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <span className={cn("font-mono text-[9.5px] tracking-[0.22em]", p.side === 0 ? "text-neon-cyan/70" : "text-neon-magenta/70")}>{p.name}</span>
            <span className="font-mono text-[9.5px] text-white/30">
              {p.hp.kind === "number" ? "ЧИСЛО" : p.hp.kind === "graph" ? "ГРАФІК f(x)" : "РІВНЯННЯ"}
            </span>
          </div>
          {p.hp.kind === "number" ? (
            <div className="flex h-[180px] items-center justify-center">
              <div className="text-center">
                <div className="font-display text-5xl font-black tabular-nums" style={{ color: p.side === 0 ? "#3ce7ff" : "#ff3d8b", textShadow: "0 0 30px currentColor" }}>
                  {p.hp.divisionByZero ? "∅" : <HpValue hp={p.hp} />}
                </div>
                <div className="mt-1 font-mono text-[9.5px] tracking-[0.3em] text-white/30">HP · {p.hp.divisionByZero ? "КОЛАПС ÷0" : "ЧИСЛО"}</div>
              </div>
            </div>
          ) : (
            <GraphPlot poly={p.hp.poly} mode={p.hp.kind} height={180} animateKey={`${p.side}-${JSON.stringify(p.hp.poly)}-${p.hp.kind}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ArenaNumber({ hp, color, label, align }: { hp: GameState["players"][0]["hp"]; color: string; label: string; align: "left" | "right" }) {
  const collapsed = hp.kind === "number" && hp.divisionByZero;
  const v = collapsed ? "∅" : hpLabel(hp);
  return (
    <div className={cn("text-center", align === "right" ? "text-right" : "text-left")}>
      <div className="font-mono text-[9.5px] tracking-[0.3em] text-white/30">{label}</div>
      <div
        key={v}
        className="pop-in font-display text-6xl font-black leading-none tabular-nums sm:text-7xl"
        style={{ color, textShadow: `0 0 36px ${color}` }}
      >
        {hp.kind === "number" && !collapsed ? <HpValue hp={hp} /> : v}
      </div>
      <div className="font-mono text-[9.5px] tracking-[0.3em] text-white/25">{collapsed ? "КОЛАПС ÷0" : "HP"}</div>
    </div>
  );
}

function Sigil({ side, active, critical, size = "md" }: { side: Side; active: boolean; critical: boolean; size?: "sm" | "md" }) {
  const color = critical ? "#ff4d4d" : side === 0 ? "#3ce7ff" : "#ff3d8b";
  return (
    <div className={cn("relative shrink-0", size === "sm" ? "h-10 w-10" : "h-16 w-16")}>
      <svg viewBox="0 0 64 64" className={cn("h-full w-full", active && "spin-slow")}>
        <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeOpacity={active ? 0.85 : 0.25} strokeWidth="1.5" strokeDasharray={side === 0 ? "4 6" : "18 8"} />
        <circle cx="32" cy="32" r="20" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
        {side === 0 ? (
          <path d="M22 40 L32 22 L42 40 M26 34 H38" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M22 22 L42 42 M42 22 L22 42" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        )}
      </svg>
      {active && <div className="absolute inset-0 rounded-full pulse-ring" style={{ boxShadow: `0 0 0 2px ${color}` }} />}
    </div>
  );
}

function StatChips({ p, accent }: { p: GameState["players"][0]; accent: "cyan" | "magenta" }) {
  const c = accent === "cyan" ? "text-neon-cyan/70 border-neon-cyan/20" : "text-neon-magenta/70 border-neon-magenta/20";
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9.5px]", c)}>КОЛОДА {p.deck.length}</span>
      <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9.5px]", c)}>РУКА {p.hand.length}</span>
      <span className={cn("rounded border border-neon-amber/25 px-1.5 py-0.5 font-mono text-[9.5px] text-neon-amber/80")}>
        ОО {p.oo >= 90 ? "∞" : p.oo}
      </span>
      <span className={cn("hidden rounded border px-1.5 py-0.5 font-mono text-[9.5px] sm:block", c)}>ЗИГРАНО {p.cardsPlayed}</span>
    </div>
  );
}

function OoPips({ value, cap }: { value: number; cap: number }) {
  if (value >= 90) {
    return <span className="rounded border border-neon-amber/50 bg-neon-amber/15 px-2 py-1 font-mono text-[10px] font-bold text-neon-amber">ОО ∞</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[9.5px] tracking-widest text-white/35">ОО</span>
      {Array.from({ length: Math.min(cap, 8) }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full border transition-all duration-300",
            i < value ? "border-neon-amber bg-neon-amber shadow-[0_0_10px_#ffc65c]" : "border-white/20 bg-transparent",
          )}
        />
      ))}
      <span className="ml-0.5 font-mono text-[10px] font-bold text-neon-amber">{value}</span>
    </div>
  );
}

function PuzzleBanner({ pz }: { pz: (typeof PUZZLES)[number] }) {
  return (
    <div className="panel rise-in relative overflow-hidden rounded-xl border-neon-violet/30 px-4 py-3">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-neon-violet shadow-[0_0_20px_#a98bff]" />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] tracking-[0.3em] text-neon-violet">ЗАДАЧА {pz.index}</span>
        <span className="font-display text-sm font-black uppercase tracking-wide text-white">{pz.title}</span>
        <span className="font-mono text-[10.5px] text-white/45">{pz.brief}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className="rounded border border-neon-lime/40 bg-neon-lime/10 px-2 py-0.5 font-mono text-[10.5px] text-neon-lime">МЕТА: {pz.goal}</span>
        <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/40">ходів: {pz.moves}</span>
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-white/35">ПІДКАЗКА: {pz.hint}</div>
    </div>
  );
}

function GameOver({ state, onRestart, onExit }: { state: GameState; onRestart: () => void; onExit: () => void }) {
  const won = state.winner === 0;
  const me = state.players[0];
  const foe = state.players[1];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="panel pop-in w-full max-w-lg overflow-hidden rounded-2xl">
        <div className={cn("relative px-6 py-6 text-center", won ? "bg-[radial-gradient(ellipse_at_top,rgba(60,231,255,.22),transparent_70%)]" : "bg-[radial-gradient(ellipse_at_top,rgba(255,77,77,.22),transparent_70%)]")}>
          <div className={cn("font-mono text-[10px] tracking-[0.4em]", won ? "text-neon-cyan" : "text-neon-red")}>
            {won ? "ПЕРЕМОГА" : "ПОРАЗКА"}
          </div>
          <div className={cn("mt-1 font-display text-6xl font-black leading-none", won ? "text-neon-cyan neon-text" : "text-neon-red")} style={{ textShadow: won ? "0 0 40px #3ce7ff" : "0 0 40px #ff4d4d" }}>
            0
          </div>
          <div className="mt-2 font-display text-base font-extrabold uppercase tracking-[0.14em] text-white">
            {won ? "СУПРОТИВНИКА ОБНУЛЕНО" : "ВАС ОБНУЛЕНО"}
          </div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.3em] text-white/30">
            ПЕРЕМОЖЕЦЬ: {state.players[state.winner ?? 0].name} · РАУНД {state.round}
          </div>
          <div className="mt-1 font-mono text-[11.5px] text-white/55">{state.winReason}</div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          <Stat label="Раундів" value={String(state.round)} />
          <Stat label="Ваших карт" value={String(me.cardsPlayed)} />
          <Stat label="Карт ШІ" value={String(foe.cardsPlayed)} />
          <Stat label="Ваш HP" value={hpLabel(me.hp)} />
        </div>
        <div className="flex gap-2 p-4">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 rounded-lg bg-neon-cyan px-4 py-3 font-display text-xs font-black uppercase tracking-[0.16em] text-ink-900 transition hover:scale-[1.02] hover:bg-white"
          >
            Реванш
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex-1 rounded-lg border border-white/20 px-4 py-3 font-display text-xs font-black uppercase tracking-[0.16em] text-white/75 transition hover:border-white/50 hover:text-white"
          >
            У меню
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#080d18] px-3 py-2.5 text-center">
      <div className="font-mono text-[9px] tracking-[0.2em] text-white/35">{label.toUpperCase()}</div>
      <div className="mt-0.5 truncate font-display text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function PuzzleResult({
  solved, pz, onRetry, onNext, onExit, isLast,
}: {
  solved: boolean; pz: (typeof PUZZLES)[number]; onRetry: () => void; onNext: () => void; onExit: () => void; isLast: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="panel pop-in w-full max-w-md rounded-2xl p-6 text-center">
        <div className={cn("font-mono text-[10px] tracking-[0.4em]", solved ? "text-neon-lime" : "text-neon-red")}>
          ЗАДАЧА {pz.index} · {solved ? "РОЗВ'ЯЗАНО" : "НЕ ВИЙШЛО"}
        </div>
        <div className={cn("mt-2 font-display text-3xl font-black uppercase tracking-tight", solved ? "text-neon-lime" : "text-neon-red")} style={{ textShadow: solved ? "0 0 30px #8dff5a" : "0 0 30px #ff4d4d" }}>
          {solved ? "Q.E.D." : "СПРОБУЙТЕ ЩЕ"}
        </div>
        <p className="mt-2 font-body text-[13px] text-white/60">
          {solved ? pz.goal + " — виконано." : "Ходи вичерпано, мету не досягнуто. " + pz.hint}
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onRetry} className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-wider text-white/75 transition hover:border-neon-amber/60 hover:text-neon-amber">
            ↻ Повторити
          </button>
          {solved && !isLast && (
            <button type="button" onClick={onNext} className="flex-1 rounded-lg bg-neon-lime px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-wider text-ink-900 transition hover:scale-[1.02] hover:bg-white">
              Далі →
            </button>
          )}
          <button type="button" onClick={onExit} className="rounded-lg border border-white/15 px-3 py-2.5 font-mono text-[11px] text-white/50 transition hover:text-white">
            Меню
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileLog({ entries }: { entries: GameState["log"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-3 right-3 z-30 rounded-full border border-neon-cyan/40 bg-ink-800/95 px-4 py-2.5 font-mono text-[11px] tracking-wider text-neon-cyan shadow-xl backdrop-blur"
      >
        {open ? "СХОВАТИ ЖУРНАЛ" : `ЖУРНАЛ · ${entries.length}`}
      </button>
      {open && (
        <div className="panel fixed inset-x-2 bottom-16 z-30 max-h-[40vh] overflow-y-auto rounded-xl p-3 scroll-thin">
          <div className="space-y-1">
            {entries.slice(0, 40).map((e) => (
              <div
                key={e.id}
                className={cn(
                  "border-l-2 pl-2 font-mono text-[11px] leading-snug",
                  e.tone === "danger" && "border-neon-red text-neon-red/90",
                  e.tone === "bad" && "border-neon-magenta text-white/60",
                  e.tone === "good" && "border-neon-lime text-neon-lime/85",
                  e.tone === "epic" && "border-neon-amber text-neon-amber",
                  e.tone === "info" && "border-white/15 text-white/50",
                )}
              >
                {e.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
