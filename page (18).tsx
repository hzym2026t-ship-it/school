import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { Landing } from "@/components/landing";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  // Signed in to Supabase but no longer on the allow-list.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/login?error=inactive");

  return <Landing />;
}
