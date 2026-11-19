import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadDataset, loadDirectives } from "@/lib/data";
import { currentTime } from "@/lib/time";
import { DirectivesPanel } from "@/components/directives";
import { evaluatees, filledCount, teamSummaries } from "@/lib/stats";
import { VISIT_STATUS_CLASS, VISIT_STATUS_LABEL } from "@/lib/constants";
import { AssignLeaderForm, EditTeamForm, MemberForm } from "@/components/forms";
import { Empty, PageHeader, ProgressBar, RatingBadge, formatDate } from "@/components/ui";
import { MemberRow } from "../../team/member-row";
import { ExportButton } from "@/components/export-button";

export default async function TeamDetailPage({ params }: PageProps<"/teams/[code]">) {
  const [, { code }, data, directives, now] = await Promise.all([
    requireUser("officer"),
    params,
    loadDataset(),
    loadDirectives(),
    currentTime(),
  ]);
  const team = data.teams.find((t) => t.code === decodeURIComponent(code).toUpperCase());
  if (!team) notFound();

  const summary = teamSummaries(data).find((s) => s.team.id === team.id)!;
  const members = data.members.filter((m) => m.team_id === team.id);
  const mems = evaluatees(data.members, team.id);
  const visits = data.visits.filter((v) => v.team_id === team.id);
  const leaderAccounts = data.profiles
    .filter((p) => p.role === "leader" && (!data.teams.some((t) => t.leader_id === p.id) || p.id === team.leader_id))
    .map((p) => ({ id: p.id, label: `${p.full_name ?? ""} <${p.email}>` }));
  const leaderProfile = data.profiles.find((p) => p.id === team.leader_id);

  return (
    <>
      <PageHeader title={`فريق ${team.code}`} sub={`${summary.leaderName}${team.city ? " · " + team.city : ""}`}>
        <Link href={`/reviews?team=${team.code}#new`} className="btn-primary">زيارة وتقويم هذا الفريق</Link>
        <Link href="/teams" className="btn-ghost">سجل الفرق</Link>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card">
          <div className="text-sm text-muted">الزيارات المنفذة</div>
          <div className="mt-1 text-2xl font-bold">{summary.visitsDone} / {summary.visitsTotal}</div>
        </div>
        <div className="card">
          <div className="mb-2 text-sm text-muted">إنجاز التقويم</div>
          <ProgressBar pct={summary.completion} />
        </div>
        <div className="card">
          <div className="text-sm text-muted">مستوى الفريق (تقويم الرئيس)</div>
          <div className="mt-2"><RatingBadge value={summary.leaderLevel} /></div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">مستوى الفريق (ضباط الجودة)</div>
          <div className="mt-2"><RatingBadge value={summary.officerLevel} /></div>
        </div>
      </div>

      <section className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">توجيهات هذا الفريق</h2>
        <Link href="/directives" className="btn-ghost px-3 py-1 text-xs">+ إرسال توجيه</Link>
      </section>
      <DirectivesPanel
        directives={directives.filter((d) => d.audience === "all" || (team.leader_id && d.target_user === team.leader_id))}
        now={now}
        personalSub={`موجّه لرئيس ${team.code}`}
      />

      <section className="card mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">الزيارات — اختر زيارة لتسجيل زيارتك وتقويم الأعضاء</h2>
          <ExportButton tableId="x-team-visits" filename="زيارات-الفريق" />
        </div>
        {visits.length === 0 ? (
          <Empty>لم يسجل الفريق أي زيارة بعد.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table id="x-team-visits" className="w-full">
              <thead>
                <tr>
                  <th className="th">المدرسة</th>
                  <th className="th">التاريخ</th>
                  <th className="th">الحالة</th>
                  <th className="th min-w-36">إنجاز تقويم الرئيس</th>
                  <th className="th">زيارة الجودة</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => {
                  const filled = mems.reduce(
                    (s, m) => s + filledCount(data.evaluations.find((e) => e.visit_id === v.id && e.member_id === m.id && e.evaluator_role === "leader")),
                    0,
                  );
                  const review = data.reviews.find((r) => r.visit_id === v.id);
                  return (
                    <tr key={v.id}>
                      <td className="td font-medium">{v.school_name}</td>
                      <td className="td">{formatDate(v.visit_date)}</td>
                      <td className="td"><span className={`rounded px-2 py-0.5 text-xs ${VISIT_STATUS_CLASS[v.status]}`}>{VISIT_STATUS_LABEL[v.status]}</span></td>
                      <td className="td"><ProgressBar pct={mems.length ? (filled / (mems.length * 8)) * 100 : 0} /></td>
                      <td className="td">{review ? <RatingBadge value={review.overall_level} /> : <span className="text-xs text-muted">لم تتم</span>}</td>
                      <td className="td"><Link href={`/visits/${v.id}`} className="btn-primary px-3 py-1 text-xs">فتح وتقويم</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">أعضاء الفريق</h2>
          <ExportButton tableId="x-team-members" filename="أعضاء-الفريق" />
        </div>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table id="x-team-members" className="w-full">
            <thead>
              <tr>
                <th className="th">الصفة</th>
                <th className="th">الاسم</th>
                <th className="th">السجل المدني</th>
                <th className="th">الجوال</th>
                <th className="th">البريد الإلكتروني</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-semibold">إضافة عضو</summary>
          <div className="mt-3"><MemberForm teamId={team.id} /></div>
        </details>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">إدارة الفريق</h2>
        <EditTeamForm teamId={team.id} code={team.code} city={team.city} />
        <div>
          {!leaderProfile && (
            <p className="mb-2 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">
              لا يوجد حساب رئيس مرتبط بهذا الفريق حاليًا (ربما حُذف بريده). يمكنك ربطه بحساب رئيس آخر.
            </p>
          )}
          <AssignLeaderForm teamId={team.id} current={team.leader_id} options={leaderAccounts} />
        </div>
      </section>
    </>
  );
}
