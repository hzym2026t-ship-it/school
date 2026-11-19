import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { loadDataset } from "@/lib/data";
import { buildSheet } from "@/lib/sheet";
import { criterionDistribution, teamSummaries } from "@/lib/stats";
import {
  CRITERIA,
  CRITERION_KEYS,
  RATINGS,
  RATING_LABEL,
  VISIT_STATUSES,
  VISIT_STATUS_LABEL,
  levelFromScore,
  type Rating,
  type VisitStatus,
} from "@/lib/constants";

const FILL: Record<Rating, string> = {
  high: "FFD6F0DD",
  acceptable: "FFE6F4C8",
  weak: "FFFDF0C2",
  very_weak: "FFFBD5D5",
};

const solid = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function styleHeader(row: ExcelJS.Row, argb = "FF0F6B52") {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell((c) => (c.fill = solid(argb)));
  row.height = 32;
}

function colorRatings(row: ExcelJS.Row) {
  row.eachCell((c) => {
    const r = RATINGS.find((x) => x.label === c.value);
    if (r) c.fill = solid(FILL[r.value]);
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "officer") return new Response("Forbidden", { status: 403 });

  const data = await loadDataset();
  const rawStatus = new URL(request.url).searchParams.get("status");
  const status = VISIT_STATUSES.some((x) => x.value === rawStatus) ? (rawStatus as VisitStatus) : null;
  const wb = new ExcelJS.Workbook();
  wb.creator = "منصة فرق التقويم المدرسي";
  wb.created = new Date();
  const label = (v: Rating | null | undefined) => (v ? RATING_LABEL[v] : "");

  // ---- Sheet 1: everything, one row per member per visit (like the original file)
  const ws = wb.addWorksheet("سجل الفرق", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1, xSplit: 3 }] });
  const crit = (prefix: string) => CRITERIA.map((c, i) => `${prefix} م${i + 1}: ${c}`);
  ws.addRow([
    "رقم الفريق", "رئيس/ عضو", "الإسم", "السجل المدني", "رقم الجوال", "الايميل",
    "المدرسة", "الرقم الوزاري", "نوع المدرسة", "تاريخ الزيارة", "أيام الزيارة", "البعد (كم)", "الحالة", "ملاحظات", "المدينة",
    ...crit("الرئيس"), "الرئيس: المستوى العام", "الرئيس: ملاحظات",
    ...crit("الجودة"), "الجودة: المستوى العام", "الجودة: ملاحظات",
    "اسم ضابط الجودة", "رقم الجوال", "تاريخ الزيارة", "المستوى العام", "ملاحظات ضابط الجودة",
  ]);
  styleHeader(ws.getRow(1));
  for (const r of buildSheet(data)) {
    const v = r.visit;
    const row = ws.addRow([
      r.team.code, r.member.member_role === "leader" ? "رئيس" : "عضو", r.member.full_name,
      r.member.national_id ?? "", r.member.phone ?? "", r.member.email ?? "",
      v?.school_name ?? "", v?.ministry_number ?? "", v?.school_type ?? "", v?.visit_date ?? "",
      v?.visit_days ?? "", v?.distance_km ?? "",
      v ? VISIT_STATUS_LABEL[v.status] : "", v?.notes ?? "", v?.city ?? r.team.city ?? "",
      ...CRITERION_KEYS.map((k) => label(r.leaderEval?.[k])), label(r.leaderEval?.overall_level), r.leaderEval?.notes ?? "",
      ...CRITERION_KEYS.map((k) => label(r.officerEval?.[k])), label(r.officerEval?.overall_level), r.officerEval?.notes ?? "",
      r.officer?.full_name ?? r.officer?.email ?? "", r.officer?.phone ?? "", r.review?.review_date ?? "",
      label(r.review?.overall_level), r.review?.notes ?? "",
    ]);
    colorRatings(row);
    if (r.firstOfTeam) row.eachCell((c) => (c.border = { top: { style: "medium", color: { argb: "FF0F6B52" } } }));
  }
  ws.columns.forEach((c, i) => (c.width = i < 15 ? 16 : i < 35 ? 12 : 20));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

  // ---- Visits, filtered by status when ?status= is given
  const sv = wb.addWorksheet(status ? `الزيارات - ${VISIT_STATUS_LABEL[status]}` : "الزيارات", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  sv.addRow(["الفريق", "المدرسة", "الرقم الوزاري", "نوع المدرسة", "المدينة", "تاريخ الزيارة", "أيام الزيارة", "البعد (كم)", "الحالة", "ملاحظات"]);
  styleHeader(sv.getRow(1));
  const code = (id: string) => data.teams.find((t) => t.id === id)?.code ?? "";
  const STATUS_FILL: Record<VisitStatus, string> = { completed: FILL.high, planned: FILL.weak, not_visited: FILL.very_weak };
  data.visits
    .filter((v) => !status || v.status === status)
    .sort((a, b) => code(a.team_id).localeCompare(code(b.team_id), "en", { numeric: true }) || (a.visit_date ?? "").localeCompare(b.visit_date ?? ""))
    .forEach((v) => {
      const row = sv.addRow([code(v.team_id), v.school_name, v.ministry_number ?? "", v.school_type ?? "", v.city ?? "", v.visit_date ?? "", v.visit_days, v.distance_km ?? "", VISIT_STATUS_LABEL[v.status], v.notes ?? ""]);
      row.getCell(9).fill = solid(STATUS_FILL[v.status]);
    });
  sv.columns.forEach((c) => (c.width = 16));
  sv.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };

  // ---- Sheet 2: team summary
  const s2 = wb.addWorksheet("ملخص الفرق", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  s2.addRow(["الفريق", "رئيس الفريق", "الأعضاء", "الزيارات المنفذة", "إجمالي الزيارات", "آخر زيارة", "إنجاز التقويم %", "مستوى الفريق (الرئيس)", "مستوى الفريق (الجودة)", "زيارات الجودة"]);
  styleHeader(s2.getRow(1));
  for (const s of teamSummaries(data)) {
    const row = s2.addRow([
      s.team.code, s.leaderName, s.members, s.visitsDone, s.visitsTotal, s.lastVisit ?? "",
      Math.round(s.completion), label(s.leaderLevel), label(s.officerLevel), s.reviewed,
    ]);
    colorRatings(row);
    const pct = row.getCell(7);
    pct.fill = solid(s.completion >= 100 ? FILL.high : s.completion >= 50 ? FILL.weak : FILL.very_weak);
  }
  s2.columns.forEach((c) => (c.width = 18));

  // ---- Sheet 3: criteria results
  const s3 = wb.addWorksheet("نتائج المعايير", { views: [{ rightToLeft: true }] });
  s3.addRow(["المعيار", "المقوِّم", ...RATINGS.map((r) => r.label), "الإجمالي", "المستوى"]);
  styleHeader(s3.getRow(1));
  const L = criterionDistribution(data.evaluations, "leader");
  const O = criterionDistribution(data.evaluations, "officer");
  CRITERIA.forEach((title, i) => {
    for (const [who, d] of [["رؤساء الفرق", L[i]], ["ضباط الجودة", O[i]]] as const) {
      const row = s3.addRow([`${i + 1}. ${title}`, who, ...RATINGS.map((r) => d.counts[r.value]), d.total, label(levelFromScore(d.avg))]);
      colorRatings(row);
    }
  });
  s3.getColumn(1).width = 45;
  s3.columns.slice(1).forEach((c) => (c.width = 14));

  const buf = await wb.xlsx.writeBuffer();
  const name = `school-evaluation-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
