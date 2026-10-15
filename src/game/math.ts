/**
 * Поліном у формі масиву коефіцієнтів за зростанням степеня:
 * p = [a0, a1, a2, a3]  →  a0 + a1·x + a2·x² + a3·x³
 */
export type Poly = number[];

export const EPS = 1e-9;

export function trim(p: Poly): Poly {
  const q = [...p];
  while (q.length > 1 && Math.abs(q[q.length - 1]) < EPS) q.pop();
  return q.map((c) => (Math.abs(c) < EPS ? 0 : c));
}

export function degree(p: Poly): number {
  return trim(p).length - 1;
}

export function isZeroPoly(p: Poly): boolean {
  return p.every((c) => Math.abs(c) < EPS);
}

/** 0 = a0 + a1x ... — тотожність (нескінченність розв'язків) */
export function isIdentity(p: Poly): boolean {
  return isZeroPoly(p);
}

/** c ≠ 0, степінь 0 — розв'язків немає */
export function isContradiction(p: Poly): boolean {
  const t = trim(p);
  return t.length === 1 && Math.abs(t[0]) > EPS;
}

export function scalePoly(p: Poly, k: number): Poly {
  return trim(p.map((c) => c * k));
}

export function addConst(p: Poly, k: number): Poly {
  const r = [...p];
  while (r.length < 1) r.push(0);
  r[0] = r[0] + k;
  return trim(r);
}

export function mulPoly(a: Poly, b: Poly): Poly {
  const res = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) res[i + j] += a[i] * b[j];
  }
  return trim(res);
}

/** Підстановка x → −x (віддзеркалення коренів) */
export function negateVariable(p: Poly): Poly {
  return trim(p.map((c, i) => (i % 2 === 1 ? -c : c)));
}

/** Синтетичний поділ (схема Горнера) на (x − root). Повертає частку та остачу. */
export function hornerDivide(p: Poly, root: number): { quotient: Poly; remainder: number } {
  const t = trim(p);
  const n = t.length;
  const q = new Array(n - 1).fill(0);
  let carry = t[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    q[i] = carry;
    carry = t[i] + carry * root;
  }
  return { quotient: trim(q.length ? q : [0]), remainder: carry };
}

function polish(p: Poly, r: number): number {
  let x = r;
  for (let i = 0; i < 6; i++) {
    const f = evalPoly(p, x);
    let d = 0;
    const t = trim(p);
    for (let k = t.length - 1; k >= 1; k--) d = d * x + k * t[k];
    if (Math.abs(d) < EPS) break;
    const nx = x - f / d;
    if (!Number.isFinite(nx)) break;
    if (Math.abs(nx - x) < 1e-12) { x = nx; break; }
    x = nx;
  }
  return Math.abs(x) < 1e-7 ? 0 : x;
}

export function evalPoly(p: Poly, x: number): number {
  let acc = 0;
  for (let i = p.length - 1; i >= 0; i--) acc = acc * x + p[i];
  return acc;
}

/** Усі корені (дійсні та комплексні) для степеня ≤ 3, інакше — лише дійсні (числово). */
export interface Root {
  re: number;
  im: number;
  multiplicity: number;
}

export function allRoots(p: Poly): Root[] {
  const t = trim(p);
  const d = t.length - 1;
  if (d <= 0) return [];
  if (d === 1) return [{ re: -t[0] / t[1], im: 0, multiplicity: 1 }];
  if (d === 2) {
    const [a, b, c] = [t[2], t[1], t[0]];
    const D = b * b - 4 * a * c;
    if (D > EPS) {
      const s = Math.sqrt(D);
      return sortRoots([
        { re: (-b + s) / (2 * a), im: 0, multiplicity: 1 },
        { re: (-b - s) / (2 * a), im: 0, multiplicity: 1 },
      ]);
    }
    if (Math.abs(D) <= EPS) return [{ re: -b / (2 * a), im: 0, multiplicity: 2 }];
    const s = Math.sqrt(-D);
    return sortRoots([
      { re: -b / (2 * a), im: s / (2 * a), multiplicity: 1 },
      { re: -b / (2 * a), im: -s / (2 * a), multiplicity: 1 },
    ]);
  }
  if (d === 3) return sortRoots(cubicRoots(t[3], t[2], t[1], t[0]));
  return sortRoots(numericRealRoots(t).map((re) => ({ re, im: 0, multiplicity: 1 })));
}

