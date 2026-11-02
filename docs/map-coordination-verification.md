# Daily coordination Map — implementation and verification

Date: 2026-10-12. Branch: `dev-got`, explicitly authorized by the user for this implementation.
No commit, push or deployment was performed. The supplied untracked drawing was used as requested;
include `apps/web/public/site-plan/STS_KY_Layout_Plan.png` when delivering the change through Git.

## Implemented behavior

- Shared project/date-scoped API and PostgreSQL data replace browser-only sample callouts.
- New drawing, colour-coded SVG-path machinery icons and permanent contractor-code labels.
- Rectangle/polygon drawing, icon placement/rotation, area movement, rectangle transform handles,
  polygon vertex editing, zoom/pan and selection across the canvas/work list.
- Complete local drafts with Save/Cancel, unsaved-change guards and revision conflict handling.
- Contractor/company/project ownership enforced on API reads/writes, including colleagues in the same company.
- Stable company colours with EPS controls, translucent areas, allowed overlaps and company filters.
- EPS and contractor workspace share the query; dashboard uses the same persisted data as read-only.
- Mobile bottom details drawer and save/details controls. Konva loads in a separate lazy chunk.
- No automatic import of undated browser examples; no sample work inserted into the real project.

## Database and commands

`bun db:generate` generated `0019_bored_psynapse.sql`, its snapshot and migration journal entry.
The migration adds `coordination_maps`, `coordination_colors`, and `coordination_items` with
project/contractor foreign keys, map/actor references, date index and value checks.

`bun db:migrate` exited 0 and printed `migrations applied`. PostgreSQL emitted normal existing-schema
notices plus identifier-truncation notices for the generated long foreign-key names; the constraints applied.

`bun db:seed` exited 0. It added the configured STS drawing idempotently and preserved existing master data;
it created no users or sample work.

`bun typecheck` passed all four workspaces. `bun test` passed 50 tests across 6 files with 0 failures,
including concave/crossing/degenerate geometry, rotated rectangles on a non-square image and Thailand dates.

`bun run build` passed API and frontend. The map canvas is a separate approximately 466 kB chunk
(141 kB gzip). Vite still warns about the existing large main bundle; no unrelated bundle refactor was made.

`git diff --check` passed. The Impeccable mechanical detector returned `[]` for the changed map feature/pages.
Static checks do not prove rendered layout or pointer interactions.

## Actual API acceptance

`bun --env-file=.env apps/api/scripts/verify-coordination.ts` passed 29 actual API checks on localhost:3000
using the local localhost:5432 database. Its generated project/company/user IDs are isolated QA fixtures and
removed in `finally`, with cascaded memberships, map records, colours, work and sessions.

Verified:

- No session → 401; a membership in a different project → 403 even when the contractor ID matches.
- Authorized project read → empty day, correct editable companies and colour permissions.
- Contractor creating work for another company → 403.
- Invalid date, out-of-image position, crossed polygon and malformed rectangle → 400.
- Create work → 201; another colleague in that company reads and edits it successfully.
- Other project contractors can view shared work but cannot change it.
- Reading the next date produces an empty plan; geometry/icon coordinates survive server readback unchanged.
- Stale revision → 409; two concurrent edits yield exactly one 200 and one 409.
- A second contractor creates overlapping work successfully.
- Contractor colour update → 403; EPS colour update → 200; stale colour revision → 409.
- Updated company colour is visible to another company.
- Wrong-owner delete → 403; stale delete → 409; same-company colleague and EPS deletion → 204.
- Final plan is empty after deleting the fixture work.

## Browser boundary and manual walkthrough

Browser inventory/navigation could not load the browser request-header policy. The user explicitly chose
to perform the UI walkthrough themselves. No alternate browser access or permission workaround was used;
no screenshots or automated live pointer/layout acceptance are claimed.

Open `/site-coordination` as EPS or `/field/coordination` as a linked contractor:

1. Choose the project/date and add a work item. Enter a title, contractor and icon type.
2. Place the icon, drag a rectangle, then Save. Reload and confirm the exact position/area persists.
3. Edit the item, rotate/resize the rectangle, move the icon and save; verify after zoom/pan/reload.
4. Create a polygon with a concave boundary, finish it and drag its vertices. Crossed boundaries must prevent Save.
5. Select work through both icon/area and the list; verify company-code labels, colours and filtered work.
6. Change the day, project or route with an unsaved draft; decline discarding and confirm the draft survives.
7. Open two accounts and edit one item; the second stale save must preserve its draft and offer reload.
8. Confirm a contractor cannot edit another company, while EPS can; change a company colour and verify another view.
9. Check the dashboard is read-only and shows persisted work for its selected day.
10. At a phone viewport, verify the bottom drawer, polygon Finish button, zoom/pan and Save controls are reachable.

Remaining acceptance: user-run rendered UI and pointer interaction walkthrough above.
