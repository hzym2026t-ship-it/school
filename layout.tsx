import { requireUser } from "@/lib/auth";
import { APP_ROLES } from "@/lib/constants";
import { AppHeader } from "@/components/app-header";

const LEADER_NAV = [
  { href: "/team", label: "فريقي" },
  { href: "/visits", label: "الزيارات والتقويم" },
  { href: "/sheet", label: "سجل الفريق" },
  { href: "/inbox", label: "التوجيهات الواردة" },
  { href: "/issues", label: "البلاغات" },
];

const OFFICER_NAV = [
  { href: "/teams", label: "سجل الفرق" },
  { href: "/reviews", label: "زيارة وتقويم الفرق" },
  { href: "/directives", label: "التوجيهات" },
  { href: "/issues", label: "البلاغات" },
  { href: "/reports", label: "التقارير" },
  { href: "/dashboard", label: "لوحة المؤشرات" },
  { href: "/users", label: "المستخدمون" },
];

const SUPPORT_NAV = [{ href: "/issues", label: "البلاغات" }];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser(APP_ROLES);
  const nav = user.role === "officer" ? OFFICER_NAV : user.role === "support" ? SUPPORT_NAV : LEADER_NAV;

  return (
    <>
      <AppHeader name={user.full_name || user.email} role={user.role} nav={nav} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
