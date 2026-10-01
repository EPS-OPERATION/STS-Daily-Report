import { and, eq, sql } from "drizzle-orm";
import { getDb, type Db } from "../client.js";
import { facilities, facilityMapMarkers, projects, siteMapViews, sitePlans, users } from "../schema/index.js";
import { getStorage } from "../../shared/storage/index.js";
import { validateMapImage } from "../../modules/site-maps/site-map-image.service.js";

// Existing Project-code convention is the stable bootstrap identity, not its editable name.
const projectCode = "STS-001";
const initialFacilities = [
  ["raw-water-pond-and-pump", "Raw Water Pond and Pump"],
  ["water-tank-and-pump-house", "Water Tank and Pump House"],
  ["water-treatment-plant", "Water Treatment Plant"],
  ["auxiliary-cooling-tower", "Auxiliary Cooling Tower"],
  ["compressor-room", "Compressor Room"],
  ["acc", "ACC"],
  ["tg-building", "TG Building"],
  ["tr", "TR"],
  ["boiler", "Boiler"],
  ["biomass-transport", "Biomass Transport"],
  ["bottom-ash-bunker", "Bottom Ash Bunker"],
  ["fly-ash-silo", "Fly Ash Silo"],
  ["diesel-oil-tank", "Diesel Oil Tank"],
  ["fgt", "FGT"],
  ["stack", "Stack"],
] as const;

async function image(key: string, name: string, filename: string, sortOrder: number) {
  const source = Bun.file(new URL(`../../../../web/public/site-plan/${filename}`, import.meta.url));
  const { body } = await validateMapImage(new File([source], filename, { type: "image/png" }));
  const bytes = body.subarray(0, 24);
  if (
    bytes.length !== 24 ||
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  )
    throw new Error(`Invalid bootstrap PNG: ${filename}`);
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error(`Invalid bootstrap dimensions: ${filename}`);
  return { key, name, legacyAssetUrl: `/site-plan/${filename}`, width, height, sortOrder, body };
}

