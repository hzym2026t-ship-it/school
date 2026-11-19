"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const ROLE_NAME = { leader: "رئيس فريق", officer: "ضابط جودة", support: "دعم فني" } as const;
type Role = keyof typeof ROLE_NAME;

/**
 * After sign-in: make sure the account is active and matches the entry the
 * user chose on the welcome page (leader / officer). The role always comes
 * from the database, never from the choice itself.
 */
async function checkRole(supabase: Awaited<ReturnType<typeof createClient>>, chosen: string): Promise<string | undefined> {
  const { data: role } = await supabase.rpc("ensure_profile");
  if (!role) {
    await supabase.auth.signOut();
    return "حسابك غير مفعّل على المنصة. تواصل مع ضابط الجودة.";
  }
  if (chosen in ROLE_NAME && chosen !== role) {
    await supabase.auth.signOut();
    return `هذا الحساب مسجّل بصفة ${ROLE_NAME[role as Role]}، وليس ${ROLE_NAME[chosen as Role]}. ارجع واختر الدخول كـ${ROLE_NAME[role as Role]}.`;
  }
  return undefined;
}

function readCreds(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { email, password } = readCreds(formData);
  if (!email || !password) return { error: "أدخل البريد الإلكتروني وكلمة المرور" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.warn("[signIn] failed:", error.status, error.code, error.message);
    if (!error.status || /fetch/i.test(error.message)) {
      return { error: "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى." };
    }
    if (error.code === "email_not_confirmed") {
      return { error: "لم يتم تأكيد البريد بعد. افتح رسالة التأكيد المرسلة إلى بريدك ثم حاول مرة أخرى." };
    }
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب غير مفعّل." };
  }
  const roleError = await checkRole(supabase, String(formData.get("as") ?? ""));
  if (roleError) return { error: roleError };
  redirect("/");
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { email, password } = readCreds(formData);
  const confirm = String(formData.get("confirm") ?? "");
  if (!email || !password) return { error: "أدخل البريد الإلكتروني وكلمة المرور" };
  if (password.length < 8) return { error: "كلمة المرور يجب ألا تقل عن 8 أحرف" };
  if (password !== confirm) return { error: "كلمتا المرور غير متطابقتين" };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    console.warn("[signUp] failed:", error.status, error.code, error.message);
    if (!error.status || /fetch/i.test(error.message)) {
      return { error: "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى." };
    }
    // The database trigger rejects emails that aren't on the allow-list.
    if (/database error/i.test(error.message)) {
      return { error: "هذا البريد غير مضاف إلى المنصة. تواصل مع ضابط الجودة لإضافته." };
    }
    if (error.code === "user_already_exists") {
      return { error: "هذا البريد مسجل مسبقًا. استخدم تسجيل الدخول." };
    }
    return { error: error.message };
  }
  if (data.session) {
    const roleError = await checkRole(supabase, String(formData.get("as") ?? ""));
    if (roleError) return { error: roleError };
    redirect("/");
  }
  return { ok: "تم إنشاء الحساب. افتح رسالة التأكيد في بريدك الإلكتروني ثم سجّل الدخول." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
