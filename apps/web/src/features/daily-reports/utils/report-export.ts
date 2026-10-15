// Export helpers for list pages: CSV that opens cleanly in Excel (UTF-8 BOM keeps Thai) and an A4
// print sheet opened in a new window (the browser's print dialog saves it as PDF).
export interface ExportSection {
  title: string;
  head: string[];
  rows: (string | number | null | undefined)[][];
}

const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function downloadCsv(filename: string, sections: ExportSection[]) {
  const lines: string[] = [];
  for (const s of sections) {
    if (sections.length > 1) lines.push(cell(s.title));
    lines.push(s.head.map(cell).join(","));
    for (const r of s.rows) lines.push(r.map(cell).join(","));
    if (sections.length > 1) lines.push("");
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const esc = (v: string | number | null | undefined) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function printSections(title: string, subtitle: string, sections: ExportSection[]) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const tables = sections
    .map((s) => `<h2>${esc(s.title)} <span>(${s.rows.length})</span></h2>` + (s.rows.length
      ? `<table><thead><tr>${s.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.rows
          .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      : `<p class="empty">ไม่มีรายการ</p>`))
    .join("");
  win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4 landscape; margin: 12mm; }
body { font-family: Sarabun, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
header { border-bottom: 2px solid #0B4D8B; padding-bottom: 6px; margin-bottom: 10px; }
h1 { font-size: 18px; margin: 0; color: #0B4D8B; }
header p { margin: 2px 0 0; color: #475569; }
h2 { font-size: 13px; margin: 14px 0 6px; }
h2 span { color: #64748b; font-weight: 400; }
table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #eef2f7; font-weight: 700; }
.empty { color: #64748b; margin: 0; }
</style></head><body>
<header><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header>${tables}
<script>document.fonts.ready.then(() => setTimeout(() => window.print(), 200));</script>
</body></html>`);
  win.document.close();
  return true;
}
