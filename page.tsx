import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadDataset, loadIssues, loadPlatformStats } from "@/lib/data";
import { HeroBand } from "@/components/hero";
import { avgScore, criterionDistribution, teamSummaries } from "@/lib/stats";
import { levelFromScore } from "@/lib/constants";
import { CriteriaDistribution, RatingLegend } from "@/components/distribution";
import { Empty, PageHeader, ProgressBar, RatingBadge } from "@/components/ui";
import { TeamsSummaryTable } from "@/components/teams-summary";
import { ExportButton } from "@/components/export-button";

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const [user, data, stats, issues] = await Promise.all([
    requireUser("officer"),
    loadDataset(),
    loadPlatformStats(),
    loadIssues(),
  ]);
  const openIssues = issues.filter((i) => i.status === "in_progress").length;
  const summaries = teamSummaries(data);

  const visitsDone = data.visits.filter((v) => v.status === "completed").length;
  const avgCompletion = summaries.length ? summaries.reduce((s, t) => s + t.completion, 0) / summaries.length : 0;
  const reviewedTeams = summaries.filter((s) => s.reviewed > 0).length;
  const leaderAvg = avgScore(data.evaluations.filter((e) => e.evaluator_role === "leader"));
  const officerAvg = avgScore(data.evaluations.filter((e) => e.evaluator_role === "officer"));
  const needsAttention = summaries.filter(
    (s) =>
      (s.visitsDone > 0 && s.completion < 50) ||
      s.leaderLevel === "weak" || s.leaderLevel === "very_weak" ||
      s.officerLevel === "weak" || s.officerLevel === "very_weak",
  );

  return (
    <>
      <HeroBand name={user.full_name ?? user.email} roleLabel="ضابط جودة" stats={stats} />
      <PageHeader title="لوحة المؤشرات" sub="نظرة شاملة على إنجاز فرق التقويم المدرسي ومستوياتها">
        <Link href="/directives" className="btn-primary">إرسال توجيه</Link>
        <Link href="/reports" className="btn-ghost">التقارير والتصدير</Link>
      </PageHeader>

      {data.teams.length === 0 ? (
        <Empty>لم يسجل أي فريق بعد. أضف بريد رؤساء الفرق من صفحة <Link href="/users" className="text-brand underline">المستخدمون</Link>.</Empty>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile label="الفرق" value={data.teams.length} sub={`${data.members.length} عضوًا`} />
            <Tile label="الزيارات المنفذة" value={`${visitsDone} / ${data.visits.length}`} />
            <Tile label="متوسط إنجاز التقويم" value={`${Math.round(avgCompletion)}%`} sub={<ProgressBar pct={avgCompletion} />} />
            <Tile
              label="فرق زارها ضباط الجودة"
              value={`${reviewedTeams} / ${data.teams.length}`}
              sub={<ProgressBar pct={(reviewedTeams / data.teams.length) * 100} />}
            />
            <Tile
              label="المستوى العام"
              value={<RatingBadge value={levelFromScore(leaderAvg)} />}
              sub={<span>ضباط الجودة: <RatingBadge value={levelFromScore(officerAvg)} /></span>}
            />
          </div>

          {openIssues > 0 && (
            <Link
              href="/issues?status=in_progress"
              className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 hover:bg-red-100"
            >
              <span className="font-semibold">🔔 لديك {openIssues} بلاغ تحت الإجراء من رؤساء الفرق</span>
              <span className="text-sm underline">عرض البلاغات ←</span>
            </Link>
          )}

          {needsAttention.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-amber-900">⚠ فرق تحتاج متابعة ({needsAttention.length})</h2>
              <div className="flex flex-wrap gap-2">
                {needsAttention.map((s) => (
                  <Link key={s.team.id} href={`/teams/${s.team.code}`} className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm hover:shadow">
                    <b>{s.team.code}</b> — {s.leaderName} · إنجاز {Math.round(s.completion)}%
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
            <section className="card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">توزيع التقويم على المعايير الثمانية</h2>
                <RatingLegend />
              </div>
              <CriteriaDistribution
                leader={criterionDistribution(data.evaluations, "leader")}
                officer={criterionDistribution(data.evaluations, "officer")}
              />
            </section>
            <section className="card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">إنجاز الفرق</h2>
          <ExportButton tableId="x-teams" filename="إنجاز-الفرق" />
        </div>
              <TeamsSummaryTable summaries={summaries} id="x-teams" />
            </section>
          </div>
        </>
      )}
    </>
  );
}
