import { createGame, isCritical, push } from "./engine";
import { realRoots } from "./math";
import type { CardId, GameState } from "./types";

export interface PuzzleDef {
  id: string;
  index: string;
  title: string;
  brief: string;
  goal: string;
  hint: string;
  moves: number;
  build: () => GameState;
  solved: (s: GameState) => boolean;
}

let n = 0;
const hand = (ids: CardId[]) => ids.map((id) => ({ uid: `p${++n}`, id }));

function base(
  playerHp: GameState["players"][0]["hp"],
  foeHp: GameState["players"][1]["hp"],
  playerHand: CardId[],
  foeHand: CardId[],
  moves: number,
  intro: string,
): GameState {
  const s = createGame("puzzle", ["ВИ", "ЦІЛЬ"]);
  s.players[0].hp = playerHp;
  s.players[1].hp = foeHp;
  s.players[0].hand = hand(playerHand);
  s.players[1].hand = hand(foeHand);
  s.players[0].deck = [];
  s.players[1].deck = [];
  s.players[0].oo = 99;
  s.players[1].oo = 0;
  s.maxCards = moves;
  s.cardsThisTurn = 0;
  s.log = [];
  push(s, intro, "info");
  s.players[0].criticalAtTurnStart = isCritical(playerHp).critical;
  return s;
}