function sortRoots(roots: Root[]): Root[] {
  return [...roots].sort((a, b) => a.re - b.re || a.im - b.im);
}

function cubicRoots(a: number, b: number, c: number, d: number): Root[] {
  // x³ + px + q після депресації
  const A = b / a;
  const B = c / a;
  const C = d / a;
  const p = B - (A * A) / 3;
  const q = (2 * A * A * A) / 27 - (A * B) / 3 + C;
  const disc = (q * q) / 4 + (p * p * p) / 27;
  const off = -A / 3;
  const roots: Root[] = [];
  if (disc > EPS) {
    const s = Math.sqrt(disc);
    const u = Math.cbrt(-q / 2 + s);
    const v = Math.cbrt(-q / 2 - s);
    const r1 = u + v + off;
    const re = -(u + v) / 2 + off;
    const im = ((u - v) * Math.sqrt(3)) / 2;
    roots.push({ re: r1, im: 0, multiplicity: 1 });
    if (Math.abs(im) > EPS) {
      roots.push({ re, im: Math.abs(im), multiplicity: 1 });
      roots.push({ re, im: -Math.abs(im), multiplicity: 1 });
    } else {
      roots.push({ re, im: 0, multiplicity: 2 });
    }
  } else if (Math.abs(disc) <= EPS) {
    const u = Math.cbrt(-q / 2);
    roots.push({ re: 2 * u + off, im: 0, multiplicity: 1 });
    roots.push({ re: -u + off, im: 0, multiplicity: 2 });
  } else {
    // тригонометрична форма Вієта — три дійсні корені
    const r = Math.sqrt(-(p * p * p) / 27);
    const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
    const m = 2 * Math.sqrt(-p / 3);
    for (let k = 0; k < 3; k++) {
      roots.push({ re: m * Math.cos((phi + 2 * Math.PI * k) / 3) + off, im: 0, multiplicity: 1 });
    }
  }
  return roots.map((rt) => ({ ...rt, re: Math.abs(rt.re) < 1e-7 ? 0 : polish([d, c, b, a], rt.re) || rt.re }));
}

function numericRealRoots(t: Poly): number[] {
  const found: number[] = [];
  for (let x = -60; x <= 60.001; x += 0.05) {
    const y1 = evalPoly(t, x);
    const y2 = evalPoly(t, x + 0.05);
    if (y1 === 0) found.push(x);
    else if (y1 * y2 < 0) {
      let lo = x;
      let hi = x + 0.05;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (evalPoly(t, lo) * evalPoly(t, mid) <= 0) hi = mid;
        else lo = mid;
      }
      found.push((lo + hi) / 2);
    }
  }
  return found.map((r) => polish(t, r));
}

/** Дійсні корені (без дублікатів, відсортовані) */
export function realRoots(p: Poly): number[] {
  if (isIdentity(p) || isContradiction(p)) return [];
  const out: number[] = [];
  for (const r of allRoots(p)) {
    if (Math.abs(r.im) < 1e-7) {
      const v = Math.abs(r.re) < 1e-9 ? 0 : r.re;
      if (!out.some((o) => Math.abs(o - v) < 1e-7)) out.push(v);
    }
  }
  return out.sort((a, b) => a - b);
}

/** Корені з кратністю (для показу «0 з'явився двічі») */
export function rootsWithMultiplicity(p: Poly): Root[] {
  return allRoots(p).map((r) => ({ ...r, re: Math.abs(r.re) < 1e-9 ? 0 : r.re }));
}

