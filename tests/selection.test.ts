import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionDock } from "../src/components/ActionDock";
import { canCompleteMove, checkMove, createGame, legalMoves, playMove } from "../src/game/engine";
import type { CardId, GameState, Move } from "../src/game/types";

function setup(id: CardId) {
  const state = createGame("puzzle");
  state.players[0].hand = [{ id, uid: "selected" }];
  state.players[0].hp = { kind: "equation", poly: [-6, 1, 1] }; // roots −3 and 2
  state.players[1].hp = { kind: "equation", poly: [-5, 1] };
  return state;
}
function buttons(state: GameState, pending: Move) {
  const html = renderToStaticMarkup(createElement(ActionDock, {
    state, pending,
    onTarget: () => {}, onZone: () => {}, onRoot: () => {}, onCancel: () => {},
  }));
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .map((match) => ({ disabled: /\bdisabled=/.test(match[1]), content: match[2] }));
}

test("discriminant target remains selectable before choosing its root", () => {
  const state = setup("discriminant");
  const partial = { cardUid: "selected", target: 0 } as const;
  assert.equal(checkMove(state, 0, partial).ok, false);
  assert.equal(checkMove(state, 0, partial).needsRoot, true);
  assert.equal(canCompleteMove(state, 0, partial), true);
  assert.equal(canCompleteMove(state, 0, { ...partial, target: 1 }), false);
  const targets = buttons(state, { cardUid: "selected" });
  assert.equal(targets.find((b) => b.content.includes("На себе"))?.disabled, false);
  assert.equal(targets.find((b) => b.content.includes("На супротивника"))?.disabled, true);
  for (const root of [-3, 2]) {
    assert.deepEqual(playMove(state, 0, { ...partial, root }).players[0].hp, { kind: "number", value: root });
  }
});

test("arithmetic target remains selectable until its equation side is chosen", () => {
  const state = setup("plus1");
  const partial = { cardUid: "selected", target: 1 } as const;
  assert.equal(checkMove(state, 0, partial).needsZone, true);
  assert.equal(canCompleteMove(state, 0, partial), true);
  const targets = buttons(state, { cardUid: "selected" }).filter((b) => b.content.includes("На "));
  assert.equal(targets.length, 2);
  assert.ok(targets.every((b) => !b.disabled));
  const zones = buttons(state, partial).filter((b) => /Ліва частина|Права частина|Обидві частини/.test(b.content));
  assert.equal(zones.length, 3);
  assert.ok(zones.every((b) => !b.disabled));
  assert.deepEqual(playMove(state, 0, { ...partial, zone: "left" }).players[1].hp, { kind: "equation", poly: [-4, 1] });
  assert.deepEqual(playMove(state, 0, { ...partial, zone: "right" }).players[1].hp, { kind: "equation", poly: [-6, 1] });
});

test("helper root buttons appear after a target is selected", () => {
  const state = setup("discriminant");
  const roots = buttons(state, { cardUid: "selected", target: 0 }).filter((b) => b.content.includes("x = "));
  assert.equal(roots.length, 2);
  assert.ok(roots.every((b) => !b.disabled));
  assert.ok(roots.some((b) => b.content.includes("−3") || b.content.includes("-3")));
  assert.ok(roots.some((b) => b.content.includes("HP → 2")));
});

test("unusable targets are disabled even when the card requires another choice", () => {
  const state = setup("square");
  assert.equal(canCompleteMove(state, 0, { cardUid: "selected", target: 0 }), false); // degree 4 forbidden
  assert.equal(canCompleteMove(state, 0, { cardUid: "selected", target: 1 }), true);
  const targets = buttons(state, { cardUid: "selected" });
  assert.equal(targets.find((b) => b.content.includes("На себе"))?.disabled, true);
  assert.equal(targets.find((b) => b.content.includes("На супротивника"))?.disabled, false);
});

test("partial selection never spends resources or accepts an invalid root", () => {
  const state = setup("discriminant");
  const before = structuredClone(state);
  for (const root of [-3, 2]) assert.equal(canCompleteMove(state, 0, { cardUid: "selected", target: 0, root }), true);
  assert.equal(canCompleteMove(state, 0, { cardUid: "selected", target: 0, root: 99 }), false);
  assert.deepEqual(state, before);
});

test("helper completions respect turn, gameover and action limits", () => {
  const state = setup("discriminant");
  state.turn = 1;
  assert.deepEqual(legalMoves(state, 0), []);
  state.turn = 0;
  state.phase = "gameover";
  assert.deepEqual(legalMoves(state, 0), []);
  state.phase = "playing";
  state.cardsThisTurn = state.maxCards;
  assert.equal(canCompleteMove(state, 0, { cardUid: "selected", target: 0 }), false);
});
