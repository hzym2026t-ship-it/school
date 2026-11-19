import { Fragment } from "react";
import Link from "next/link";
import { CRITERIA, CRITERION_KEYS, VISIT_STATUS_CLASS, VISIT_STATUS_LABEL } from "@/lib/constants";
import type { SheetRow } from "@/lib/sheet";
import type { Directive, Team } from "@/lib/types";
import { RatingBadge, formatDate } from "./ui";

const head = "th border-s border-line/70 text-[11px]";
const cell = "td border-s border-line/60 text-xs";

function DirectivesCell({ items }: { items: Directive[] }) {
  if (items.length === 0) return <span className="text-muted">—</span>;
  const shown = items.slice(0, 4);
  return (
    <ul className="w-56 space-y-1.5 whitespace-normal text-start leading-relaxed">
      {shown.map((d) => (
        <li key={d.id} className="flex gap-1">
          <span className={`shrink-0 rounded px-1 text-[10px] ${d.audience === "all" ? "bg-brand-soft text-brand-strong" : "bg-amber-100 text-amber-900"}`}>
            {d.audience === "all" ? "عام" : "خاص"}
          </span>
          <span className="line-clamp-2" title={d.body ?? d.title}>{d.title}</span>
        </li>
      ))}
      {items.length > shown.length && <li className="text-muted">+{items.length - shown.length} أخرى</li>}
    </ul>
  );
}

/**
 * The spreadsheet view of teams, one row per member per visit.
 * `full` adds the quality-officer columns; leaders see up to their own
 * evaluation followed by the directives column.
 */
