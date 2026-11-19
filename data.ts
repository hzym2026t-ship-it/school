import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CRITERION_KEYS, averageLevel } from "./constants";
import type { Directive, Issue, Evaluation, OfficerReview, PlatformStats, Profile, Team, TeamMember, Visit } from "./types";

const EVAL_COLS =
  "id, visit_id, member_id, evaluator_id, evaluator_role, c1, c2, c3, c4, c5, c6, c7, c8, overall_level, notes, updated_at";

export type Dataset = {
  teams: Team[];
  members: TeamMember[];
  visits: Visit[];
  evaluations: Evaluation[];
  reviews: OfficerReview[];
  profiles: Profile[];
};

/** Everything the current user may read. RLS decides what that is. */
export const loadDataset = cache(async (): Promise<Dataset> => {
  const supabase = await createClient();
  const [teams, members, visits, evaluations, reviews, profiles] = await Promise.all([
    supabase.from("teams").select("id, code, leader_id, city").order("code"),
    supabase.from("team_members").select("id, team_id, member_role, full_name, national_id, phone, email").order("created_at"),
    supabase.from("visits").select("*").order("visit_date", { ascending: false, nullsFirst: false }),
    supabase.from("evaluations").select(EVAL_COLS),
    supabase.from("officer_reviews").select("id, visit_id, officer_id, review_date, overall_level, notes"),
    supabase.from("profiles").select("id, email, role, full_name, phone"),
  ]);
  const members_ = ((members.data ?? []) as TeamMember[]).sort(
    (a, b) => Number(a.member_role === "member") - Number(b.member_role === "member"),
  );
  // Overall levels are always derived from the criteria (also fixes rows saved
  // before the level became automatic): a member's level is the average of their
  // eight criteria, an officer's team level is the average of everything that
  // officer rated on the visit.
  const evals = ((evaluations.data ?? []) as Evaluation[]).map((e) => {
    const { level } = averageLevel(CRITERION_KEYS.map((k) => e[k]));
    return { ...e, overall_level: level };
  });
  const reviews_ = ((reviews.data ?? []) as OfficerReview[]).map((r) => {
    const mine = evals.filter((e) => e.visit_id === r.visit_id && e.evaluator_id === r.officer_id);
    const { level } = averageLevel(mine.flatMap((e) => CRITERION_KEYS.map((k) => e[k])));
    return { ...r, overall_level: level };
  });
  return {
    teams: (teams.data ?? []) as Team[],
    members: members_,
    visits: (visits.data ?? []) as Visit[],
    evaluations: evals,
    reviews: reviews_,
    profiles: (profiles.data ?? []) as Profile[],
  };
});

/** Leader's dataset. RLS only returns the leader's own team. */
export async function loadMyTeam() {
  const data = await loadDataset();
  const team = data.teams[0] ?? null;
  return { ...data, team };
}

export const loadDirectives = cache(async (): Promise<Directive[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("directives")
    .select("id, audience, target_user, title, body, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as Directive[];
});

export async function loadPlatformStats(): Promise<PlatformStats | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_stats");
  return (data as PlatformStats | null) ?? null;
}

export const loadIssues = cache(async (): Promise<Issue[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("id, team_id, created_by, problem, school_name, school_type, ministry_number, status, officer_note, resolved_by, resolved_at, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as Issue[];
});

export type IssueLabel = { team_code: string | null; leader_name: string | null; resolver_name: string | null };

/** Team code, leader and resolver per issue (officers and technical support). */
export const loadIssueLabels = cache(async (): Promise<Map<string, IssueLabel>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_labels");
  if (error) console.warn("[issue_labels]", error.code, error.message);
  const rows = (data ?? []) as (IssueLabel & { issue_id: string })[];
  return new Map(rows.map(({ issue_id, ...l }) => [issue_id, l]));
});
