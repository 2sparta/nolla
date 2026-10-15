import { useEffect, useState } from "react";
import { CARD_LIST } from "../game/cards";
import { MODES } from "../game/engine";
import type { Accent } from "../game/types";
import { cn } from "../utils/cn";

const ACC: Record<Accent, string> = {
  cyan: "text-neon-cyan border-neon-cyan/40 bg-neon-cyan/10",
  magenta: "text-neon-magenta border-neon-magenta/40 bg-neon-magenta/10",
  amber: "text-neon-amber border-neon-amber/40 bg-neon-amber/10",
  lime: "text-neon-lime border-neon-lime/40 bg-neon-lime/10",
  violet: "text-neon-violet border-neon-violet/40 bg-neon-violet/10",
  red: "text-neon-red border-neon-red/50 bg-neon-red/10",
};

const TABS = ["Основи", "Стани HP", "Рівняння", "Графіки", "Карти", "Режими"] as const;

export function Rules({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Основи");

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-8" onClick={onClose}>
      <div
        className="panel pop-in relative my-auto w-full max-w-4xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Правила гри НОЛЬ"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="font-display text-lg font-black tracking-tight text-white">ПРАВИЛА ГРИ «НОЛЬ»</div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-white/35">ПОВНА КНИГА ПРАВИЛ</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-2 font-mono text-xs text-white/60 transition hover:border-neon-red/60 hover:text-neon-red"
          >
            ESC ✕
          </button>
        </div>

        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider transition",
                tab === t ? "bg-neon-cyan text-ink-900" : "text-white/45 hover:bg-white/8 hover:text-white",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="scroll-thin max-h-[62vh] overflow-y-auto px-5 py-5 text-[13.5px] leading-relaxed text-white/70">
          {tab === "Основи" && (
            <div className="space-y-4">
              <Block title="Мета">
                У кожного гравця є HP (стартово 20). Гравці розігрують картки математичних операцій на себе або на супротивника.
                Перемога настає, якщо: HP супротивника = 0 і він не врятувався; його рівняння має корінь 0 або не має розв'язків;
                він не виправив колапс після ÷0; його графік не перетинає вісь X.
              </Block>
              <Block title="Структура ходу">
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Початок ходу: перевірка HP / рівняння / графіка. Якщо стан критичний — його треба виправити цього ходу.</li>
                  <li>Добір 1 картки та отримання очок операцій (ОО). ОО накопичуються між ходами.</li>
                  <li>Дія: зіграти 1 картку (у спід-режимі — 2). Дорогі карти, як «y» (4 ОО) або «÷0» (5 ОО), вимагають заощадження.</li>
                  <li>Кінець ходу. Якщо критичний стан не виправлено — поразка.</li>
                </ol>
              </Block>
              <Block title="Стан «Обнулення» та порятунок">
                Якщо HP стає 0, гравець входить у стан «Обнулення». На початку свого ходу він може зіграти рятівну картку{" "}
                <Mono>0!</Mono> або <Mono>x⁰</Mono>, щоб отримати 1 (також працює обмін <Mono>⇄</Mono>). Порятунок витрачає хід.
                Якщо рятівної карти немає — поразка.
              </Block>
              <Block title="Порятунок після ділення на нуль">
                На числовому HP карта <Mono>÷0</Mono> спричиняє «Колапс»: HP не визначено, але попереднє значення зберігається.
                Є один власний хід на порятунок. Карта <Mono>↶</Mono> «Відкат» (1 ОО) повертає HP до значення перед ÷0;
                <Mono>⇄</Mono> обмінює стани й передає колапс супернику. Успішний порятунок завершує хід.
                Звичайні операції, <Mono>0!</Mono> та <Mono>x⁰</Mono> на невизначеному HP недоступні.
                Якщо до кінця ходу колапс лишився — поразка. Це спеціальне правило гри: ділення на нуль у математиці не визначено.
                У режимі рівняння ÷0, як і раніше, згортає HP в 1; на графіку спричиняє миттєву поразку.
              </Block>
              <Block title="Закінчення колоди та фінальна серія">
                Коли в гравця закінчуються картки, супротивник отримує <b className="text-neon-amber">фінальну серію</b>: він розігрує всі свої
                картки без обмежень на ОО, намагаючись добити. Якщо не зміг привести ціль у критичний стан — програє сам.
              </Block>
              <Block title="Округлення">
                Після ділення, кореня та вибору кореня рівняння дробове число округлюється <b>вниз</b>: −3 ÷ 2 = −2.
                HP може бути від’ємним (межі: −999…999). Лише рівно 0 створює стан «Обнулення».
                Наприклад, 2 − 3 = −1 — гра триває, а −1 + 1 = 0 — критичний стан.
                Карта <Mono>|x|</Mono> перетворює −7 на 7; нуль лишається нулем.
                Квадратний корінь і факторіал від’ємного HP недоступні.
              </Block>
            </div>
          )}

          {tab === "Стани HP" && (
            <div className="space-y-4">
              <Block title="HP як число">
                HP — ціле число. Можна додавати, віднімати, множити, ділити, підносити до степеня, брати факторіал, остачу від ділення.
                Приклади: <Mono>+1, −1, ×2, ÷2, x², √x, x!, x⁰, ×0, |x|, mod 3, ⇄, ⟲, ⌀</Mono>.
              </Block>
              <Block title="Карта «x» — перетворення на рівняння">
                У колоді рівно 10 карток «x». Грається на себе або на супротивника: ціле HP стає рівнянням <Mono>x − HP = 0</Mono>.
                Повторне застосування підвищує степінь і додає корінь 0:
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>1-й раз: лінійне <Mono>x − HP = 0</Mono></li>
                  <li>2-й раз: квадратне <Mono>x(x − HP) = 0</Mono></li>
                  <li>3-й раз: кубічне <Mono>x²(x − HP) = 0</Mono></li>
                  <li>4-й раз: <b className="text-neon-red">заборонено</b></li>
                </ul>
                Якщо в рівнянні виникає ділення на 0 або тотожність — воно колапсує, і HP стає 1.
              </Block>
              <Block title="Карта «y» — площина графіка">
                Перетворює битву на площину: HP цілі стає графіком функції f(x), що відповідає поточному рівнянню. Рідкісна (2 у колоді),
                коштує 4 ОО. У режимі графіка ділення на нуль — миттєва поразка, а не колапс.
              </Block>
            </div>
          )}

          {tab === "Рівняння" && (
            <div className="space-y-4">
              <Block title="Заміна змінної">
                Карта <Mono>x↦</Mono> коштує 2 ОО. Оберіть своє або чуже рівняння, потім одну з підстановок:
                <Mono>x → x − 3</Mono>, <Mono>x → x − 1</Mono>, <Mono>x → x + 1</Mono>, <Mono>x → x + 3</Mono>.
                Підстановка застосовується до кожного входження x, а степінь не змінюється.
                Наприклад, <Mono>x² − 5x = 0</Mono> після <Mono>x → x + 1</Mono> стає <Mono>x² − 3x − 4 = 0</Mono>:
                корені 0 і 5 стають −1 і 4. Це знімає небезпечний нуль; інша підстановка може, навпаки, його створити.
                Нова змінна на екрані знову позначається x. На числі чи графіку карта недоступна.
              </Block>
              <Block title="Звичайні карти проти рівняння">
                Коли HP є рівнянням, математичні картки застосовуються з вибором частини:
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <Chip title="Ліва частина" body="+n зсуває вільний член: корені змінюються." />
                  <Chip title="Права частина" body="0 + n = n → корінь зсувається на −n. ×n на нулі нічого не змінює." />
                  <Chip title="Обидві частини" body="Рівновага: корені ті самі. x⁰ або ×0 → тотожність і колапс у 1." />
                </div>
                <p className="mt-2">
                  Приклад: <Mono>x − 5 = 0</Mono>, граємо <Mono>+1</Mono> на праву частину → <Mono>x − 5 = 1</Mono> → корінь 6.
                  Граємо <Mono>×2</Mono> на обидві → <Mono>2x − 10 = 0</Mono> → корінь 5.
                </p>
              </Block>
              <Block title="Допоміжні картки (теореми)">
                Застосовуються, коли HP — рівняння або графік (своє чи чуже). Гравець обирає корінь, HP стає рівним цьому кореню
                (округленому вниз), рівняння скасовується. Якщо обрано корінь 0 — HP 0 і стан «Обнулення».
              </Block>
              <Block title="Критичні стани рівняння">
                <ul className="list-disc space-y-1 pl-5">
                  <li><span className="text-neon-red">Корінь x = 0</span> — треба вирізати (Горнер), зсунути або розв'язати в інший корінь.</li>
                  <li><span className="text-neon-red">Немає дійсних коренів</span> — рівняння нерозв'язне, графік не перетинає вісь X.</li>
                  <li><span className="text-neon-red">Тотожність 0 = 0</span> — колапсує в HP 1 автоматично (безпечно).</li>
                </ul>
              </Block>
            </div>
          )}

          {tab === "Графіки" && (
            <div className="space-y-4">
              <Block title="Режим графіка">
                Після карти «y» HP відображається як функція f(x) на площині. Перетини з віссю X — це корені рівняння, вони підсвічуються.
                Корінь 0 завжди червоний.
              </Block>
              <Block title="Умови поразки в режимі графіка">
                <ul className="list-disc space-y-1 pl-5">
                  <li>графік не перетинає вісь X (немає дійсних коренів);</li>
                  <li>виникає ділення на нуль — миттєва поразка;</li>
                  <li>корінь 0 не виправлено до кінця свого ходу.</li>
                </ul>
              </Block>
              <Block title="Як створити графік без перетинів">
                <Mono>x − 3 = 0</Mono> → <Mono>x²</Mono> на ліву частину → <Mono>x² − 6x + 9 = 0</Mono> → <Mono>−3</Mono> на праву частину →{" "}
                <Mono>x² − 6x + 12 = 0</Mono>, D = −12 &lt; 0 → <Mono>y</Mono> → графік зависає над віссю X. Поразка.
              </Block>
            </div>
          )}

          {tab === "Карти" && (
            <div className="space-y-2">
              {CARD_LIST.map((c) => (
                <div key={c.id} className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-2.5 transition hover:border-white/20 hover:bg-white/[0.05]">
                  <span className={cn("mt-0.5 min-w-[62px] rounded border px-2 py-1 text-center font-mono text-[13px] font-bold", ACC[c.accent])}>
                    {c.symbol}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-display text-[12.5px] font-bold uppercase tracking-wide text-white">{c.name}</span>
                      <span className="font-mono text-[10px] text-white/35">{c.cost} ОО · у колоді {c.count}</span>
                    </div>
                    <div className="text-[12.5px] text-white/60">{c.desc}</div>
                    <div className="font-mono text-[11px] text-white/35">{c.rule}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "Режими" && (
            <div className="space-y-2">
              {Object.values(MODES).map((m) => (
                <div key={m.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm font-black uppercase tracking-wide" style={{ color: m.accent }}>{m.title}</span>
                    <span className="font-mono text-[10px] text-white/35">{m.tag}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-white/60">{m.desc}</div>
                  <div className="mt-1.5 font-mono text-[10.5px] text-white/35">
                    HP: {m.startHp} · дій на хід: {m.maxCards} · ОО/хід: {m.ooPerTurn} (макс. {m.ooCap}) · старт руки: {m.handSize}
                  </div>
                </div>
              ))}
              <div className="mt-3 rounded-lg border border-neon-violet/25 bg-neon-violet/5 p-3 text-[12.5px] text-white/60">
                <b className="text-neon-violet">Драфт і кампанія</b> — режим на двох із почерговим вибором карт із спільної купки та ланцюжок
                партій із модифікаторами. У цій цифровій версії доступні дуель проти ШІ та набір головоломок.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 font-display text-[13px] font-black uppercase tracking-[0.14em] text-neon-cyan">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Chip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-2">
      <div className="font-display text-[11px] font-bold uppercase tracking-wide text-white/85">{title}</div>
      <div className="mt-0.5 text-[12px] text-white/55">{body}</div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[12px] text-neon-amber">{children}</code>;
}
