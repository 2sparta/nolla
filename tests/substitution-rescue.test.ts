import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionDock } from "../src/components/ActionDock";
import { HpPanel } from "../src/components/HpPanel";
import { aiDecide } from "../src/game/ai";
import { buildDeck, card } from "../src/game/cards";
import { canCompleteMove, checkMove, createGame, endTurn, hpLabel, hpStrength, isCritical, legalMoves, playMove, previewMove } from "../src/game/engine";
import { degree, evalPoly, realRoots, substituteVariable, SUBSTITUTION_SHIFTS } from "../src/game/math";
import { PUZZLES } from "../src/game/puzzles";
import type { CardId, HpState } from "../src/game/types";

function setup(id: CardId, hp: HpState) {
  const state = createGame("classic");
  state.players[0].hand = [{ uid: "test", id }];
  state.players[0].oo = 6;
  state.players[1].hp = hp;
  return state;
}
const voidHp: HpState = { kind: "number", value: -7, divisionByZero: true };

test("substitution composes every term of linear, quadratic and cubic polynomials", () => {
  for (const p of [[-5, 1], [0, -5, 1], [0, 2, -3, 1]]) {
    for (const shift of SUBSTITUTION_SHIFTS) {
      const composed = substituteVariable(p, shift);
      assert.equal(degree(composed), degree(p));
      for (const x of [-4, 0, 2, 7]) assert.ok(Math.abs(evalPoly(composed, x) - evalPoly(p, x + shift)) < 1e-9);
    }
  }
  assert.deepEqual(substituteVariable([0, -5, 1], 1), [-4, -3, 1]);
  assert.deepEqual(realRoots(substituteVariable([0, -5, 1], 1)), [-1, 4]);
});

test("substitution requires an eligible target and then a supported choice", () => {
  const state = setup("substitute", { kind: "equation", poly: [0, -5, 1] });
  const partial = { cardUid: "test", target: 1 } as const;
  assert.equal(checkMove(state, 0, partial).needsSubstitution, true);
  assert.equal(canCompleteMove(state, 0, partial), true);
  assert.equal(checkMove(state, 0, { ...partial, substitution: 2 }).ok, false);
  assert.equal(checkMove(state, 0, { ...partial, substitution: NaN }).ok, false);
  const choices = legalMoves(state, 0).filter((m) => m.target === 1);
  assert.deepEqual(choices.map((m) => m.substitution), [...SUBSTITUTION_SHIFTS]);
  const move = { ...partial, substitution: 1 };
  assert.deepEqual(previewMove(state, 0, move)?.players[1].hp, { kind: "equation", poly: [-4, -3, 1] });
  const next = playMove(state, 0, move);
  assert.deepEqual(next.players[1].hp, { kind: "equation", poly: [-4, -3, 1] });
  assert.equal(next.players[0].oo, 4);
  assert.equal(next.players[0].hand.length, 0);
  assert.equal(next.cardsThisTurn, 1);
  assert.equal(state.players[0].hand.length, 1);
  for (const hp of [{ kind: "number", value: 7 }, { kind: "graph", poly: [-5, 1] }] as HpState[]) {
    state.players[1].hp = hp;
    assert.equal(canCompleteMove(state, 0, partial), false);
  }
});

test("substitution can rescue a zero root or create one for an opponent", () => {
  const state = setup("substitute", { kind: "equation", poly: [-1, 1] });
  state.players[0].hp = { kind: "equation", poly: [0, -5, 1] };
  const rescued = playMove(state, 0, { cardUid: "test", target: 0, substitution: 1 });
  assert.equal(isCritical(rescued.players[0].hp).critical, false);
  assert.equal(rescued.turn, 1);
  const attack = playMove(state, 0, { cardUid: "test", target: 1, substitution: 1 });
  assert.equal(isCritical(attack.players[1].hp).kind, "root-zero");
});

test("substitution picker renders all four previews after selecting the target", () => {
  const state = setup("substitute", { kind: "equation", poly: [0, -5, 1] });
  const html = renderToStaticMarkup(createElement(ActionDock, {
    state, pending: { cardUid: "test", target: 1 }, onTarget() {}, onZone() {}, onRoot() {}, onSubstitution() {}, onFractionPart() {}, onCancel() {},
  }));
  assert.ok(html.includes("x → x + 1"));
  assert.ok(html.includes("x → x − 3"));
  assert.equal([...html.matchAll(/Корені /g)].length, 4);
  assert.ok(html.includes("КРОК 2 / 2"));
});

test("numeric division by zero is delayed, preserves previous HP and loses if unanswered", () => {
  const state = setup("div0", { kind: "number", value: -7 });
  const move = { cardUid: "test", target: 1 } as const;
  const preview = previewMove(state, 0, move)!;
  assert.equal(preview.phase, "playing");
  assert.deepEqual(preview.players[1].hp, voidHp);
  const attacked = playMove(state, 0, move);
  assert.equal(attacked.phase, "playing");
  assert.deepEqual(attacked.players[1].hp, voidHp);
  assert.equal(isCritical(attacked.players[1].hp).kind, "division-zero");
  assert.ok(hpLabel(attacked.players[1].hp).includes("не визначено"));
  assert.equal(hpStrength(attacked.players[1].hp), -60);
  const response = endTurn(attacked);
  assert.equal(response.turn, 1);
  assert.equal(response.phase, "playing");
  assert.equal(response.players[1].criticalAtTurnStart, true);
  const lost = endTurn(response);
  assert.equal(lost.phase, "gameover");
  assert.equal(lost.winner, 0);
});

