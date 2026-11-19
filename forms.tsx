"use client";

import { useActionState, useState } from "react";
import {
  addAllowedEmail,
  createMyTeam,
  saveEvaluation,
  saveMember,
  saveOfficerReview,
  saveVisit,
  updateTeam,
  assignLeader,
} from "@/app/(app)/actions";
import {
  CITIES,
  CRITERIA,
  CRITERION_KEYS,
  RATINGS,
  RATING_LABEL,
  SCHOOL_TYPES,
  VISIT_STATUSES,
  averageLevel,
  type Rating,
} from "@/lib/constants";
import type { ActionState, Evaluation, OfficerReview, TeamMember, Visit } from "@/lib/types";

type Action = (p: ActionState, fd: FormData) => Promise<ActionState>;

function Message({ state }: { state: ActionState }) {
  if (state?.error) return <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg bg-green-50 p-2.5 text-sm text-green-800">{state.ok}</p>;
  return null;
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  dir,
  placeholder,
  list,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  list?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        dir={dir}
        placeholder={placeholder}
        list={list}
        className="input"
      />
    </div>
  );
}

/** City (المكان) from the fixed list; keeps an older free-text value selectable. */
function CitySelect({ defaultValue }: { defaultValue?: string | null }) {
  const extra = defaultValue && !CITIES.includes(defaultValue) ? [defaultValue] : [];
  return (
    <div>
      <label className="label" htmlFor="city">المدينة</label>
      <select id="city" name="city" defaultValue={defaultValue ?? ""} className="input">
        <option value="">— اختر المدينة —</option>
        {[...CITIES, ...extra].map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "جارٍ الحفظ..." : children}
    </button>
  );
}

function useForm(action: Action) {
  return useActionState(action, undefined);
}

// ---------------------------------------------------------------- team
export function CreateTeamForm({ defaultName }: { defaultName?: string | null }) {
  const [state, action, pending] = useForm(createMyTeam);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="رقم المجموعة" name="code" required dir="ltr" placeholder="G01" />
      <CitySelect />
      <Field label="اسم رئيس الفريق" name="full_name" required defaultValue={defaultName} />
      <Field label="السجل المدني" name="national_id" dir="ltr" />
      <Field label="رقم الجوال" name="phone" type="tel" dir="ltr" />
      <div className="flex items-end gap-3 sm:col-span-2">
        <Submit pending={pending}>إنشاء الفريق</Submit>
        <Message state={state} />
      </div>
    </form>
  );
}

export function EditTeamForm({ teamId, code, city }: { teamId: string; code: string; city: string | null }) {
  const [state, action, pending] = useForm(updateTeam);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="team_id" value={teamId} />
      <div className="w-28">
        <Field label="رقم المجموعة" name="code" defaultValue={code} required dir="ltr" />
      </div>
      <div className="w-44">
        <CitySelect defaultValue={city} />
      </div>
      <Submit pending={pending}>حفظ</Submit>
      <Message state={state} />
    </form>
  );
}

export function AssignLeaderForm({
  teamId,
  current,
  options,
}: {
  teamId: string;
  current: string | null;
  options: { id: string; label: string }[];
}) {
  const [state, action, pending] = useForm(assignLeader);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="team_id" value={teamId} />
      <div className="min-w-56">
        <label className="label" htmlFor="leader_id">حساب رئيس الفريق</label>
        <select id="leader_id" name="leader_id" defaultValue={current ?? ""} className="input">
          <option value="">— بدون —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
      <Submit pending={pending}>تعيين</Submit>
      <Message state={state} />
    </form>
  );
}

// ------------------------------------------------------------- members
export function MemberForm({ teamId, member, onDone }: { teamId: string; member?: TeamMember; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (p: ActionState, fd: FormData) => {
    const r = await saveMember(p, fd);
    if (r?.ok && onDone) onDone();
    return r;
  }, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" key={member?.id ?? "new"}>
      <input type="hidden" name="team_id" value={teamId} />
      {member && <input type="hidden" name="id" value={member.id} />}
      <Field label="الاسم" name="full_name" required defaultValue={member?.full_name} />
      <Field label="السجل المدني" name="national_id" dir="ltr" defaultValue={member?.national_id} />
      <Field label="رقم الجوال" name="phone" type="tel" dir="ltr" defaultValue={member?.phone} />
      <Field label="البريد الإلكتروني" name="email" type="email" dir="ltr" defaultValue={member?.email} />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
        <Submit pending={pending}>{member ? "حفظ التعديل" : "إضافة عضو"}</Submit>
        <Message state={state} />
      </div>
    </form>
  );
}

