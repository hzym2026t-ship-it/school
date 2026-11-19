import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadDataset } from "@/lib/data";
import { CRITERIA, CRITERION_KEYS, averageLevel } from "@/lib/constants";
import { EvaluationForm, OfficerReviewForm, VisitForm } from "@/components/forms";
import { PageHeader, RatingBadge, todayISO } from "@/components/ui";
import { currentTime } from "@/lib/time";
import { DeleteVisitButton } from "./delete-visit";
import { ExportButton } from "@/components/export-button";

export default async function VisitPage({ params }: PageProps<"/visits/[id]">) {
  const { id } = await params;
  const [user, data, now] = await Promise.all([requireUser(), loadDataset(), currentTime()]);
  const visit = data.visits.find((v) => v.id === id);
  if (!visit) notFound();
  const team = data.teams.find((t) => t.id === visit.team_id)!;
  const members = data.members.filter((m) => m.team_id === team.id);
  const isOfficer = user.role === "officer";
  const mine = (memberId: string) =>
    data.evaluations.find((e) => e.visit_id === visit.id && e.member_id === memberId && e.evaluator_id === user.id);

  const toEvaluate = isOfficer ? members : members.filter((m) => m.member_role === "member");
  const leaderEvals = data.evaluations.filter((e) => e.visit_id === visit.id && e.evaluator_role === "leader");
  const myReview = data.reviews.find((r) => r.visit_id === visit.id && r.officer_id === user.id);
  const { avg: teamAvg, level: teamLevel } = averageLevel(
    data.evaluations
      .filter((e) => e.visit_id === visit.id && e.evaluator_id === user.id)
      .flatMap((e) => CRITERION_KEYS.map((k) => e[k])),
  );
  const myTeamLevel = { teamAvg, teamLevel };

  return (
    <>
      <PageHeader title={visit.school_name} sub={`فريق ${team.code}`}>
        <Link href={isOfficer ? `/reviews?team=${team.code}#new` : "/visits"} className="btn-ghost">رجوع</Link>
      </PageHeader>

      {isOfficer && (
        <section className="card mb-5 border-2 border-brand/40">
          <h2 className="mb-1 font-semibold">١. زيارتك لفريق <span dir="ltr">{team.code}</span></h2>
          <p className="mb-4 text-sm text-muted">حدّد تاريخ زيارتك ومستوى الفريق العام، ثم قوّم الأعضاء في الأسفل.</p>
          <OfficerReviewForm visitId={visit.id} review={myReview} today={todayISO(now)} {...myTeamLevel} />
        </section>
      )}

      <details className="card mb-5" open={!isOfficer && !visit.visit_date}>
        <summary className="cursor-pointer font-semibold">بيانات المدرسة والزيارة</summary>
        <div className="mt-4">
          <VisitForm teamId={team.id} visit={visit} />
          <div className="mt-4 border-t border-line pt-3">
            <DeleteVisitButton id={visit.id} />
          </div>
        </div>
      </details>

      {isOfficer && leaderEvals.length > 0 && (
        <section className="card mb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">تقويم رئيس الفريق للأعضاء (للاطلاع)</h2>
          <ExportButton tableId="x-leader-eval" filename="تقويم-رئيس-الفريق" />
        </div>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table id="x-leader-eval" className="w-full">
              <thead>
                <tr>
                  <th className="th">المعيار</th>
                  {leaderEvals.map((e) => (
                    <th key={e.id} className="th">{members.find((m) => m.id === e.member_id)?.full_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRITERION_KEYS.map((k, i) => (
                  <tr key={k}>
                    <td className="td text-xs">{CRITERIA[i]}</td>
                    {leaderEvals.map((e) => (
                      <td key={e.id} className="td"><RatingBadge value={e[k]} /></td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="td font-semibold">المستوى العام</td>
                  {leaderEvals.map((e) => (
                    <td key={e.id} className="td"><RatingBadge value={e.overall_level} /></td>
                  ))}
                </tr>
                <tr>
                  <td className="td">ملاحظات</td>
                  {leaderEvals.map((e) => (
                    <td key={e.id} className="td whitespace-normal text-xs">{e.notes ?? "—"}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <h2 className="mb-3 text-lg font-semibold">
        {isOfficer ? "٢. تقويمك لأعضاء الفريق ورئيسه" : "تقويم أعضاء الفريق وفق المعايير الثمانية"}
      </h2>
      {toEvaluate.length === 0 ? (
        <p className="card text-sm text-muted">
          لا يوجد أعضاء في الفريق بعد. <Link href={isOfficer ? `/teams/${team.code}` : "/team"} className="text-brand underline">أضف الأعضاء</Link>
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {toEvaluate.map((m) => (
            <EvaluationForm key={m.id} visitId={visit.id} member={m} evaluation={mine(m.id)} />
          ))}
        </div>
      )}
    </>
  );
}
