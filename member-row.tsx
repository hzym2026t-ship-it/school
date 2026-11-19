"use client";

import { useState } from "react";
import { deleteMember } from "@/app/(app)/actions";
import { MemberForm } from "@/components/forms";
import type { TeamMember } from "@/lib/types";

export function MemberRow({ member, editable = true }: { member: TeamMember; editable?: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr>
        <td colSpan={6} className="td bg-brand-soft/40 whitespace-normal">
          <MemberForm teamId={member.team_id} member={member} onDone={() => setEditing(false)} />
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost mt-2">إلغاء</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="td">
        <span className={`rounded px-2 py-0.5 text-xs ${member.member_role === "leader" ? "bg-brand text-white" : "bg-gray-100"}`}>
          {member.member_role === "leader" ? "رئيس" : "عضو"}
        </span>
      </td>
      <td className="td font-medium">{member.full_name}</td>
      <td className="td" dir="ltr">{member.national_id ?? "—"}</td>
      <td className="td" dir="ltr">{member.phone ?? "—"}</td>
      <td className="td" dir="ltr">{member.email ?? "—"}</td>
      <td className="td">
        {editable && (
          <div className="flex gap-1">
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost px-2 py-1 text-xs">تعديل</button>
            {member.member_role === "member" && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`حذف ${member.full_name} من الفريق؟ ستُحذف تقويماته أيضًا.`)) deleteMember(member.id);
                }}
                className="btn-danger px-2 py-1 text-xs"
              >
                حذف
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
