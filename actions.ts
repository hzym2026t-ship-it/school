"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { CRITERION_KEYS, averageLevel, isRating, type AppRole, type Rating, type VisitStatus } from "@/lib/constants";
import type { ActionState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;

function friendly(e: PostgrestError | null): string | undefined {
  if (!e) return undefined;
  const m = e.message;
  if (e.code === "23505" && /teams_code/.test(m)) return "رقم المجموعة مستخدم من فريق آخر";
  if (e.code === "23505" && /allowed_emails_pkey/.test(m)) return "هذا البريد مضاف مسبقًا";
  if (e.code === "23505" && /team_members_one_leader/.test(m)) return "للفريق رئيس واحد فقط";
  if (e.code === "23505" && /teams_leader_id/.test(m)) return "لديك فريق مسجل بالفعل";
  if (e.code === "23514" && /code/.test(m)) return "رقم المجموعة يجب أن يكون بالشكل G01";
  if (e.code === "23514" && /email/.test(m)) return "صيغة البريد الإلكتروني غير صحيحة";
  if (/LEADER_EVALUATES_MEMBERS_ONLY/.test(m)) return "رئيس الفريق يقوّم الأعضاء فقط";
  if (/MEMBER_NOT_IN_VISIT_TEAM/.test(m)) return "العضو لا ينتمي لهذا الفريق";
  if (e.code === "42501" || /row-level security/.test(m)) return "ليست لديك صلاحية لهذا الإجراء";
  return "تعذّر الحفظ: " + m;
}

function done(error?: string, ok = "تم الحفظ"): ActionState {
  if (error) return { error };
  revalidatePath("/", "layout");
  return { ok };
}

// ---------------------------------------------------------------- teams
export async function createMyTeam(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("leader");
  const code = str(fd, "code").toUpperCase();
  if (!/^G\d{2,3}$/.test(code)) return { error: "رقم المجموعة يجب أن يكون بالشكل G01" };
  if (!str(fd, "full_name")) return { error: "أدخل اسمك" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_my_team", {
    p_code: code,
    p_city: str(fd, "city"),
    p_full_name: str(fd, "full_name"),
    p_national_id: str(fd, "national_id"),
    p_phone: str(fd, "phone"),
  });
  return done(friendly(error), "تم إنشاء الفريق");
}

export async function updateTeam(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const code = str(fd, "code").toUpperCase();
  if (!/^G\d{2,3}$/.test(code)) return { error: "رقم المجموعة يجب أن يكون بالشكل G01" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ code, city: opt(fd, "city") })
    .eq("id", str(fd, "team_id"));
  return done(friendly(error));
}

/** Officer: hand a team (e.g. after its leader was removed) to another leader account. */
export async function assignLeader(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("officer");
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ leader_id: opt(fd, "leader_id") })
    .eq("id", str(fd, "team_id"));
  return done(friendly(error));
}

// -------------------------------------------------------------- members
export async function saveMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const row = {
    full_name: str(fd, "full_name"),
    national_id: opt(fd, "national_id"),
    phone: opt(fd, "phone"),
    email: opt(fd, "email")?.toLowerCase() ?? null,
  };
  if (!row.full_name) return { error: "أدخل اسم العضو" };
  const supabase = await createClient();
  const id = str(fd, "id");
  const { error } = id
    ? await supabase.from("team_members").update(row).eq("id", id)
    : await supabase.from("team_members").insert({ ...row, team_id: str(fd, "team_id"), member_role: "member" });
  return done(friendly(error), id ? "تم تحديث بيانات العضو" : "تمت إضافة العضو");
}

export async function deleteMember(id: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("team_members").delete().eq("id", id).eq("member_role", "member");
  revalidatePath("/", "layout");
}

// --------------------------------------------------------------- visits
export async function saveVisit(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const row = {
    school_name: str(fd, "school_name"),
    ministry_number: opt(fd, "ministry_number"),
    school_type: opt(fd, "school_type"),
    city: opt(fd, "city"),
    visit_date: opt(fd, "visit_date"),
    status: (["completed", "planned", "not_visited"].includes(str(fd, "status")) ? str(fd, "status") : "planned") as VisitStatus,
    visit_days: Math.min(30, Math.max(1, Math.round(Number(str(fd, "visit_days")) || 1))),
    distance_km: str(fd, "distance_km") === "" ? null : Math.max(0, Number(str(fd, "distance_km")) || 0),
    notes: opt(fd, "notes"),
  };
  if (!row.school_name) return { error: "أدخل اسم المدرسة" };
  const supabase = await createClient();
  const id = str(fd, "id");
  if (id) {
    const { error } = await supabase.from("visits").update(row).eq("id", id);
    return done(friendly(error), "تم تحديث بيانات الزيارة");
  }
  const { data, error } = await supabase
    .from("visits")
    .insert({ ...row, team_id: str(fd, "team_id") })
    .select("id")
    .single();
  if (error) return { error: friendly(error) };
  revalidatePath("/", "layout");
  redirect(`/visits/${data.id}`);
}

export async function deleteVisit(id: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("visits").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect(user.role === "officer" ? "/teams" : "/visits");
}

