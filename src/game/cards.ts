import {
  allRoots,
  degree,
  factorableOverIntegers,
  isInteger,
  isRational,
  polyToString,
  realRoots,
  type Poly,
  type Root,
} from "./math";
import type { CardDef, CardId } from "./types";

export const CARDS: Record<CardId, CardDef> = {
  plus1: {
    id: "plus1", symbol: "+1", name: "Інкремент", cost: 1, category: "math", accent: "lime",
    desc: "HP +1. Для рівняння — зсуває корінь.",
    rule: "Ліва частина: a₀+1. Права: корінь +1. Обидві: нічого не змінюється.",
    count: 3, onNumber: true, onEquation: true, zones: true, needsRoot: false, resolves: false,
  },
  plus3: {
    id: "plus3", symbol: "+3", name: "Стрибок", cost: 2, category: "math", accent: "lime",
    desc: "HP +3. Для рівняння — зсуває корінь на 3.",
    rule: "Права частина: корінь зростає на 3.",
    count: 2, onNumber: true, onEquation: true, zones: true, needsRoot: false, resolves: false,
  },
  minus1: {
    id: "minus1", symbol: "−1", name: "Крок униз", cost: 1, category: "math", accent: "magenta",
    desc: "HP −1. Для рівняння — зсуває корінь униз.",
    rule: "HP може бути від’ємним. Критичний стан — лише рівно 0.",
    count: 3, onNumber: true, onEquation: true, zones: true, needsRoot: false, resolves: false,
  },
  minus3: {
    id: "minus3", symbol: "−3", name: "Обвал", cost: 2, category: "math", accent: "magenta",
    desc: "HP −3 одразу.",
    rule: "Права частина рівняння: корінь −3.",
    count: 2, onNumber: true, onEquation: true, zones: true, needsRoot: false, resolves: false,
  },
  times2: {
    id: "times2", symbol: "×2", name: "Подвоєння", cost: 2, category: "math", accent: "cyan",
    desc: "HP ×2 — собі, або подвоєння коефіцієнтів рівняння.",
    rule: "Ліва/обидві частини: усі коефіцієнти ×2 (корені ті самі).",
    count: 2, onNumber: true, onEquation: true, zones: true, needsRoot: false, resolves: false,
  },
  div2: {
    id: "div2", symbol: "÷2", name: "Розтин", cost: 2, category: "math", accent: "cyan",
    desc: "HP ÷2 (округлення вниз).",
    rule: "Дробове число завжди округлюється вниз.",
    count: 2, onNumber: true, onEquation: true, zones: true, needsRoot: false, resolves: false,
  },
  square: {
    id: "square", symbol: "x²", name: "Квадрат", cost: 3, category: "math", accent: "amber",
    desc: "Підносить HP до квадрата або підносить ліву частину рівняння до квадрата.",
    rule: "Для рівняння: (LHS)² = 0, степінь подвоюється. Заборонено, якщо степінь стане > 3.",
    count: 2, onNumber: true, onEquation: true, zones: true, needsRoot: false, resolves: false,
  },
  sqrt: {
    id: "sqrt", symbol: "√x", name: "Корінь", cost: 2, category: "math", accent: "lime",
    desc: "HP = ⌊√HP⌋.",
    rule: "Лише для HP ≥ 0. Не застосовується до рівнянь.",
    count: 2, onNumber: true, onEquation: false, zones: false, needsRoot: false, resolves: false,
  },
  fact: {
    id: "fact", symbol: "x!", name: "Факторіал", cost: 3, category: "math", accent: "amber",
    desc: "HP = HP! (дозволено лише для 0 ≤ HP ≤ 6).",
    rule: "0! = 1. Факторіал рівняння не визначено.",
    count: 1, onNumber: true, onEquation: false, zones: false, needsRoot: false, resolves: false,
  },
  abs: {
    id: "abs", symbol: "|x|", name: "Модуль", cost: 2, category: "math", accent: "lime",
    desc: "HP = |HP|: від’ємне стає додатним, інше не змінюється.",
    rule: "−7 → 7; 7 → 7; 0 → 0. Лише числове HP, ціль — будь-який гравець.",
    count: 2, onNumber: true, onEquation: false, zones: false, needsRoot: false, resolves: false,
  },
  mod3: {
    id: "mod3", symbol: "mod 3", name: "Остача", cost: 2, category: "math", accent: "violet",
    desc: "HP = HP mod 3. Непередбачуваний і різкий.",
    rule: "Працює лише з числовим HP.",
    count: 2, onNumber: true, onEquation: false, zones: false, needsRoot: false, resolves: false,
  },
  pow0: {
    id: "pow0", symbol: "x⁰", name: "Нульовий степінь", cost: 2, category: "rescue", accent: "amber",
    desc: "Усе стає одиницею: HP = 1. РЯТІВНА КАРТКА.",
    rule: "Рівняння перетворюється на тотожність 1 = 1 і колапсує в HP = 1.",
    count: 2, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: true,
  },
  zeroFact: {
    id: "zeroFact", symbol: "0!", name: "Нуль-факторіал", cost: 2, category: "rescue", accent: "amber",
    desc: "0! = 1. Виводить зі стану «Обнулення». РЯТІВНА КАРТКА.",
    rule: "Порятунок витрачає хід: після нього хід одразу завершується.",
    count: 2, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: true,
  },
  restore: {
    id: "restore", symbol: "↶", name: "Відкат", cost: 1, category: "rescue", accent: "lime",
    desc: "Скасовує колапс після ÷0 та повертає попереднє числове HP.",
    rule: "Лише на себе після ÷0. Дві карти в колоді. Порятунок завершує хід; звичайне HP = 0 не лікує.",
    count: 2, onNumber: true, onEquation: false, zones: false, needsRoot: false, resolves: false,
  },
  substitute: {
    id: "substitute", symbol: "x↦", name: "Заміна змінної", cost: 2, category: "transform", accent: "violet",
    desc: "Підставляє x ± 1 або x ± 3 у все рівняння. Оберіть підстановку.",
    rule: "Лише рівняння будь-якого гравця. x → x + k зміщує кожен корінь на −k; степінь зберігається.",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: false, needsSubstitution: true, resolves: false,
  },
  times0: {
    id: "times0", symbol: "×0", name: "Анігіляція", cost: 4, category: "forbidden", accent: "red",
    desc: "HP ×0 → 0. Супротивник входить у стан «Обнулення».",
    rule: "Рівняння: 0 = 0 — тотожність, колапсує в HP = 1 (безпечно!).",
    count: 1, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: false,
  },
  div0: {
    id: "div0", symbol: "÷0", name: "Ділення на нуль", cost: 5, category: "forbidden", accent: "red",
    desc: "Число: колапс із ходом на порятунок. Графік: миттєва поразка.",
    rule: "Число: врятуйтеся «Відкатом» або «Обміном» до кінця свого ходу. Рівняння: HP = 1. Графік: миттєва поразка.",
    count: 1, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: false,
  },
  swap: {
    id: "swap", symbol: "⇄", name: "Обмін", cost: 3, category: "transform", accent: "violet",
    desc: "Гравці міняються HP — разом із рівняннями та графіками.",
    rule: "Обмінює стани повністю: число, поліном і режим графіка.",
    count: 1, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: false,
  },
  mirror: {
    id: "mirror", symbol: "⟲", name: "Дзеркало", cost: 3, category: "transform", accent: "violet",
    desc: "Цифри перевертаються зі збереженням знака (−21 → −12). Рівняння: x → −x.",
    rule: "Корені рівняння стають протилежними: 5 → −5. Від’ємні корені зберігаються.",
    count: 1, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: false,
  },
  cancel: {
    id: "cancel", symbol: "⌀", name: "Скасування", cost: 2, category: "transform", accent: "cyan",
    desc: "Прибирає рівняння/графік: HP = найбільший дійсний корінь.",
    rule: "Від’ємні корені дозволені. Якщо дійсних коренів немає — HP стає 1.",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: false, resolves: true,
  },
  xcard: {
    id: "xcard", symbol: "x", name: "Змінна X", cost: 2, category: "transform", accent: "magenta",
    desc: "Число HP перетворюється на рівняння x − HP = 0.",
    rule: "Повторна гра підвищує степінь і додає корінь 0. 4-й степінь заборонено.",
    count: 10, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: false,
  },
  ycard: {
    id: "ycard", symbol: "y", name: "Площина Y", cost: 4, category: "transform", accent: "cyan",
    desc: "Битва переходить у площину графіка: HP стає функцією f(x).",
    rule: "У режимі графіка поразка = немає дійсних коренів або ділення на нуль.",
    count: 2, onNumber: true, onEquation: true, zones: false, needsRoot: false, resolves: false,
  },
  discriminant: {
    id: "discriminant", symbol: "D", name: "Дискримінант", cost: 2, category: "helper", accent: "amber",
    desc: "Квадратне рівняння: обрати будь-який корінь, навіть комплексний.",
    rule: "Тільки степінь 2. Комплексний корінь → HP = 0 (небезпека!).",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: true, resolves: true,
  },
  vieta: {
    id: "vieta", symbol: "Вієт", name: "Теорема Вієта", cost: 2, category: "helper", accent: "amber",
    desc: "Обрати будь-який дійсний корінь (степінь 2 або 3).",
    rule: "HP = ⌊корінь⌋, рівняння скасовується.",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: true, resolves: true,
  },
  factor: {
    id: "factor", symbol: "(a·b)", name: "Розкладання", cost: 2, category: "helper", accent: "lime",
    desc: "Якщо рівняння розкладається на цілі множники — обрати цілий корінь.",
    rule: "Доступно лише коли всі корені цілі.",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: true, resolves: true,
  },
  cardano: {
    id: "cardano", symbol: "∛", name: "Формула Кардано", cost: 3, category: "helper", accent: "violet",
    desc: "Кубічне рівняння: знайти дійсний корінь.",
    rule: "Тільки степінь 3.",
    count: 1, onNumber: false, onEquation: true, zones: false, needsRoot: true, resolves: true,
  },
  trigVieta: {
    id: "trigVieta", symbol: "cos φ", name: "Триг. формула Вієта", cost: 3, category: "helper", accent: "violet",
    desc: "Кубічне рівняння з трьома дійсними коренями — обрати будь-який.",
    rule: "Тільки степінь 3 і три різні дійсні корені.",
    count: 1, onNumber: false, onEquation: true, zones: false, needsRoot: true, resolves: true,
  },
  rationalRoot: {
    id: "rationalRoot", symbol: "p/q", name: "Раціональний корінь", cost: 2, category: "helper", accent: "lime",
    desc: "Знайти раціональний корінь рівняння будь-якого степеня.",
    rule: "Якщо раціональних коренів немає — карта не грається.",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: true, resolves: true,
  },
  horner: {
    id: "horner", symbol: "⌐a", name: "Схема Горнера", cost: 3, category: "helper", accent: "cyan",
    desc: "Поділити рівняння на (x − a), знизивши степінь і прибравши корінь a.",
    rule: "HP лишається рівнянням. Ідеально, щоб вирізати корінь 0.",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: true, resolves: false,
  },
  graphAnalysis: {
    id: "graphAnalysis", symbol: "∿", name: "Графічний аналіз", cost: 1, category: "helper", accent: "cyan",
    desc: "Показує кількість дійсних коренів і дає додаткову карту.",
    rule: "Працює на будь-якому рівнянні чи графіку — своєму або чужому.",
    count: 2, onNumber: false, onEquation: true, zones: false, needsRoot: false, resolves: false,
  },
};

