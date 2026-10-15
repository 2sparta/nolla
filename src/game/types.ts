import type { Poly } from "./math";

export type Mode = "classic" | "speed" | "equations" | "graphs" | "puzzle";
export type Side = 0 | 1;
export type Zone = "left" | "right" | "both";

export type HpState =
  | { kind: "number"; value: number; divisionByZero?: boolean }
  | { kind: "equation"; poly: Poly }
  | { kind: "graph"; poly: Poly };

export interface CardInstance {
  uid: string;
  id: CardId;
}

export type CardId =
  | "plus1" | "plus3" | "minus1" | "minus3" | "times2" | "div2" | "square" | "sqrt"
  | "abs" | "fact" | "mod3" | "pow0" | "zeroFact" | "times0" | "div0" | "swap" | "mirror" | "cancel"
  | "xcard" | "ycard" | "substitute" | "restore"
  | "discriminant" | "vieta" | "factor" | "cardano" | "trigVieta" | "rationalRoot" | "horner" | "graphAnalysis";

export type Accent = "cyan" | "magenta" | "amber" | "lime" | "violet" | "red";
export type Category = "math" | "transform" | "helper" | "rescue" | "forbidden";

export interface CardDef {
  id: CardId;
  symbol: string;
  name: string;
  cost: number;
  category: Category;
  accent: Accent;
  desc: string;
  rule: string;
  count: number;
  /** чи можна застосувати до числового HP */
  onNumber: boolean;
  /** чи можна застосувати до рівняння / графіка */
  onEquation: boolean;
  /** потребує вибору частини рівняння */
  zones: boolean;
  /** потребує вибору кореня */
  needsRoot: boolean;
  needsSubstitution?: boolean;
  /** розв'язує рівняння (HP стає числом) */
  resolves: boolean;
}

export type LogTone = "info" | "good" | "bad" | "danger" | "epic";

export interface LogEntry {
  id: number;
  text: string;
  tone: LogTone;
}

export interface PlayerState {
  side: Side;
  name: string;
  hp: HpState;
  deck: CardInstance[];
  hand: CardInstance[];
  oo: number;
  criticalAtTurnStart: boolean;
  discarded: number;
  cardsPlayed: number;
  damageDealt: number;
}

export interface Move {
  cardUid: string;
  target?: Side;
  zone?: Zone;
  root?: number;
  substitution?: number;
}

export type Phase = "playing" | "finalSeries" | "gameover";

export interface GameState {
  mode: Mode;
  phase: Phase;
  turn: Side;
  round: number;
  players: [PlayerState, PlayerState];
  log: LogEntry[];
  winner: Side | null;
  winReason: string;
  cardsThisTurn: number;
  maxCards: number;
  ooPerTurn: number;
  ooCap: number;
  startHp: number;
  finalSeriesBy: Side | null;
  /** для головоломок */
  puzzle?: { id: string; title: string; goal: string; solved: boolean; failed: boolean };
  lastEvent?: { side: Side; kind: "hit" | "heal" | "danger" | "transform" | "win"; at: number };
}
