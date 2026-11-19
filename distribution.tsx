import { CRITERIA, RATINGS, RATING_BAR_COLOR, levelFromScore, type Rating } from "@/lib/constants";
import { RatingBadge } from "./ui";

type Row = { key: string; counts: Record<Rating, number>; total: number; avg: number | null };

export function RatingLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {RATINGS.map((r) => (
        <span key={r.value} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: RATING_BAR_COLOR[r.value] }} />
          {r.label}
        </span>
      ))}
    </div>
  );
}

function StackedBar({ row, label }: { row: Row; label: string }) {
  if (!row.total) {
    return <div className="h-3.5 rounded bg-gray-100" title={`${label}: لا توجد تقويمات`} />;
  }
  return (
    <div className="flex h-3.5 gap-[2px]">
      {RATINGS.map((r) => {
        const n = row.counts[r.value];
        if (!n) return null;
        const pct = (n / row.total) * 100;
        return (
          <div
            key={r.value}
            className="h-full first:rounded-s last:rounded-e hover:opacity-80"
            style={{ width: `${pct}%`, background: RATING_BAR_COLOR[r.value] }}
            title={`${label} — ${r.label}: ${n} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>
  );
}

/** Per-criterion rating distribution: leader vs quality officer. */
export function CriteriaDistribution({ leader, officer }: { leader: Row[]; officer: Row[] }) {
  return (
    <div className="space-y-4">
      {CRITERIA.map((title, i) => (
        <div key={title}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
            <span>
              <span className="text-muted">{i + 1}. </span>
              {title}
            </span>
          </div>
          <div className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-x-2 gap-y-1.5 text-xs text-muted">
            <span>رؤساء الفرق</span>
            <StackedBar row={leader[i]} label="رؤساء الفرق" />
            <RatingBadge value={levelFromScore(leader[i].avg)} short />
            <span>ضباط الجودة</span>
            <StackedBar row={officer[i]} label="ضباط الجودة" />
            <RatingBadge value={levelFromScore(officer[i].avg)} short />
          </div>
        </div>
      ))}
    </div>
  );
}
