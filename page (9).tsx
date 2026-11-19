import { requireUser } from "@/lib/auth";
import { loadDataset, loadDirectives } from "@/lib/data";
import { buildSheet } from "@/lib/sheet";
import { Empty, PageHeader } from "@/components/ui";
import { SheetTable } from "@/components/sheet-table";
import { ExportButton } from "@/components/export-button";

export default async function TeamsSheetPage({ searchParams }: PageProps<"/teams">) {
  const [, { q }, data, directives] = await Promise.all([requireUser("officer"), searchParams, loadDataset(), loadDirectives()]);
  const query = (typeof q === "string" ? q : "").trim();
  let rows = buildSheet(data);
  if (query) {
    const needle = query.toLowerCase();
    rows = rows.filter((r) =>
      [r.team.code, r.member.full_name, r.member.email, r.visit?.school_name, r.visit?.city, r.team.city].some((v) =>
        v?.toLowerCase().includes(needle),
      ),
    );
  }

  return (
    <>
      <PageHeader title="سجل الفرق" sub="جميع بيانات الفرق مرتبة حسب رقم المجموعة — مرّر أفقيًا لعرض كل الأعمدة">
        <form className="flex gap-2">
          <input name="q" defaultValue={query} placeholder="بحث: رقم مجموعة، اسم، مدرسة..." className="input w-56" />
          <button className="btn-ghost">بحث</button>
        </form>
        <ExportButton tableId="sheet-table" filename="سجل-الفرق-المعروض" label="Excel للجدول المعروض" className="!py-2" />
        <a href="/api/export" className="btn-primary">تصدير Excel الشامل</a>
      </PageHeader>

      {rows.length === 0 ? (
        <Empty>{query ? "لا نتائج مطابقة." : "لا توجد بيانات بعد."}</Empty>
      ) : (
        <SheetTable
          rows={rows}
          full
          flat={!!query}
          directivesFor={(team) =>
            directives.filter((d) => d.audience === "all" || (team.leader_id !== null && d.target_user === team.leader_id))
          }
        />
      )}
      <p className="mt-3 text-xs text-muted">
        م1–م8: المعايير الثمانية بالترتيب (مرّر المؤشر على رأس العمود لعرض اسم المعيار).
      </p>
    </>
  );
}
