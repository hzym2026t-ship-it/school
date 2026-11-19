"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteDirective, sendDirective } from "@/app/(app)/actions";

export function DirectiveForm({ leaders }: { leaders: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(sendDirective, undefined);
  const [audience, setAudience] = useState<"all" | "user">("all");

  return (
    <form action={action} className="space-y-4" key={state?.ok}>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-background p-1 text-sm">
        {(
          [
            ["all", "توجيه عام (لجميع المستخدمين)"],
            ["user", "توجيه خاص (لرئيس فريق)"],
          ] as const
        ).map(([v, label]) => (
          <label
            key={v}
            className={`cursor-pointer rounded-md px-3 py-2 text-center font-medium ${audience === v ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            <input type="radio" name="audience" value={v} checked={audience === v} onChange={() => setAudience(v)} className="sr-only" />
            {label}
          </label>
        ))}
      </div>

      {audience === "user" && (
        <div>
          <label className="label" htmlFor="target_user">رئيس الفريق</label>
          <select id="target_user" name="target_user" required className="input" defaultValue="">
            <option value="" disabled>— اختر —</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          {leaders.length === 0 && <p className="mt-1 text-xs text-muted">لا يوجد رؤساء فرق مسجلون بعد.</p>}
        </div>
      )}

      <div>
        <label className="label" htmlFor="title">عنوان التوجيه <span className="text-red-600">*</span></label>
        <input id="title" name="title" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="body">نص التوجيه</label>
        <textarea id="body" name="body" rows={4} className="input" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "جارٍ الإرسال..." : "إرسال التوجيه"}</button>
        {state?.error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{state.error}</p>}
        {state?.ok && <p className="rounded-lg bg-green-50 p-2.5 text-sm text-green-800">{state.ok}</p>}
      </div>
    </form>
  );
}

export function DeleteDirective({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm("حذف هذا التوجيه؟") && start(() => deleteDirective(id))}
      className="btn-danger px-2 py-1 text-xs"
    >
      {pending ? "..." : "حذف"}
    </button>
  );
}
