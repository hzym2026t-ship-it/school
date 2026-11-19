import { requireUser } from "@/lib/auth";
import { loadDirectives } from "@/lib/data";
import { currentTime } from "@/lib/time";
import { DirectivesPanel } from "@/components/directives";
import { PageHeader } from "@/components/ui";

/** Leader: directives received from quality officers. */
export default async function InboxPage() {
  const [, directives, now] = await Promise.all([requireUser("leader"), loadDirectives(), currentTime()]);
  const personal = directives.filter((d) => d.audience === "user").length;

  return (
    <>
      <PageHeader
        title="التوجيهات الواردة"
        sub={`من ضباط الجودة — ${directives.length - personal} توجيه عام و${personal} توجيه خاص`}
      />
      <DirectivesPanel directives={directives} now={now} tall />
    </>
  );
}
