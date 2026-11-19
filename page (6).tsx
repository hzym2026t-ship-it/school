import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadDirectives, loadMyTeam } from "@/lib/data";
import { buildSheet } from "@/lib/sheet";
import { Empty, PageHeader } from "@/components/ui";
import { SheetTable } from "@/components/sheet-table";

/** Leader: own team's record, up to the leader's evaluation, plus directives. */
export default async function TeamSheetPage() {
  const [, data, directives] = await Promise.all([requireUser("leader"), loadMyTeam(), loadDirectives()]);
  if (!data.team) redirect("/team");
  const rows = buildSheet({ ...data, teams: [data.team] });

  return (
    <>
      <PageHeader title={`سجل فريق ${data.team.code}`} sub="بيانات الفريق والزيارات وتقويمك للأعضاء — مرّر أفقيًا لعرض كل الأعمدة" />
      {rows.length === 0 ? (
        <Empty>أضف أعضاء الفريق والزيارات ليظهر السجل.</Empty>
      ) : (
        <SheetTable rows={rows} full={false} directivesFor={() => directives} />
      )}
      <p className="mt-3 text-xs text-muted">
        م1–م8: المعايير الثمانية بالترتيب (مرّر المؤشر على رأس العمود لعرض اسم المعيار).
      </p>
    </>
  );
}