export async function bootstrapStsDefault(db: Db) {
  const images = await Promise.all([
    image("overview", "Overview", "master-layout-map-above.png", 1),
    image("top", "Top View", "master-layout-map.png", 2),
  ]);
  const storage = getStorage();
  const uploadedKeys: string[] = [];
  try {
    return await db.transaction(async (tx) => {
      // Serialize explicit bootstrap reruns without adding a Map-key column just for this script.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('sts-default:STS-001'))`);
      const createdProject = await tx
        .insert(projects)
        .values({
          code: projectCode,
          name: "STS 9.9 MW Biomass Power Plant",
          description: "STS Biomass Power Plant operational site project",
          status: "active",
        })
        .onConflictDoNothing({ target: projects.code })
        .returning();
      const [project] = await tx.select().from(projects).where(eq(projects.code, projectCode)).for("update");
      if (!project) throw new Error("STS Project could not be resolved");
      const details = [`[${createdProject.length ? "create" : "reuse"}] Project ${project.name} (${project.code})`];
      const maps = await tx.select().from(sitePlans).where(eq(sitePlans.projectId, project.id));
      const namedMaps = maps.filter((map) => map.name === "Master Site Layout");
      // An existing default survives a user rename; bootstrap never resets its metadata/default choice.
      const candidates = namedMaps.length ? namedMaps : maps.filter((map) => map.isDefault);
      if (candidates.length > 1)
        throw new Error("Ambiguous STS Master Site Layout; resolve duplicate/default Maps before bootstrap");
      let map = candidates[0];
      const mapCreated = !map;
      if (!map)
        [map] = await tx
          .insert(sitePlans)
          .values({
            projectId: project.id,
            name: "Master Site Layout",
            description: "Primary operational site map for STS 9.9 MW Biomass Power Plant.",
            isDefault: !maps.some((row) => row.isDefault),
            isActive: true,
          })
          .returning();
      if (!map) throw new Error("STS Site Map could not be resolved");
      details.push(`[${mapCreated ? "create" : "reuse"}] Site Map ${map.name}`);
      const viewIds: string[] = [];
      for (const { body, ...initial } of images) {
        const created = await tx
          .insert(siteMapViews)
          .values({ ...initial, sitePlanId: map.id, isActive: true })
          .onConflictDoNothing({ target: [siteMapViews.sitePlanId, siteMapViews.key] })
          .returning();
        const [view] = await tx
          .select()
          .from(siteMapViews)
          .where(and(eq(siteMapViews.sitePlanId, map.id), eq(siteMapViews.key, initial.key)))
          .for("update");
        if (!view) throw new Error(`View ${initial.key} could not be resolved`);
        viewIds.push(view.id);
        details.push(`[${created.length ? "create" : "reuse"}] View ${view.name} (${initial.key})`);
        if (!view.imageObjectKey && (created.length || view.legacyAssetUrl === initial.legacyAssetUrl)) {
          const key = `projects/${project.id}/maps/${map.id}/views/${view.id}/${crypto.randomUUID()}.png`;
          uploadedKeys.push(key);
          await storage.upload({ key, body, contentType: "image/png" });
          await tx
            .update(siteMapViews)
            .set({
              imageObjectKey: key,
              legacyAssetUrl: null,
              width: initial.width,
              height: initial.height,
              updatedAt: new Date(),
            })
            .where(eq(siteMapViews.id, view.id));
          details.push(`[upload] Image ${initial.key} -> MinIO`);
        } else {
          details.push(`[reuse] Image ${initial.key} (existing or user-managed source)`);
        }
      }
      let createdFacilities = 0;
      const facilityIds: string[] = [];
      for (const [index, [key, name]] of initialFacilities.entries()) {
        const created = await tx
          .insert(facilities)
          .values({ projectId: project.id, key, name, sortOrder: index + 1, isActive: true, legacyZoneId: null })
          .onConflictDoNothing({ target: [facilities.projectId, facilities.key] })
          .returning();
        const [facility] = await tx
          .select()
          .from(facilities)
          .where(and(eq(facilities.projectId, project.id), eq(facilities.key, key)));
        if (!facility) throw new Error(`Facility ${key} could not be resolved`);
        facilityIds.push(facility.id);
        createdFacilities += created.length;
        details.push(`[${created.length ? "create" : "reuse"}] Facility ${key}`);
      }
      // No approved native coordinate dataset: preserve saved positions, never revive legacy guesses.
      const saved = await tx
        .select()
        .from(facilityMapMarkers)
        .where(
          sql`${facilityMapMarkers.facilityId} IN ${facilityIds} AND ${facilityMapMarkers.siteMapViewId} IN ${viewIds}`,
        );
      const managers = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.canManageSiteConfiguration, true), eq(users.status, "active")));
      return {
        project,
        map,
        images,
        details,
        createdFacilities,
        reusedFacilities: 15 - createdFacilities,
        existingMarkers: saved.length,
        unconfiguredMarkers: 30 - saved.length,
        hasConfigurationManager: managers.length > 0,
        uploadedImages: uploadedKeys.length,
      };
    });
  } catch (error) {
    // PostgreSQL and object storage cannot share a transaction. Never delete a committed/uncertain reference.
    for (const key of uploadedKeys) {
      const references = await db
        .select({ id: siteMapViews.id })
        .from(siteMapViews)
        .where(eq(siteMapViews.imageObjectKey, key))
        .catch(() => null);
      if (references?.length === 0)
        await storage.remove(key).catch(() => console.warn("Bootstrap image cleanup pending:", key));
    }
    throw error;
  }
}

if (import.meta.main) {
  try {
    const result = await bootstrapStsDefault(getDb());
    console.log(result.details.join("\n"));
    console.log(
      `\nSTS Default Project Bootstrap\nProject: ${result.project.name}\nSite Map: ${result.map.name}\nViews: Overview / Top View\nImages: ${result.uploadedImages} uploaded to MinIO\nFacilities: ${result.createdFacilities} created, ${result.reusedFacilities} reused\nMarkers: 0 created, ${result.existingMarkers} existing, ${result.unconfiguredMarkers} unconfigured Facility/View placements\nParts: 0 seeded\nActivities: 0 seeded\nContractors: 0 seeded\nZones: 0 created\nPermission grants: 0`,
    );
    if (!result.hasConfigurationManager) console.log("Site Configuration permission: pending explicit account grant.");
    process.exit(0);
  } catch (error) {
    console.error("STS bootstrap failed; transaction rolled back:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
