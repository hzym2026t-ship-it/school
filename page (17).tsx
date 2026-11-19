import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand";
import { PLATFORM_NAME } from "@/lib/constants";

const ROLE_TITLE = { leader: "الدخول كرئيس فريق", officer: "الدخول كضابط جودة", support: "الدخول كدعم فني" } as const;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { error, as } = await searchParams;
  const role = typeof as === "string" && as in ROLE_TITLE ? (as as keyof typeof ROLE_TITLE) : null;
  // The role is chosen on the welcome page first.
  if (!role && error !== "inactive") redirect("/");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -top-32 -start-24 h-80 w-80 rounded-full bg-[#6cbf3a]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -end-24 h-96 w-96 rounded-full bg-[#3b2f8f]/12 blur-3xl" />

      <div className="relative text-center">
        <Link href="/" className="mx-auto mb-4 inline-flex rounded-2xl bg-white px-5 py-3 shadow-sm ring-1 ring-line">
          <Logo size={64} />
        </Link>
        <h1 className="text-lg font-bold sm:text-xl">{PLATFORM_NAME}</h1>
        {role && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-semibold text-brand-strong">
            {ROLE_TITLE[role]}
            <Link href="/" className="text-xs font-normal text-muted underline hover:text-brand">تغيير</Link>
          </p>
        )}
      </div>
      <div className="relative w-full max-w-sm">
        <LoginForm
          as={role ?? ""}
          initialError={error === "inactive" ? "حسابك غير مفعّل على المنصة. تواصل مع ضابط الجودة." : undefined}
        />
      </div>
    </main>
  );
}
