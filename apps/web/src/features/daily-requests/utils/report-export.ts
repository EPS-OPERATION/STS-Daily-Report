import { toast } from "sonner";

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
  if (!win) {
    toast.error("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up แล้วลองอีกครั้ง");
    return false;
  }
  const tables = sections
    .map((s) => `<h2>${esc(s.title)} <span>(${s.rows.length})</span></h2>` + (s.rows.length
      ? `<table><thead><tr>${s.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.rows
          .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      : `<p class="empty">ไม่มีรายการ</p>`))
    .join("");
  win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4 landscape; margin: 12mm; }
@media print {
  .no-print { display: none !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0 !important; }
}
* { box-sizing: border-box; }
body {
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  font-size: 11px;
  line-height: 1.4;
  margin: 0;
  padding: 16px 20px;
  background: #ffffff;
}
.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 5px solid #0B4D8B;
  border-radius: 8px;
  padding: 12px 18px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.banner-title {
  font-size: 13px;
  font-weight: 700;
  color: #0B4D8B;
  display: flex;
  align-items: center;
  gap: 6px;
}
.banner-hint {
  font-size: 11px;
  color: #475569;
  margin-top: 2px;
}
.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 12px;
  font-family: inherit;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}
.btn-primary {
  background: #0B4D8B;
  color: #ffffff;
  border-color: #0B4D8B;
}
.btn-primary:hover {
  background: #083866;
  border-color: #083866;
}
.btn-secondary {
  background: #ffffff;
  color: #475569;
  border-color: #cbd5e1;
}
.btn-secondary:hover {
  background: #f1f5f9;
  color: #1e293b;
}
header { border-bottom: 2px solid #0B4D8B; padding-bottom: 6px; margin-bottom: 12px; }
h1 { font-size: 18px; margin: 0; color: #0B4D8B; font-weight: 700; }
header p { margin: 3px 0 0; color: #475569; font-size: 11px; }
h2 { font-size: 13px; margin: 16px 0 6px; color: #0f172a; font-weight: 700; }
h2 span { color: #64748b; font-weight: 400; }
table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; vertical-align: top; }
th { background: #eef2f7; font-weight: 700; color: #0f172a; }
.empty { color: #64748b; margin: 6px 0; font-style: italic; }
</style></head><body>
<div class="no-print banner">
  <div>
    <div class="banner-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      พิมพ์รายงาน / บันทึกเป็น PDF (Print to PDF)
    </div>
    <div class="banner-hint">
      ในหน้าต่างพิมพ์ เลือกปลายทาง (Destination) เป็น <strong>"Save as PDF"</strong> หรือ <strong>"บันทึกเป็น PDF"</strong> (หรือกดแป้นพิมพ์ <code>Ctrl + P</code>)
    </div>
  </div>
  <div class="banner-actions">
    <button class="btn btn-primary" onclick="window.focus(); window.print();">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      พิมพ์ / บันทึกเป็น PDF
    </button>
    <button class="btn btn-secondary" onclick="window.close();">ปิดหน้าต่าง</button>
  </div>
</div>
<header><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header>${tables}
<script>
function triggerPrint() {
  try {
    window.focus();
    window.print();
  } catch (err) {
    console.warn("Auto print failed or blocked by browser:", err);
  }
}
if (document.fonts && document.fonts.ready) {
  Promise.race([
    document.fonts.ready,
    new Promise(function(resolve) { setTimeout(resolve, 400); })
  ]).then(function() {
    setTimeout(triggerPrint, 150);
  });
} else {
  setTimeout(triggerPrint, 350);
}
</script>
</body></html>`);
  win.document.close();
  try {
    win.focus();
  } catch {}
  return true;
}