export const CARD_LIST = Object.values(CARDS);

export function card(id: CardId): CardDef {
  return CARDS[id];
}

export function buildDeck(): CardId[] {
  const out: CardId[] = [];
  for (const def of CARD_LIST) for (let i = 0; i < def.count; i++) out.push(def.id);
  return out;
}

export interface RootOption {
  value: Root;
  label: string;
  dangerous: boolean;
  disabled?: boolean;
  note?: string;
}

/** Чи можна застосувати допоміжну картку до полінома */
export function helperAvailability(id: CardId, poly: Poly): { ok: boolean; reason: string } {
  const d = degree(poly);
  const rr = realRoots(poly);
  switch (id) {
    case "discriminant":
      return d === 2 ? { ok: true, reason: "" } : { ok: false, reason: "Потрібне квадратне рівняння (степінь 2)" };
    case "vieta":
      return d === 2 || d === 3 ? { ok: true, reason: "" } : { ok: false, reason: "Лише степінь 2 або 3" };
    case "factor":
      return factorableOverIntegers(poly)
        ? { ok: true, reason: "" }
        : { ok: false, reason: "Рівняння не розкладається на цілі множники" };
    case "cardano":
      return d === 3 ? { ok: true, reason: "" } : { ok: false, reason: "Потрібне кубічне рівняння (степінь 3)" };
    case "trigVieta":
      return d === 3 && rr.length === 3
        ? { ok: true, reason: "" }
        : { ok: false, reason: "Потрібні три дійсні корені кубічного рівняння" };
    case "rationalRoot":
      return rr.some(isRational)
        ? { ok: true, reason: "" }
        : { ok: false, reason: "Раціональних коренів немає" };
    case "horner":
      return d >= 2 && rr.length > 0
        ? { ok: true, reason: "" }
        : { ok: false, reason: "Потрібен поліном степеня ≥ 2 з дійсним коренем" };
    case "graphAnalysis":
      return { ok: true, reason: "" };
    default:
      return { ok: false, reason: "Не допоміжна карта" };
  }
}