export function hasZeroRoot(p: Poly): boolean {
  return Math.abs(trim(p)[0] ?? 0) < EPS && degree(p) >= 1;
}

export function isRational(x: number): boolean {
  for (let q = 1; q <= 24; q++) {
    const v = x * q;
    if (Math.abs(v - Math.round(v)) < 1e-7) return true;
  }
  return false;
}

export function isInteger(x: number): boolean {
  return Math.abs(x - Math.round(x)) < 1e-7;
}

/** Чи розкладається поліном на лінійні множники з цілими коренями */
export function factorableOverIntegers(p: Poly): boolean {
  const r = realRoots(p);
  return r.length > 0 && r.every(isInteger) && r.length === degree(p);
}

/** Раціональні корені (теорема про раціональний корінь) */
export function rationalRoots(p: Poly): number[] {
  return realRoots(p).filter(isRational);
}

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴" };

export function sup(n: number): string {
  return String(n).split("").map((c) => SUP[c] ?? c).join("");
}

export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const r = Math.round(n);
  if (Math.abs(n - r) < 1e-7) return String(r);
  return String(Math.round(n * 100) / 100);
}

/** «x³ − 5x² = 0» */
export function polyToString(p: Poly, varName = "x"): string {
  const t = trim(p);
  if (isZeroPoly(t)) return "0 = 0";
  if (t.length === 1) return `${fmtNum(t[0])} = 0`;
  const parts: string[] = [];
  for (let i = t.length - 1; i >= 0; i--) {
    const c = t[i];
    if (Math.abs(c) < EPS) continue;
    const sign = c < 0 ? "−" : parts.length ? "+" : "";
    const abs = Math.abs(c);
    let coef = fmtNum(abs);
    if (i > 0 && abs === 1) coef = "";
    const term = i === 0 ? coef : `${coef}${varName}${i > 1 ? sup(i) : ""}`;
    parts.push(`${sign}${sign ? " " : ""}${term}`);
  }
  return `${parts.join(" ")} = 0`;
}

export function polyTerms(p: Poly, varName = "x"): { sign: string; body: string; sup?: string }[] {
  const t = trim(p);
  const out: { sign: string; body: string; sup?: string }[] = [];
  if (isZeroPoly(t)) return [{ sign: "", body: "0" }];
  for (let i = t.length - 1; i >= 0; i--) {
    const c = t[i];
    if (Math.abs(c) < EPS) continue;
    const sign = c < 0 ? "−" : out.length ? "+" : "";
    const abs = Math.abs(c);
    let coef = fmtNum(abs);
    if (i > 0 && abs === 1) coef = "";
    out.push({
      sign,
      body: i === 0 ? coef : `${coef}${varName}`,
      sup: i > 1 ? sup(i) : undefined,
    });
  }
  return out;
}

export function factorial(n: number): number {
  if (n < 0) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function clampHp(v: number): number {
  if (!Number.isFinite(v)) return 999;
  const f = Math.floor(v);
  return Math.max(-999, Math.min(999, f));
}

export function reverseDigits(n: number): number {
  const s = String(Math.abs(Math.floor(n)));
  const r = Number(s.split("").reverse().join(""));
  return clampHp(Math.sign(n) * r);
}

/** Підстановка x → x + shift: p(x + shift), степінь не зростає. */
export function substituteVariable(p: Poly, shift: number): Poly {
  let out: Poly = [0];
  for (let i = p.length - 1; i >= 0; i--) {
    out = addConst(mulPoly(out, [shift, 1]), p[i]);
  }
  return trim(out);
}

export const SUBSTITUTION_SHIFTS = [-3, -1, 1, 3] as const;
export function substitutionLabel(shift: number): string {
  return `x → x ${shift < 0 ? "−" : "+"} ${Math.abs(shift)}`;
}
