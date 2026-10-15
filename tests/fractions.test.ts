import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionDock } from "../src/components/ActionDock";
import { HpPanel } from "../src/components/HpPanel";
import { aiDecide } from "../src/game/ai";
import { rootOptions } from "../src/game/cards";
import { canCompleteMove, checkMove, createGame, endTurn, hpLabel, isCritical, legalMoves, playMove, previewMove } from "../src/game/engine";
import { addFractions, fraction, fractionFromNumber, fractionLabel } from "../src/game/fractions";
import { applyNumeric, hpFromFraction, hpFromRoot, numericLabel } from "../src/game/numeric";
import { PUZZLES } from "../src/game/puzzles";
import type { CardId, FractionPart, GameState, NumericHp } from "../src/game/types";

const hp = (n: number | bigint, d: number | bigint = 1) => hpFromFraction(fraction(n, d));
function stateFor(id: CardId, targetHp: NumericHp): GameState {
  const state = createGame("classic");
  state.players[0].hand = [{ uid: "fraction-test", id }];
  state.players[0].oo = 6;
  state.players[1].hp = targetHp;
  return state;
}
function play(id: CardId, value: NumericHp, fractionPart?: FractionPart) {
  const state = stateFor(id, value);
  const move = { cardUid: "fraction-test", target: 1 as const, fractionPart };
  assert.equal(checkMove(state, 0, move).ok, true);
  return playMove(state, 0, move).players[1].hp;
}

test("1 divided by 2 produces exact 1/2 and no zero-critical state", () => {
  const state = stateFor("div2", hp(1));
  const move = { cardUid: "fraction-test", target: 1 as const };
  const preview = previewMove(state, 0, move)!;
  const next = playMove(state, 0, move);
  assert.deepEqual(next.players[1].hp, hp(1, 2));
  assert.equal(hpLabel(next.players[1].hp), "1/2");
  assert.equal(isCritical(next.players[1].hp).critical, false);
  assert.equal(endTurn(next).phase, "playing");
  assert.deepEqual(preview.players[1].hp, next.players[1].hp);
  assert.equal(next.players[0].oo, 4);
  assert.equal(next.cardsThisTurn, 1);
  assert.deepEqual(state.players[1].hp, hp(1));
});

test("fractions normalize signs, reduce and parse decimals exactly", () => {
  assert.deepEqual(fraction(-6, -8), fraction(3, 4));
  assert.deepEqual(fraction(0, -4), fraction(0));
  assert.deepEqual(fractionFromNumber(0.125), fraction(1, 8));
  assert.deepEqual(fractionFromNumber(-1.5e-5), fraction(-3, 200000));
  assert.equal(fractionLabel(addFractions(fractionFromNumber(0.1), fractionFromNumber(0.2))), "3/10");
  assert.throws(() => fraction(1, 0));
});

test("negative fractional arithmetic, squares, absolute values and remainders stay exact", () => {
  assert.deepEqual(play("div2", hp(-3)), hp(-3, 2));
  assert.deepEqual(play("div2", hp(-3, 2)), hp(-3, 4));
  assert.deepEqual(play("plus1", hp(1, 2)), hp(3, 2));
  assert.deepEqual(play("minus1", hp(1, 2)), hp(-1, 2));
  assert.deepEqual(play("plus3", hp(-1, 2)), hp(5, 2));
  assert.deepEqual(play("minus3", hp(1, 2)), hp(-5, 2));
  assert.deepEqual(play("square", hp(-3, 4)), hp(9, 16));
  assert.deepEqual(play("abs", hp(-3, 4)), hp(3, 4));
  assert.deepEqual(play("mod3", hp(-7, 2)), hp(5, 2));
});

test("multiplying a numerator or denominator gives different reduced results", () => {
  for (const [part, expected] of [["numerator", hp(3, 2)], ["denominator", hp(3, 8)]] as const) {
    const state = stateFor("times2", hp(3, 4));
    const partial = { cardUid: "fraction-test", target: 1 as const };
    assert.equal(checkMove(state, 0, partial).needsFractionPart, true);
    assert.equal(canCompleteMove(state, 0, partial), true);
    const move = { ...partial, fractionPart: part };
    const preview = previewMove(state, 0, move)!;
    const next = playMove(state, 0, move);
    assert.deepEqual(next.players[1].hp, expected);
    assert.deepEqual(preview.players[1].hp, expected);
    assert.equal(next.players[0].oo, 4);
    assert.equal(next.players[0].hand.length, 0);
    assert.equal(next.cardsThisTurn, 1);
  }
  assert.deepEqual(play("times2", hp(1, 2), "numerator"), hp(1));
  assert.deepEqual(play("times2", hp(-3, 4), "denominator"), hp(-3, 8));
});

