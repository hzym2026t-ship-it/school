"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";

export function LoginForm({ initialError, as = "" }: { initialError?: string; as?: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState(signIn, undefined);
  const [upState, upAction, upPending] = useActionState(signUp, undefined);
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;
  const error = state?.error ?? (mode === "in" ? initialError : undefined);

  return (
    <div className="card w-full shadow-sm">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-background p-1 text-sm">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md py-2 font-medium ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {m === "in" ? "تسجيل الدخول" : "إنشاء حساب"}
          </button>
        ))}
      </div>

      <form action={mode === "in" ? inAction : upAction} className="space-y-4" key={mode}>
        <input type="hidden" name="as" value={as} />
        <div>
          <label className="label" htmlFor="email">البريد الإلكتروني (اسم المستخدم)</label>
          <input id="email" name="email" type="email" dir="ltr" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">كلمة المرور</label>
          <input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={mode === "up" ? 8 : undefined}
            required
            className="input"
          />
        </div>
        {mode === "up" && (
          <div>
            <label className="label" htmlFor="confirm">تأكيد كلمة المرور</label>
            <input id="confirm" name="confirm" type="password" dir="ltr" autoComplete="new-password" required className="input" />
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {state?.ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{state.ok}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "جارٍ..." : mode === "in" ? "دخول" : "إنشاء الحساب"}
        </button>

        {mode === "up" && (
          <p className="text-xs leading-relaxed text-muted">
            يمكنك إنشاء حساب فقط إذا أضاف ضابط الجودة بريدك الإلكتروني إلى المنصة.
          </p>
        )}
      </form>
    </div>
  );
}
