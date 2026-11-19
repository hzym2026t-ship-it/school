"use client";

import { useState } from "react";

const RATING_FILL: Record<string, string> = {
  "r-high": "FFD6F0DD",
  "r-acceptable": "FFE6F4C8",
  "r-weak": "FFFDF0C2",
  "r-very_weak": "FFFBD5D5",
};

type Cell = { value: string | number; fill?: string; header: boolean };

function cellText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  // Selected option instead of the whole option list; drop action buttons.
  el.querySelectorAll("select").forEach((sel, i) => {
    const target = clone.querySelectorAll("select")[i];
    target?.replaceWith(document.createTextNode(sel.selectedOptions[0]?.text ?? ""));
  });
  clone.querySelectorAll("button, form, [data-noexport]").forEach((n) => n.remove());
  return (clone.innerText || clone.textContent || "").replace(/\s+\n/g, "\n").trim();
}

function cellFill(el: HTMLElement): string | undefined {
  for (const cls of Object.keys(RATING_FILL)) {
    if (el.classList.contains(cls) || el.querySelector(`.${cls}`)) return RATING_FILL[cls];
  }
  return undefined;
}

/** Reads an HTML table (with row/col spans) into a grid of cells plus merges. */
function readTable(table: HTMLTableElement) {
  const grid: (Cell | null)[][] = [];
  const merges: [number, number, number, number][] = [];
  Array.from(table.rows).forEach((tr, r) => {
    grid[r] ??= [];
    let c = 0;
    Array.from(tr.cells).forEach((td) => {
      if (td.hasAttribute("data-noexport")) return;
      while (grid[r][c] !== undefined) c++;
      const raw = cellText(td);
      const num = raw !== "" && /^-?\d+(\.\d+)?$/.test(raw) && raw.length < 10 ? Number(raw) : raw;
      const rs = Math.max(1, td.rowSpan);
      const cs = Math.max(1, td.colSpan);
      for (let i = 0; i < rs; i++)
        for (let j = 0; j < cs; j++) {
          grid[r + i] ??= [];
          grid[r + i][c + j] = i === 0 && j === 0 ? { value: num, fill: cellFill(td), header: td.tagName === "TH" } : null;
        }
      if (rs > 1 || cs > 1) merges.push([r + 1, c + 1, r + rs, c + cs]);
      c += cs;
    });
  });
  return { grid, merges };
}

/**
 * Downloads an Excel file of a table on the page (`tableId`) or of given rows
 * (`rows`, first row = headers). Excel library loads only when clicked.
 */
export function ExportButton({
  tableId,
  rows,
  filename,
  label = "Excel",
  className = "",
}: {
  tableId?: string;
  rows?: (string | number | null)[][];
  filename: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(filename.slice(0, 31), { views: [{ rightToLeft: true }] });

      let grid: (Cell | null)[][] = [];
      let merges: [number, number, number, number][] = [];
      if (tableId) {
        const table = document.getElementById(tableId)?.querySelector("table") ?? (document.getElementById(tableId) as HTMLTableElement | null);
        if (!table || table.tagName !== "TABLE") return;
        ({ grid, merges } = readTable(table as HTMLTableElement));
      } else if (rows) {
        grid = rows.map((row, r) => row.map((v) => ({ value: v ?? "", header: r === 0 })));
      }

      grid.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (!cell) return;
          const x = ws.getCell(r + 1, c + 1);
          x.value = cell.value;
          x.alignment = { vertical: "middle", wrapText: true, horizontal: cell.header ? "center" : "right" };
          if (cell.header) {
            x.font = { bold: true, color: { argb: "FFFFFFFF" } };
            x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F6B52" } };
          } else if (cell.fill) {
            x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cell.fill } };
          }
          x.border = { top: { style: "thin", color: { argb: "FFDFE5E2" } }, bottom: { style: "thin", color: { argb: "FFDFE5E2" } } };
        }),
      );
      for (const [r1, c1, r2, c2] of merges) ws.mergeCells(r1, c1, r2, c2);
      const cols = Math.max(0, ...grid.map((r) => r.length));
      for (let c = 1; c <= cols; c++) {
        const longest = Math.max(8, ...grid.map((r) => String(r[c - 1]?.value ?? "").length));
        ws.getColumn(c).width = Math.min(45, longest + 2);
      }

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`no-print inline-flex items-center gap-1.5 rounded-lg border border-green-700/30 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 transition-colors hover:bg-green-100 disabled:opacity-60 ${className}`}
      title="تنزيل ملف Excel"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13l4 5M12 13l-4 5" />
      </svg>
      {busy ? "جارٍ التجهيز..." : label}
    </button>
  );
}
