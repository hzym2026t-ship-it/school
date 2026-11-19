"use client";

import { deleteVisit } from "@/app/(app)/actions";

export function DeleteVisitButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="btn-danger"
      onClick={() => {
        if (confirm("حذف هذه الزيارة وجميع تقويماتها؟ لا يمكن التراجع.")) deleteVisit(id);
      }}
    >
      حذف الزيارة
    </button>
  );
}
