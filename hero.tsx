import { PLATFORM_NAME } from "@/lib/constants";
import type { PlatformStats } from "@/lib/types";
import { LiveClock, Logo } from "./brand";

const ICONS = {
  users: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9a8 8 0 0 1 16 0",
  teams: "M3 21V9l9-6 9 6v12M9 21v-6h6v6",
  done: "M5 13l4 4L19 7",
  planned: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  missed: "M18 6 6 18M6 6l12 12",
} as const;

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: keyof typeof ICONS;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/95 p-3 text-foreground shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={ICONS[icon]} />
        </svg>
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none tabular-nums">{value}</div>
        <div className="mt-1 truncate text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

/** Welcome band shown at the top of each user's home page. */
export function HeroBand({ name, roleLabel, stats }: { name: string; roleLabel: string; stats: PlatformStats | null }) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-l from-brand-strong via-brand to-[#1d8a6b] p-5 text-white shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-white p-1.5">
            <Logo size={48} />
          </span>
          <div>
            <p className="text-sm opacity-85">مرحبًا، {name}</p>
            <h1 className="text-lg font-bold sm:text-xl">{PLATFORM_NAME}</h1>
            <p className="text-xs opacity-75">{roleLabel}</p>
          </div>
        </div>
        <LiveClock />
      </div>

      {stats && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="المستخدمون" value={stats.users} icon="users" tone="bg-sky-100 text-sky-800" />
          <StatTile label="الفرق" value={stats.teams} icon="teams" tone="bg-brand-soft text-brand-strong" />
          <StatTile label="مدارس تمت زيارتها" value={stats.completed} icon="done" tone="r-high" />
          <StatTile label="مدارس مجدولة" value={stats.planned} icon="planned" tone="r-weak" />
          <StatTile label="مدارس لم تتم زيارتها" value={stats.not_visited} icon="missed" tone="r-very_weak" />
        </div>
      )}
    </section>
  );
}

/** Circular completion indicator. */
export function CompletionRing({
  pct,
  label,
  sub,
  size = 132,
}: {
  pct: number;
  label: string;
  sub?: string;
  size?: number;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, pct));
  const color = value >= 100 ? "#0f7a4a" : value >= 50 ? "#e0a526" : "#c0392b";
  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${label}: ${Math.round(value)}%`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5ebe8" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" fontSize="24" fontWeight="700" fill="currentColor">
          {Math.round(value)}%
        </text>
        {sub && (
          <text x="60" y="78" textAnchor="middle" fontSize="10" fill="#5f6b66">
            {sub}
          </text>
        )}
      </svg>
      <div className="mt-1 text-sm font-semibold">{label}</div>
    </div>
  );
}
