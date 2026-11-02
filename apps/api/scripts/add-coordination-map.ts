import { eq, max } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { coordinationMaps, projects } from "../src/db/schema/index.js";

// Operator-run: add (or update) a working-area map for the Map page's "Area" dropdown.
//   bun --env-file=../../.env scripts/add-coordination-map.ts --project STSBPP --name "33 kV line route" \
//     --name-th "แนวสายส่ง 33 kV" --image /site-plan/STS_33kV_Line.png --width 1532 --height 1125 [--order 10]
// The image file goes in apps/web/public/site-plan/ (add a 3200px-wide .preview.webp next to big ones, see its README).
// Re-running with the same --name updates that map instead of adding another.
const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i]!.replace(/^--/, ""), process.argv[i + 1] ?? "");
const need = (key: string) => {
  const value = args.get(key)?.trim();
  if (!value) throw new Error(`Missing --${key}`);
  return value;
};
const [projectCode, name, nameTh, imagePath] = [need("project"), need("name"), need("name-th"), need("image")];
const [width, height] = [Number(need("width")), Number(need("height"))];
if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error("--width and --height must be positive whole pixels");
if (!imagePath.startsWith("/")) throw new Error("--image is a web path such as /site-plan/file.png");

const db = getDb();
const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.code, projectCode)).limit(1);
if (!project) throw new Error(`No project with code ${projectCode}`);
const [last] = await db.select({ order: max(coordinationMaps.sortOrder) }).from(coordinationMaps).where(eq(coordinationMaps.projectId, project.id));
const sortOrder = args.has("order") ? Number(args.get("order")) : (last?.order ?? 0) + 10;
const [row] = await db.insert(coordinationMaps).values({ projectId: project.id, name, nameTh, imagePath, width, height, sortOrder })
  .onConflictDoUpdate({ target: [coordinationMaps.projectId, coordinationMaps.name], set: { nameTh, imagePath, width, height, sortOrder } })
  .returning({ id: coordinationMaps.id });
console.log(`Map "${name}" ready for ${projectCode} (${row!.id}), order ${sortOrder}`);
const maps = await db.select({ name: coordinationMaps.name, order: coordinationMaps.sortOrder }).from(coordinationMaps)
  .where(eq(coordinationMaps.projectId, project.id)).orderBy(coordinationMaps.sortOrder);
console.log(maps.map((m) => `${m.order}: ${m.name}`).join("\n"));
process.exit(0);
