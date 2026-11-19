"use client";

import { useTransition } from "react";
import { removeAllowedEmail, setAllowedRole } from "@/app/(app)/actions";
import type { AppRole } from "@/lib/constants";

export function AllowedRowActions({
  email,
  role,
  isMe,
  part,
}: {
  email: string;
  role: AppRole;
  isMe: boolean;
  part: "role" | "delete";
}) {
  const [pending, start] = useTransition();

  if (part === "role") {
    return (
      <select
        aria-label="الدور"
        defaultValue={role}
        disabled={isMe || pending}
        onChange={(e) => {
          const next = e.target.value as AppRole;
          start(() => setAllowedRole(email, next));
        }}
        className="input w-32 py-1"
      >
        <option value="leader">رئيس فريق</option>
        <option value="officer">ضابط جودة</option>
        <option value="support">دعم فني</option>
      </select>
    );
  }

  if (isMe) return <span className="text-xs text-muted">(أنت)</span>;
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-danger px-2 py-1 text-xs"
      onClick={() => {
        if (confirm(`سحب ${email} من النظام؟ سيُحذف حسابه ولن يستطيع الدخول. بيانات فريقه تبقى محفوظة.`)) {
          start(() => removeAllowedEmail(email));
        }
      }}
    >
      {pending ? "..." : "سحب من النظام"}
    </button>
  );
}