export function SheetTable({
  rows,
  full,
  directivesFor,
  flat = false,
  id = "sheet-table",
}: {
  id?: string;
  rows: SheetRow[];
  full: boolean;
  directivesFor: (team: Team) => Directive[];
  /** Every row stands alone (e.g. search results), so no merged cells. */
  flat?: boolean;
}) {
  const teamRows = new Map<string, number>();
  for (const r of rows) teamRows.set(r.team.id, (teamRows.get(r.team.id) ?? 0) + 1);

  return (
    <div className="max-h-[75vh] overflow-auto rounded-xl border border-line bg-surface">
      <table id={id} className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={head} colSpan={6}>بيانات الفريق</th>
            <th className={head} colSpan={9}>بيانات المدرسة والزيارة</th>
            <th className={`${head} !bg-amber-100 !text-amber-900`} colSpan={10}>تقويم رئيس الفريق</th>
            <th className={`${head} !bg-sky-100 !text-sky-900`} rowSpan={2}>التوجيهات<br /><span className="font-normal">عامة / خاصة</span></th>
            {full && (
              <>
                <th className={`${head} !bg-green-100 !text-green-900`} colSpan={10}>تقويم ضابط الجودة للعضو</th>
                <th className={head} colSpan={4}>زيارة ضابط الجودة للفريق</th>
              </>
            )}
          </tr>
          <tr>
            {["رقم الفريق", "رئيس/عضو", "الاسم", "السجل المدني", "الجوال", "البريد", "المدرسة", "الرقم الوزاري", "نوع المدرسة", "تاريخ الزيارة", "أيام الزيارة", "البعد (كم)", "الحالة", "المدينة", "ملاحظات"].map((h) => (
              <th key={h} className={head}>{h}</th>
            ))}
            {(full ? [0, 1] : [0]).map((g) => (
              <Fragment key={g}>
                {CRITERION_KEYS.map((k, i) => (
                  <th key={`${g}${k}`} className={`${head} ${g ? "!bg-green-50" : "!bg-amber-50"}`} title={CRITERIA[i]}>م{i + 1}</th>
                ))}
                <th className={`${head} ${g ? "!bg-green-50" : "!bg-amber-50"}`}>المستوى العام</th>
                <th className={`${head} ${g ? "!bg-green-50" : "!bg-amber-50"}`}>ملاحظات</th>
              </Fragment>
            ))}
            {full &&
              ["ضابط الجودة", "تاريخ الزيارة", "المستوى العام", "ملاحظات ضابط الجودة"].map((h) => (
                <th key={h} className={head}>{h}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const v = r.visit;
            const firstOfVisit = flat || r.firstOfVisit;
            const visitSpan = flat ? 1 : r.visitRows;
            const firstOfTeam = flat || r.firstOfTeam;
            const teamSpan = flat ? 1 : teamRows.get(r.team.id) ?? 1;
            const sep = !flat && r.firstOfTeam ? "border-t-2 border-t-brand/40" : "";
            const evalCells = (e: SheetRow["leaderEval"], g: number) => (
              <Fragment key={g}>
                {CRITERION_KEYS.map((k) => (
                  <td key={k} className={`${cell} ${sep}`}><RatingBadge value={e?.[k]} short /></td>
                ))}
                <td className={`${cell} ${sep}`}><RatingBadge value={e?.overall_level} short /></td>
                <td className={`${cell} max-w-40 truncate ${sep}`} title={e?.notes ?? ""}>{e?.notes ?? ""}</td>
              </Fragment>
            );
            return (
              <tr key={`${v?.id ?? "nov"}-${r.member.id}`} className="hover:bg-brand-soft/30">
                <td className={`${cell} font-bold ${sep}`} dir="ltr">
                  {firstOfVisit &&
                    (full ? (
                      <Link href={`/teams/${r.team.code}`} className="text-brand hover:underline">{r.team.code}</Link>
                    ) : (
                      r.team.code
                    ))}
                </td>
                <td className={`${cell} ${sep}`}>{r.member.member_role === "leader" ? "رئيس" : "عضو"}</td>
                <td className={`${cell} font-medium ${sep}`}>{r.member.full_name}</td>
                <td className={`${cell} ${sep}`} dir="ltr">{r.member.national_id ?? ""}</td>
                <td className={`${cell} ${sep}`} dir="ltr">{r.member.phone ?? ""}</td>
                <td className={`${cell} ${sep}`} dir="ltr">{r.member.email ?? ""}</td>
                {firstOfVisit && (
                  <>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>
                      {v ? <Link href={`/visits/${v.id}`} className="text-brand hover:underline">{v.school_name}</Link> : <span className="text-muted">لا زيارات</span>}
                    </td>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan} dir="ltr">{v?.ministry_number ?? ""}</td>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>{v?.school_type ?? ""}</td>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>{v ? formatDate(v.visit_date) : ""}</td>
                    <td className={`${cell} tabular-nums ${sep}`} rowSpan={visitSpan}>{v?.visit_days ?? ""}</td>
                    <td className={`${cell} tabular-nums ${sep}`} rowSpan={visitSpan}>{v?.distance_km ?? ""}</td>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>
                      {v && <span className={`rounded px-1.5 py-0.5 ${VISIT_STATUS_CLASS[v.status]}`}>{VISIT_STATUS_LABEL[v.status]}</span>}
                    </td>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>{v?.city ?? r.team.city ?? ""}</td>
                    <td className={`${cell} max-w-48 truncate ${sep}`} rowSpan={visitSpan} title={v?.notes ?? ""}>{v?.notes ?? ""}</td>
                  </>
                )}
                {evalCells(r.leaderEval, 0)}
                {firstOfTeam && (
                  <td className={`${cell} min-w-60 bg-sky-50/50 align-top ${sep}`} rowSpan={teamSpan}>
                    <DirectivesCell items={directivesFor(r.team)} />
                  </td>
                )}
                {full && evalCells(r.officerEval, 1)}
                {full && firstOfVisit && (
                  <>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>{r.officer?.full_name ?? r.officer?.email ?? ""}</td>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>{r.review ? formatDate(r.review.review_date) : ""}</td>
                    <td className={`${cell} ${sep}`} rowSpan={visitSpan}>{r.review && <RatingBadge value={r.review.overall_level} short />}</td>
                    <td className={`${cell} max-w-48 truncate ${sep}`} rowSpan={visitSpan} title={r.review?.notes ?? ""}>{r.review?.notes ?? ""}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
