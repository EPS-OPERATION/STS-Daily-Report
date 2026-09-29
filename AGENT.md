# AGENT.md — STS-Daily-Report

> Living document: ถ้ามีการ update อะไรก็ตามใน repo นี้ (code, config, schema, script, docs, โครงสร้าง,
> คำสั่ง build/test/deploy) ต้อง update ไฟล์นี้ให้ตรงของจริงใน commit เดียวกัน ห้ามปล่อยล้าสมัย

## สถานะปัจจุบัน (2026-09-28, branch `dev`)

- Bun monorepo (workspaces `apps/*`, `packages/*`): `apps/web` React19+Vite6+MUI7/MUI-X8+Query5+RHF+Zod,
  `apps/api` Elysia+Drizzle+PG, `packages/{shared,env,typescript-config}`
- Schema: `projects`, `contractors`, `project_contractors` (m2m) + migration `0000_*` + seed (1 project, 2 contractors)
- Reference: `features/contractors` (web) และ `modules/contractors` (api) — ของใหม่ copy pattern นี้
- Design system "Industrial Operational Minimal": theme ที่ `apps/web/src/app/theme/` (palette navy #0B4D8B,
  Inter+Noto Sans Thai, radius 6/8/10, border-over-shadow); primitives `components/ui/` (StatusChip/KpiCard/PageHeader)
- Screens: `/` dashboard, `/site-plan` (SVG schematic + drawer), `/daily-reports` (DataGrid mock),
  `/tomorrow`, `/field` + `/evening-report` (mobile-first), `/contractors` (real API); mock ที่ `src/mock/site-data.ts`
- ยังไม่มี: auth, tests, lint config, CI, domains อื่น (ดู README §12/13)

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
- `packages/env` ต้องมี `@types/bun` ไม่งั้น `process` typecheck ไม่ผ่าน
