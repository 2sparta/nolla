/** JSON-safe exact fraction. Arithmetic uses BigInt; game state contains strings. */
export interface Fraction {
  numerator: string;
  denominator: string;
}

const abs = (n: bigint) => n < 0n ? -n : n;
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a); b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
export function fraction(n: bigint | number | string, d: bigint | number | string = 1): Fraction {
  let numerator = BigInt(n), denominator = BigInt(d);
  if (denominator === 0n) throw new Error("Zero denominator");
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const divisor = gcd(numerator, denominator);
  return { numerator: String(numerator / divisor), denominator: String(denominator / divisor) };
}
export function fractionFromNumber(value: number): Fraction {
  if (!Number.isFinite(value)) throw new Error("Non-finite fraction");
  const [mantissa, exponent = "0"] = String(value).toLowerCase().split("e");
  const decimals = mantissa.split(".")[1]?.length ?? 0;
  const power = Number(exponent) - decimals;
  const digits = BigInt(mantissa.replace(".", ""));
  return power >= 0 ? fraction(digits * 10n ** BigInt(power)) : fraction(digits, 10n ** BigInt(-power));
}
export function fractionValue(f: Fraction): number {
  const n = Number(f.numerator), d = Number(f.denominator);
  if (Number.isFinite(n) && Number.isFinite(d)) return n / d;
  const ns = abs(BigInt(f.numerator)).toString(), ds = f.denominator;
  const np = ns.slice(0, 16), dp = ds.slice(0, 16);
  return (BigInt(f.numerator) < 0n ? -1 : 1) * Number(np) / Number(dp) * 10 ** ((ns.length - np.length) - (ds.length - dp.length));
}
export function fractionLabel(f: Fraction): string {
  return f.denominator === "1" ? f.numerator : `${f.numerator}/${f.denominator}`;
}
export function addFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}
export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(BigInt(a.numerator) * BigInt(b.numerator), BigInt(a.denominator) * BigInt(b.denominator));
}
export function divideFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(BigInt(a.numerator) * BigInt(b.denominator), BigInt(a.denominator) * BigInt(b.numerator));
}
function integerSqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("Negative square root");
  if (n < 2n) return n;
  let x = n, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}
export function sqrtFraction(f: Fraction): Fraction | null {
  const n = BigInt(f.numerator), d = BigInt(f.denominator);
  if (n < 0n) return null;
  const nr = integerSqrt(n), dr = integerSqrt(d);
  return nr * nr === n && dr * dr === d ? fraction(nr, dr) : null;
}
export function moduloFraction(f: Fraction, modulus: number): Fraction {
  const n = BigInt(f.numerator), d = BigInt(f.denominator), m = BigInt(modulus) * d;
  return fraction(((n % m) + m) % m, d);
}