test("fraction choices exist for self and opponent, but aren't requested for integer HP", () => {
  const state = stateFor("times2", hp(3, 4));
  state.players[0].hp = hp(-1, 2);
  const moves = legalMoves(state, 0);
  assert.equal(moves.length, 4);
  assert.deepEqual(moves.filter((m) => m.target === 1).map((m) => m.fractionPart), ["numerator", "denominator"]);
  assert.equal(checkMove(state, 0, {cardUid:"fraction-test",target:1,fractionPart:"wrong" as FractionPart}).ok, false);
  const whole = stateFor("times2", hp(3));
  assert.equal(checkMove(whole, 0, {cardUid:"fraction-test",target:1}).ok, true);
  assert.deepEqual(play("times2", hp(3)), hp(6));
});

test("choosing a fraction part doesn't consume the card and the panel previews both outcomes", () => {
  const state = stateFor("times2", hp(3, 4));
  const before = structuredClone(state);
  const html = renderToStaticMarkup(createElement(ActionDock, {
    state, pending:{cardUid:"fraction-test",target:1}, onTarget(){}, onZone(){}, onRoot(){}, onSubstitution(){}, onFractionPart(){}, onCancel(){},
  }));
  assert.ok(html.includes("Чисельник"));
  assert.ok(html.includes("Знаменник"));
  assert.ok(html.includes("HP → 3/2"));
  assert.ok(html.includes("HP → 3/8"));
  assert.ok(html.includes("КРОК 2 / 2"));
  assert.deepEqual(state, before);
});

test("numerator times zero creates exact zero, denominator times zero creates recoverable collapse", () => {
  assert.deepEqual(play("times0", hp(3, 4), "numerator"), hp(0));
  const collapsed = play("times0", hp(3, 4), "denominator");
  assert.deepEqual(collapsed, {...hp(3,4),divisionByZero:true});
  assert.equal(isCritical(collapsed).kind, "division-zero");
  const state = stateFor("restore", hp(20));
  state.players[0].hp = collapsed;
  const restored = playMove(state, 0, {cardUid:"fraction-test"});
  assert.deepEqual(restored.players[0].hp, hp(3,4));
  assert.equal(restored.phase, "playing");
});

test("division-by-zero rollback and swapping preserve the entire fraction", () => {
  const collapsed = play("div0", hp(-5, 8));
  const state = stateFor("restore", hp(20));
  state.players[0].hp = collapsed;
  assert.deepEqual(playMove(state, 0, {cardUid:"fraction-test"}).players[0].hp, hp(-5,8));
  assert.deepEqual(play("swap", hp(3,4)), hp(20));
  const swap = stateFor("swap", hp(3,4));
  const next = playMove(swap, 0, {cardUid:"fraction-test"});
  assert.deepEqual(next.players[0].hp, hp(3,4));
});

test("only a genuine zero triggers obnulled HP, including after fractional combinations", () => {
  let value = hp(1);
  for (let i=0;i<80;i++) value = applyNumeric(value,"div2");
  assert.equal(numericLabel(value), `1/${2n ** 80n}`);
  assert.equal(isCritical(value).critical, false);
  assert.notEqual(hpLabel(value), "0");
  const underflow = hp(1, 2n ** 2000n);
  assert.equal(underflow.value, 0);
  assert.equal(isCritical(underflow).critical, false);
  const one = play("times2", hp(1,2), "numerator") as NumericHp;
  assert.equal(isCritical(play("minus1", one)).critical, true);
});

test("square roots preserve rational results and explicitly mark irrational approximations", () => {
  assert.deepEqual(play("sqrt", hp(1,4)), hp(1,2));
  assert.deepEqual(play("sqrt", hp(9,16)), hp(3,4));
  const irrational = play("sqrt", hp(2));
  assert.equal(irrational.kind, "number");
  if(irrational.kind!=="number")throw new Error();
  assert.equal(irrational.approximate, true);
  assert.ok(hpLabel(irrational).startsWith("≈1.414"));
  assert.equal(isCritical(play("div2", irrational)).critical, false);
});

