import {
  substituteVariable,
  SUBSTITUTION_SHIFTS,
  substitutionLabel,
  degree,
  evalPoly,
  fmtNum,
  hasZeroRoot,
  hornerDivide,
  isContradiction,
  isIdentity,
  mulPoly,
  negateVariable,
  polyToString,
  realRoots,
  scalePoly,
  addConst,
  type Poly,
} from "./math";
import { CARDS, buildDeck, card, helperAvailability, rootOptions } from "./cards";
import { applyNumeric, hpFromRoot, isFractionHp, isIntegerHp, isZeroHp, numericLabel, numericMultiplier, numericPoly } from "./numeric";
import type { CardId, CardInstance, GameState, HpState, LogTone, Mode, Move, PlayerState, Side, Zone } from "./types";

let uidCounter = 0;
const uid = () => `c${++uidCounter}`;
let logCounter = 0;

export interface ModeConfig {
  id: Mode;
  title: string;
  tag: string;
  desc: string;
  startHp: number;
  maxCards: number;
  ooPerTurn: number;
  ooCap: number;
  handSize: number;
  hpKind: "number" | "equation" | "graph";
  extraY?: number;
  accent: string;
}

export const MODES: Record<Mode, ModeConfig> = {
  classic: {
    id: "classic", title: "Класика", tag: "20 HP · 1 дія", accent: "#3ce7ff",
    desc: "Повна партія за правилами: 20 HP, одна дія на хід, очки операцій накопичуються.",
    startHp: 20, maxCards: 1, ooPerTurn: 2, ooCap: 6, handSize: 6, hpKind: "number",
  },
  speed: {
    id: "speed", title: "Спід-режим", tag: "12 HP · 2 дії", accent: "#ff3d8b",
    desc: "Коротка люта партія: 12 HP, дві карти за хід, більше очок операцій.",
    startHp: 12, maxCards: 2, ooPerTurn: 3, ooCap: 8, handSize: 5, hpKind: "number",
  },
  equations: {
    id: "equations", title: "Режим рівнянь", tag: "усі починають з x", accent: "#ffc65c",
    desc: "HP обох гравців — уже рівняння. Бийтеся коренями, зсувами та степенями.",
    startHp: 14, maxCards: 1, ooPerTurn: 2, ooCap: 6, handSize: 6, hpKind: "equation",
  },
  graphs: {
    id: "graphs", title: "Режим графіків", tag: "обов'язкова карта y", accent: "#8dff5a",
    desc: "Битва у площині: HP — графік функції. Немає перетину з віссю X — поразка.",
    startHp: 11, maxCards: 1, ooPerTurn: 3, ooCap: 7, handSize: 6, hpKind: "graph", extraY: 2,
  },
  puzzle: {
    id: "puzzle", title: "Головоломка", tag: "точні розв'язки", accent: "#a98bff",
    desc: "Задані позиції з однією правильною лінією. Мета — виконати умову задачі.",
    startHp: 20, maxCards: 3, ooPerTurn: 99, ooCap: 99, handSize: 6, hpKind: "number",
  },
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeDeck(extraY = 0): CardInstance[] {
  const ids = buildDeck();
  for (let i = 0; i < extraY; i++) ids.push("ycard");
  return shuffle(ids).map((id) => ({ uid: uid(), id }));
}

function initialHp(cfg: ModeConfig): HpState {
  if (cfg.hpKind === "equation") return { kind: "equation", poly: [-cfg.startHp, 1] };
  if (cfg.hpKind === "graph") return { kind: "graph", poly: [-cfg.startHp, 1] };
  return { kind: "number", value: cfg.startHp };
}

function makePlayer(side: Side, name: string, cfg: ModeConfig): PlayerState {
  const deck = makeDeck(cfg.extraY);
  const hand = deck.splice(0, cfg.handSize);
  return {
    side, name, hp: initialHp(cfg), deck, hand,
    oo: side === 0 ? cfg.ooPerTurn : cfg.ooPerTurn,
    criticalAtTurnStart: false, discarded: 0, cardsPlayed: 0, damageDealt: 0,
  };
}

export function createGame(mode: Mode, names = ["ВИ", "СУПРОТИВНИК"]): GameState {
  const cfg = MODES[mode];
  const state: GameState = {
    mode, phase: "playing", turn: 0, round: 1,
    players: [makePlayer(0, names[0], cfg), makePlayer(1, names[1], cfg)],
    log: [], winner: null, winReason: "",
    cardsThisTurn: 0, maxCards: cfg.maxCards, ooPerTurn: cfg.ooPerTurn, ooCap: cfg.ooCap,
    startHp: cfg.startHp, finalSeriesBy: null,
    lastEvent: undefined,
  };
  push(state, `Режим «${cfg.title}». Стартове HP: ${cfg.startHp}.`, "info");
  push(state, "Хід 1. Доберіть карту та зіграйте одну дію.", "info");
  state.players[0].criticalAtTurnStart = isCritical(state.players[0].hp).critical;
  return state;
}

export function push(state: GameState, text: string, tone: LogTone = "info") {
  state.log = [...state.log, { id: ++logCounter, text, tone }].slice(-140);
}

export const clone = <T,>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

/* ---------------- HP та критичні стани ---------------- */

export function realRootsOf(hp: HpState): number[] {
  return hp.kind === "number" ? [] : realRoots(hp.poly);
}

export interface CriticalInfo {
  critical: boolean;
  reason: string;
  kind: "zero" | "root-zero" | "no-roots" | "division-zero" | null;
}

export function isCritical(hp: HpState): CriticalInfo {
  if (hp.kind === "number") {
    if (hp.divisionByZero) return { critical: true, reason: "Колапс після ÷0: потрібен Відкат або Обмін", kind: "division-zero" };
    return isZeroHp(hp)
      ? { critical: true, reason: "Обнулення: HP = 0", kind: "zero" }
      : { critical: false, reason: "", kind: null };
  }
  const roots = realRoots(hp.poly);
  if (isContradiction(hp.poly)) {
    return { critical: true, reason: "Рівняння не має розв'язків", kind: "no-roots" };
  }
  if (roots.length === 0) {
    return {
      critical: true,
      reason: hp.kind === "graph" ? "Графік не перетинає вісь X" : "Немає дійсних коренів",
      kind: "no-roots",
    };
  }
  if (hasZeroRoot(hp.poly)) {
    return { critical: true, reason: "Корінь x = 0", kind: "root-zero" };
  }
  return { critical: false, reason: "", kind: null };
}

/** «Сила» HP для оцінки ШІ */
export function hpStrength(hp: HpState): number {
  if (hp.kind === "number") return isCritical(hp).critical ? -60 : Math.abs(hp.value);
  if (isCritical(hp).critical) return -60;
  const roots = realRoots(hp.poly);
  const best = roots.length ? Math.max(...roots.map((r) => Math.abs(r))) : 0;
  return best * (hp.kind === "graph" ? 0.92 : 0.95) - 1;
}

export function hpLabel(hp: HpState): string {
  if (hp.kind === "number") return hp.divisionByZero ? "не визначено (÷0)" : numericLabel(hp);
  return polyToString(hp.poly);
}

/* ---------------- легальність ---------------- */

export const RESCUE_IDS: CardId[] = ["pow0", "zeroFact", "swap"];
export const DIVISION_RESCUE_IDS: CardId[] = ["restore", "swap"];

export interface Legality {
  ok: boolean;
  reason: string;
  needsZone: boolean;
  needsRoot: boolean;
  needsSubstitution?: boolean;
  needsFractionPart?: boolean;
  needsTarget: boolean;
  zones: Zone[];
}

export function checkMove(state: GameState, actor: Side, move: Move): Legality {
  const fail = (reason: string, extra: Partial<Legality> = {}): Legality => ({
    ok: false, reason, needsZone: false, needsRoot: false, needsTarget: false, zones: [], ...extra,
  });
  const p = state.players[actor];
  const inst = p.hand.find((c) => c.uid === move.cardUid);
  if (!inst) return fail("Карти немає в руці");
  const def = card(inst.id);

  const inFinal = state.phase === "finalSeries" && state.finalSeriesBy === actor;
  if (state.phase === "gameover") return fail("Партію завершено");
  if (state.turn !== actor && !inFinal) return fail("Зараз не ваш хід");
  if (!inFinal && state.cardsThisTurn >= state.maxCards) return fail(`Ліміт дій на хід: ${state.maxCards}`);
  if (!inFinal && p.oo < def.cost) return fail(`Потрібно ${def.cost} ОО, у вас ${p.oo}`);

  const crit = isCritical(p.hp);
  if (crit.critical && p.hp.kind === "number") {
    if (p.hp.divisionByZero && !DIVISION_RESCUE_IDS.includes(def.id)) {
      return fail("Колапс після ÷0: доступні лише Відкат або Обмін");
    }
    if (!p.hp.divisionByZero && !RESCUE_IDS.includes(def.id)) {
      return fail("Стан «Обнулення»: доступні лише 0!, x⁰ або ⇄");
    }
  }

  // карта-обмін діє на обох — ціль не потрібна
  if (def.id === "swap") {
    return { ok: true, reason: "", needsZone: false, needsRoot: false, needsTarget: false, zones: [] };
  }

  // рятівні карти — лише на себе; допоміжні можна скерувати й на рівняння супротивника
  const target: Side = def.category === "rescue" ? actor : move.target ?? (-1 as Side);
  if (target === (-1 as Side)) {
    return fail("Оберіть ціль", { needsTarget: true, needsZone: def.zones, needsRoot: def.needsRoot });
  }
  const t = state.players[target];
  const th = t.hp;

  if (th.kind === "number") {
    if (th.divisionByZero && def.id !== "restore") return fail("HP не визначено після ÷0; потрібен Відкат або Обмін", { needsTarget: true });
    if (def.id === "restore" && !th.divisionByZero) return fail("Відкат доступний лише після ділення на нуль");
    if (!def.onNumber) {
      return fail(def.category === "helper" ? "Потрібне рівняння або графік" : "Не діє на числове HP", {
        needsTarget: true,
      });
    }
    if (def.id === "fact" && (!isIntegerHp(th) || th.value > 6 || th.value < 0)) return fail("Факторіал дозволено лише для цілих HP від 0 до 6", { needsTarget: true });
    if (def.id === "mirror" && !isIntegerHp(th)) return fail("Дзеркало цифр доступне лише для цілого HP", { needsTarget: true });
    if (def.id === "sqrt" && th.value < 0) return fail("Квадратний корінь від’ємного HP не є дійсним. Спочатку застосуйте |x|.", { needsTarget: true });
    if (numericMultiplier(def.id) !== null && isFractionHp(th)) {
      if (move.fractionPart === undefined) return fail("Оберіть чисельник або знаменник", { needsFractionPart: true });
      if (move.fractionPart !== "numerator" && move.fractionPart !== "denominator") return fail("Недопустима частина дробу");
    } else if (move.fractionPart !== undefined) return fail("Вибір частини доступний лише для множення дробу");
    return { ok: true, reason: "", needsZone: false, needsRoot: false, needsTarget: true, zones: [] };
  }

  // рівняння або графік
  if (!def.onEquation) return fail("Не діє на рівняння чи графік", { needsTarget: true });

  if (def.id === "substitute") {
    if (th.kind !== "equation") return fail("Заміна змінної доступна лише для рівнянь", { needsTarget: true });
    if (move.substitution === undefined) return fail("Оберіть підстановку", { needsSubstitution: true });
    if (!SUBSTITUTION_SHIFTS.some((shift) => shift === move.substitution)) return fail("Доступні підстановки x ± 1 або x ± 3");
  }

  if (def.category === "helper") {
    const av = helperAvailability(def.id, th.poly);
    if (!av.ok) return fail(av.reason, { needsTarget: true });
    if (def.needsRoot) {
      const opts = rootOptions(def.id, th.poly);
      if (!opts.length) return fail("Немає доступних коренів", { needsTarget: true });
      if (move.root === undefined) return fail("Оберіть корінь", { needsRoot: true, needsTarget: false });
      if (!opts.some((o) => Math.abs(o.value.re - move.root!) < 1e-6)) {
        return fail("Цей корінь недоступний для цієї карти", { needsRoot: true, needsTarget: false });
      }
      return { ok: true, reason: "", needsZone: false, needsRoot: false, needsTarget: false, zones: [] };
    }
    return { ok: true, reason: "", needsZone: false, needsRoot: false, needsTarget: true, zones: [] };
  }

  if (def.id === "ycard" && th.kind === "graph") return fail("Ціль уже в режимі графіка", { needsTarget: true });
  if (def.id === "xcard" && degree(th.poly) >= 3) return fail("Рівняння 4-го степеня заборонено", { needsTarget: true });
  if (def.id === "square" && degree(th.poly) * 2 > 3) return fail("Степінь стане більшим за 3", { needsTarget: true });
  if (def.id === "sqrt" || def.id === "fact" || def.id === "mod3") {
    return fail("Ця операція не визначена для рівняння", { needsTarget: true });
  }

  const needsZone = def.zones;
  if (needsZone && !move.zone) return fail("Оберіть частину рівняння", { needsZone: true, needsTarget: false });
  return { ok: true, reason: "", needsZone: false, needsRoot: false, needsTarget: false, zones: needsZone ? ["left", "right", "both"] : [] };
}

/** Усі легальні ходи (для ШІ та підсвіток) */
export function legalMoves(state: GameState, actor: Side): Move[] {
  const p = state.players[actor];
  const moves: Move[] = [];
  for (const inst of p.hand) {
    const def = card(inst.id);
    if (state.phase !== "finalSeries" && p.oo < def.cost) continue;
    if (state.phase !== "finalSeries" && state.cardsThisTurn >= state.maxCards) continue;
    const sides: Side[] = def.id === "swap" ? [actor] : [0, 1];
    for (const target of sides) {
      const th = state.players[target].hp;
      const zones: (Zone | undefined)[] = th.kind !== "number" && def.zones ? ["left", "right", "both"] : [undefined];
      if (th.kind === "number" && !def.onNumber) continue;
      if (th.kind !== "number" && !def.onEquation) continue;
      if (numericMultiplier(def.id) !== null && th.kind === "number" && isFractionHp(th)) {
        for (const fractionPart of ["numerator", "denominator"] as const) {
          const move: Move = { cardUid: inst.uid, target, fractionPart };
          if (checkMove(state, actor, move).ok) moves.push(move);
        }
        continue;
      }
      if (def.id === "substitute") {
        for (const substitution of SUBSTITUTION_SHIFTS) {
          const move: Move = { cardUid: inst.uid, target, substitution };
          if (checkMove(state, actor, move).ok) moves.push(move);
        }
        continue;
      }
      if (th.kind !== "number" && def.category === "helper") {
        if (!helperAvailability(def.id, th.poly).ok) continue;
        if (def.needsRoot) {
          for (const opt of rootOptions(def.id, th.poly)) {
            const move = { cardUid: inst.uid, target, root: opt.value.re };
            if (checkMove(state, actor, move).ok) moves.push(move);
          }
          continue;
        }
      }
      for (const z of zones) {
        const m: Move = { cardUid: inst.uid, target, zone: z };
        if (checkMove(state, actor, m).ok) moves.push(m);
      }
    }
  }
  return moves;
}

/** Чи можна доповнити вибрані ціль/частину/корінь до легального ходу. */
export function canCompleteMove(state: GameState, actor: Side, partial: Move): boolean {
  return legalMoves(state, actor).some((move) =>
    move.cardUid === partial.cardUid &&
    (partial.target === undefined || move.target === partial.target) &&
    (partial.zone === undefined || move.zone === partial.zone) &&
    (partial.substitution === undefined || move.substitution === partial.substitution) &&
    (partial.fractionPart === undefined || move.fractionPart === partial.fractionPart) &&
    (partial.root === undefined || (move.root !== undefined && Math.abs(move.root - partial.root) < 1e-6))
  );
}

/* ---------------- застосування ---------------- */

function setWinner(state: GameState, winner: Side, reason: string) {
  state.phase = "gameover";
  state.winner = winner;
  state.winReason = reason;
  state.lastEvent = { side: winner, kind: "win", at: Date.now() };
  push(state, `ПЕРЕМОГА: ${state.players[winner].name}!`, "epic");
  push(state, reason, "epic");
}

function collapseToOne(state: GameState, side: Side, why: string) {
  state.players[side].hp = { kind: "number", value: 1 };
  push(state, `${why} — рівняння колапсує, HP = 1.`, "good");
  state.lastEvent = { side, kind: "heal", at: Date.now() };
}

function describePoly(p: Poly) {
  return polyToString(p);
}

export function playMove(state: GameState, actor: Side, move: Move): GameState {
  const next = clone(state);
  const legality = checkMove(next, actor, move);
  if (!legality.ok) {
    push(next, `Хід неможливий: ${legality.reason}`, "bad");
    return next;
  }
  const p = next.players[actor];
  const idx = p.hand.findIndex((c) => c.uid === move.cardUid);
  if (idx < 0) return next;
  const inst = p.hand[idx];
  const def = CARDS[inst.id];
  const inFinal = next.phase === "finalSeries" && next.finalSeriesBy === actor;

  p.hand.splice(idx, 1);
  p.discarded += 1;
  p.cardsPlayed += 1;
  if (!inFinal) {
    p.oo -= def.cost;
    next.cardsThisTurn += 1;
  }

  const wasCritical = isCritical(p.hp).critical;
  const targetSide: Side = def.id === "swap" ? actor : def.category === "rescue" ? actor : move.target ?? actor;
  const t = next.players[targetSide];
  const before = hpStrength(t.hp);

  push(next, `${p.name} грає «${def.symbol}» — ${def.name}${targetSide === actor ? " на себе" : ` на ${t.name}`}.`, "info");

  applyEffect(next, actor, targetSide, inst.id, move);

  const after = hpStrength(next.players[targetSide].hp);
  if (targetSide !== actor && next.phase !== "gameover") {
    const dmg = Math.max(0, before - after);
    next.players[actor].damageDealt += dmg;
    if (dmg > 0) {
      next.lastEvent = { side: targetSide, kind: "hit", at: Date.now() };
      push(next, `${t.name} втрачає еквівалент ${fmtNum(dmg)} HP.`, "bad");
    }
  }
  if (next.phase !== "gameover" && targetSide === actor && after > before) {
    next.lastEvent = { side: actor, kind: "heal", at: Date.now() };
  }

  if (next.phase === "gameover") return next;

  // критичний стан після ходу — перевіриться у кінці ходу
  const nowCrit = isCritical(p.hp).critical;
  if (wasCritical && !nowCrit) {
    push(next, "Стан виправлено. Порятунок витрачає хід.", "good");
    return endTurn(next);
  }
  return next;
}

function applyEffect(state: GameState, actor: Side, target: Side, id: CardId, move: Move) {
  const t = state.players[target];
  const other = state.players[target === 0 ? 1 : 0];
  const zone: Zone = move.zone ?? "both";
  const hp = t.hp;

  if (id === "swap") {
    const a = state.players[actor].hp;
    const b = other.hp;
    state.players[actor].hp = b;
    other.hp = a;
    push(state, `Обмін HP: ${state.players[actor].name} ↔ ${other.name}.`, "epic");
    state.lastEvent = { side: actor, kind: "transform", at: Date.now() };
    return;
  }

  if (hp.kind === "number") {
    const beforeLabel = numericLabel(hp);
    if (id === "div0" || (id === "times0" && move.fractionPart === "denominator")) {
      t.hp = { ...hp, divisionByZero: true };
      push(state, `${t.name}: колапс після ÷0. HP не визначено; попереднє HP ${beforeLabel} збережено для Відкату. Один хід на порятунок.`, "danger");
      state.lastEvent = { side: target, kind: "danger", at: Date.now() };
      return;
    }
    if (id === "restore") {
      const { divisionByZero: _, ...restored } = hp;
      t.hp = restored;
      push(state, `Відкат: скасовано ÷0, HP ${t.name} відновлено до ${numericLabel(restored)}.`, "good");
      state.lastEvent = { side: target, kind: "heal", at: Date.now() };
      return;
    }
    if (id === "xcard" || id === "ycard") {
      const poly = numericPoly(hp);
      t.hp = { kind: id === "xcard" ? "equation" : "graph", poly };
      push(state, `HP ${beforeLabel} перетворено на ${id === "xcard" ? "рівняння" : "графік"} ${describePoly(poly)}.`, "epic");
      state.lastEvent = { side: target, kind: "transform", at: Date.now() };
      return;
    }
    const out = applyNumeric(hp, id, move.fractionPart);
    t.hp = out;
    const afterLabel = numericLabel(out);
    if (afterLabel !== beforeLabel) {
      const delta = out.value - hp.value;
      push(state, `HP ${t.name}: ${beforeLabel} → ${afterLabel}${move.fractionPart ? ` · ${move.fractionPart === "numerator" ? "чисельник" : "знаменник"} ×${numericMultiplier(id)}` : ""}.`, delta > 0 ? "good" : "bad");
      state.lastEvent = { side: target, kind: delta > 0 ? "heal" : "hit", at: Date.now() };
    } else push(state, `HP ${t.name} лишається ${beforeLabel}.`, "info");
    if (isZeroHp(out)) push(state, `${t.name} входить у стан «Обнулення»!`, "danger");
    return;
  }

  /* --- рівняння / графік --- */
  const poly = hp.poly;
  const kind = hp.kind;
  let p: Poly = poly;
  let note = "";

  switch (id) {
    case "substitute": {
      const shift = move.substitution!;
      p = substituteVariable(poly, shift);
      note = `підстановка ${substitutionLabel(shift)}, кожен корінь зміщено на ${-shift}`;
      break;
    }
    case "plus1": case "plus3": case "minus1": case "minus3": {
      const n = id === "plus1" ? 1 : id === "plus3" ? 3 : id === "minus1" ? -1 : -3;
      if (zone === "left") { p = addConst(poly, n); note = `ліва частина ${n > 0 ? "+" : "−"} ${Math.abs(n)}`; }
      else if (zone === "right") { p = addConst(poly, -n); note = `права частина ${n > 0 ? "+" : "−"} ${Math.abs(n)} → корінь ${n > 0 ? "+" : "−"} ${Math.abs(n)}`; }
      else { p = poly; note = "обидві частини: рівновагу збережено, корені не змінилися"; }
      break;
    }
    case "times2": case "div2": {
      const k = id === "times2" ? 2 : 0.5;
      if (zone === "right") { p = poly; note = "права частина: операція над нулем — корені не змінилися"; }
      else { p = scalePoly(poly, k); note = id === "times2" ? "усі коефіцієнти ×2" : "усі коефіцієнти ÷2"; }
      break;
    }
    case "square": {
      if (zone === "right") { p = poly; note = "0² = 0 — корені не змінилися"; }
      else { p = mulPoly(poly, poly); note = "ліву частину піднесено до квадрата — кратність коренів подвоєно"; }
      break;
    }
    case "pow0": case "zeroFact":
      collapseToOne(state, target, id === "pow0" ? "x⁰: 1 = 1 — тотожність" : "0!: рівняння згорнуто в 1");
      return;
    case "times0":
      collapseToOne(state, target, "×0: 0 = 0 — тотожність");
      return;
    case "div0":
      if (kind === "graph") {
        setWinner(state, target === 0 ? 1 : 0, `${t.name} — ділення на нуль у режимі графіка`);
        return;
      }
      collapseToOne(state, target, "÷0 у рівнянні — заборонена операція");
      return;
    case "mirror":
      p = negateVariable(poly);
      note = "підстановка x → −x: усі корені віддзеркалено";
      break;
    case "cancel": {
      const roots = realRoots(poly);
      t.hp = roots.length ? hpFromRoot(poly, Math.max(...roots)) : { kind: "number", value: 1 };
      push(state, `Скасування: ${describePoly(poly)} → HP = ${hpLabel(t.hp)}.`, "good");
      state.lastEvent = { side: target, kind: "transform", at: Date.now() };
      return;
    }
    case "xcard": {
      if (degree(poly) >= 3) return;
      p = mulPoly(poly, [0, 1]);
      note = `степінь підвищено до ${degree(p)} — додано корінь x = 0`;
      break;
    }
    case "ycard":
      t.hp = { kind: "graph", poly };
      push(state, `Графік: f(x) = ${describePoly(poly).replace(" = 0", "")}. Площина активована.`, "epic");
      state.lastEvent = { side: target, kind: "transform", at: Date.now() };
      return;
    case "graphAnalysis": {
      const roots = realRoots(poly);
      const actor2 = state.players[actor];
      push(state, `Графічний аналіз ${describePoly(poly)}: дійсних коренів ${roots.length}${roots.length ? ` (${roots.map(fmtNum).join(", ")})` : ""}.`, "info");
      if (actor2.deck.length) {
        const drawn = actor2.deck.shift()!;
        if (actor2.hand.length < 9) actor2.hand.push(drawn);
        push(state, `${actor2.name} добирає карту.`, "good");
      }
      return;
    }
    case "horner": {
      const a = move.root ?? 0;
      const { quotient, remainder } = hornerDivide(poly, a);
      if (Math.abs(remainder) > 1e-6) {
        push(state, `Горнер: ${fmtNum(a)} не є коренем — поділ неможливий.`, "bad");
        return;
      }
      if (isIdentity(quotient)) {
        collapseToOne(state, target, `Горнер: рівняння звелося до тотожності`);
        return;
      }
      p = quotient;
      note = `поділ на (x − ${fmtNum(a)}): степінь знижено до ${degree(p)}`;
      break;
    }
    default: {
      // допоміжні картки з вибором кореня
      const def = CARDS[id];
      if (def.category !== "helper") return;
      const r = move.root ?? 0;
      const opts = rootOptions(id, poly);
      const chosen = opts.find((o) => Math.abs(o.value.re - r) < 1e-6);
      if (!chosen) {
        push(state, "Обраний корінь недоступний для цієї карти.", "bad");
        return;
      }
      if (Math.abs(chosen.value.im) > 1e-7) {
        t.hp = { kind: "number", value: 0 };
        push(state, `Обрано комплексний корінь ${chosen.label} — дійсного HP не існує. HP = 0!`, "danger");
        state.lastEvent = { side: target, kind: "hit", at: Date.now() };
        return;
      }
      const out = hpFromRoot(poly, chosen.value.re);
      t.hp = out;
      const zero = isZeroHp(out);
      push(state, `${def.name}: корінь ${fmtNum(chosen.value.re)} → HP = ${hpLabel(out)}. Рівняння скасовано.`, zero ? "danger" : "good");
      state.lastEvent = { side: target, kind: zero ? "hit" : "heal", at: Date.now() };
      if (zero) push(state, `${t.name} входить у стан «Обнулення»!`, "danger");
      return;
    }
  }

  p = scalePoly(p, 1);
  if (isIdentity(p)) {
    collapseToOne(state, target, "Рівняння звелося до тотожності 0 = 0");
    return;
  }
  if (isContradiction(p)) {
    t.hp = { kind, poly: p };
    push(state, `${describePoly(p)} — розв'язків НЕМАЄ. ${t.name} у критичному стані!`, "danger");
    state.lastEvent = { side: target, kind: "danger", at: Date.now() };
    return;
  }
  t.hp = { kind, poly: p };
  const roots = realRoots(p);
  push(state, `${describePoly(poly)} → ${describePoly(p)}${note ? ` · ${note}` : ""}.`, "info");
  const crit = isCritical(t.hp);
  if (crit.critical) {
    push(state, `${t.name}: ${crit.reason} — КРИТИЧНИЙ СТАН!`, "danger");
    state.lastEvent = { side: target, kind: "danger", at: Date.now() };
  } else if (roots.length) {
    push(state, `Дійсні корені: ${roots.map(fmtNum).join(", ")}.`, "info");
  }
}

/* ---------------- хід ---------------- */

export function drawCard(state: GameState, side: Side): boolean {
  const p = state.players[side];
  if (!p.deck.length) return false;
  const c = p.deck.shift()!;
  if (p.hand.length >= 9) {
    push(state, `Рука переповнена — карту «${card(c.id).symbol}» скинуто.`, "bad");
    return true;
  }
  p.hand.push(c);
  return true;
}

export function beginTurn(state: GameState): GameState {
  const next = clone(state);
  const actor = next.turn;
  const p = next.players[actor];
  const foe = next.players[actor === 0 ? 1 : 0];

  if (!p.deck.length) {
    next.phase = "finalSeries";
    next.finalSeriesBy = foe.side;
    next.turn = foe.side;
    foe.oo = 99;
    foe.criticalAtTurnStart = isCritical(foe.hp).critical;
    next.cardsThisTurn = 0;
    push(next, `${p.name}: колода спорожніла!`, "epic");
    push(next, `ФІНАЛЬНА СЕРІЯ — ${foe.name} розігрує всі карти без обмежень на ОО. Не доб'є — програє.`, "danger");
    return next;
  }

  p.oo = Math.min(next.ooCap, p.oo + next.ooPerTurn);
  next.cardsThisTurn = 0;
  const drew = drawCard(next, actor);
  p.criticalAtTurnStart = isCritical(p.hp).critical;
  if (p.criticalAtTurnStart) {
    const info = isCritical(p.hp);
    push(next, `${p.name}: ${info.reason} — КРИТИЧНИЙ СТАН!`, "danger");
    if (actor === 0) push(next, "Виправте стан до кінця ходу, інакше поразка.", "danger");
    next.lastEvent = { side: actor, kind: "danger", at: Date.now() };
  } else if (drew) {
    push(next, `${p.name} добирає карту. ОО: ${p.oo}.`, "info");
  }
  return next;
}

export function endTurn(state: GameState): GameState {
  const next = clone(state);
  if (next.phase === "gameover") return next;

  if (next.mode === "puzzle") {
    next.turn = 0;
    next.cardsThisTurn = 0;
    next.players[0].criticalAtTurnStart = isCritical(next.players[0].hp).critical;
    return next;
  }

  const actor = next.turn;
  const p = next.players[actor];
  const foe = next.players[actor === 0 ? 1 : 0];

  if (next.phase === "finalSeries" && next.finalSeriesBy === actor) {
    const crit = isCritical(foe.hp);
    if (crit.critical) {
      setWinner(next, actor, `Фінальна серія досягла мети: ${crit.reason}.`);
    } else {
      setWinner(next, foe.side, `Фінальну серію відбито — жодного критичного стану.`);
    }
    return next;
  }

  const crit = isCritical(p.hp);
  if (crit.critical) {
    setWinner(next, foe.side, `${p.name}: критичний стан не виправлено до кінця ходу (${crit.reason}).`);
    return next;
  }

  next.turn = foe.side;
  if (next.turn === 0) next.round += 1;
  return beginTurn(next);
}

/** Чистий попередній перегляд результату ходу (без витрати карти) */
export function previewMove(state: GameState, actor: Side, move: Move): GameState | null {
  const next = clone(state);
  if (!checkMove(next, actor, move).ok) return null;
  const inst = next.players[actor].hand.find((c) => c.uid === move.cardUid);
  if (!inst) return null;
  const def = CARDS[inst.id];
  const targetSide: Side = def.id === "swap" ? actor : def.category === "rescue" ? actor : move.target ?? actor;
  try {
    applyEffect(next, actor, targetSide, inst.id, move);
  } catch {
    return null;
  }
  return next;
}

export function evalFunctionAt(hp: HpState, x: number): number {
  if (hp.kind === "number") return hp.value;
  return evalPoly(hp.poly, x);
}

export function handCard(state: GameState, uidStr: string): CardId | null {
  for (const p of state.players) {
    const c = p.hand.find((k) => k.uid === uidStr);
    if (c) return c.id;
  }
  return null;
}
