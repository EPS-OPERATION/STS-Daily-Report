---
name: sts-domain
description: Domain knowledge for the STS Biomass Power Plant daily-report system - contractor daily reports, EPS "Daily Request & Report" form, work permits, manpower, QAQC requests/RFI/NCR, WBS/zone/BLD.CODE schemes, contractor code aliases, safety metrics (NMH, man-day, days without accident) and the dashboards EPS wants. Use when designing tables, forms, validations, seed data or dashboards for this project, or when a Thai construction term appears.
---

# STS Daily Report — domain

Source: requirements deck (Canva `DAHVPjBav2I`, exported to `..\STS Daily Report (1).pdf`) and real reports in
`..\Daily Report\`. When in doubt, read those — do not invent fields.

## Actors

- **EPS** — owner-side project management / QAQC / safety. Reviews ("Checked by EPS"), runs dashboards and meetings,
  uploads drone photos.
- **Contractor (ผู้รับเหมา, ผรม.)** — submits the daily report ("Prepared by Contractor"). Today they post in LINE and
  the LINE message is treated as final; nobody keys it into Excel. That gap is why this app exists.
- **Site staff (หน้างาน)** — use the site dashboard: what to do today, what to prepare tomorrow, what is blocked.

## Report inputs

**Morning LINE report (per contractor, per day)**: date + weather; total workers; days without accident (counted
from a start date); work permits by type (Work at Height / Lifting / Hot Work — people and permit count); list of
work items; machinery (Dump truck, Excavator, Truck loader crane, Crane …, qty); manpower by position (Site Manager,
Engineer, Supervisor, Surveyor, Foreman, QA/QC, Safety officer, Crane operator, Admin, Maid, Welder, Driver,
Store controller, Worker, Fire watch); Thai M/F and foreign M/F; safety-talk topics; temperature, humidity;
reporter name/role (e.g. จป.วิชาชีพ) and phone.

**EPS form "Daily Request & Report"** (template code `R003/20260702`, has its own "Report No."):
weather checkboxes + temperature (feeds stop-work rules for wind/rain); Progress Report cumulative and today
(Plan / Actual / Difference — usually left blank); Material Receive (usually blank); worker type/count;
Work Permit table; activity rows with Plan % / Status %, Supervisor, JSA done checkbox; Tomorrow Forecast
activities with Area; Countermeasure free text; machine type + qty; ~6 photos "Daily Progress and High-risk"
(no tag separating progress vs high-risk); signatures.

Design implications: prefer dropdowns for recurring values (positions, machine types, permit types, weather),
pre-fill the evening form from the morning one (no double entry), tag photos with a kind.

## Consistency checks the business cares about

- Permit headcount vs total manpower (a person may hold several permits — warn, don't block).
- Machines vs permits (Hot Work ↔ welding machines, Lifting ↔ crane).
- Activity actual % < plan % ⇒ countermeasure (cause + fix) required; follow-up is an open question for EPS.
- Report date vs date embedded in the document code.
- Tomorrow Forecast of day D should be compared to Today Activities of day D+1.

## Location schemes (do not merge silently)

1. Repo seed zones: `1.1 Biomass Storage, 1.2 Biomass Transport, 2.1 Furnace & Boiler, 2.2 Diesel Oil Tank,
   2.3 Bottom Ash Bunker, 2.4 Fly Ash Silo, 3 Flue Gas Treatment, 3 Stack, 4 Turbine Generator Building, 5 ACC,
   6.1 Raw Water Pond & Pump, 6.2 Service Water Tank & Pump House, 6.3 WTP & Chemical Storage,
   6.4 Auxiliary Cooling Tower, 6.5 Compressor Room`.
2. Conzol WBS `000–034` (official, used in document numbers). WBS 26–34 (Pipe Rack, Sign Board, Feed Connection,
   Boiler Steam, Dissipating, Fire Protection, Electrical, Instrumentation, Telecom) have **no building**.
3. Drawing BLD.CODE `A–O` over 25 buildings (A Biomass Storage/Fuel Transport, B Furnace-Boiler/Flue Gas/Stack,
   C Bottom Ash/Fly Ash, D Diesel, E CEMS, F Turbine Generator, G ACC, H Water Treatment, I Service Water Tank,
   J Aux Cooling, K Raw Water Pond/Pump, L Oil Separator, M Guard House, O Road/Drainage/Sludge/Gate/Fence/BOP pit;
   Green Area and Compressor Room have none).
4. Field shorthand in reports: TG, Boiler, ACC (+ACR/ACT/WTT sub-areas), Water Tank, Cooling Tower, Compressor Room,
   WWTP-01/02/03, Stack, Raw Water, Pipe Rack, Diesel, Moving Floor MF01/MF02, Warehouse WH.

Model a mapping table between schemes; keep unmapped values visible (a "Not found" status is a valid state).

## Contractors

Many contractors per zone (e.g. Boiler: CKM, UE, KR; TG: ZOE; ACC/Water Tank/Cooling Tower/Compressor: L-Tap;
Stack: PE, RETS; Raw Water/Pipe Rack/Diesel: SZ; Moving Floor: US; Warehouse: FS, PPE). One contractor has several
codes — doc code / Conzol code / filename code (Zhongtian = ZE / ZCE / ZOE; ภัทรภณ = PE / PEE / PPE). Store aliases.

## Document numbers

`STSBPP-{contractor}-DLR-{discipline}-{WBS 3-digit}-{running no}-{rev}`; discipline ∈ `CE | ME | EE | GE`.

## Dates

Thai reports use Buddhist era, often 2-digit (`15/09/69` → 2026-09-15; BE − 543 = CE). Store `DATE` in CE,
calendar-day semantics (never UTC-shift). Display may show BE.

## Metrics

- **Man-day** = daily headcount, summed over days (per contractor / project).
- **NMH** (Number of Man-Hours) = headcount × working hours, summed over days and contractors.
- **Days without accident** (accumulated) and **Highest days without accident**.
- First-pass vs failed inspections, grouped by contractor.
- Safety weekly: Unsafe Action / Unsafe Condition cases by category and status; Line-walk findings
  (issue → corrective action → closed, with after-photo evidence).

## Dashboards / features requested

- **Site Daily Dashboard** (for หน้างาน): Today (to do / request sent / waiting QAQC / inspected),
  **Tomorrow Plan (most prominent)**, Request Status kanban `Draft → Requested → Confirmed → Inspected → Closed`,
  **Action Required** list (e.g. "Concrete B1 L3 tomorrow 13:00 — area not ready", "missing drawing Rev.03").
- QAQC evening form: RFIs, documents uploaded to Conzol, what was submitted today / to inspect tomorrow, NCR count.
- Breakdowns by zone (WBS), contractor, labour type/position, nationality, gender; weekly/monthly filters.
- Work permits per contractor; tomorrow plan as a calendar; materials received per day (contractor input);
  drone photo page (EPS); daily requests.
- Meeting deck dashboard (60 min agenda): SHE, progress S-curve (overall / engineering / procurement /
  construction / commissioning), key milestones, permits. Man-day stacked by work type per day + S-curve;
  headcount by position coloured by contractor; problem Pareto.
