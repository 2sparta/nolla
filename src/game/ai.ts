import { isCritical, hpStrength, legalMoves, playMove, checkMove, endTurn } from "./engine";
import { card } from "./cards";
import type { GameState, Move, Side } from "./types";

const AI: Side = 1;

export function evaluate(state: GameState): number {
  if (state.phase === "gameover") return state.winner === AI ? 100000 : -100000;
  const me = state.players[AI];
  const foe = state.players[0];
  let s = 0;
  s += hpStrength(me.hp) * 1.0;
  s -= hpStrength(foe.hp) * 1.3;
  if (isCritical(foe.hp).critical) s += 150;
  if (isCritical(me.hp).critical) s -= 190;
  if (me.hp.kind === "number") s += 8;
  if (foe.hp.kind !== "number") s += 12;
  if (foe.hp.kind === "graph") s += 6;
  s += me.hand.length * 2 - foe.hand.length * 2;
  s += me.oo * 1.1;
  s += me.deck.length * 0.4 - foe.deck.length * 0.4;
  return s;
}

export interface AiPlan {
  move: Move;
  score: number;
  thought: string;
}

export function aiDecide(state: GameState, opts: { greedy?: boolean } = {}): AiPlan | null {
  const moves = legalMoves(state, AI);
  if (!moves.length) return null;
  const baseline = evaluate(state);
  const me = state.players[AI];
  const foe = state.players[0];
  const iAmCritical = isCritical(me.hp).critical;

  let best: AiPlan | null = null;
  for (const m of moves) {
    if (!checkMove(state, AI, m).ok) continue;
    const sim = playMove(state, AI, m);
    let score = evaluate(sim);
    const id = simHandId(state, m);
    const def = id ? card(id) : null;
    if (!def) continue;

    // не витрачати дорогі карти дарма
    score -= def.cost * 3;
    // якщо ми в критичному стані — рятуватися понад усе
    if (iAmCritical) {
      score += isCritical(sim.players[AI].hp).critical ? -400 : 260;
    }
    // добивати
    if (sim.phase === "gameover" && sim.winner === AI) score += 5000;
    if (sim.phase === "gameover" && sim.winner === 0) score -= 8000;
    // не допомагати супротивнику в критичному стані
    if (isCritical(foe.hp).critical && m.target === 0) {
      if (hpStrength(sim.players[0].hp) > hpStrength(foe.hp)) score -= 320;
    }
    score += Math.random() * 6;

    if (!best || score > best.score) {
      best = { move: m, score, thought: describe(def.id, m.target === AI ? "себе" : "супротивника") };
    }
  }
  if (!best) return null;
  if (!opts.greedy && best.score < baseline - 6 && !iAmCritical) return null;
  return best;
}

function simHandId(state: GameState, m: Move) {
  const c = state.players[AI].hand.find((k) => k.uid === m.cardUid);
  return c?.id ?? null;
}

function describe(id: string, who: string): string {
  const t: Record<string, string> = {
    div0: `Розриває тканину математики — ділення на нуль на ${who}`,
    times0: `Анігіляція: обнулює ${who}`,
    xcard: `Перетворює HP ${who} на рівняння`,
    ycard: `Викидає ${who} у площину графіка`,
    horner: `Знижує степінь рівняння за схемою Горнера`,
    mirror: `Дзеркалить ${who}`,
    swap: `Міняється HP із супротивником`,
    zeroFact: `0! — рятується з Обнулення`,
    pow0: `x⁰ — згортає все в одиницю`,
    cancel: `Скасовує рівняння, забираючи корінь`,
    abs: `Бере модуль HP ${who}`,
    minus3: `Б'є по HP супротивника`,
    minus1: `Б'є по HP супротивника`,
    plus1: `Піднімає власне HP`,
    plus3: `Піднімає власне HP`,
  };
  return t[id] ?? `Розігрує карту на ${who}`;
}

/** Чи має ШІ завершити серію ходів */
export function aiShouldEndTurn(state: GameState): boolean {
  if (state.phase === "finalSeries" && state.finalSeriesBy === AI) {
    return !aiDecide(state, { greedy: true });
  }
  return !aiDecide(state);
}

export function aiEndTurn(state: GameState): GameState {
  return endTurn(state);
}
