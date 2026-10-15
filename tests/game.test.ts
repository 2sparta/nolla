import assert from "node:assert/strict";
import test from "node:test";
import { buildDeck, card } from "../src/game/cards";
import { aiDecide } from "../src/game/ai";
import { checkMove, createGame, endTurn, hpStrength, isCritical, legalMoves, playMove, previewMove } from "../src/game/engine";
import { clampHp, reverseDigits } from "../src/game/math";
import { fraction } from "../src/game/fractions";
import { hpFromFraction } from "../src/game/numeric";
import { PUZZLES } from "../src/game/puzzles";
import type { CardId, HpState, Move, Side } from "../src/game/types";

function setup(id: CardId, value: number, target: Side = 1) {
  const state = createGame("classic");
  state.players[0].hand = [{ id, uid: "test-card" }];
  state.players[0].oo = 6;
  state.players[target].hp = { kind: "number", value };
  return { state, move: { cardUid: "test-card", target } satisfies Move };
}
function result(id: CardId, value: number) {
  const { state, move } = setup(id, value);
  assert.equal(checkMove(state, 0, move).ok, true);
  return playMove(state, 0, move).players[1].hp;
}
const hp = (value: number): HpState => ({ kind: "number", value });

test("overshooting zero preserves negative HP and the turn continues", () => {
  const { state, move } = setup("minus3", 2);
  const next = playMove(state, 0, move);
  assert.deepEqual(next.players[1].hp, hp(-1));
  assert.equal(isCritical(next.players[1].hp).critical, false);
  const response = endTurn(next);
  assert.equal(response.phase, "playing");
  assert.equal(response.turn, 1);
  assert.equal(response.players[1].criticalAtTurnStart, false);
  assert.equal(endTurn(response).phase, "playing");
});

test("only exact zero is critical; an unanswered zero loses on the response turn", () => {
  for (const value of [-999, -1, 1, 999]) assert.equal(isCritical(hp(value)).critical, false);
  const { state, move } = setup("plus1", -1);
  const next = endTurn(playMove(state, 0, move));
  assert.deepEqual(next.players[1].hp, hp(0));
  assert.equal(next.phase, "playing");
  assert.equal(next.players[1].criticalAtTurnStart, true);
  const loss = endTurn(next);
  assert.equal(loss.phase, "gameover");
  assert.equal(loss.winner, 0);
});

test("negative players can use ordinary cards and cross zero to a safe positive value", () => {
  const { state, move } = setup("plus3", -2, 0);
  assert.equal(checkMove(state, 0, move).ok, true);
  const next = playMove(state, 0, move);
  assert.deepEqual(next.players[0].hp, hp(1));
  assert.equal(next.turn, 0);
});

test("arithmetic retains signs, fractions and symmetric limits", () => {
  assert.deepEqual(result("minus1", 0), hp(-1));
  assert.deepEqual(result("times2", -5), hp(-10));
  assert.deepEqual(result("div2", -3), hpFromFraction(fraction(-3, 2)));
  assert.deepEqual(result("square", -5), hp(25));
  assert.equal(clampHp(-10000), -999);
  assert.equal(clampHp(10000), 999);
});

test("modulus is present in decks and works on either player's numeric HP", () => {
  assert.equal(card("abs").name, "Модуль");
  assert.equal(buildDeck().filter((id) => id === "abs").length, 2);
  for (const target of [0, 1] as const) {
    for (const value of [-999, -7, 7, 999]) {
      const { state, move } = setup("abs", value, target);
      assert.equal(checkMove(state, 0, move).ok, true);
      const preview = previewMove(state, 0, move);
      const next = playMove(state, 0, move);
      assert.deepEqual(next.players[target].hp, hp(Math.abs(value)));
      assert.deepEqual(preview?.players[target].hp, next.players[target].hp);
      assert.deepEqual(state.players[target].hp, hp(value));
      assert.equal(next.players[0].oo, 4);
      assert.equal(next.players[0].hand.length, 0);
    }
  }
});

