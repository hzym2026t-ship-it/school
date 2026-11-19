import Link from "next/link";
import { ROLE_LABEL, type AppRole } from "@/lib/constants";
import { signOut } from "@/app/login/actions";
import { NavLinks } from "@/app/(app)/nav-links";
import { Logo } from "./brand";

type NavItem = { href: string; label: string };

/** Two-tier header: brand bar (logo, platform name, user) + navigation bar. */
export function AppHeader({
  name,
  role,
  nav,
}: {
  name: string;
  role: AppRole;
  nav: NavItem[];
}) {
  const initial = name.trim().charAt(0) || "؟";
  return (
    <header className="no-print sticky top-0 z-20 bg-surface shadow-sm">
      {/* Accent strip in the logo's colours */}
      <div className="h-1 bg-gradient-to-l from-[#6cbf3a] via-[#18a6c9] to-[#3b2f8f]" />

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Logo size={44} />
          <span className="hidden h-10 w-px bg-line sm:block" aria-hidden />
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-base font-bold text-foreground lg:text-lg">منصة فرق التقويم المدرسي</span>
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              المنطقة الغربية
            </span>
          </span>
        </Link>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden text-end leading-tight md:block">
            <div className="max-w-48 truncate text-sm font-semibold">{name}</div>
            <div className="text-xs text-muted">{ROLE_LABEL[role]}</div>
          </div>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong ring-2 ring-white"
            title={`${name} — ${ROLE_LABEL[role]}`}
          >
            {initial}
          </span>
          <form action={signOut}>
            <button
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-sm text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              title="تسجيل الخروج"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="hidden sm:inline">خروج</span>
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-line bg-background/70">
        <div className="mx-auto max-w-7xl px-4 py-1.5">
          <NavLinks items={nav} />
        </div>
      </div>
    </header>
  );
}
