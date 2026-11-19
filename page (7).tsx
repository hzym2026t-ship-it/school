import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadDirectives, loadMyTeam, loadPlatformStats } from "@/lib/data";
import { leaderCompletion } from "@/lib/stats";
import { CreateTeamForm, EditTeamForm, MemberForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { CompletionRing, HeroBand } from "@/components/hero";
import { DirectivesPanel } from "@/components/directives";
import { currentTime } from "@/lib/time";
import { MemberRow } from "./member-row";

export default async function TeamPage() {
  const [user, data, directives, stats] = await Promise.all([
    requireUser("leader"),
    loadMyTeam(),
    loadDirectives(),
    loadPlatformStats(),
  ]);
  const { team } = data;
  const now = await currentTime();

  if (!team) {
    return (
      <div className="mx-auto max-w-2xl">
        <HeroBand name={user.full_name ?? user.email} roleLabel="رئيس فريق" stats={stats} />
        <DirectivesPanel directives={directives} now={now} />
        <PageHeader title="مرحبًا بك" sub="أكمل بيانات فريقك للبدء. رقم المجموعة يكون بالشكل G01، G02، ..." />
        <div className="card">
          <CreateTeamForm defaultName={user.full_name} />
        </div>
      </div>
    );
  }

  const members = data.members.filter((m) => m.team_id === team.id);
  const visits = data.visits.filter((v) => v.team_id === team.id);
  const done = visits.filter((v) => v.status === "completed").length;
  const planned = visits.filter((v) => v.status === "planned").length;
  const missed = visits.filter((v) => v.status === "not_visited").length;
  const completion = leaderCompletion(team, data);

  return (
    <>
      <HeroBand name={user.full_name ?? user.email} roleLabel={`رئيس فريق ${team.code}`} stats={stats} />
      <DirectivesPanel directives={directives} now={now} />

      <PageHeader title={`فريق ${team.code}`} sub={team.city ?? undefined}>
        <Link href="/visits/new" className="btn-primary">+ زيارة جديدة</Link>
      </PageHeader>

      <div className="mb-5 grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="card flex flex-wrap items-center justify-center gap-6 px-6">
          <CompletionRing pct={visits.length ? (done / visits.length) * 100 : 0} label="إنجاز المدارس المسندة" sub={`${done} من ${visits.length}`} />
          <CompletionRing pct={completion.pct} label="إنجاز تقويم المعايير" size={104} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card">
            <div className="text-sm text-muted">أعضاء الفريق</div>
            <div className="mt-1 text-2xl font-bold">{members.length}</div>
          </div>
          <div className="card r-high">
            <div className="text-sm">تمت الزيارة</div>
            <div className="mt-1 text-2xl font-bold">{done}</div>
          </div>
          <div className="card r-weak">
            <div className="text-sm">مجدولة</div>
            <div className="mt-1 text-2xl font-bold">{planned}</div>
          </div>
          <div className="card r-very_weak">
            <div className="text-sm">لم تتم الزيارة</div>
            <div className="mt-1 text-2xl font-bold">{missed}</div>
          </div>
        </div>
      </div>

      <section className="card mb-5">
        <h2 className="mb-3 font-semibold">بيانات الفريق</h2>
        <EditTeamForm teamId={team.id} code={team.code} city={team.city} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">أعضاء الفريق</h2>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">الصفة</th>
                <th className="th">الاسم</th>
                <th className="th">السجل المدني</th>
                <th className="th">الجوال</th>
                <th className="th">البريد الإلكتروني</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="mb-3 text-sm font-semibold">إضافة عضو</h3>
          <MemberForm teamId={team.id} />
        </div>
      </section>
    </>
  );
}