test("modulus leaves zero at zero and cannot rescue an obnulled player", () => {
  assert.deepEqual(result("abs", 0), hp(0));
  const { state, move } = setup("abs", 0, 0);
  assert.equal(checkMove(state, 0, move).ok, false);
});

test("modulus is unavailable for equations and graphs", () => {
  for (const kind of ["equation", "graph"] as const) {
    const { state, move } = setup("abs", -5);
    state.players[1].hp = { kind, poly: [5, 1] };
    assert.equal(checkMove(state, 0, move).ok, false);
  }
});

test("sqrt and factorial reject negative HP without spending a card or OO", () => {
  for (const id of ["sqrt", "fact"] as const) {
    const { state, move } = setup(id, -4);
    assert.equal(checkMove(state, 0, move).ok, false);
    assert.equal(previewMove(state, 0, move), null);
    assert.equal(legalMoves(state, 0).some((m) => m.target === 1), false);
    const next = playMove(state, 0, move);
    assert.deepEqual(next.players, state.players);
    assert.equal(next.cardsThisTurn, 0);
  }
  assert.deepEqual(result("sqrt", 9), hp(3));
  assert.deepEqual(result("fact", 0), hp(1));
});

test("mirror preserves the sign and modulo 3 returns a nonnegative remainder", () => {
  assert.equal(reverseDigits(-120), -21);
  assert.deepEqual(result("mirror", -21), hp(-12));
  assert.deepEqual(result("mod3", -4), hp(2));
});

test("transforming a negative number retains its negative root", () => {
  const { state, move } = setup("xcard", -5);
  const next = playMove(state, 0, move);
  assert.deepEqual(next.players[1].hp, { kind: "equation", poly: [5, 1] });
  assert.equal(isCritical(next.players[1].hp).critical, false);
});

test("resolving or cancelling an equation preserves negative roots", () => {
  for (const id of ["rationalRoot", "cancel"] as const) {
    const { state, move } = setup(id, -5);
    state.players[1].hp = { kind: "equation", poly: [5, 1] };
    const rootMove = { ...move, root: -5 };
    assert.equal(checkMove(state, 0, rootMove).ok, true);
    const next = playMove(state, 0, rootMove);
    assert.deepEqual(next.players[1].hp, hp(-5));
    assert.equal(isCritical(next.players[1].hp).critical, false);
  }
});

test("AI values distance from zero and can finish a negative opponent with addition", () => {
  assert.equal(hpStrength(hp(-5)), hpStrength(hp(5)));
  assert.ok(hpStrength(hp(-1)) > hpStrength(hp(0)));
  const { state } = setup("plus1", 20);
  state.turn = 1;
  state.players[1].hand = [{ id: "plus1", uid: "ai-plus" }];
  state.players[1].oo = 6;
  state.players[0].hp = hp(-1);
  const plan = aiDecide(state, { greedy: true });
  assert.equal(plan?.move.target, 0);
  assert.deepEqual(playMove(state, 1, plan!.move).players[0].hp, hp(0));
});

test("new tutorial puzzles require exact zero and teach modulus", () => {
  for (const [id, moves] of [
    ["negative-zero", [{ cardUid: "", target: 1 }, { cardUid: "", target: 1 }]],
    ["absolute-value", [{ cardUid: "", target: 0 }]],
  ] as const) {
    const puzzle = PUZZLES.find((p) => p.id === id)!;
    let state = puzzle.build();
    assert.equal(puzzle.solved(state), false);
    for (const [index, move] of moves.entries()) {
      const cardId = id === "absolute-value" ? "abs" : index === 0 ? "minus3" : "plus1";
      const inst = state.players[0].hand.find((c) => c.id === cardId)!;
      state = playMove(state, 0, { ...move, cardUid: inst.uid });
    }
    assert.equal(puzzle.solved(state), true);
  }
});
