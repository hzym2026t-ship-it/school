import { requireUser } from "@/lib/auth";
import { loadDataset } from "@/lib/data";
import { avgScore, criterionDistribution, teamSummaries } from "@/lib/stats";
import Link from "next/link";
import {
  CRITERIA,
  RATINGS,
  VISIT_STATUSES,
  VISIT_STATUS_CLASS,
  VISIT_STATUS_LABEL,
  levelFromScore,
  type VisitStatus,
} from "@/lib/constants";
import { TIME_ZONE, formatDate } from "@/components/ui";
import { TeamsSummaryTable } from "@/components/teams-summary";
import { PageHeader, RatingBadge } from "@/components/ui";
import { PrintButton } from "./print-button";
import { ExportButton } from "@/components/export-button";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const [, { status: rawStatus }, data] = await Promise.all([requireUser("officer"), searchParams, loadDataset()]);
  const status = VISIT_STATUSES.some((s) => s.value === rawStatus) ? (rawStatus as VisitStatus) : null;
  const summaries = teamSummaries(data);
  const leader = criterionDistribution(data.evaluations, "leader");
  const officer = criterionDistribution(data.evaluations, "officer");
  const teamCode = (id: string) => data.teams.find((t) => t.id === id)?.code ?? "";
  const visits = data.visits
    .filter((v) => !status || v.status === status)
    .sort((a, b) => teamCode(a.team_id).localeCompare(teamCode(b.team_id), "en", { numeric: true }) || (a.visit_date ?? "").localeCompare(b.visit_date ?? ""));
  const today = new Date().toLocaleDateString("ar-SA-u-ca-gregory", { dateStyle: "long", timeZone: TIME_ZONE });

  // Member ranking by average across all evaluations they received.
  const memberRows = data.members
    .map((m) => {
      const evs = data.evaluations.filter((e) => e.member_id === m.id);
      const la = avgScore(evs.filter((e) => e.evaluator_role === "leader"));
      const oa = avgScore(evs.filter((e) => e.evaluator_role === "officer"));
      const team = data.teams.find((t) => t.id === m.team_id);
      return { m, team, la, oa, n: evs.length };
    })
    .filter((r) => r.n > 0)
    .sort((a, b) => (a.team?.code ?? "").localeCompare(b.team?.code ?? "", "en", { numeric: true }));

  return (
    <>
      <div className="no-print">
        <PageHeader title="التقارير" sub="تقرير تحليلي جاهز للطباعة أو الحفظ PDF، وتصدير كامل للبيانات إلى Excel">
          <PrintButton />
          <a href={`/api/export${status ? `?status=${status}` : ""}`} className="btn-primary">تنزيل Excel</a>
        </PageHeader>
      </div>

      <article className="space-y-5">
        <header className="card">
          <h1 className="text-xl font-bold">تقرير حالة تقويم فرق التقويم المدرسي</h1>
          <p className="mt-1 text-sm text-muted">تاريخ التقرير: {today}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>عدد الفرق: <b>{data.teams.length}</b></div>
            <div>عدد الأعضاء: <b>{data.members.length}</b></div>
            <div>تمت الزيارة: <b>{data.visits.filter((v) => v.status === "completed").length}</b> · مجدولة: <b>{data.visits.filter((v) => v.status === "planned").length}</b> · لم تتم: <b>{data.visits.filter((v) => v.status === "not_visited").length}</b></div>
            <div>زيارات ضباط الجودة: <b>{data.reviews.length}</b></div>
          </div>
        </header>

        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              الزيارات {status ? `— ${VISIT_STATUS_LABEL[status]}` : "— جميع الحالات"} ({visits.length})
            </h2>
            <div className="no-print flex flex-wrap items-center gap-1.5 text-sm">
              <ExportButton tableId="x-visits" filename="الزيارات" />
              {[{ value: null, label: "الكل", count: data.visits.length }, ...VISIT_STATUSES.map((s) => ({ ...s, count: data.visits.filter((v) => v.status === s.value).length }))].map((s) => (
                <Link
                  key={s.label}
                  href={s.value ? `/reports?status=${s.value}` : "/reports"}
                  scroll={false}
                  className={`rounded-full border px-3 py-1 ${status === s.value ? "border-brand bg-brand text-white" : "border-line bg-surface hover:bg-brand-soft"}`}
                >
                  {s.label} <span className="tabular-nums opacity-75">({s.count})</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="-mx-4 max-h-[60vh] overflow-auto sm:mx-0">
            <table id="x-visits" className="w-full">
              <thead className="sticky top-0">
                <tr>
                  <th className="th">الفريق</th>
                  <th className="th">المدرسة</th>
                  <th className="th">الرقم الوزاري</th>
                  <th className="th">تاريخ الزيارة</th>
                  <th className="th">أيام الزيارة</th>
                  <th className="th">البعد (كم)</th>
                  <th className="th">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id}>
                    <td className="td font-semibold" dir="ltr">{teamCode(v.team_id)}</td>
                    <td className="td">{v.school_name}</td>
                    <td className="td" dir="ltr">{v.ministry_number ?? "—"}</td>
                    <td className="td">{formatDate(v.visit_date)}</td>
                    <td className="td tabular-nums">{v.visit_days}</td>
                    <td className="td tabular-nums">{v.distance_km ?? "—"}</td>
                    <td className="td"><span className={`rounded px-2 py-0.5 text-xs ${VISIT_STATUS_CLASS[v.status]}`}>{VISIT_STATUS_LABEL[v.status]}</span></td>
                  </tr>
                ))}
                {visits.length === 0 && (
                  <tr><td colSpan={7} className="td text-center text-muted">لا توجد زيارات بهذه الحالة.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">ملخص الفرق</h2>
          <ExportButton tableId="x-summary" filename="ملخص-الفرق" />
        </div>
          <TeamsSummaryTable summaries={summaries} links={false} id="x-summary" />
        </section>

        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">نتائج المعايير الثمانية (عدد التقويمات لكل مستوى)</h2>
          <ExportButton tableId="x-criteria" filename="نتائج-المعايير" />
        </div>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table id="x-criteria" className="w-full">
              <thead>
                <tr>
                  <th className="th">المعيار</th>
                  <th className="th">المقوِّم</th>
                  {RATINGS.map((r) => <th key={r.value} className="th">{r.label}</th>)}
                  <th className="th">المستوى</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((title, i) =>
                  ([["رؤساء الفرق", leader[i]], ["ضباط الجودة", officer[i]]] as const).map(([who, row], j) => (
                    <tr key={`${i}${j}`}>
                      {j === 0 && <td className="td whitespace-normal" rowSpan={2}>{i + 1}. {title}</td>}
                      <td className="td text-xs text-muted">{who}</td>
                      {RATINGS.map((r) => (
                        <td key={r.value} className={`td tabular-nums ${row.counts[r.value] ? `r-${r.value}` : ""}`}>{row.counts[r.value]}</td>
                      ))}
                      <td className="td"><RatingBadge value={levelFromScore(row.avg)} /></td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">مستوى الأعضاء</h2>
          <ExportButton tableId="x-members" filename="مستوى-الأعضاء" />
        </div>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table id="x-members" className="w-full">
              <thead>
                <tr>
                  <th className="th">الفريق</th>
                  <th className="th">الاسم</th>
                  <th className="th">الصفة</th>
                  <th className="th">تقويم الرئيس</th>
                  <th className="th">تقويم الجودة</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map(({ m, team, la, oa }) => (
                  <tr key={m.id}>
                    <td className="td" dir="ltr">{team?.code}</td>
                    <td className="td">{m.full_name}</td>
                    <td className="td">{m.member_role === "leader" ? "رئيس" : "عضو"}</td>
                    <td className="td"><RatingBadge value={levelFromScore(la)} /></td>
                    <td className="td"><RatingBadge value={levelFromScore(oa)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </article>
    </>
  );
}
