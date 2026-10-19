# Plan — one contractor per company

Status: **approved scope, ready to build** (nothing built yet). Date: 2026-10-19.

## Goal

Today every *company + discipline* is its own contractor (Sinoma has 8 codes: SCM, SCI, SEE, SFP, SGE,
SIN, SME, SPI). The daily report form already asks for the discipline (CE / ME / EE), so the code repeats
it. After this change there is **one contractor per company**; the discipline comes only from the form.

Decisions:

| Question | Decision |
|---|---|
| How far | Real merge: one contractor per company |
| Discipline of the old codes | Not kept — only the company is kept; the discipline is what the form's CE / ME / EE says (as today) |
| Company codes | Short codes below; old codes kept as aliases |
| Logins linked to an old code | Moved to the company automatically |
| EPS (Eco Plant Services) | Stays, but as the owner company — **not a contractor**. Sign-up gets a separate "EPS" choice |
| Most visible places | Sign-up, contractor filters, charts/reports |

## 1. The 22 contractor codes → 11 contractor companies (+ EPS)

| New code | Company | Old codes merged in |
|---|---|---|
| BW | Blue White | BEE |
| FS | Fast steel | FCE, FEE |
| KR | Khwan Rungrueang | KME |
| LT | L-tab | LCE |
| PT | Pattara | PEE |
| UC | Unique Conveyor | QCI, QEE, QME |
| RS | Ruangsan Engineer | RME |
| SZ | Szone | SCE |
| SN | Sinoma | SCI, SCM, SEE, SFP, SGE, SIN, SME, SPI |
| US | Utai Seya | UME, UPP |
| ZT | Zhongtian | ZCE |
| EPS | Eco Plant Services | EPS — owner company, hidden from every contractor list (section 3) |

The company keeps the id of its first old code (e.g. L-tab keeps LCE's id), so links and bookmarks that
point at that id keep working. Reports keep the discipline the contractor picked in the form.

## 2. Database change (one migration, runs by itself in the pipeline)

1. New table `contractor_aliases (contractor_id, code)` — every old code (SCM, LCE, …) is stored as an
   alias of its company, so old document numbers (`STSBPP-LCE-DLR-…`) still find the right company.
2. Every place that points at an old code is moved to the company:
   `daily_reports`, `inspection_requests`, `site_activities`, `safety_findings`, `coordination_items`,
   `daily_report_standard_items`, `users.requested_contractor_id`.
3. Places that must stay unique are de-duplicated:
   `project_contractors` (one row per project + company), `contractor_memberships` (one per user + company
   + project), `coordination_colors` (the company keeps its first colour).
4. The old contractor rows are deleted; the company row gets its new code and name.
5. New column `contractors.is_contractor` (default true; **false for EPS**). Every contractor list, filter,
   picker and chart shows only `is_contractor = true`.
6. **Safety stop:** if two old codes of the same company have a daily report on the **same day**, the
   migration stops with a clear error instead of guessing how to merge them. Nothing is changed, the
   pipeline does not deploy, and we decide what to do. Today this never happens: staging has 0 reports
   and the local copy has 0 such days.

`bun db:seed` is changed to the new companies, so a fresh database starts merged too.

## 3. EPS and sign-up

- **Create account, step 2** first asks **"ผู้รับเหมา (Contractor)"** or **"EPS"**.
  - Contractor → project + company list (11 companies, no EPS).
  - EPS → project only; the request reaches the admin as an **EPS account request**.
- **Admin approval:** an EPS request is approved as **EPS หน้างาน** (eps_site); the admin can change it to
  EPS ผู้ดูแลระบบ afterwards with the existing role control. No company link is needed for EPS.
- **Existing data on staging:** 2 users signed up choosing "EPS" as if it were a contractor, and 1 Map item
  is filed under EPS. They are **not** changed automatically (turning them into EPS staff would give EPS
  rights without approval). After the deploy the admin decides per user: change role to EPS, or leave.
  The EPS Map item stays and is still shown on the map.

## 4. What users will see

- **Sign-up:** contractor / EPS choice; 11 companies instead of 23.
- **Contractor filters** (Map, Daily Request, Manpower, QAQC, Safety, Dashboard): one entry per company,
  no EPS.
- **Charts and reports** (Manpower, weekly, permits, PDFs): one bar / row per company; discipline still
  shown where the page already shows it (from the form's CE / ME / EE).
- **Map colours:** one colour per company. **Map "which contractor" dialog:** 11 companies.
- **Logins:** a user linked to LCE is now linked to L-tab and sees no difference in the form.
- **Daily report form:** unchanged (CE / ME / EE buttons).

## 5. Order of work

1. Migration (merge + aliases + `is_contractor`) and seed change; test on a copy of the local database
   (counts before/after, every reference moved, no orphan rows).
2. API: contractor lists filter `is_contractor`; lookups also accept an alias code; registration takes
   the contractor / EPS choice; approval of EPS requests.
3. Web: sign-up step 2, then every contractor list, filter and chart checked with merged data
   (desktop + phone).
4. Golden API snapshot updated on purpose (codes change from LCE to LT, etc.).
5. **Backup Supabase** (download a dump) before merging the PR.
6. One PR → CI → merge → pipeline migrates Supabase → Vercel deploys. Smoke test on staging.

## 6. Rollback

- Before staging migrates: close the PR, nothing happened.
- After: restore the Supabase backup from step 5 and redeploy the previous commit. (Staging has no
  real reports yet, so the risk is low today; it grows once contractors start sending reports.)
