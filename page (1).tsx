import { requireUser } from "@/lib/auth";
import { loadDataset, loadDirectives } from "@/lib/data";
import { Empty, PageHeader, formatDateTime } from "@/components/ui";
import { DeleteDirective, DirectiveForm } from "./directive-form";
import { ExportButton } from "@/components/export-button";

export default async function DirectivesPage() {
  const [, directives, data] = await Promise.all([requireUser("officer"), loadDirectives(), loadDataset()]);

  const leaders = data.profiles
    .filter((p) => p.role === "leader")
    .map((p) => {
      const team = data.teams.find((t) => t.leader_id === p.id);
      return { id: p.id, label: `${team ? team.code + " — " : ""}${p.full_name ?? p.email}`, code: team?.code ?? "~" };
    })
    .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
  const nameOf = (id: string | null) => leaders.find((l) => l.id === id)?.label ?? "—";

  return (
    <>
      <PageHeader
        title="التوجيهات"
        sub="التوجيه العام يظهر في صفحات جميع المستخدمين، والتوجيه الخاص يظهر لرئيس الفريق المحدد فقط."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="card">
          <h2 className="mb-4 font-semibold">توجيه جديد</h2>
          <DirectiveForm leaders={leaders} />
        </section>

        <section className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">التوجيهات المرسلة ({directives.length})</h2>
            <ExportButton
              filename="التوجيهات"
              rows={[
                ["النوع", "المرسل إليه", "العنوان", "النص", "التاريخ"],
                ...directives.map((d) => [
                  d.audience === "all" ? "عام" : "خاص",
                  d.audience === "all" ? "جميع المستخدمين" : nameOf(d.target_user),
                  d.title,
                  d.body ?? "",
                  formatDateTime(d.created_at),
                ]),
              ]}
            />
          </div>
          {directives.length === 0 ? (
            <Empty>لم يتم إرسال أي توجيه بعد.</Empty>
          ) : (
            <ul className="space-y-2">
              {directives.map((d) => (
                <li key={d.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`me-2 rounded px-2 py-0.5 text-xs ${d.audience === "all" ? "bg-brand-soft text-brand-strong" : "bg-amber-100 text-amber-900"}`}>
                        {d.audience === "all" ? "عام" : `خاص: ${nameOf(d.target_user)}`}
                      </span>
                      <span className="font-semibold">{d.title}</span>
                      {d.body && <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{d.body}</p>}
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(d.created_at)}
                      </p>
                    </div>
                    <DeleteDirective id={d.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
