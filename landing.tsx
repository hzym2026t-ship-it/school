import Link from "next/link";
import { PLATFORM_NAME } from "@/lib/constants";
import { LiveClock, Logo } from "./brand";

const ROLES = [
  {
    as: "leader",
    title: "رئيس فريق",
    desc: "بيانات فريقك وزياراتك للمدارس وتقويم أعضاء الفريق والتوجيهات الواردة",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    tone: "from-[#6cbf3a] to-[#2e9b57]",
  },
  {
    as: "officer",
    title: "ضابط جودة",
    desc: "متابعة جميع الفرق، التقويم الميداني، التوجيهات، التقارير ولوحة المؤشرات",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4",
    tone: "from-[#18a6c9] to-[#3b2f8f]",
  },
  {
    as: "support",
    title: "دعم فني",
    desc: "استقبال بلاغات رؤساء الفرق ومعالجتها",
    icon: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
    tone: "from-[#f0a04b] to-[#c2571a]",
  },
] as const;

/** Public entry page: logo, name, a welcome line, and the role choice. */
export function Landing() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* soft background shapes in the logo's colours */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -start-24 h-80 w-80 rounded-full bg-[#6cbf3a]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -end-24 h-96 w-96 rounded-full bg-[#3b2f8f]/12 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 end-1/4 h-64 w-64 rounded-full bg-[#18a6c9]/12 blur-3xl" />

      <div className="relative w-full max-w-3xl text-center">
        <div className="mx-auto mb-6 inline-flex rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-line">
          <Logo size={92} />
        </div>
        <h1 className="text-2xl font-bold leading-snug sm:text-4xl">{PLATFORM_NAME}</h1>
        <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-l from-[#6cbf3a] via-[#18a6c9] to-[#3b2f8f]" />
        <p className="mx-auto mt-5 max-w-xl text-base leading-loose text-foreground/80 sm:text-lg">
          أهلًا وسهلًا بكم في منصة فرق التقويم المدرسي، معًا نرتقي بجودة التقويم ونصنع أثرًا يليق بمدارسنا وأبنائنا.
        </p>
        <LiveClock className="mt-4 !text-center text-brand-strong" />

        <p className="mt-8 mb-3 text-sm font-semibold text-muted">اختر نوع الدخول</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <Link
              key={r.as}
              href={`/login?as=${r.as}`}
              className={`${r.as === "support" ? "sm:col-span-2 sm:mx-auto sm:w-1/2 " : ""}group flex items-center gap-4 rounded-2xl bg-white p-5 text-start shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/40`}
            >
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${r.tone}`}>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={r.icon} />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold">الدخول كـ{r.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{r.desc}</span>
              </span>
              <span className="ms-auto text-xl text-brand transition group-hover:-translate-x-1" aria-hidden>←</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
