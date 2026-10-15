import { exactFraction, numericLabel } from "../game/numeric";
import type { NumericHp } from "../game/types";

/** Display the stored fraction rather than its rounded decimal approximation. */
export function HpValue({ hp }: { hp: NumericHp }) {
  const f = exactFraction(hp);
  if (!f || f.denominator === "1") return <>{numericLabel(hp)}</>;
  return (
    <span role="math" aria-label={numericLabel(hp)} title={numericLabel(hp)} className="inline-flex max-w-full flex-col items-center align-middle text-[0.65em] leading-tight">
      <span className="max-w-full break-all border-b-2 border-current px-1">{f.numerator}</span>
      <span className="max-w-full break-all px-1">{f.denominator}</span>
    </span>
  );
}
