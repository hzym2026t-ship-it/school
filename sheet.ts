import type { Dataset } from "./data";
import type { Evaluation, OfficerReview, Profile, Team, TeamMember, Visit } from "./types";

/** One row per member per visit — the same shape as the original Excel sheet. */
export type SheetRow = {
  team: Team;
  member: TeamMember;
  visit: Visit | null;
  leaderEval: Evaluation | undefined;
  officerEval: Evaluation | undefined;
  review: OfficerReview | undefined;
  officer: Profile | undefined;
  firstOfTeam: boolean;
  firstOfVisit: boolean;
  visitRows: number;
};

const latest = <T extends { updated_at?: string }>(xs: T[]) =>
  xs.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0];

export function buildSheet(data: Dataset): SheetRow[] {
  const rows: SheetRow[] = [];
  const teams = [...data.teams].sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));

  for (const team of teams) {
    const members = data.members.filter((m) => m.team_id === team.id);
    const visits = data.visits
      .filter((v) => v.team_id === team.id)
      .sort((a, b) => (a.visit_date ?? "9").localeCompare(b.visit_date ?? "9"));
    const blocks: (Visit | null)[] = visits.length ? visits : [null];
    let firstOfTeam = true;

    for (const visit of blocks) {
      const review = visit ? data.reviews.find((r) => r.visit_id === visit.id) : undefined;
      const officer = review ? data.profiles.find((p) => p.id === review.officer_id) : undefined;
      const list = members.length ? members : [null];
      list.forEach((member, i) => {
        if (!member) return;
        const evals = visit ? data.evaluations.filter((e) => e.visit_id === visit.id && e.member_id === member.id) : [];
        rows.push({
          team,
          member,
          visit,
          leaderEval: evals.find((e) => e.evaluator_role === "leader"),
          officerEval: latest(evals.filter((e) => e.evaluator_role === "officer")),
          review,
          officer,
          firstOfTeam,
          firstOfVisit: i === 0,
          visitRows: members.length,
        });
        firstOfTeam = false;
      });
    }
  }
  return rows;
}
