import Link from "next/link";
import type { TeamSummary } from "@/lib/stats";
import { ProgressBar, RatingBadge, formatDate } from "./ui";

export function TeamsSummaryTable({ summaries, links = true, id }: { summaries: TeamSummary[]; links?: boolean; id?: string }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table id={id} className="w-full">
        <thead>
          <tr>
            <th className="th">الفريق</th>
            <th className="th">رئيس الفريق</th>
            <th className="th">الأعضاء</th>
            <th className="th min-w-36">إنجاز المدارس</th>
            <th className="th">آخر زيارة</th>
            <th className="th min-w-36">إنجاز التقويم</th>
            <th className="th">تقويم الرئيس</th>
            <th className="th">تقويم الجودة</th>
            <th className="th">زيارات الجودة</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.team.id} className="hover:bg-background">
              <td className="td font-semibold" dir="ltr">
                {links ? <Link href={`/teams/${s.team.code}`} className="text-brand hover:underline">{s.team.code}</Link> : s.team.code}
              </td>
              <td className="td">{s.leaderName}</td>
              <td className="td tabular-nums">{s.members}</td>
              <td className="td">
                <div className="text-xs text-muted">{s.visitsDone} من {s.visitsTotal}</div>
                <ProgressBar pct={s.visitsTotal ? (s.visitsDone / s.visitsTotal) * 100 : 0} />
              </td>
              <td className="td">{formatDate(s.lastVisit)}</td>
              <td className="td"><ProgressBar pct={s.completion} /></td>
              <td className="td"><RatingBadge value={s.leaderLevel} /></td>
              <td className="td"><RatingBadge value={s.officerLevel} /></td>
              <td className="td">
                <span className={`rounded px-2 py-0.5 text-xs ${s.reviewed ? "r-high" : "r-none"}`}>
                  {s.reviewed ? `✓ ${s.reviewed}` : "لم تتم"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
