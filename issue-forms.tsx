"use client";

import { useActionState, useRef, useTransition } from "react";
import { deleteIssue, submitIssue, updateIssue } from "@/app/(app)/actions";
import { ISSUE_STATUSES, SCHOOL_TYPES, type IssueStatus } from "@/lib/constants";
import type { ActionState } from "@/lib/types";

type School = { key: string; name: string; type: string | null; ministry: string | null };

function Msg({ state }: { state: ActionState }) {
  if (state?.error) return <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg bg-green-50 p-2.5 text-sm text-green-800">{state.ok}</p>;
  return null;
}

/** Leader: report a problem with one of the assigned schools. */
export function IssueForm({ teamId, schools }: { teamId: string; schools: School[] }) {
  const [state, action, pending] = useActionState(submitIssue, undefined);
  const form = useRef<HTMLFormElement>(null);

  const pick = (key: string) => {
    const s = schools.find((x) => x.key === key);
    const f = form.current;
    if (!s || !f) return;
    (f.elements.namedItem("school_name") as HTMLInputElement).value = s.name;
    (f.elements.namedItem("school_type") as HTMLInputElement).value = s.type ?? "";
    (f.elements.namedItem("ministry_number") as HTMLInputElement).value = s.ministry ?? "";
  };

  return (
    <form ref={form} action={action} className="grid gap-4 sm:grid-cols-3" key={state?.ok}>
      <input type="hidden" name="team_id" value={teamId} />
      {schools.length > 0 && (
        <div className="sm:col-span-3">
          <label className="label" htmlFor="pick">اختر من مدارسك المسندة (يملأ البيانات تلقائيًا)</label>
          <select id="pick" defaultValue="" onChange={(e) => pick(e.target.value)} className="input">
            <option value="">— اختر مدرسة أو اكتب البيانات يدويًا —</option>
            {schools.map((s) => (
              <option key={s.key} value={s.key}>{s.name}{s.ministry ? ` — ${s.ministry}` : ""}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="school_name">اسم المدرسة <span className="text-red-600">*</span></label>
        <input id="school_name" name="school_name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="school_type">نوع المدرسة</label>
        <input id="school_type" name="school_type" list="issue-school-types" className="input" />
        <datalist id="issue-school-types">
          {SCHOOL_TYPES.map((t) => <option key={t} value={t} />)}
        </datalist>
      </div>
      <div>
        <label className="label" htmlFor="ministry_number">الرقم الوزاري</label>
        <input id="ministry_number" name="ministry_number" dir="ltr" className="input" />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="problem">تحديد المشكلة <span className="text-red-600">*</span></label>
        <textarea id="problem" name="problem" rows={4} required className="input" placeholder="صف المشكلة التي تواجهك في المدرسة بوضوح..." />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "جارٍ الإرسال..." : "إرسال البلاغ"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

/** Officer: set the handling status and a note on one issue. */
export function IssueHandler({
  id,
  status,
  note,
  canDelete,
}: {
  id: string;
  status: IssueStatus;
  note: string | null;
  canDelete: boolean;
}) {
  const [state, action, pending] = useActionState(updateIssue, undefined);
  const [deleting, startDelete] = useTransition();
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label !text-xs" htmlFor={`st-${id}`}>المعالجة</label>
        <select id={`st-${id}`} name="status" defaultValue={status} className="input w-36 py-1.5">
          {ISSUE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="min-w-48 flex-1">
        <label className="label !text-xs" htmlFor={`nt-${id}`}>ملاحظة المعالجة</label>
        <input id={`nt-${id}`} name="officer_note" defaultValue={note ?? ""} className="input py-1.5" placeholder="الإجراء المتخذ..." />
      </div>
      <button type="submit" disabled={pending} className="btn-primary px-3 py-1.5">{pending ? "..." : "حفظ"}</button>
      {canDelete && (
        <button
          type="button"
          disabled={deleting}
          onClick={() => confirm("حذف هذا البلاغ نهائيًا؟") && startDelete(() => deleteIssue(id))}
          className="btn-danger px-3 py-1.5"
        >
          حذف
        </button>
      )}
      {(state?.error || state?.ok) && <div className="basis-full"><Msg state={state} /></div>}
    </form>
  );
}
