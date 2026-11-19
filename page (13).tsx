import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadMyTeam } from "@/lib/data";
import { evaluatees, filledCount } from "@/lib/stats";
import { VISIT_STATUS_CLASS, VISIT_STATUS_LABEL } from "@/lib/constants";
import { Empty, PageHeader, ProgressBar, formatDate } from "@/components/ui";

export default async function VisitsPage() {
  const [, data] = await Promise.all([requireUser("leader"), loadMyTeam()]);
  if (!data.team) redirect("/team");
  const team = data.team;

  const visits = data.visits.filter((v) => v.team_id === team.id);
  const mems = evaluatees(data.members, team.id);

  return (
    <>
      <PageHeader title="الزيارات والتقويم" sub={`فريق ${team.code} — اضغط على الزيارة لتقويم أعضاء الفريق`}>
        <Link href="/visits/new" className="btn-primary">+ زيارة جديدة</Link>
      </PageHeader>

      {visits.length === 0 ? (
        <Empty>لا توجد زيارات بعد. أضف أول زيارة لمدرسة.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visits.map((v) => {
            const filled = mems.reduce(
              (s, m) =>
                s + filledCount(data.evaluations.find((e) => e.visit_id === v.id && e.member_id === m.id && e.evaluator_role === "leader")),
              0,
            );
            const pct = mems.length ? (filled / (mems.length * 8)) * 100 : 0;
            return (
              <Link key={v.id} href={`/visits/${v.id}`} className="card block transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{v.school_name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {[v.school_type, v.city, v.ministry_number && `رقم وزاري ${v.ministry_number}`].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${VISIT_STATUS_CLASS[v.status]}`}>
                    {VISIT_STATUS_LABEL[v.status]}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted">{formatDate(v.visit_date)}</span>
                  <div className="w-40">
                    <ProgressBar pct={pct} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