test("factorial and digit mirror reject fractions without spending resources", () => {
  for(const id of ["fact","mirror"] as const){
    const state=stateFor(id,hp(3,2));
    const next=playMove(state,0,{cardUid:"fraction-test",target:1});
    assert.deepEqual(next.players,state.players);
    assert.equal(next.cardsThisTurn,0);
  }
});

test("linear, quadratic and cubic rational roots stay fractional and irrational roots aren't invented fractions", () => {
  assert.deepEqual(hpFromRoot([-1,3], 1/3), hp(1,3));
  assert.deepEqual(hpFromRoot([-1,1,2], .5), hp(1,2));
  assert.deepEqual(hpFromRoot([-1,0,0,8], .5), hp(1,2));
  const sqrt2=hpFromRoot([-2,0,1],Math.SQRT2);
  assert.equal(sqrt2.approximate,true);
  const state=stateFor("rationalRoot",hp(1));
  state.players[1].hp={kind:"equation",poly:[-1,3]};
  const move={cardUid:"fraction-test",target:1 as const,root:1/3};
  assert.deepEqual(playMove(state,0,move).players[1].hp,hp(1,3));
  state.players[0].hand[0].id="cancel";
  assert.deepEqual(playMove(state,0,{cardUid:"fraction-test",target:1}).players[1].hp,hp(1,3));
  const options=rootOptions("rationalRoot",[-1,3]);
  assert.equal(options[0].label,"1/3");
  assert.notEqual(options[0].note,"округлиться вниз");
  assert.equal(rootOptions("rationalRoot",[-1000,1])[0].label,"1000");
});

test("numeric fractions convert to equations with integer coefficients and return exactly", () => {
  const state=stateFor("xcard",hp(-3,4));
  const next=playMove(state,0,{cardUid:"fraction-test",target:1});
  assert.deepEqual(next.players[1].hp,{kind:"equation",poly:[3,4]});
  assert.deepEqual(hpFromRoot([3,4],-.75),hp(-3,4));
});

test("HP magnitude limits still apply without flooring small fractions", () => {
  assert.deepEqual(play("times2",hp(1499,2),"numerator"),hp(999));
  assert.deepEqual(play("square",hp(1001,2)),hp(999));
  assert.deepEqual(hpFromFraction(fraction(-10000,3)),hp(-999));
  assert.deepEqual(play("div2",hp(1,1000)),hp(1,2000));
});

test("fractional HP survives JSON serialization and subsequent exact arithmetic", () => {
  const state=stateFor("times2",hp(1,3));
  const restored=JSON.parse(JSON.stringify(state)) as GameState;
  const next=playMove(restored,0,{cardUid:"fraction-test",target:1,fractionPart:"denominator"});
  assert.deepEqual(next.players[1].hp,hp(1,6));
});

test("HP panel displays a real fraction and AI can use denominator multiplication", () => {
  const state=stateFor("times2",hp(3,4));
  const html=renderToStaticMarkup(createElement(HpPanel,{player:state.players[1],startHp:20,side:1,active:true,showGraph:false}));
  assert.ok(html.includes('aria-label="3/4"'));
  assert.ok(html.includes('aria-valuenow="0.75"'));
  state.turn=1;
  state.players[0].hp=hp(3,4);
  state.players[1].hp=hp(20);
  state.players[1].hand=[{id:"times2",uid:"ai-fraction"}];
  state.players[1].oo=6;
  const moves=legalMoves(state,1);
  assert.ok(moves.some((m)=>m.target===0&&m.fractionPart==="denominator"));
  const plan=aiDecide(state,{greedy:true});
  assert.ok(plan);
  assert.equal(checkMove(state,1,plan!.move).ok,true);
});

test("new fraction tutorials can both be completed", () => {
  for(const id of ["fraction-half","fraction-denominator"]){
    const pz=PUZZLES.find((p)=>p.id===id)!;
    const state=pz.build();
    const inst=state.players[0].hand.find((c)=>c.id===(id==="fraction-half"?"div2":"times2"))!;
    assert.equal(pz.solved(state),false);
    const next=playMove(state,0,{cardUid:inst.uid,target:1,fractionPart:id==="fraction-half"?undefined:"denominator"});
    assert.equal(pz.solved(next),true);
  }
});
