import { CRITERION_KEYS, RATING_SCORE, RATINGS, levelFromScore, type AppRole, type Rating } from "./constants";
import type { Dataset } from "./data";
import type { Evaluation, Team, TeamMember, Visit } from "./types";

export function filledCount(e: Evaluation | undefined) {
  return e ? CRITERION_KEYS.filter((k) => e[k]).length : 0;
}

export function avgScore(evals: Evaluation[]): number | null {
  let sum = 0;
  let n = 0;
  for (const e of evals)
    for (const k of CRITERION_KEYS) {
      const v = e[k];
      if (v) {
        sum += RATING_SCORE[v];
        n++;
      }
    }
  return n ? sum / n : null;
}

/** Members a leader is expected to evaluate (everyone except the leader). */
export function evaluatees(members: TeamMember[], teamId: string) {
  return members.filter((m) => m.team_id === teamId && m.member_role === "member");
}

/** % of the 8 criteria the leader filled for each member on each completed visit. */
export function leaderCompletion(team: Team, data: Pick<Dataset, "members" | "visits" | "evaluations">) {
  const visits = data.visits.filter((v) => v.team_id === team.id && v.status === "completed");
  const mems = evaluatees(data.members, team.id);
  const expected = visits.length * mems.length * 8;
  if (!expected) return { pct: 0, filled: 0, expected: 0 };
  let filled = 0;
  for (const v of visits)
    for (const m of mems) {
      const e = data.evaluations.find(
        (x) => x.visit_id === v.id && x.member_id === m.id && x.evaluator_role === "leader",
      );
      filled += filledCount(e);
    }
  return { pct: (filled / expected) * 100, filled, expected };
}

export type TeamSummary = {
  team: Team;
  leaderName: string;
  members: number;
  visitsTotal: number;
  visitsDone: number;
  lastVisit: string | null;
  completion: number;
  leaderAvg: number | null;
  officerAvg: number | null;
  leaderLevel: Rating | null;
  officerLevel: Rating | null;
  reviewed: number;
};

export function teamSummaries(data: Dataset): TeamSummary[] {
  return data.teams.map((team) => {
    const visits = data.visits.filter((v) => v.team_id === team.id);
    const visitIds = new Set(visits.map((v) => v.id));
    const evals = data.evaluations.filter((e) => visitIds.has(e.visit_id));
    const leaderEvals = evals.filter((e) => e.evaluator_role === "leader");
    const officerEvals = evals.filter((e) => e.evaluator_role === "officer");
    const leader = data.members.find((m) => m.team_id === team.id && m.member_role === "leader");
    const done = visits.filter((v) => v.status === "completed");
    const dates = done.map((v) => v.visit_date).filter(Boolean).sort() as string[];
    const la = avgScore(leaderEvals);
    const oa = avgScore(officerEvals);
    return {
      team,
      leaderName: leader?.full_name ?? "—",
      members: data.members.filter((m) => m.team_id === team.id).length,
      visitsTotal: visits.length,
      visitsDone: done.length,
      lastVisit: dates.at(-1) ?? null,
      completion: leaderCompletion(team, data).pct,
      leaderAvg: la,
      officerAvg: oa,
      leaderLevel: levelFromScore(la),
      officerLevel: levelFromScore(oa),
      reviewed: data.reviews.filter((r) => visitIds.has(r.visit_id)).length,
    };
  });
}

/** Count of each rating per criterion, for one evaluator role. */
export function criterionDistribution(evals: Evaluation[], role: AppRole) {
  return CRITERION_KEYS.map((k) => {
    const counts = Object.fromEntries(RATINGS.map((r) => [r.value, 0])) as Record<Rating, number>;
    let total = 0;
    for (const e of evals) {
      if (e.evaluator_role !== role) continue;
      const v = e[k];
      if (v) {
        counts[v]++;
        total++;
      }
    }
    const score = total
      ? RATINGS.reduce((s, r) => s + counts[r.value] * r.score, 0) / total
      : null;
    return { key: k, counts, total, avg: score };
  });
}

export function visitLabel(v: Visit) {
  return v.school_name + (v.visit_date ? ` — ${v.visit_date}` : "");
}