// -------------------------------------------------------------- visits
export function VisitForm({ teamId, visit }: { teamId: string; visit?: Visit }) {
  const [state, action, pending] = useForm(saveVisit);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="team_id" value={teamId} />
      {visit && <input type="hidden" name="id" value={visit.id} />}
      <Field label="اسم المدرسة" name="school_name" required defaultValue={visit?.school_name} />
      <Field label="الرقم الوزاري" name="ministry_number" dir="ltr" defaultValue={visit?.ministry_number} />
      <Field label="نوع المدرسة" name="school_type" list="school-types" defaultValue={visit?.school_type} />
      <datalist id="school-types">
        {SCHOOL_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <CitySelect defaultValue={visit?.city} />
      <div>
        <label className="label" htmlFor="visit_date">تاريخ الزيارة</label>
        <input
          id="visit_date"
          name="visit_date"
          type="date"
          defaultValue={visit?.visit_date ?? ""}
          onClick={(e) => e.currentTarget.showPicker?.()}
          className="input cursor-pointer"
        />
      </div>
      <DaysStepper defaultValue={visit?.visit_days ?? 1} />
      <div>
        <label className="label" htmlFor="distance_km">بعد المدرسة (كم)</label>
        <div className="relative">
          <input
            id="distance_km"
            name="distance_km"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            defaultValue={visit?.distance_km ?? ""}
            placeholder="0"
            className="input pe-12"
          />
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted">كم</span>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="status">الحالة</label>
        <select id="status" name="status" defaultValue={visit?.status ?? "planned"} className="input">
          {VISIT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="label" htmlFor="notes">ملاحظات</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={visit?.notes ?? ""} className="input" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <Submit pending={pending}>{visit ? "حفظ بيانات الزيارة" : "إضافة الزيارة"}</Submit>
        <Message state={state} />
      </div>
    </form>
  );
}

function DaysStepper({ defaultValue }: { defaultValue: number }) {
  const [days, setDays] = useState(defaultValue);
  const set = (n: number) => setDays(Math.min(30, Math.max(1, n)));
  return (
    <div>
      <label className="label" htmlFor="visit_days">عدد أيام الزيارة</label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-surface">
        <button type="button" onClick={() => set(days - 1)} className="w-11 text-lg font-bold text-brand hover:bg-brand-soft" aria-label="إنقاص">−</button>
        <input
          id="visit_days"
          name="visit_days"
          type="number"
          min={1}
          max={30}
          value={days}
          onChange={(e) => set(Number(e.target.value) || 1)}
          className="w-full border-x border-line py-2 text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" onClick={() => set(days + 1)} className="w-11 text-lg font-bold text-brand hover:bg-brand-soft" aria-label="زيادة">+</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- evaluation
function RatingSelect({
  name,
  value,
  onChange,
  label,
}: {
  name: string;
  value: Rating | "";
  onChange: (v: Rating | "") => void;
  label: string;
}) {
  return (
    <select
      name={name}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as Rating | "")}
      className={`input w-full sm:w-36 ${value ? `r-${value} font-medium` : ""}`}
    >
      <option value="">— اختر —</option>
      {RATINGS.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}

/** Read-only overall level computed from an average score (1–4). */
export function AutoLevel({ avg, level, empty = "يظهر بعد اختيار المعايير" }: { avg: number | null; level: Rating | null; empty?: string }) {
  if (!level || avg == null) return <span className="text-xs text-muted">{empty}</span>;
  return (
    <span className={`inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold sm:w-36 r-${level}`}>
      {RATING_LABEL[level]}
      <span className="text-xs font-normal tabular-nums opacity-80" dir="ltr">{avg.toFixed(2)} / 4</span>
    </span>
  );
}

export function EvaluationForm({
  visitId,
  member,
  evaluation,
  heading,
}: {
  visitId: string;
  member: TeamMember;
  evaluation?: Evaluation;
  heading?: string;
}) {
  const [state, action, pending] = useForm(saveEvaluation);
  const [values, setValues] = useState<Record<string, Rating | "">>(() =>
    Object.fromEntries(CRITERION_KEYS.map((k) => [k, (evaluation?.[k] ?? "") as Rating | ""])),
  );
  const filled = CRITERION_KEYS.filter((k) => values[k]).length;
  const overall = averageLevel(CRITERION_KEYS.map((k) => values[k]));
  const set = (k: string) => (v: Rating | "") => setValues((s) => ({ ...s, [k]: v }));

  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="visit_id" value={visitId} />
      <input type="hidden" name="member_id" value={member.id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            {member.full_name}{" "}
            <span className="text-xs font-normal text-muted">({member.member_role === "leader" ? "رئيس" : "عضو"})</span>
          </h3>
          {heading && <p className="text-xs text-muted">{heading}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${filled === 8 ? "r-high" : filled ? "r-weak" : "r-very_weak"}`}>
          {filled}/8 معايير
        </span>
      </div>

      <ol className="divide-y divide-line rounded-lg border border-line">
        {CRITERION_KEYS.map((k, i) => (
          <li key={k} className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              <span className="me-1 text-muted">{i + 1}.</span>
              {CRITERIA[i]}
            </span>
            <RatingSelect name={k} label={CRITERIA[i]} value={values[k]} onChange={set(k)} />
          </li>
        ))}
        <li className="flex flex-col gap-2 bg-brand-soft/50 p-2.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold">
            المستوى العام <span className="text-xs font-normal text-muted">(يُحسب تلقائيًا من معدل المعايير)</span>
          </span>
          <AutoLevel avg={overall.avg} level={overall.level} />
        </li>
      </ol>

      <div>
        <label className="label" htmlFor={`notes-${member.id}`}>ملاحظات وأدلة</label>
        <textarea id={`notes-${member.id}`} name="notes" rows={2} defaultValue={evaluation?.notes ?? ""} className="input" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>حفظ التقويم</Submit>
        <Message state={state} />
      </div>
    </form>
  );
}

export function OfficerReviewForm({
  visitId,
  review,
  today,
  teamAvg,
  teamLevel,
}: {
  visitId: string;
  review?: OfficerReview;
  today?: string;
  /** Average of this officer's member evaluations on this visit. */
  teamAvg: number | null;
  teamLevel: Rating | null;
}) {
  const [state, action, pending] = useForm(saveOfficerReview);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="visit_id" value={visitId} />
      <Field label="تاريخ زيارة ضابط الجودة" name="review_date" type="date" required defaultValue={review?.review_date ?? today} />
      <div className="sm:col-span-2">
        <span className="label">المستوى العام للفريق <span className="text-xs font-normal text-muted">(معدل تقويمك لجميع الأعضاء)</span></span>
        <AutoLevel avg={teamAvg} level={teamLevel} empty="يظهر بعد تقويم الأعضاء في الأسفل" />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="review-notes">ملاحظات ضابط الجودة</label>
        <textarea id="review-notes" name="notes" rows={3} defaultValue={review?.notes ?? ""} className="input" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Submit pending={pending}>حفظ</Submit>
        <Message state={state} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------- allow-list
export function AllowedEmailForm() {
  const [state, action, pending] = useForm(addAllowedEmail);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4" key={state?.ok}>
      <Field label="البريد الإلكتروني" name="email" type="email" required dir="ltr" />
      <Field label="الاسم (اختياري)" name="full_name" />
      <div>
        <label className="label" htmlFor="role">الدور</label>
        <select id="role" name="role" defaultValue="leader" className="input">
          <option value="leader">رئيس فريق</option>
          <option value="officer">ضابط جودة</option>
          <option value="support">دعم فني (البلاغات فقط)</option>
        </select>
      </div>
      <div className="flex items-end">
        <Submit pending={pending}>إضافة</Submit>
      </div>
      <div className="sm:col-span-4">
        <Message state={state} />
      </div>
    </form>
  );
}