test("rollback restores positive or negative previous HP, spends OO and ends the rescue turn", () => {
  for (const value of [14, -7]) {
    const state = setup("div0", { kind: "number", value });
    state.players[1].hand = [{ id: "restore", uid: "rescue" }];
    state.players[1].deck = [{ id: "plus1", uid: "draw" }];
    let next = endTurn(playMove(state, 0, { cardUid: "test", target: 1 }));
    const oo = next.players[1].oo;
    assert.equal(checkMove(next, 1, { cardUid: "rescue" }).ok, true);
    next = playMove(next, 1, { cardUid: "rescue" });
    assert.deepEqual(next.players[1].hp, { kind: "number", value });
    assert.equal(next.turn, 0);
    assert.equal(next.phase, "playing");
    assert.equal(next.players[1].oo, oo - 1);
  }
});

test("swap transfers collapse and previous HP, allowing the other player to roll it back", () => {
  const state = setup("swap", { kind: "number", value: 12 });
  state.players[0].hp = voidHp;
  state.players[1].hand = [{ id: "restore", uid: "other-restore" }];
  const swapped = playMove(state, 0, { cardUid: "test" });
  assert.deepEqual(swapped.players[0].hp, { kind: "number", value: 12 });
  assert.deepEqual(swapped.players[1].hp, voidHp);
  assert.equal(swapped.turn, 1);
  const restored = playMove(swapped, 1, { cardUid: "other-restore" });
  assert.deepEqual(restored.players[1].hp, { kind: "number", value: -7 });
  assert.equal(restored.phase, "playing");
});

test("undefined HP rejects ordinary math and zero-rescue cards without spending resources", () => {
  for (const id of ["plus1", "zeroFact", "pow0", "fact", "abs", "xcard", "ycard", "div0"] as CardId[]) {
    const state = setup(id, voidHp);
    if (card(id).category !== "rescue") assert.equal(checkMove(state, 0, { cardUid: "test", target: 1 }).ok, false);
    state.players[0].hp = voidHp;
    assert.equal(checkMove(state, 0, { cardUid: "test", target: 0 }).ok, false);
    assert.equal(legalMoves(state, 0).length, 0);
    const next = playMove(state, 0, { cardUid: "test", target: 0 });
    assert.deepEqual(next.players, state.players);
  }
});

test("rollback cannot heal normal zero, and restoring pre-attack zero stays critical", () => {
  const state = setup("restore", { kind: "number", value: 10 });
  for (const value of [0, 5, -7]) {
    state.players[0].hp = { kind: "number", value };
    assert.equal(checkMove(state, 0, { cardUid: "test" }).ok, false);
  }
  state.players[0].hp = { kind: "number", value: 0, divisionByZero: true };
  const next = playMove(state, 0, { cardUid: "test" });
  assert.deepEqual(next.players[0].hp, { kind: "number", value: 0 });
  assert.equal(isCritical(next.players[0].hp).kind, "zero");
  assert.equal(endTurn(next).winner, 1);
});

test("equation and graph division keep their existing rules", () => {
  const state = setup("div0", { kind: "equation", poly: [-5, 1] });
  assert.deepEqual(playMove(state, 0, { cardUid: "test", target: 1 }).players[1].hp, { kind: "number", value: 1 });
  state.players[1].hp = { kind: "graph", poly: [-5, 1] };
  assert.equal(playMove(state, 0, { cardUid: "test", target: 1 }).winner, 0);
});

test("AI finds rollback during collapse and substitution choices are legal", () => {
  const state = setup("plus1", { kind: "number", value: -7, divisionByZero: true });
  state.turn = 1;
  state.players[1].hand = [{ id: "restore", uid: "ai-restore" }];
  const plan = aiDecide(state);
  assert.equal(plan?.move.cardUid, "ai-restore");
  assert.equal(isCritical(playMove(state, 1, plan!.move).players[1].hp).critical, false);
  const eq = setup("substitute", { kind: "equation", poly: [-1, 1] });
  assert.equal(legalMoves(eq, 0).filter((move) => move.substitution !== undefined).length, 4);
});

test("collapse panel shows an undefined state and a recovery value instead of a valid meter", () => {
  const state = setup("restore", voidHp);
  const html = renderToStaticMarkup(createElement(HpPanel, {player:state.players[1],startHp:20,side:1,active:true,showGraph:false}));
  assert.ok(html.includes("HP НЕ ВИЗНАЧЕНО"));
  assert.ok(html.includes("До ÷0: -7 HP"));
  assert.equal(html.includes('role="meter"'), false);
});

test("new cards are in the deck and both tutorial puzzles can be solved", () => {
  for (const id of ["substitute", "restore"] as const) {
    assert.equal(buildDeck().filter((c) => c === id).length, 2);
    assert.equal(card(id).count, 2);
  }
  for (const id of ["substitution", "division-rescue"]) {
    const pz = PUZZLES.find((p) => p.id === id)!;
    const state = pz.build();
    assert.equal(pz.solved(state), false);
    const inst = state.players[0].hand.find((c) => c.id === (id === "substitution" ? "substitute" : "restore"))!;
    const next = playMove(state, 0, {cardUid:inst.uid,target:0,substitution:1});
    assert.equal(pz.solved(next), true);
  }
});
