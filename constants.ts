// Shared constants mirrored from the database (supabase/migrations/0001_init.sql).

export type Rating = "high" | "acceptable" | "weak" | "very_weak";
export type AppRole = "leader" | "officer" | "support";
export type VisitStatus = "completed" | "planned" | "not_visited";

export const RATINGS: { value: Rating; label: string; score: number }[] = [
  { value: "high", label: "مرتفع", score: 4 },
  { value: "acceptable", label: "مقبول", score: 3 },
  { value: "weak", label: "ضعيف", score: 2 },
  { value: "very_weak", label: "ضعيف جدا", score: 1 },
];

export const RATING_LABEL: Record<Rating, string> = Object.fromEntries(
  RATINGS.map((r) => [r.value, r.label]),
) as Record<Rating, string>;

export const RATING_SCORE: Record<Rating, number> = Object.fromEntries(
  RATINGS.map((r) => [r.value, r.score]),
) as Record<Rating, number>;

/** Bar fills for rating distributions (validated for colour-blind separation). */
export const RATING_BAR_COLOR: Record<Rating, string> = {
  high: "#0f7a4a",
  acceptable: "#3dbb9c",
  weak: "#f0a04b",
  very_weak: "#a8281f",
};

export function isRating(v: unknown): v is Rating {
  return typeof v === "string" && v in RATING_LABEL;
}

export const CRITERIA = [
  "جودة التعريف ببرنامج التقويم المدرسي",
  "خلفية الأخصائيين عن المدرسة قبل الزيارة",
  "دقة رصد وتوثيق وتنظيم الملاحظات",
  "جودة إدارة المقابلات حوارا وتدوينا",
  "جودة مداولات الفريق وفق المؤشرات والأدلة",
  "التناغم والتكامل بين أعضاء الفريق",
  "التواصل الإيجابي مع إدارة المدرسة ومنسوبيها",
  "يصلح للقيام بعمل رئيس فريق",
] as const;

export const CRITERION_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] as const;
export type CriterionKey = (typeof CRITERION_KEYS)[number];

export const VISIT_STATUSES: { value: VisitStatus; label: string }[] = [
  { value: "completed", label: "تمت الزيارة" },
  { value: "planned", label: "مجدولة" },
  { value: "not_visited", label: "لم تتم الزيارة" },
];

/** Colour class per status: green done, yellow scheduled, red not visited. */
export const VISIT_STATUS_CLASS: Record<VisitStatus, string> = {
  completed: "r-high",
  planned: "r-weak",
  not_visited: "r-very_weak",
};

export type IssueStatus = "in_progress" | "resolved";
export const ISSUE_STATUSES: { value: IssueStatus; label: string; cls: string }[] = [
  { value: "in_progress", label: "تحت الإجراء", cls: "r-weak" },
  { value: "resolved", label: "تمت", cls: "r-high" },
];
export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = { in_progress: "تحت الإجراء", resolved: "تمت" };

export const PLATFORM_NAME = "منصة فرق التقويم المدرسي بالمنطقة الغربية";

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = Object.fromEntries(
  VISIT_STATUSES.map((s) => [s.value, s.label]),
) as Record<VisitStatus, string>;

export const CITIES = ["مكة المكرمة", "جدة", "الطائف", "المدينة المنورة", "ينبع", "القنفذة", "الليث", "الرضيات"];

export const SCHOOL_TYPES = ["ابتدائية", "متوسطة", "ثانوية", "مجمع", "رياض أطفال", "تعليم مستمر"];

export const ROLE_LABEL: Record<AppRole, string> = {
  leader: "رئيس فريق",
  officer: "ضابط جودة",
  support: "دعم فني",
};

export const APP_ROLES: AppRole[] = ["leader", "officer", "support"];

/** Average (1–4) of the given ratings, ignoring empty ones, and the level it maps to. */
export function averageLevel(ratings: readonly (Rating | null | undefined | "")[]): { avg: number | null; level: Rating | null } {
  const scores = ratings.filter((r): r is Rating => isRating(r)).map((r) => RATING_SCORE[r]);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return { avg, level: levelFromScore(avg) };
}

/** Level from an average score (1–4). */
export function levelFromScore(avg: number | null): Rating | null {
  if (avg == null) return null;
  if (avg >= 3.5) return "high";
  if (avg >= 2.5) return "acceptable";
  if (avg >= 1.5) return "weak";
  return "very_weak";
}