export const PUZZLES: PuzzleDef[] = [
  {
    id: "annihilation",
    index: "01",
    title: "Обнулення",
    brief: "Ваше HP = 0. У руці сміття й одна рятівна карта.",
    goal: "Вийти зі стану «Обнулення»: HP ≥ 1",
    hint: "У стані HP = 0 легальні лише 0!, x⁰ та ⇄. Порятунок витрачає хід.",
    moves: 1,
    build: () =>
      base(
        { kind: "number", value: 0 },
        { kind: "number", value: 17 },
        ["minus3", "zeroFact", "times2", "mod3"],
        [],
        1,
        "Задача 01. HP = 0 — це ще не поразка, якщо є чим виправити.",
      ),
    solved: (s) => s.players[0].hp.kind === "number" && s.players[0].hp.value >= 1,
  },
  {
    id: "root-zero",
    index: "02",
    title: "Корінь нуля",
    brief: "HP супротивника — 7. Перетворіть його на рівняння з коренем 0.",
    goal: "Зробити стан супротивника критичним (корінь x = 0)",
    hint: "Карта «x» двічі: x − 7 = 0 → x(x − 7) = 0. Корені 0 і 7.",
    moves: 2,
    build: () =>
      base(
        { kind: "number", value: 12 },
        { kind: "number", value: 7 },
        ["xcard", "xcard", "plus1", "sqrt"],
        [],
        2,
        "Задача 02. Кожне повторне «x» додає корінь 0 — і це зброя.",
      ),
    solved: (s) => isCritical(s.players[1].hp).critical,
  },
  {
    id: "no-crossing",
    index: "03",
    title: "Графік без перетину",
    brief: "Рівняння супротивника x − 3 = 0. Зробіть так, щоб його графік не перетнув вісь X.",
    goal: "Супротивник у режимі графіка і не має дійсних коренів",
    hint: "x² (ліва частина) → (x−3)² ; −3 (права) → x²−6x+12, D < 0 ; потім y.",
    moves: 3,
    build: () =>
      base(
        { kind: "number", value: 15 },
        { kind: "equation", poly: [-3, 1] },
        ["square", "minus3", "ycard", "plus1"],
        [],
        3,
        "Задача 03. Підніміть параболу над віссю X і зафіксуйте це картою «y».",
      ),
    solved: (s) =>
      s.players[1].hp.kind === "graph" && realRoots(s.players[1].hp.poly).length === 0,
  },
  {
    id: "div-zero",
    index: "04",
    title: "Ділення на нуль",
    brief: "Супротивник уже в режимі графіка. Добийте його забороненою операцією.",
    goal: "Перемогти цього ходу",
    hint: "÷0 на числі й на графіку — миттєва поразка. На рівнянні — лише колапс у 1.",
    moves: 1,
    build: () =>
      base(
        { kind: "number", value: 9 },
        { kind: "graph", poly: [-6, 1] },
        ["div0", "times0", "plus1", "minus1"],
        [],
        1,
        "Задача 04. Графік не пробачає заборонених операцій.",
      ),
    solved: (s) => s.phase === "gameover" && s.winner === 0,
  },
  {
    id: "horner",
    index: "05",
    title: "Схема Горнера",
    brief: "Ваше HP — x³ − 5x² = 0 з подвійним коренем 0. Виріжте нулі, не втрачаючи п'ятірку.",
    goal: "Рівняння без кореня 0, з єдиним коренем x = 5",
    hint: "Горнер з a = 0 двічі: x³−5x² → x²−5x → x−5. Рівняння лишається, але нуль зникає.",
    moves: 3,
    build: () =>
      base(
        { kind: "equation", poly: [0, 0, -5, 1] },
        { kind: "number", value: 14 },
        ["horner", "horner", "graphAnalysis", "minus1"],
        [],
        3,
        "Задача 05. Поділ на (x − 0) прибирає один нуль за раз.",
      ),
    solved: (s) => {
      const hp = s.players[0].hp;
      if (hp.kind === "number") return false;
      const r = realRoots(hp.poly);
      return r.length === 1 && Math.abs(r[0] - 5) < 1e-6 && !isCritical(hp).critical;
    },
  },
  {
    id: "cardano",
    index: "06",
    title: "Пастка Кардано",
    brief: "Супротивник має кубічне рівняння з коренем 0. Присудьте йому цей корінь.",
    goal: "HP супротивника стає 0",
    hint: "Допоміжну карту можна зіграти на рівняння СУПРОТИВНИКА — корінь обираєте ви.",
    moves: 1,
    build: () =>
      base(
        { kind: "number", value: 11 },
        { kind: "equation", poly: [0, -4, -1, 1] },
        ["cardano", "plus1", "times2", "sqrt"],
        [],
        1,
        "Задача 06. x³ − x² − 4x = 0: корені 0, ≈2.56 і ≈−1.56. Оберіть найгірший для нього.",
      ),
    solved: (s) => s.players[1].hp.kind === "number" && s.players[1].hp.value === 0,
  },
  {
    id: "negative-zero",
    index: "07",
    title: "По той бік нуля",
    brief: "У супротивника 2 HP. Карта −3 проведе повз нуль — завершить комбінацію +1.",
    goal: "Отримати рівно 0 HP у супротивника за дві дії",
    hint: "2 − 3 = −1 — це безпечно. Потім −1 + 1 = 0 — це вже Обнулення.",
    moves: 2,
    build: () => base(
      { kind: "number", value: 12 }, { kind: "number", value: 2 },
      ["minus3", "plus1", "abs", "times2"], [], 2,
      "Задача 07. Від’ємне HP — не поразка. Потрібен точний нуль.",
    ),
    solved: (s) => s.cardsThisTurn === 2 && s.players[1].hp.kind === "number" && s.players[1].hp.value === 0,
  },
  {
    id: "absolute-value",
    index: "08",
    title: "Сила модуля",
    brief: "У вас −7 HP. Перетворіть його на +7 за одну дію.",
    goal: "Отримати рівно 7 власних HP",
    hint: "Карта |x| бере модуль числа: |−7| = 7. Не плутайте з mod 3 — остачею від ділення.",
    moves: 1,
    build: () => base(
      { kind: "number", value: -7 }, { kind: "number", value: 12 },
      ["abs", "plus3", "square", "mod3"], [], 1,
      "Задача 08. Модуль змінює знак від’ємного HP і зберігає його величину.",
    ),
    solved: (s) => s.players[0].hp.kind === "number" && s.players[0].hp.value === 7,
  },
];
