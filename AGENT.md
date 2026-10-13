# AGENT.md — STS-Daily-Report

> Living document: ถ้ามีการ update อะไรก็ตามใน repo นี้ (code, config, schema, script, docs, โครงสร้าง,
> คำสั่ง build/test/deploy) ต้อง update ไฟล์นี้ให้ตรงของจริงใน commit เดียวกัน ห้ามปล่อยล้าสมัย

## สถานะปัจจุบัน (2026-10-13, branch `dev-got` — กฎ git ดู `PROJECT_WORKFLOW.md`)

- Agent docs: `CLAUDE.md` (entry, import ไฟล์นี้), `SKILLS.md` (index), skills ที่ `.claude/skills/`
  (`sts-*`, `impeccable`, `web-design-guidelines`, `vercel-react-best-practices`) — design system อยู่ที่ `DESIGN.md` และ `.impeccable/`
- Bun monorepo (workspaces `apps/*`, `packages/*`): `apps/web` React19+Vite6+MUI7/MUI-X8+Query5+RHF+Zod,
  `apps/api` Elysia+Drizzle+PG, `packages/{shared,env,typescript-config}`
- Schema (migrations `0000`–`0026`): projects, contractors, project_contractors, users(username/password_hash/requested_company/decision)/memberships/sessions/password_reset_tokens/auth_rate_limits, zones,
  site_plans/zone_map_areas, site_activities, buildings, daily_reports(+_positions/_equipment/_allocations/_machinery/
  _permits/_road_usage/_photos/_materials), inspection_requests, coordination_maps/colors/items/day_notes/day_locks
- Reference: `features/contractors` (web) และ `modules/contractors` (api) — ของใหม่ copy pattern นี้
- Design system "Industrial Operational Minimal": theme ที่ `apps/web/src/app/theme/` (palette navy #0B4D8B,
  Inter (Latin)+Sarabun (Thai), radius 6/8/10, border-over-shadow); primitives `components/ui/` (StatusChip/KpiCard/PageHeader)
