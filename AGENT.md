# AGENT.md — STS-Daily-Report

> Living document: ถ้ามีการ update อะไรก็ตามใน repo นี้ (code, config, schema, script, docs, โครงสร้าง,
> คำสั่ง build/test/deploy) ต้อง update ไฟล์นี้ให้ตรงของจริงใน commit เดียวกัน ห้ามปล่อยล้าสมัย

## สถานะปัจจุบัน (2026-09-30, branch `dev`)

- Bun monorepo (workspaces `apps/*`, `packages/*`): `apps/web` React19+Vite6+MUI7/MUI-X8+Query5+RHF+Zod,
  `apps/api` Elysia+Drizzle+PG, `packages/{shared,env,typescript-config}`
- Schema: projects/contractors/auth + zones/site_plans/zone_map_areas/site_activities; seed 1 project, 3 contractors, 21 zones, 13 stored map areas
- Reference: `features/contractors` (web) และ `modules/contractors` (api) — ของใหม่ copy pattern นี้
- Design system "Industrial Operational Minimal": theme ที่ `apps/web/src/app/theme/` (palette navy #0B4D8B,
  Inter+Noto Sans Thai, radius 6/8/10, border-over-shadow); primitives `components/ui/` (StatusChip/KpiCard/PageHeader)
- Screens: `/site-plan` is Site Activity (Konva, DB activities); `/site-plan/config` is separate Zone Configuration; `/daily-reports` (DataGrid mock),
  `/tomorrow`, `/field` + `/evening-report` (mobile-first), `/contractors` (real API); mock ที่ `src/mock/site-data.ts`
- Auth protects project/site-plan/zone/activity/contractor APIs; `bun test` runs Bun-native regression tests.
- Quality tooling: root ESLint Flat Config + Prettier; `bun run check` runs lint, format:check, and typecheck. CI and other domains are not yet configured.

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

- `bun dev | bun run dev:web | bun run dev:api`, `bun run build | bun run build:web | bun run build:api`, `bun typecheck`, `bun test`
- Quality commands: `bun run lint`, `bun run lint:fix`, `bun run format`, `bun run format:check`, `bun run check`
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
- Run `bun --filter` from root; filtered workspaces need explicit `--env-file=.env` to receive the root `.env`.
- `apps/web` is already a workspace; adding `sts-web: ./apps/web` to root dependencies duplicates its lockfile key and breaks frozen installs.
- compose merge `ports` แบบ additive — ไฟล์ override นอก repo ต้องใช้ `ports: !override`
- localhost ชนโปรเจกต์อื่นได้ (เคยเจอ 3000/5432/9000 ถูกใช้) — verify ด้วย project/ports สำรองนอก repo
- `errorPlugin` ต้องเช็ค `instanceof AppError` ก่อน Elysia validation branch (ไม่งั้น 409 กลายเป็น 400)
- MUI v7: type ชื่อ `TypographyVariantsOptions` (ไม่มี `TypographyOptions`); web ห้าม project-reference ไป api
- DataGrid theme override ต้อง `import type {} from "@mui/x-data-grid/themeAugmentation"` ไม่งั้น key `MuiDataGrid` ไม่รู้จัก
- MUI v7 Grid ใช้ prop `size={{ xs: 12, md: 6 }}` (ไม่ใช่ `item xs={}`); custom variant `metric` อยู่ใน `theme/augmentation.ts`
- Site Activity uses Konva on `master-layout-map.png`; mapped polygons only, 0..1 geometry, parent overview rolls up descendant activity status.
- DataGrid ล็อก layout ผ่าน theme default (`disableColumnMenu/Resize`); reorder ถูกล็อกในตัว DataGrid อยู่แล้ว
  ตั้งผ่าน props/theme ไม่ได้ (forced prop) — sorting ด้วย click header ยังใช้ได้
- Icons: Outlined ทั้งระบบ (ArrowBack/Forward/MoreVert/Horiz เท่านั้นที่คง filled), registry ที่
  `app/icons/navigation-icons.ts` (sidebar ใช้ key แทน import ตรง), status icons รวมที่ StatusChip
  (Submitted=SendOutlined, Pending=ScheduleOutlined, Rejected=CancelOutlined), QAQC ทุกที่=FactCheckOutlined
- Command palette (`app/command-palette/`): Dialog + registry กลาง (navigate/actions/contractors),
  เปิดด้วย Ctrl/Cmd+K หรือปุ่ม search ใน topbar; ไม่มี mock zone/activity commands;
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
- Site-plan API uses `requireAuth` for reads and writes. Configuration uses one transactional
  `PUT /site-plans/:id/areas`; Site Activity consumes saved geometry and activities from PostgreSQL.
- Seed geometry: 13 mapped areas and 8 unmapped zones. `6.2`, `6.3`, and `6.5` stay unmapped until reviewed in Zone Configuration.
- Konva map (konva+react-konva ใน apps/web): base master-layout-map.png (1586x992) + polygons;
  vertex/draw/reassign/reset/delete edits stay local until atomic Save; default_geometry is the reset target;
  normalized saved geometry is PostgreSQL state, viewport and draft coordinates are UI state.
- Site Activity is `/site-plan`; Zone Configuration is `/site-plan/config` under Administration.
  Draft edits, reassignment, create, reset, and delete save atomically; cancel/project/plan/navigation changes confirm dirty drafts.
- Drill-down: overview renders parent polygons only; WBS buttons keep All Zones + every parent visible.
  Focus reveals immediate children (unmapped children remain labeled); parent status rolls up descendants.
- Overlaps (`features/site-plan/utils/polygon-overlap.ts` + `polygon-clipping`): analysis runs on mapped
  physical LEAF zones only (group nodes carry no geometry); parent/descendant ignored, sibling = warning,
  cross-branch = strong (`MEANINGFUL_OVERLAP_RATIO=0.05` vs smaller polygon). Config panel has Zones/Issues
  tabs: tree shows ✓/○ plus ⚠ per involved leaf (unmapped stays neutral), Issues lists compact rows with an
  inspector (focus + dim others + intersection overlay + direct Edit boundary); save confirms strong only.
  Activity disambiguates same-level clicks via popover; focused parents render as non-interactive outlines.
- `packages/env` ต้องมี `@types/bun` ไม่งั้น `process` typecheck ไม่ผ่าน
