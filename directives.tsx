import type { Directive } from "@/lib/types";
import { formatDateTime } from "./ui";

const NEW_MS = 3 * 24 * 60 * 60 * 1000;


function DirectiveItem({ d, now }: { d: Directive; now: number }) {
  const isNew = now - new Date(d.created_at).getTime() < NEW_MS;
  return (
    <li className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{d.title}</h4>
        {isNew && <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">جديد</span>}
      </div>
      {d.body && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{d.body}</p>}
      <p className="mt-2 text-xs text-muted">{formatDateTime(d.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
    </li>
  );
}

/** The two-part directives window: general (everyone) and private (this user). */
export function DirectivesPanel({
  directives,
  now,
  tall = false,
  personalSub = "موجّه إليك",
}: {
  directives: Directive[];
  now: number;
  tall?: boolean;
  personalSub?: string;
}) {
  const general = directives.filter((d) => d.audience === "all");
  const personal = directives.filter((d) => d.audience === "user");
  const sections = [
    { title: "توجيه عام", sub: "لجميع المستخدمين", items: general, tone: "border-brand/40 bg-brand-soft/40", icon: "📢" },
    { title: "توجيه خاص", sub: personalSub, items: personal, tone: "border-amber-300 bg-amber-50", icon: "✉️" },
  ];

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-2">
      {sections.map((s) => (
        <div key={s.title} className={`rounded-xl border p-4 ${s.tone}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">
              <span className="me-1.5" aria-hidden>{s.icon}</span>
              {s.title}
            </h2>
            <span className="text-xs text-muted">{s.sub}</span>
          </div>
          {s.items.length === 0 ? (
            <p className="text-sm text-muted">لا توجد توجيهات حاليًا.</p>
          ) : (
            <ul className={`space-y-2 overflow-y-auto ${tall ? "" : "max-h-72"}`}>
              {s.items.map((d) => (
                <DirectiveItem key={d.id} d={d} now={now} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
