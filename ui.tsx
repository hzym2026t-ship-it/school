import { RATING_LABEL, type Rating } from "@/lib/constants";

export function RatingBadge({ value, short }: { value: Rating | null | undefined; short?: boolean }) {
  if (!value) return <span className="r-none inline-block rounded px-2 py-0.5 text-xs">—</span>;
  return (
    <span className={`r-${value} inline-block rounded px-2 py-0.5 text-xs font-medium`}>
      {short ? RATING_LABEL[value].replace("ضعيف جدا", "ض.جدا") : RATING_LABEL[value]}
    </span>
  );
}

/** Completion %: green when done, yellow when partial, red when little or nothing. */
export function progressClass(pct: number) {
  if (pct >= 100) return "r-high";
  if (pct >= 50) return "r-weak";
  return "r-very_weak";
}

export function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "bg-green-600" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-xs tabular-nums text-muted">{Math.round(pct)}%</span>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

/** Saudi time, regardless of where the server runs (Vercel runs on UTC). */
export const TIME_ZONE = "Asia/Riyadh";

/** Today's date (YYYY-MM-DD) in Saudi time. */
export function todayISO(now: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(now));
}

/** Date only. Plain dates (YYYY-MM-DD) are shown as-is; timestamps in Saudi time. */
export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const plain = d.length === 10;
  return new Date(plain ? d + "T00:00:00Z" : d).toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: plain ? "UTC" : TIME_ZONE,
  });
}

/** Date and time in Saudi time. */
export function formatDateTime(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  return new Date(iso).toLocaleString("ar-SA-u-ca-gregory", { ...opts, timeZone: TIME_ZONE });
}
