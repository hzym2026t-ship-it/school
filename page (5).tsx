import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadDataset } from "@/lib/data";
import { Empty, PageHeader, RatingBadge, formatDate } from "@/components/ui";
import { VisitForm } from "@/components/forms";
import { VISIT_STATUS_CLASS, VISIT_STATUS_LABEL } from "@/lib/constants";
import { ExportButton } from "@/components/export-button";

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const [user, data, { team: rawTeam }] = await Promise.all([requireUser("officer"), loadDataset(), searchParams]);
  const mine = data.reviews.filter((r) => r.officer_id === user.id);
  const teamOf = (visitId: string) => {
    const v = data.visits.find((x) => x.id === visitId);
    return { v, t: data.teams.find((t) => t.id === v?.team_id) };
  };
  const reviewedTeamIds = new Set(data.reviews.map((r) => teamOf(r.visit_id).t?.id));
  const notReviewed = data.teams.filter((t) => !reviewedTeamIds.has(t.id));

  const teams = [...data.teams].sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
  const leaderName = (teamId: string) =>
    data.members.find((m) => m.team_id === teamId && m.member_role === "leader")?.full_name ?? "بدون رئيس";
  const picked = typeof rawTeam === "string" ? teams.find((t) => t.code === rawTeam.toUpperCase()) : undefined;
  const pickedVisits = picked ? data.visits.filter((v) => v.team_id === picked.id) : [];
  const pickedMembers = picked ? data.members.filter((m) => m.team_id === picked.id).length : 0;

  return (
    <>
      <PageHeader title="زياراتي الميدانية" sub="اختر الفريق الذي ستزوره، ثم المدرسة، وسجّل تاريخ زيارتك وتقويمك لأعضاء الفريق." />

      <section id="new" className="card mb-5 border-2 border-brand/40">
        <h2 className="mb-1 text-lg font-bold text-brand-strong">زيارة وتقويم فريق</h2>
        <p className="mb-4 text-sm text-muted">١. اختر الفريق ← ٢. اختر المدرسة التي يزورها الفريق ← ٣. سجّل تاريخ زيارتك وقوّم الأعضاء.</p>
        {teams.length === 0 ? (
          <Empty>لا توجد فرق مسجلة بعد.</Empty>
        ) : (
          <form action="/reviews" className="flex flex-wrap items-end gap-2">
            <div className="min-w-60 flex-1">
              <label className="label" htmlFor="team">الفريق</label>
              <select id="team" name="team" defaultValue={picked?.code ?? ""} required className="input">
                <option value="" disabled>— اختر الفريق —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.code} — {leaderName(t.id)}{t.city ? ` — ${t.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">عرض مدارس الفريق</button>
          </form>
        )}

        {picked && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">
                مدارس فريق <span dir="ltr">{picked.code}</span> — اختر المدرسة التي ستزور الفريق فيها
              </h3>
              <Link href={`/teams/${picked.code}`} className="btn-ghost px-3 py-1 text-xs">ملف الفريق</Link>
            </div>
            {pickedMembers === 0 && (
              <p className="mb-3 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-800">لم يُضف أعضاء لهذا الفريق بعد، لذلك لن تظهر نماذج التقويم.</p>
            )}
            {pickedVisits.length === 0 ? (
              <p className="mb-4 text-sm text-muted">لم يسجل هذا الفريق أي مدرسة بعد. أضف المدرسة التي ستزور الفريق فيها:</p>
            ) : (
              <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pickedVisits.map((v) => {
                  const myReview = mine.find((r) => r.visit_id === v.id);
                  return (
                    <Link
                      key={v.id}
                      href={`/visits/${v.id}`}
                      className="rounded-xl border border-line bg-surface p-3 transition hover:border-brand hover:bg-brand-soft"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{v.school_name}</span>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${VISIT_STATUS_CLASS[v.status]}`}>{VISIT_STATUS_LABEL[v.status]}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {[v.school_type, v.city, v.visit_date && `زيارة الفريق ${formatDate(v.visit_date)}`].filter(Boolean).join(" · ")}
                      </div>
                      <div className="mt-2 text-xs font-medium text-brand">
                        {myReview ? `✓ زرته ${formatDate(myReview.review_date)} — تعديل التقويم` : "اختيار وتقويم ←"}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <details open={pickedVisits.length === 0} className="rounded-xl border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold">+ المدرسة غير موجودة؟ أضفها لهذا الفريق</summary>
              <div className="mt-4">
                <VisitForm teamId={picked.id} />
              </div>
            </details>
          </div>
        )}
      </section>

      <section className="card mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">زياراتي المسجلة ({mine.length})</h2>
          <ExportButton tableId="x-reviews" filename="زياراتي-الميدانية" />
        </div>
        {mine.length === 0 ? (
          <Empty>لم تسجل أي زيارة بعد.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table id="x-reviews" className="w-full">
              <thead>
                <tr>
                  <th className="th">الفريق</th>
                  <th className="th">المدرسة</th>
                  <th className="th">تاريخ زيارتي</th>
                  <th className="th">المستوى العام</th>
                  <th className="th">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((r) => {
                  const { v, t } = teamOf(r.visit_id);
                  return (
                    <tr key={r.id}>
                      <td className="td font-semibold" dir="ltr">{t?.code}</td>
                      <td className="td"><Link href={`/visits/${r.visit_id}`} className="text-brand hover:underline">{v?.school_name}</Link></td>
                      <td className="td">{formatDate(r.review_date)}</td>
                      <td className="td"><RatingBadge value={r.overall_level} /></td>
                      <td className="td max-w-72 truncate" title={r.notes ?? ""}>{r.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">فرق لم يزرها أي ضابط جودة بعد ({notReviewed.length})</h2>
        {notReviewed.length === 0 ? (
          <p className="text-sm text-muted">تمت زيارة جميع الفرق.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {notReviewed.map((t) => (
              <Link key={t.id} href={`/reviews?team=${t.code}#new`} className="r-weak rounded-lg px-3 py-1.5 text-sm font-medium" dir="ltr">
                {t.code}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
