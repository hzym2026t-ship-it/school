import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadDataset } from "@/lib/data";
import { AllowedEmailForm } from "@/components/forms";
import { Empty, PageHeader, formatDate } from "@/components/ui";
import type { AllowedEmail } from "@/lib/types";
import { AllowedRowActions } from "./row-actions";
import { ExportButton } from "@/components/export-button";

export default async function UsersPage() {
  const me = await requireUser("officer");
  const supabase = await createClient();
  const [{ data: list }, data] = await Promise.all([
    supabase.from("allowed_emails").select("email, role, full_name, created_at").order("created_at"),
    loadDataset(),
  ]);
  const rows = (list ?? []) as AllowedEmail[];

  return (
    <>
      <PageHeader
        title="المستخدمون"
        sub="لا يستطيع أحد إنشاء حساب إلا إذا أضفت بريده هنا. حذف البريد يحذف الحساب ويمنع الدخول فورًا، مع الاحتفاظ ببيانات الفريق."
      />

      <section className="card mb-5">
        <h2 className="mb-3 font-semibold">إضافة بريد</h2>
        <AllowedEmailForm />
      </section>

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">القائمة ({rows.length})</h2>
          <ExportButton tableId="x-users" filename="المستخدمون" />
        </div>
        {rows.length === 0 ? (
          <Empty>القائمة فارغة.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table id="x-users" className="w-full">
              <thead>
                <tr>
                  <th className="th">البريد الإلكتروني</th>
                  <th className="th">الاسم</th>
                  <th className="th">الدور</th>
                  <th className="th">الحساب</th>
                  <th className="th">الفريق</th>
                  <th className="th">أضيف في</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const profile = data.profiles.find((p) => p.email === r.email);
                  const team = profile && data.teams.find((t) => t.leader_id === profile.id);
                  return (
                    <tr key={r.email}>
                      <td className="td" dir="ltr">{r.email}</td>
                      <td className="td">{profile?.full_name ?? r.full_name ?? "—"}</td>
                      <td className="td">
                        <AllowedRowActions email={r.email} role={r.role} isMe={r.email === me.email} part="role" />
                      </td>
                      <td className="td">
                        <span className={`rounded px-2 py-0.5 text-xs ${profile ? "r-high" : "r-none"}`}>
                          {profile ? "مسجّل" : "لم يسجل بعد"}
                        </span>
                      </td>
                      <td className="td" dir="ltr">{team?.code ?? "—"}</td>
                      <td className="td">{formatDate(r.created_at)}</td>
                      <td className="td">
                        <AllowedRowActions email={r.email} role={r.role} isMe={r.email === me.email} part="delete" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