/** Які корені можна обрати цією картою */
export function rootOptions(id: CardId, poly: Poly): RootOption[] {
  const opts: RootOption[] = [];
  const seen = new Set<string>();
  const push = (r: Root) => {
    const key = `${r.re.toFixed(6)}|${r.im.toFixed(6)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const complex = Math.abs(r.im) > 1e-7;
    opts.push({
      value: r,
      label: complex ? `${fmt(r.re)} ${r.im > 0 ? "+" : "−"} ${fmt(Math.abs(r.im))}i` : fmt(r.re),
      dangerous: !complex && Math.abs(r.re) < 1e-9,
      disabled: false,
      note: complex
        ? "недійсний корінь — HP зникне"
        : r.multiplicity > 1
          ? `кратність ${r.multiplicity}`
          : Math.abs(r.re) < 1e-9
            ? "НЕБЕЗПЕЧНИЙ КОРІНЬ"
            : !isInteger(r.re)
              ? "округлиться вниз"
              : undefined,
    });
  };
  if (id === "discriminant") allRoots(poly).forEach(push);
  else if (id === "factor") realRoots(poly).filter(isInteger).forEach((v) => push({ re: v, im: 0, multiplicity: 1 }));
  else if (id === "rationalRoot") realRoots(poly).filter(isRational).forEach((v) => push({ re: v, im: 0, multiplicity: 1 }));
  else realRoots(poly).forEach((v) => push({ re: v, im: 0, multiplicity: 1 }));
  return opts.sort((a, b) => a.value.re - b.value.re);
}

function fmt(n: number): string {
  const r = Math.round(n * 1000) / 1000;
  return String(Number.isInteger(r) ? r : r);
}

/** Підказка для гравця: що показує поточний стан HP */
export function hpSummaryText(poly: Poly): string {
  return polyToString(poly);
}
