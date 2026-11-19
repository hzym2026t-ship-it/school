import type { AppRole, IssueStatus, Rating, VisitStatus } from "./constants";

export type Profile = {
  id: string;
  email: string;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
};

export type Team = {
  id: string;
  code: string;
  leader_id: string | null;
  city: string | null;
};

export type TeamMember = {
  id: string;
  team_id: string;
  member_role: "leader" | "member";
  full_name: string;
  national_id: string | null;
  phone: string | null;
  email: string | null;
};

export type Visit = {
  id: string;
  team_id: string;
  school_name: string;
  ministry_number: string | null;
  school_type: string | null;
  city: string | null;
  visit_date: string | null;
  status: VisitStatus;
  visit_days: number;
  distance_km: number | null;
  notes: string | null;
};

export type Evaluation = {
  id: string;
  visit_id: string;
  member_id: string;
  evaluator_id: string;
  evaluator_role: AppRole;
  c1: Rating | null;
  c2: Rating | null;
  c3: Rating | null;
  c4: Rating | null;
  c5: Rating | null;
  c6: Rating | null;
  c7: Rating | null;
  c8: Rating | null;
  overall_level: Rating | null;
  notes: string | null;
  updated_at: string;
};

export type OfficerReview = {
  id: string;
  visit_id: string;
  officer_id: string;
  review_date: string | null;
  overall_level: Rating | null;
  notes: string | null;
};

export type AllowedEmail = {
  email: string;
  role: AppRole;
  full_name: string | null;
  created_at: string;
};

export type Directive = {
  id: string;
  audience: "all" | "user";
  target_user: string | null;
  title: string;
  body: string | null;
  created_by: string | null;
  created_at: string;
};

export type Issue = {
  id: string;
  team_id: string;
  created_by: string | null;
  problem: string;
  school_name: string | null;
  school_type: string | null;
  ministry_number: string | null;
  status: IssueStatus;
  officer_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type PlatformStats = {
  users: number;
  leaders: number;
  officers: number;
  teams: number;
  visits: number;
  completed: number;
  planned: number;
  not_visited: number;
};

export type ActionState = { error?: string; ok?: string } | undefined;
