# AGENT.md — STS-Daily-Report

> Living document: ถ้ามีการ update อะไรก็ตามใน repo นี้ (code, config, schema, script, docs, โครงสร้าง,
> คำสั่ง build/test/deploy) ต้อง update ไฟล์นี้ให้ตรงของจริงใน commit เดียวกัน ห้ามปล่อยล้าสมัย

## สถานะปัจจุบัน (2026-10-02, branch `improvement/daily-report` — กฎ git ดู `PROJECT_WORKFLOW.md`)

- Agent docs: `CLAUDE.md` (entry, import ไฟล์นี้), `SKILLS.md` (index), skills ที่ `.claude/skills/`
  (`sts-*`, `impeccable`, `web-design-guidelines`, `vercel-react-best-practices`) — design system อยู่ที่ `DESIGN.md` และ `.impeccable/`
- Bun monorepo (workspaces `apps/*`, `packages/*`): `apps/web` React19+Vite6+MUI7/MUI-X8+Query5+RHF+Zod,
  `apps/api` Elysia+Drizzle+PG, `packages/{shared,env,typescript-config}`
- Schema (migrations `0000`–`0013`): projects, contractors, project_contractors, users(role)/memberships/sessions, zones,
  site_plans/zone_map_areas, site_activities, buildings, daily_reports(+_positions/_equipment/_allocations/_machinery/
  _permits/_road_usage/_photos/_materials), inspection_requests
- Reference: `features/contractors` (web) และ `modules/contractors` (api) — ของใหม่ copy pattern นี้
- Design system "Industrial Operational Minimal": theme ที่ `apps/web/src/app/theme/` (palette navy #0B4D8B,
  Inter+Noto Sans Thai, radius 6/8/10, border-over-shadow); primitives `components/ui/` (StatusChip/KpiCard/PageHeader)
- Screens: `/` dashboard, `/site-plan`, `/daily-reports` (work done summary + review queue + tomorrow plan tracking), `/tomorrow`, `/weekly-summary`,
  `/field` + `/field/report` + `/field/coordination` (Map), `/qaqc` (Daily Request), `/contractors`, `/work-permits`, `/progress` (Drone Progress),
  `/materials` (EPS: totals + log จาก evening check-out, real API)
- ยังไม่มี: tests, lint config, CI, production auth, domains permits (ดู README §12/13)

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

- `bun dev | dev:web | dev:api`, `bun build | build:web | build:api`, `bun typecheck` (ทุก workspace)
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
- `bun --filter` ออกจาก root; Bun โหลด root `.env` อัตโนมัติ (env จริง override ไฟล์)
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
  Dockerfiles build จาก repo root (Bun workspaces), web เสิร์ฟผ่าน nginx + SPA fallback
- Auth phase 1 (dev-only): boundary AuthIdentity (session→user→memberships); ตาราง users/contractor_memberships/sessions
  (token_hash เท่านั้น); routes POST /auth/login, GET /auth/me, POST /auth/logout; cookie sts_session HttpOnly;
  guard requireAuth; ห้าม local-email ใน production (startup fail); seed login: contractor@sts.local (ไม่มีรหัสผ่าน)
- Site-plan vertical (real DB): ตาราง zones/site_plans/zone_map_areas/site_activities (geometry normalized 0..1 JSONB);
  modules zones/site-activities/site-plans/projects; writes กันด้วย requireAuth; reads เปิด; seed 21 zones/1 plan/6 areas;
  frontend features/site-plan + features/projects (ProjectProvider)
- /site-plan = overview hotspots → drawer/Add Activity (ไม่มี 2D map, ไม่มี /site-plan/config แล้ว);
  seed geometry ยังอยู่ใน DB (16 areas, 5 zones unmapped โดยตั้งใจ ไม่มี subdivision)
- Overview hotspots (`mock/site-overview.ts`, x/y % ล้วน): 10 ป้าย → zone จริง, 4 ป้าย (ACC/5.1, 2.2–2.4, 6.4) fallback parent โดย tooltip บอก, TR ไม่มี zone (disabled)
- `packages/env` ต้องมี `@types/bun` ไม่งั้น `process` typecheck ไม่ผ่าน
- Daily report: 1 row/contractor/project/date, เช้า/เย็น ส่งอิสระ (เช้า lock เมื่อส่งครบทั้งคู่, เย็น lock ตัวเอง);
  เช้า = เวลา/ชม., อากาศ, คนตามตำแหน่ง (ยอดหลัก) = สัญชาติ/เพศ, เครื่องจักรในไซต์, allocation ลง `buildings` 15 อาคาร (ลำดับตามไซต์, BMS inactive)
  (≠ WBS zones) รวม = total พอดี (zod + service); เย็น upsert แถวเอง (ไม่ต้องมีเช้า) = อุบัติเหตุ, OT, actual% (ต่ำกว่า plan
  ต้องมี countermeasure), รูป (draft แถวก่อนถ้ายังไม่มี), ลายเซ็น PNG, วัสดุหน้างาน (ชื่ออิสระ+qty+unit, ไม่ซ้ำ), คำขอพรุ่งนี้; NMH = คน × (ชม.+OT); vocab ที่ `@sts/shared`
- Charts (MUI x-charts, สีตาม contractor code จาก `app/theme/chart-palette.ts`): `/manpower` (สัปดาห์/เดือน; `/manpower-summary`, `/position-mix`, `/manpower-trend`), weekly page กราฟเดียว; `weekly-summary`: machinery/permits/roads ตาม target_date (ปิด rule base จองชนตาม requirement); seed sample ZCE/LCE/UME (CTR-001 ว่างไว้ทดสอบ)
- Bun `--hot` segfault บน Windows → `--watch`; FormData ใช้ `http.upload`; form ใน Dialog ต้อง `e.stopPropagation()`
- คำขอพรุ่งนี้ (machinery[เวลา optional=ทั้งวัน]+purpose/equipment_requests[qty ไม่มีเวลา]/permits/road_usage) ผูก report เย็นวัน T + `target_date`=T+1;
  QAQC = `inspection_requests` ผูก contractor+report_date; draft จนส่งเย็น → requested;
  EPS (`users.role='eps'`, seed eps@sts.local) ย้าย confirmed→inspected(pass/fail)→closed; contractor แก้ได้แค่ draft/requested
- Site plan = `building_markers` + `building_parts`/`_part_markers` (x/y 0..1 ต่อ view overview|topview|plan[แบบ CAD G A0.02]; EPS ตั้งที่ `/site-plan/config`) + `GET /site-day?date=`; report ยังไม่อ้าง part
- Safety `/safety` (EPS): `safety_findings` (line walk + รูป MinIO) + `daily_reports.accident_category` (ผู้รับเหมาเลือก 5 หมวด) → stats; PDF = `/safety/report` (print A4, นอก AppLayout)
