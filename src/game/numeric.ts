import { addFractions, divideFractions, fraction, fractionFromNumber, fractionLabel, fractionValue, multiplyFractions, moduloFraction, sqrtFraction, type Fraction } from "./fractions";
import { clampHp, factorial, fmtNum, reverseDigits, type Poly } from "./math";
import type { CardId, NumericHp, FractionPart } from "./types";

export function exactFraction(hp: NumericHp): Fraction | null {
  return hp.approximate ? null : hp.fraction ?? fractionFromNumber(hp.value);
}
export function isFractionHp(hp: NumericHp): boolean {
  const f = exactFraction(hp);
  return !!f && f.denominator !== "1";
}
export function isIntegerHp(hp: NumericHp): boolean {
  const f = exactFraction(hp);
  return !!f && f.denominator === "1";
}
export function isZeroHp(hp: NumericHp): boolean {
  return hp.fraction ? hp.fraction.numerator === "0" : hp.value === 0;
}
export function hpFromFraction(input: Fraction): NumericHp {
  const f = fraction(input.numerator, input.denominator);
  const n = BigInt(f.numerator), d = BigInt(f.denominator);
  if (n > 999n * d) return { kind: "number", value: 999 };
  if (n < -999n * d) return { kind: "number", value: -999 };
  if (f.denominator === "1") return { kind: "number", value: Number(f.numerator) };
  return { kind: "number", value: fractionValue(f), fraction: f };
}
export function numericLabel(hp: NumericHp): string {
  const f = exactFraction(hp);
  return f ? fractionLabel(f) : `≈${fmtNum(hp.value)}`;
}
export function numericMultiplier(id: CardId): number | null {
  return id === "times2" ? 2 : id === "times0" ? 0 : null;
}
export function numericHp(value: number, approximate = false): NumericHp {
  const v = clampHp(value);
  return approximate ? { kind: "number", value: v, approximate: true } : hpFromFraction(fractionFromNumber(v));
}

/** Exact arithmetic for rational HP; irrational results are explicitly approximate. */
export function applyNumeric(hp: NumericHp, id: CardId, part?: FractionPart): NumericHp {
  const f = exactFraction(hp), v = hp.value;
  const approximate = (value: number) => numericHp(value, true);
  switch (id) {
    case "plus1": case "plus3": case "minus1": case "minus3": {
      const delta = id === "plus1" ? 1 : id === "plus3" ? 3 : id === "minus1" ? -1 : -3;
      return f ? hpFromFraction(addFractions(f, fraction(delta))) : approximate(v + delta);
    }
    case "times2":
      return f ? hpFromFraction(part === "denominator" ? divideFractions(f, fraction(2)) : multiplyFractions(f, fraction(2))) : approximate(v * 2);
    case "div2": return f ? hpFromFraction(divideFractions(f, fraction(2))) : approximate(v / 2);
    case "square": return f ? hpFromFraction(multiplyFractions(f, f)) : approximate(v * v);
    case "sqrt": {
      const exact = f && sqrtFraction(f);
      return exact ? hpFromFraction(exact) : approximate(Math.sqrt(v));
    }
    case "abs": return f ? hpFromFraction(fraction(BigInt(f.numerator) < 0n ? -BigInt(f.numerator) : f.numerator, f.denominator)) : approximate(Math.abs(v));
    case "mod3": return f ? hpFromFraction(moduloFraction(f, 3)) : approximate(((v % 3) + 3) % 3);
    case "fact": return numericHp(factorial(v));
    case "mirror": return numericHp(reverseDigits(v));
    case "pow0": case "zeroFact": return numericHp(1);
    case "times0": return part === "denominator" ? { ...hp, divisionByZero: true } : numericHp(0);
    default: return hp;
  }
}

/** Preserve rational HP as integer coefficients when moving into an equation. */
export function numericPoly(hp: NumericHp): Poly {
  const f = exactFraction(hp);
  if (f && Number.isSafeInteger(Number(f.numerator)) && Number.isSafeInteger(Number(f.denominator))) {
    return [-Number(f.numerator), Number(f.denominator)];
  }
  return [-hp.value, 1];
}
function isExactRoot(poly: Poly, root: Fraction): boolean {
  let sum = fraction(0);
  for (let i = poly.length - 1; i >= 0; i--) sum = addFractions(multiplyFractions(sum, root), fractionFromNumber(poly[i]));
  return sum.numerator === "0";
}
/** Verify rational candidates exactly; don't turn an irrational root into a made-up fraction. */
export function hpFromRoot(poly: Poly, root: number): NumericHp {
  if (poly.length === 2 && poly[1] !== 0) {
    return hpFromFraction(divideFractions(fractionFromNumber(-poly[0]), fractionFromNumber(poly[1])));
  }
  const decimal = fractionFromNumber(root);
  if (isExactRoot(poly, decimal)) return hpFromFraction(decimal);
  let x = Math.abs(root), n0 = 0, n1 = 1, d0 = 1, d1 = 0;
  for (let i = 0; i < 40 && Number.isFinite(x); i++) {
    const a = Math.floor(x), n = a * n1 + n0, d = a * d1 + d0;
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d > 1_000_000) break;
    const candidate = fraction(root < 0 ? -n : n, d);
    if (isExactRoot(poly, candidate)) return hpFromFraction(candidate);
    [n0, n1, d0, d1] = [n1, n, d1, d];
    x = 1 / (x - a);
  }
  return numericHp(root, true);
}

/** A root label shows the actual root, before the HP magnitude limit is applied. */
export function rootLabel(poly: Poly, root: number): string {
  return Math.abs(root) > 999 ? fmtNum(root) : numericLabel(hpFromRoot(poly, root));
}
