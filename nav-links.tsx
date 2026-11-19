"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
      {items.map((it) => {
        const active = path === it.href || path.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 transition-colors ${
              active
                ? "bg-brand font-semibold text-white shadow-sm"
                : "text-foreground/75 hover:bg-brand-soft hover:text-brand-strong"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