// ---------------------------------------------------------- evaluations
export async function saveEvaluation(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const visit_id = str(fd, "visit_id");
  const member_id = str(fd, "member_id");
  const scores: Record<string, Rating | null> = {};
  for (const k of CRITERION_KEYS) {
    const v = str(fd, k);
    scores[k] = isRating(v) ? v : null;
  }
  // The overall level is always the average of the criteria, never typed in.
  const row = { ...scores, overall_level: averageLevel(Object.values(scores)).level, notes: opt(fd, "notes") };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("evaluations")
    .select("id")
    .eq("visit_id", visit_id)
    .eq("member_id", member_id)
    .eq("evaluator_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("evaluations").update(row).eq("id", existing.id)
    : await supabase.from("evaluations").insert({ ...row, visit_id, member_id });
  if (!error && user.role === "officer") {
    // Keep the officer's team level for this visit in step with the member evaluations.
    await supabase
      .from("officer_reviews")
      .update({ overall_level: await officerVisitLevel(supabase, visit_id, user.id) })
      .eq("visit_id", visit_id)
      .eq("officer_id", user.id);
  }
  return done(friendly(error), "تم حفظ التقويم");
}

/** Team level on a visit: the average of every criterion this officer rated for its members. */
async function officerVisitLevel(supabase: Awaited<ReturnType<typeof createClient>>, visitId: string, officerId: string) {
  const { data } = await supabase
    .from("evaluations")
    .select(CRITERION_KEYS.join(", "))
    .eq("visit_id", visitId)
    .eq("evaluator_id", officerId);
  const rows = (data ?? []) as unknown as Record<string, Rating | null>[];
  return averageLevel(rows.flatMap((e) => CRITERION_KEYS.map((k) => e[k]))).level;
}

// ------------------------------------------------------ officer reviews
export async function saveOfficerReview(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("officer");
  const visit_id = str(fd, "visit_id");
  const supabase = await createClient();
  const row = {
    review_date: opt(fd, "review_date"),
    overall_level: await officerVisitLevel(supabase, visit_id, user.id),
    notes: opt(fd, "notes"),
  };
  const { data: existing } = await supabase
    .from("officer_reviews")
    .select("id")
    .eq("visit_id", visit_id)
    .eq("officer_id", user.id)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("officer_reviews").update(row).eq("id", existing.id)
    : await supabase.from("officer_reviews").insert({ ...row, visit_id });
  return done(friendly(error), "تم حفظ زيارة ضابط الجودة");
}

// ------------------------------------------------------------ allow-list
export async function addAllowedEmail(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("officer");
  const email = str(fd, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "صيغة البريد الإلكتروني غير صحيحة" };
  const role: AppRole = str(fd, "role") === "officer" ? "officer" : str(fd, "role") === "support" ? "support" : "leader";
  const supabase = await createClient();
  const { error } = await supabase
    .from("allowed_emails")
    .insert({ email, role, full_name: opt(fd, "full_name"), added_by: user.id });
  return done(friendly(error), "تمت إضافة البريد. يمكن لصاحبه الآن إنشاء حساب.");
}

export async function setAllowedRole(email: string, role: AppRole) {
  await requireUser("officer");
  const supabase = await createClient();
  await supabase.from("allowed_emails").update({ role }).eq("email", email);
  revalidatePath("/", "layout");
}

export async function removeAllowedEmail(email: string) {
  await requireUser("officer");
  const supabase = await createClient();
  await supabase.from("allowed_emails").delete().eq("email", email);
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------ directives
export async function sendDirective(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("officer");
  const audience = str(fd, "audience") === "user" ? "user" : "all";
  const target_user = audience === "user" ? opt(fd, "target_user") : null;
  const title = str(fd, "title");
  if (!title) return { error: "أدخل عنوان التوجيه" };
  if (audience === "user" && !target_user) return { error: "اختر رئيس الفريق المقصود بالتوجيه الخاص" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("directives")
    .insert({ audience, target_user, title, body: opt(fd, "body") });
  return done(friendly(error), audience === "all" ? "تم إرسال التوجيه العام لجميع المستخدمين" : "تم إرسال التوجيه الخاص");
}

export async function deleteDirective(id: string) {
  await requireUser("officer");
  const supabase = await createClient();
  await supabase.from("directives").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- issues
export async function submitIssue(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("leader");
  const problem = str(fd, "problem");
  if (!problem) return { error: "اكتب وصف المشكلة" };
  if (!str(fd, "school_name")) return { error: "أدخل اسم المدرسة" };
  const supabase = await createClient();
  const { error } = await supabase.from("issues").insert({
    team_id: str(fd, "team_id"),
    problem,
    school_name: opt(fd, "school_name"),
    school_type: opt(fd, "school_type"),
    ministry_number: opt(fd, "ministry_number"),
  });
  return done(friendly(error), "تم إرسال البلاغ إلى ضباط الجودة");
}

export async function updateIssue(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(["officer", "support"]);
  const status = str(fd, "status") === "resolved" ? "resolved" : "in_progress";
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status, officer_note: opt(fd, "officer_note") })
    .eq("id", str(fd, "id"));
  return done(friendly(error), status === "resolved" ? "تم تسجيل المعالجة" : "تم الحفظ");
}

export async function deleteIssue(id: string) {
  await requireUser("officer");
  const supabase = await createClient();
  await supabase.from("issues").delete().eq("id", id);
  revalidatePath("/", "layout");
}