- Screens: `/` dashboard (filter ผรม highlights; Map วันนี้ read-only), `/site-coordination` (Konva Map รายวันบน STS_KY_Layout_Plan.png จาก dev: icon 7 แบบ/marker ข้อความ, floating pill ลาก/หมุน/เชื่อม-แยกเส้น (`coordination_items.link_area`), rectangle/polygon, สีต่อ contractor (`coordination_colors`), autosave ลง DB, revision กันทับ, refresh 10s, README §16; + หมายเหตุต่อรายการ `coordination_items.note` (migration `0023`) ใน dialog ตั้งค่า, แผงขวา = รายการงาน (ซ่อน/เปิดได้ ปุ่มในหัวแผง + แท็บ «รายการงาน» ขอบขวาผัง) หรือแผงแก้ไขเมื่อเลือกงาน (`CoordinationInspector`: ชื่อ/หมายเหตุ/ผรม/ประเภท/พื้นที่สี่เหลี่ยม-อิสระ/เส้นเชื่อม/ลบ, autosave; มือถือ = bottom sheet; ไม่มี floating bar/dialog ตั้งค่าแล้ว); หมายเหตุประจำวันท้ายแผงรายการ (`coordination_day_notes` 1 ต่อ project×วัน, EPS เขียน/ผรมอ่าน, ปุ่ม เขียน/แก้ไข → บันทึก, `PUT /coordination/day-note?date=`, migration `0024`); ล็อกแผนรายวัน (EPS stamp: `coordination_day_locks`, `PUT|DELETE /coordination/lock?date=`, ล็อกแล้วทุกคนรวม EPS แก้งาน/หมายเหตุไม่ได้ = 409 จน EPS ปลดล็อก; แบนเนอร์เขียว + ตราประทับบนผัง, migration `0025`); ไม่มี legend/แถวชิปผรมบนผังแล้ว (มือถือเป็นหลัก — รหัส+สีอยู่บนพื้นที่/รายการ/ตัวกรอง); admin เปลี่ยนสีผรมจากปุ่ม «เปลี่ยนสี» ในแผงแก้ไข; หมายเหตุแสดงใต้ชื่องานบนผัง (สวิตช์ได้); คลิกงาน = การ์ดรายละเอียดมุมซ้ายบนของผัง (ผรม·ชื่อ·ประเภท·พื้นที่·หมายเหตุเต็ม, สวิตช์ได้, dashboard ด้วย); filter: วัน+เมื่อวาน/วันนี้/พรุ่งนี้, ผรม (ContractorFilterPopover), ประเภทงาน, ค้นหาชื่องาน/หมายเหตุ, การแสดงผลเปิด/ปิด (พื้นที่/ชื่อ/เส้น/ป้าย/การ์ด/รายการ, localStorage `sts_map_display_v1`); วาด polygon มีคำแนะนำทีละขั้น + เส้นพรีวิว + Enter/Backspace/Esc; `/field/coordination` แก้เฉพาะ membership/project; รายงาน PDF ของ Map สำหรับ EPS เท่านั้น = `/site-coordination/report?projectId&date&print=1` หน้า A4 แนวนอน ผังแบบ snapshot + รายการงาน/หมายเหตุ บันทึก PDF ผ่านหน้าต่างพิมพ์ API `GET /projects/:id/coordination/report?date=`, `/site-plan` (Option), `/daily-reports` (work done + Submission History: filter ผรม `?contractors=`), `/today-requests` = Daily Request (filter ผรม `?contractors=`; ถนน = timeline ต่อถนน/วัน ชนกันแรเงาพร้อมเวลา, EPS แก้เวลาได้ `PATCH /projects/:id/daily-reports/road-usage/:id` badge ชนกัน→แก้ไขแล้ว/ยังชนกัน, ผรมเห็นเวลาที่ขอ และ EPS ปรับคงไว้เมื่อส่งซ้ำ, popover ร่วมกับ Manpower/QAQC/Safety/Dashboard), `/tomorrow`, `/weekly-summary`,
  `/field` (Today's Tasks: เช้า/บ่าย + History 14 วัน) + `/field/report` + `/field/coordination` (Map), `/qaqc` (RFI: Today & Tomorrow + Donut + history, filter ผรม `?contractors=`), `/contractors`, `/safety` (Safety + Work Permits `?tab=permits` + Rain & Delay Log `?tab=rain`, filter ผรม `?contractors=`), `/progress` (Drone Progress),
  `/materials` (Option: totals + log จาก evening check-out, real API)
- ยังไม่มี: lint config, CI, domains permits (ดู README §12/13); unit tests `bun test`; auth integration ดู README §15

## กฎการ update ไฟล์นี้ (บังคับ)

1. เปลี่ยนไฟล์/คำสั่ง/env/config/architecture → แก้ไฟล์นี้ใน commit เดียวกัน
2. บันทึกเฉพาะของจริงจาก repo (manifest/script/code) ห้ามเดา
3. ยังไม่มีของจริงให้เขียน `ยังไม่มี` อย่าลบหัวข้อทิ้ง
4. ไฟล์นี้ < 100 บรรทัด รายละเอียดยาวใส่ README/docs แล้ว link

## Repository map

- `apps/web/src`: `app/{providers,router,layouts,theme}` `pages/` `features/<domain>/` `services/http/`
- `apps/api/src`: `config/` `db/{schema,migrations,seed}` `modules/<domain>/` `plugins/` `shared/{errors,http,storage}`
- `packages/shared` (framework-free) `packages/env` (zod contracts) `docker-compose.yml` (pg 5432, minio 9000/9001)
- ห้าม: `packages/*` import `apps/*`; SQL ใน route; HTTP logic ใน repository; Base*/DI framework

## คำสั่งจริง (source: root `package.json#scripts`)

- `bun dev | dev:web | dev:api`, `bun build | build:web | build:api`, `bun typecheck`, `bun test`
- `bun db:generate | db:migrate | db:push | db:studio | db:seed` (ผ่าน `apps/api`)
- `bun docker:up | docker:down | docker:logs`
- Setup: `cp .env.example .env && bun install && bun docker:up && bun db:migrate && bun db:seed && bun dev`

## Conventions ที่สังเกตได้

- ไฟล์ kebab-case, component PascalCase, fn camelCase, DB snake_case, env UPPER_SNAKE, URL kebab
- API: `/api/v1/<resources>` + `GET /health`; list `page/pageSize/sort/order/search` → `{data, meta}`
- Error envelope `{error:{code,message,details}}` (400/404/409/500); web ใช้ `contractorKeys.*`, RHF+zod, MUI feedback
- TS strict, ห้าม `any`/ts-ignore โดยไม่มีเหตุผล; `.env` local-only ไม่ commit secret

## Pitfalls (เจอจริง)

- `minio/minio:latest` โดนถอดจาก Docker Hub → pin `RELEASE.2025-04-22T22-12-26Z` ใน compose
- `bun --filter` จาก root; API dev/migrate/seed โหลด root `.env` ผ่าน `--env-file=../../.env` (env จริง override ไฟล์)
- compose merge `ports` แบบ additive — ไฟล์ override นอก repo ต้องใช้ `ports: !override`
- localhost ชนโปรเจกต์อื่นได้ (เคยเจอ 3000/5432/9000 ถูกใช้) — verify ด้วย project/ports สำรองนอก repo
- `errorPlugin` ต้องเช็ค `instanceof AppError` ก่อน Elysia validation branch (ไม่งั้น 409 กลายเป็น 400)
- MUI v7: type ชื่อ `TypographyVariantsOptions` (ไม่มี `TypographyOptions`); web ห้าม project-reference ไป api
- DataGrid theme override ต้อง `import type {} from "@mui/x-data-grid/themeAugmentation"` ไม่งั้น key `MuiDataGrid` ไม่รู้จัก
- MUI v7 Grid ใช้ prop `size={{ xs: 12, md: 6 }}` (ไม่ใช่ `item xs={}`); custom variant `metric` อยู่ใน `theme/augmentation.ts`
- Site plan ใช้ schematic SVG (ไม่มี satellite asset); zone 1 อันมีได้หลาย contractor — สีสื่อ state ของ zone เท่านั้น
- DataGrid ล็อก layout ผ่าน theme default (`disableColumnMenu/Resize`); reorder ถูกล็อกในตัว DataGrid อยู่แล้ว
  ตั้งผ่าน props/theme ไม่ได้ (forced prop) — sorting ด้วย click header ยังใช้ได้
- Icons: Outlined ทั้งระบบ (ArrowBack/Forward/MoreVert/Horiz เท่านั้นที่คง filled), registry ที่
  `app/icons/navigation-icons.ts` (sidebar ใช้ key แทน import ตรง), status icons รวมที่ StatusChip
  (Submitted=SendOutlined, Pending=ScheduleOutlined, Rejected=CancelOutlined), QAQC ทุกที่=FactCheckOutlined
- Command palette (`app/command-palette/`): Dialog + registry กลาง (navigate/actions/contractors/zones),
  เปิดด้วย Ctrl/Cmd+K หรือปุ่ม search ใน topbar; static commands ตอนนี้, async ต่อที่ registry ทีหลัง;
  ห้ามใส่ destructive commands; recents เก็บ in-memory
- Scrollbar กลางที่เดียว (`theme/components.ts` → MuiCssBaseline): 8px, track โปร่ง, thumb จาก grey[400]/hover grey[500],
  sidebar navy ใช้ translucent white class `sts-navy-scroll`; Firefox + WebKit, touch ไม่แตะ
- Shared UI: EmptyState (placeholder/projects ใช้ร่วม), StatusChip ขยาย tones active/attention/blocked/idle + label override;
  contractors barrel ครบ (hooks/components/schema); contractors-page ใช้ PageHeader เหมือนหน้าอื่น
- Docker: compose มี postgres+minio (default) + api/web images ใต้ profile `app` (`--profile app up -d --build`);
  Dockerfiles build จาก repo root (Bun workspaces), web เสิร์ฟผ่าน nginx + SPA fallback (index.html `no-cache`, assets cache 30d)
- Auth v2 (3 roles `contractor` | `eps_site` | `eps_admin`): register contractor→pending→EPS อนุมัติ/ปฏิเสธ; username lowercase 3–20 `[a-z0-9._-]`, password 8–128 Argon2id (มี show/hide toggle, ไม่มี complexity rule); sessions/cookie เดิม; `/login` มีสมัคร 2 step (user details → project & contractor) + `/admin/users` + `/reset-password`; Other เก็บชื่อ ไม่มี membership→field แจ้งยังไม่ผูกบริษัท
  สิทธิ์: eps_site = งานปฏิบัติการประจำวัน (ไม่เห็นหน้า Option และ user/contractor administration); eps_admin = จัดการ user ทั้งหมด (approve/reject/link, reset link, เปลี่ยน role, ระงับ/เปิดบัญชี ห้ามแก้ตัวเอง) + เห็น `/contractors` และหน้า Option (`/site-plan`, `/materials`); `isEpsStaff/isEpsAdmin` ที่ `@sts/shared` ห้ามเทียบ string เอง
  API `/auth/register|login(identifier+password)|reset-password|me|logout|registration-options(?projectId กรอง contractor ตาม project)`; `/users` ทั้งหมด (list/approve/reject/link/reset-password + PATCH role/status) = eps_admin เท่านั้น; membership = user×contractor×project (`contractor_memberships.project_id`, migration `0018`; link ระบุ/อนุมาน project, /me ส่ง projectId, field/report ใช้เฉพาะ membership ของ project ที่เลือก); token ใช้ครั้งเดียว 60 นาที, reset revoke sessions; user approved-unlinked เห็นหน้า "ติดต่อ admin" → eps_admin กด Link; seed = master data ล้วน ไม่มี user ทุก env → admin คนแรกสร้างด้วย `scripts/bootstrap-admin.ts` (EPS_BOOTSTRAP_EMAIL/PASSWORD: สร้าง eps_admin ใหม่ หรือตั้งรหัสให้บัญชีที่ยังไม่มีรหัส ห้ามทับของเดิม); ไม่มี demo/email-only login แล้ว; migration `0016`–`0018`
- Site-plan vertical (real DB): ตาราง zones/site_plans/zone_map_areas/site_activities (geometry normalized 0..1 JSONB);
  modules zones/site-activities/site-plans/projects; writes กันด้วย requireAuth; reads เปิด; seed 21 zones/1 plan/6 areas;
  frontend features/site-plan + features/projects (ProjectProvider)
- /site-plan = overview hotspots → drawer/Add Activity (ไม่มี 2D map, ไม่มี /site-plan/config แล้ว);
  seed geometry ยังอยู่ใน DB (16 areas, 5 zones unmapped โดยตั้งใจ ไม่มี subdivision)
- Overview hotspots (`mock/site-overview.ts`, x/y % ล้วน): 10 ป้าย → zone จริง, 4 ป้าย (ACC/5.1, 2.2–2.4, 6.4) fallback parent โดย tooltip บอก, TR ไม่มี zone (disabled)
- `packages/env` ต้องมี `@types/bun` ไม่งั้น `process` typecheck ไม่ผ่าน
- Daily report แยกตาม discipline (CE/ME/EE): กดเลือกประเภทงานแล้วฟอร์มของประเภทนั้นขึ้น; positions/allocations มีคอลัมน์ `discipline`, สัญชาติ/เพศต่อกะต่อ discipline อยู่ `daily_report_crews`, `daily_reports.thai_*`/`evening_*` = ผลรวมทุก discipline (dashboard อ่านยอดรวมเหมือนเดิม); API morning/evening รับ `crews[]`; building ซ้ำได้ข้าม discipline แต่ไม่ซ้ำใน discipline เดียว
- Daily report: 1 row/contractor/project/date, เช้า/เย็น ส่งอิสระ (ส่งแล้วแก้ได้ถึง 12:00 วันถัดไป เวลาไทย `canEditReport` ใน `@sts/shared` ใช้ทั้ง API+web, หลังจากนั้นล็อก; ส่งครั้งแรกย้อนหลังยังได้);
  เช้า = เวลา/ชม., อากาศ, คนตามตำแหน่ง (ยอดหลัก) = สัญชาติ/เพศ, เครื่องจักรในไซต์ (14 รายการ + ชื่ออิสระเพิ่มเองได้), Today Activity = allocation ลง `buildings` (≠ WBS zones): อาคาร+งาน+คน, เวลา `start/end_time` และ plan% เป็น optional (ปุ่ม +),
  ห้ามลงงานพร้อมกันเกินจำนวนคนที่มา (`allocationPeak` @sts/shared, zod+service; ลงไม่ครบได้), อาคารซ้ำได้ถ้าเวลาไม่ทับ, `day_share` = สัดส่วนเวลา (man-day อาคาร = คน × day_share); เย็น upsert แถวเอง (ไม่ต้องมีเช้า) = คนช่วงบ่ายตามตำแหน่ง (`daily_report_positions.shift`=evening + `evening_thai/foreign_male/female` รวม=total, บังคับ ≥1, เช้า≠บ่ายได้; man-day = (คนเช้า+คนบ่าย)/2 หรือครึ่งที่ส่ง, NMH = man-day × ชม. + คนบ่าย × OT ผ่าน `dayManpower`), อุบัติเหตุ, OT, actual% (ต่ำกว่า plan ที่ระบุไว้
   ต้องมี countermeasure; ไม่มี plan = actual% อย่างเดียว), (ฟอร์มไม่มีอัปโหลดรูปแล้ว — ลด storage; API รูป + การแสดงรูปเก่ายังอยู่), ลายเซ็น PNG, วัสดุหน้างาน (ซ่อนชั่วคราว future feature — schema/API/material-inputs อยู่ครบ), คำขอพรุ่งนี้ (equipment ขอชื่ออิสระได้); vocab ที่ `@sts/shared`
- Charts (MUI x-charts, สีตาม contractor code จาก `app/theme/chart-palette.ts`): `/manpower` (สัปดาห์/เดือน; `/manpower-summary`, `/position-mix`, `/manpower-trend`), weekly page กราฟเดียว; `weekly-summary`: machinery/permits/roads ตาม target_date (machinery ปิด rule จองชน; ถนนเปิด: ถนนเดียวกัน วันเดียวกัน เวลาทับ ต่างผู้รับเหมา = แจ้งเตือนสีแดง ไม่ block); ไม่มี sample data ใน seed แล้ว (2026-10-11, deploy-ready — ต้องการเดโมให้กู้จาก git history)
- Bun `--hot` segfault บน Windows → `--watch`; FormData ใช้ `http.upload`; form ใน Dialog ต้อง `e.stopPropagation()`
- คำขอพรุ่งนี้ (Tomorrow Forecast Activities `daily_report_forecasts` รายละเอียด+พื้นที่ → ตาราง R003 ใน PDF, machinery[เวลา optional=ทั้งวัน]+purpose/equipment_requests[qty ไม่มีเวลา]/permits/road_usage) ผูก report เย็นวัน T + `target_date`=T+1;
  QAQC = `inspection_requests` ผูก contractor+report_date; หน้า `/qaqc` แสดง Today/Tomorrow RFI + Donut charts สรุปประวัติแยก contractor/building + ตาราง history (EPS: requested→Confirm, confirmed→pass/not pass(Correct)+note)
- Site plan = `building_markers` + `building_parts`/`_part_markers` (x/y 0..1 ต่อ view overview|topview|plan[แบบ CAD G A0.02]; EPS ตั้งที่ `/site-plan/config`) + `GET /site-day?date=`; report ยังไม่อ้าง part
- Safety `/safety` (EPS): `safety_findings` (line walk + รูป MinIO) + `daily_reports.accident_category` (5 หมวด) → stats; งานความเสี่ยงสูง (High-Risk Tasks) = ผรมติ๊กใน Work Permit บ่าย (`daily_report_permits.high_risk/task_name/supervisor_name` EPS, migration `0021`) → ย้ายไปแสดงในการ์ดหน้า Work Permit (`?tab=permits`) พร้อมข้อมูลตัวอย่างหากว่าง; PDF = `/safety/report` (print A4); Daily report PDF = `/daily-reports/:reportId/print` (R003 A4 + หน้า 2, API `GET /daily-reports/:id/print`, ไม่มีสถานะ/หมายเหตุอนุมัติ EPS, ปุ่มรายแถวที่ Submission History — ไม่มี export รวมหลายฉบับแล้ว)
- Trial mode `ALLOW_RESUBMIT=true` (default false; `/auth/config` ส่ง allowResubmit ให้เว็บ): เช้า/เย็น/รูป ส่งซ้ำได้ไม่ล็อก, ส่งเช้าซ้ำคง actual%/countermeasure ของอาคารเดิม
- UI ไม่มี mock/fallback ข้อมูลรายงานแล้ว (2026-10-11): daily-reports page + ReviewDialog โชว์ค่าว่าง/Alert จากข้อมูลจริงเท่านั้น; mock ที่เหลือ = placeholder ของโมดูลที่ยังไม่มี API (work-permits, drone, dashboard HIGHLIGHTS)
- Deploy: Vercel project `sts-daily-report` (Hobby) = `vercel.json` services (web Vite + api container `Dockerfile.vercel`, `/api/*`+`/health`→api); DB Supabase `rwlndwoimtqycwqlmczm` ผ่าน transaction pooler :6543 (`prepare:false`); รูป = Supabase Storage bucket `sts` (`STORAGE_PROVIDER=supabase`); production = password auth ล้วน (ไม่มี demo login; admin คนแรกผ่าน `scripts/bootstrap-admin.ts`); public เฉพาะ auth methods/paths ที่ระบุ; `WEB_URL`=reset origin (`WEB_ORIGIN`=CORS list)
