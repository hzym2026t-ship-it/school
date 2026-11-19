import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VisitForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default async function NewVisitPage() {
  const user = await requireUser("leader");
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id, code").eq("leader_id", user.id).maybeSingle();
  if (!team) redirect("/team");

  return (
    <>
      <PageHeader title="زيارة جديدة" sub={`فريق ${team.code} — بيانات المدرسة وتاريخ الزيارة`} />
      <div className="card">
        <VisitForm teamId={team.id} />
      </div>
    </>
  );
}
