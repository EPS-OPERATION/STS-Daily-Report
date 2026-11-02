import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { safetyBaselineVersions, safetyStatVersions, users } from "@/db/schema/index.js";

export interface NewSafetyStatVersion {
  entryId: string;
  action: "create" | "edit";
  snapshot: unknown;
  contentHash: string;
  confirmedName: string | null;
  userId: string;
  ip: string | null;
  userAgent: string | null;
}

// Next version number in the same statement; the (entry_id, version) unique key guards a race.
export async function insertSafetyStatVersion(db: Db, v: NewSafetyStatVersion) {
  const rows = await db
    .insert(safetyStatVersions)
    .values({
      ...v,
      version: sql<number>`(select coalesce(max(${safetyStatVersions.version}), 0) + 1 from ${safetyStatVersions} where ${safetyStatVersions.entryId} = ${v.entryId})`,
    })
    .returning({ version: safetyStatVersions.version, contentHash: safetyStatVersions.contentHash });
  return rows[0]!;
}

// History list without the (large) snapshots.
export async function listSafetyStatVersions(db: Db, entryId: string) {
  return db
    .select({
      version: safetyStatVersions.version,
      action: safetyStatVersions.action,
      contentHash: safetyStatVersions.contentHash,
      confirmedName: safetyStatVersions.confirmedName,
      account: sql<string | null>`coalesce(${users.username}, ${users.email})`,
      accountName: users.displayName,
      ip: safetyStatVersions.ip,
      userAgent: safetyStatVersions.userAgent,
      createdAt: safetyStatVersions.createdAt,
    })
    .from(safetyStatVersions)
    .leftJoin(users, eq(users.id, safetyStatVersions.userId))
    .where(eq(safetyStatVersions.entryId, entryId))
    .orderBy(asc(safetyStatVersions.version));
}

// ---- baseline history (one running list per project) ----
export interface NewBaselineVersion {
  projectId: string;
  snapshot: unknown;
  contentHash: string;
  confirmedName: string | null;
  userId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function insertSafetyBaselineVersion(db: Db, v: NewBaselineVersion) {
  const rows = await db
    .insert(safetyBaselineVersions)
    .values({
      ...v,
      version: sql<number>`(select coalesce(max(${safetyBaselineVersions.version}), 0) + 1 from ${safetyBaselineVersions} where ${safetyBaselineVersions.projectId} = ${v.projectId})`,
    })
    .returning({ version: safetyBaselineVersions.version, contentHash: safetyBaselineVersions.contentHash });
  return rows[0]!;
}

export async function listSafetyBaselineVersions(db: Db, projectId: string) {
  return db
    .select({
      version: safetyBaselineVersions.version,
      snapshot: safetyBaselineVersions.snapshot,
      contentHash: safetyBaselineVersions.contentHash,
      confirmedName: safetyBaselineVersions.confirmedName,
      account: sql<string | null>`coalesce(${users.username}, ${users.email})`,
      accountName: users.displayName,
      ip: safetyBaselineVersions.ip,
      userAgent: safetyBaselineVersions.userAgent,
      createdAt: safetyBaselineVersions.createdAt,
    })
    .from(safetyBaselineVersions)
    .leftJoin(users, eq(users.id, safetyBaselineVersions.userId))
    .where(eq(safetyBaselineVersions.projectId, projectId))
    .orderBy(asc(safetyBaselineVersions.version));
}
