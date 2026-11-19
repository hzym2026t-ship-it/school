import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadDataset, loadIssueLabels, loadIssues } from "@/lib/data";
import { APP_ROLES, ISSUE_STATUSES, ISSUE_STATUS_LABEL, type IssueStatus } from "@/lib/constants";
import type { Issue } from "@/lib/types";
import { Empty, PageHeader, formatDateTime } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { IssueForm, IssueHandler } from "./issue-forms";

const STATUS_CLS: Record<IssueStatus, string> = { in_progress: "r-weak", resolved: "r-high" };

function SchoolLine({ i }: { i: Issue }) {
  return (
    <div className="text-sm">
      <span className="font-semibold">{i.school_name ?? "—"}</span>
      {(i.school_type || i.ministry_number) && (
        <span className="text-muted"> · {[i.school_type, i.ministry_number && `رقم وزاري ${i.ministry_number}`].filter(Boolean).join(" · ")}</span>
      )}
    </div>
  );
}

export default async function IssuesPage({ searchParams }: PageProps<"/issues">) {
  const [user, issues, data, { status: rawStatus }] = await Promise.all([
    requireUser(APP_ROLES),
    loadIssues(),
    loadDataset(),
    searchParams,
  ]);

  // ------------------------------------------------------------ leader
  if (user.role === "leader") {
    const team = data.teams[0];
    if (!team) redirect("/team");
    const seen = new Set<string>();
    const schools = data.visits
      .filter((v) => v.team_id === team.id)
      .map((v) => ({ key: v.id, name: v.school_name, type: v.school_type, ministry: v.ministry_number }))
      .filter((s) => {
        const k = `${s.name}|${s.ministry ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    const open = issues.filter((i) => i.status === "in_progress").length;

    return (
      <>
        <PageHeader
          title="البلاغات"
          sub="إذا واجهتك مشكلة في إحدى المدارس المسندة لفريقك، أرسل بلاغًا وسيتابعه ضباط الجودة حتى معالجته."
        />
        <section className="card mb-5">
          <h2 className="mb-4 font-semibold">بلاغ جديد</h2>
          <IssueForm teamId={team.id} schools={schools} />
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">
            بلاغاتي ({issues.length}){open > 0 && <span className="ms-2 rounded-full r-weak px-2 py-0.5 text-xs">{open} تحت الإجراء</span>}
          </h2>
          {issues.length === 0 ? (
            <Empty>لم ترسل أي بلاغ بعد.</Empty>
          ) : (
            <ul className="space-y-3">
              {issues.map((i) => (
                <li key={i.id} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <SchoolLine i={i} />
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[i.status]}`}>{ISSUE_STATUS_LABEL[i.status]}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{i.problem}</p>
                  {i.officer_note && (
                    <p className="mt-2 rounded-lg bg-brand-soft/60 p-2 text-sm">
                      <span className="font-semibold text-brand-strong">رد المعالجة: </span>
                      {i.officer_note}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    أُرسل {formatDateTime(i.created_at)}
                    {i.resolved_at && ` · عولج ${formatDateTime(i.resolved_at)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }

  // ------------------------------------------- officer / technical support
  // Support can't read teams or profiles, so labels come from issue_labels().
  const isOfficer = user.role === "officer";
  const labels = await loadIssueLabels();
  // Officers can also read teams directly (covers the moment before 0006 runs).
  const labelOf = (id: string) => {
    const l = labels.get(id);
    if (l || !isOfficer) return l;
    const i = issues.find((x) => x.id === id)!;
    return {
      team_code: data.teams.find((t) => t.id === i.team_id)?.code ?? null,
      leader_name: data.members.find((m) => m.team_id === i.team_id && m.member_role === "leader")?.full_name ?? null,
      resolver_name: data.profiles.find((p) => p.id === i.resolved_by)?.full_name ?? null,
    };
  };
  const status = ISSUE_STATUSES.some((s) => s.value === rawStatus) ? (rawStatus as IssueStatus) : null;
  const shown = issues.filter((i) => !status || i.status === status);
  const count = (s: IssueStatus) => issues.filter((i) => i.status === s).length;

  return (
    <>
      <PageHeader title="البلاغات" sub="بلاغات رؤساء الفرق عن مشكلات المدارس المسندة لهم — عالجها ثم أشّر عليها بـ«تمت».">
        <ExportButton
          filename="البلاغات"
          rows={[
            ["الفريق", "رئيس الفريق", "اسم المدرسة", "نوع المدرسة", "الرقم الوزاري", "المشكلة", "المعالجة", "ملاحظة المعالجة", "تاريخ البلاغ", "عولج بواسطة", "تاريخ المعالجة"],
            ...shown.map((i) => [
              labelOf(i.id)?.team_code ?? "",
              labelOf(i.id)?.leader_name ?? "",
              i.school_name ?? "",
              i.school_type ?? "",
              i.ministry_number ?? "",
              i.problem,
              ISSUE_STATUS_LABEL[i.status],
              i.officer_note ?? "",
              formatDateTime(i.created_at),
              labelOf(i.id)?.resolver_name ?? "",
              i.resolved_at ? formatDateTime(i.resolved_at) : "",
            ]),
          ]}
          className="!py-2"
        />
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        {[{ value: null, label: "الكل", n: issues.length }, ...ISSUE_STATUSES.map((s) => ({ value: s.value, label: s.label, n: count(s.value) }))].map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/issues?status=${f.value}` : "/issues"}
            className={`rounded-full border px-4 py-1.5 ${status === f.value ? "border-brand bg-brand text-white" : "border-line bg-surface hover:bg-brand-soft"}`}
          >
            {f.label} <span className="tabular-nums opacity-75">({f.n})</span>
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty>{issues.length === 0 ? "لا توجد بلاغات حتى الآن." : "لا توجد بلاغات بهذه الحالة."}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((i) => {
            const label = labelOf(i.id);
            return (
              <li key={i.id} className={`card border-s-4 ${i.status === "resolved" ? "border-s-green-600" : "border-s-amber-500"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                      {label?.team_code &&
                        (isOfficer ? (
                          <Link href={`/teams/${label.team_code}`} className="rounded bg-brand-soft px-2 py-0.5 font-bold text-brand-strong" dir="ltr">
                            {label.team_code}
                          </Link>
                        ) : (
                          <span className="rounded bg-brand-soft px-2 py-0.5 font-bold text-brand-strong" dir="ltr">{label.team_code}</span>
                        ))}
                      <span className="text-muted">{label?.leader_name ?? "—"}</span>
                    </div>
                    <SchoolLine i={i} />
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[i.status]}`}>{ISSUE_STATUS_LABEL[i.status]}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{i.problem}</p>
                <p className="mt-2 text-xs text-muted">
                  أُرسل {formatDateTime(i.created_at)}
                  {i.resolved_at && ` · عولج ${formatDateTime(i.resolved_at)}${label?.resolver_name ? ` بواسطة ${label.resolver_name}` : ""}`}
                </p>
                <div className="mt-3 border-t border-line pt-3">
                  <IssueHandler id={i.id} status={i.status} note={i.officer_note} canDelete={isOfficer} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
