# Plan — EPS can correct a contractor's daily report

Status: **draft for approval** (nothing built yet). Date: 2026-10-19.

## Why

Contractors sometimes send wrong numbers (headcount, hours, OT, progress, tomorrow's requests).
Today EPS can only approve/reject; the wrong values flow straight into Manpower, NMH, Daily Request and the PDF.
EPS should fix them in place, without losing what the contractor actually sent.

## What EPS can edit (your choice)

| Section | Data |
|---|---|
| Headcount & positions | morning + afternoon positions, Thai/foreign × male/female (per discipline crew) |
| Time & weather | start/end time, work hours, weather, temperature, humidity |
| OT | OT rows (building + work + people + hours) → OT man-hours |
| Activities & progress | Today Activity rows: building, work, people, time, plan %, actual %, countermeasure |
| Tomorrow's requests | forecast activities, machinery, equipment, road usage (QAQC stays on `/qaqc`) |

Already EPS-editable today, unchanged: work permits (`eps_edited_at`), road-request times (`adjusted_*`).

## How it works

1. **Edit button per tab** in the review dialog (Daily Reports → Submission History → open report).
   Each tab gets «แก้ไข (EPS)» → the same inputs the contractor uses, in a `FormDialog` → Save.
   EPS staff only (`eps_site` + `eps_admin`); hidden for contractors.
2. **Corrected values become the real values.** EPS writes the normal tables, so dashboards, Manpower, NMH,
   Daily Request and the PDF all show the corrected numbers with no extra logic.
3. **Contractor's original is kept.** New table `daily_report_eps_edits`
   (report × section, `original` JSON = what the contractor sent, `edited_by`, `edited_at`).
   One row per edited section; the first EPS edit snapshots the contractor's values, later EPS edits keep that snapshot.
4. **Mark edited + who/when.** Edited sections show a chip «EPS แก้ไข · ชื่อ · 19 ต.ค. 14:30»;
   a «ดูค่าที่ผรมส่ง» toggle shows the original values side by side. Report list row gets a small «EPS แก้ไข» marker.
5. **Contractor resend does not overwrite.** When the contractor resends morning/evening, sections EPS has
   edited are skipped (their new values replace the stored `original` instead, so EPS can still compare).
   Same rule already used for permits and road times.
6. **Undo.** «คืนค่าผรม» on an edited section restores the original and removes the mark.

API: `PUT /projects/:id/daily-reports/:reportId/eps/:section` (section = `headcount|time|ot|activities|requests`)
and `DELETE …/eps/:section` (undo). Validation reuses the morning/evening zod/TypeBox rules
(e.g. positions total = nationality split, activities peak ≤ headcount, actual < plan → countermeasure).

## Build order (because another session is changing the same files right now)

The uncommitted work in the main folder adds «additional work» rows to allocations and touches
`daily-report-save.repository.ts`, the schema, and the evening form. To avoid conflicts:

- **Phase 1** (after that work is merged): table + API + UI for *Time & weather*, *Headcount & positions*, *OT*.
- **Phase 2:** *Activities & progress* (builds on the new allocation rows).
- **Phase 3:** *Tomorrow's requests*.

Each phase is a separate PR, verified on a DB copy (resend-after-edit case included) before merge.
Migration number = next free one after theirs (theirs must become `0041`, so this is `0042`).

## Questions for you

1. Should the **contractor see** that EPS corrected their report (chip + corrected values in their form)? Recommended: yes.
2. Can EPS edit **any date**, even after the 12:00-next-day lock? Recommended: yes (EPS is the reviewer).
3. Who can edit: **eps_site + eps_admin**, or admin only? Recommended: both.
4. Does an EPS edit change the review status (e.g. auto-approve)? Recommended: no, keep them separate.
