import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "./constants";
import type { Profile } from "./types";

/**
 * The signed-in user's profile, or null. Verifies the session token with
 * getClaims() (locally against the project's signing keys, no Auth round
 * trip when asymmetric keys are in use) and treats users whose email was removed from the allow-list as
 * signed out (my_role() returns null for them).
 */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  const email = auth?.claims?.email as string | undefined;
  if (!userId) return null;

  const load = () =>
    Promise.all([
      supabase.from("profiles").select("id, email, role, full_name, phone").eq("id", userId).maybeSingle(),
      supabase.rpc("my_role"),
    ]);
  let [{ data: profile }, { data: role }] = await load();
  if (!profile || !role) {
    // Account created before its email was listed (or before the schema
    // existed): create the profile now if the email is on the allow-list.
    const { data: ensured, error } = await supabase.rpc("ensure_profile");
    if (!ensured) {
      console.warn("[auth] no active profile for", email, error?.code, error?.message ?? "email not on allow-list");
      return null;
    }
    const [p, r] = await load();
    profile = p.data;
    role = r.data;
    if (!profile || !role) {
      console.warn("[auth] profile reload failed for", email, p.error?.message, r.error?.message);
    }
  }
  if (!profile || !role) return null;
  return { ...(profile as Profile), role: role as AppRole };
});

/**
 * Redirects to the welcome page when signed out, or to the user's home when
 * their role isn't allowed here. Without an argument only leaders and
 * officers pass: technical support has the issues screen and nothing else.
 */
export async function requireUser(role: AppRole | AppRole[] = ["leader", "officer"]): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect("/");
  return user;
}

export function homeFor(role: AppRole) {
  return role === "officer" ? "/dashboard" : role === "support" ? "/issues" : "/team";
}
