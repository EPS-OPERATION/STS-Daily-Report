import { and, asc, count, eq, max } from "drizzle-orm";
import type { CoordinationItemType } from "@sts/shared";
import type { Db, QueryDb } from "@/db/client.js";
import { coordinationItemTypes, coordinationItems } from "@/db/schema/index.js";

const columns = {
  id: coordinationItemTypes.id,
  code: coordinationItemTypes.code,
  label: coordinationItemTypes.label,
  labelTh: coordinationItemTypes.labelTh,
  iconKey: coordinationItemTypes.iconKey,
  sortOrder: coordinationItemTypes.sortOrder,
  isActive: coordinationItemTypes.isActive,
  isSystem: coordinationItemTypes.isSystem,
};

export async function listItemTypes(db: QueryDb, projectId: string, includeInactive = false): Promise<CoordinationItemType[]> {
  return db
    .select(columns)
    .from(coordinationItemTypes)
    .where(and(eq(coordinationItemTypes.projectId, projectId), includeInactive ? undefined : eq(coordinationItemTypes.isActive, true)))
    .orderBy(asc(coordinationItemTypes.sortOrder), asc(coordinationItemTypes.code));
}

export async function findItemTypeByCode(db: QueryDb, projectId: string, code: string): Promise<CoordinationItemType | null> {
  const [row] = await db
    .select(columns)
    .from(coordinationItemTypes)
    .where(and(eq(coordinationItemTypes.projectId, projectId), eq(coordinationItemTypes.code, code)))
    .limit(1);
  return row ?? null;
}

export async function findItemTypeById(db: QueryDb, projectId: string, id: string): Promise<CoordinationItemType | null> {
  const [row] = await db
    .select(columns)
    .from(coordinationItemTypes)
    .where(and(eq(coordinationItemTypes.projectId, projectId), eq(coordinationItemTypes.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertItemType(db: QueryDb, values: {
  projectId: string;
  code: string;
  label: string;
  labelTh: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<CoordinationItemType> {
  const [row] = await db.insert(coordinationItemTypes).values({ ...values, isSystem: false }).returning(columns);
  return row!;
}

export async function updateItemType(db: QueryDb, projectId: string, id: string, values: Partial<{
  label: string;
  labelTh: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
}>): Promise<CoordinationItemType | null> {
  const [row] = await db
    .update(coordinationItemTypes)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(coordinationItemTypes.projectId, projectId), eq(coordinationItemTypes.id, id)))
    .returning(columns);
  return row ?? null;
}

export async function deleteItemType(db: QueryDb, projectId: string, id: string): Promise<void> {
  await db.delete(coordinationItemTypes).where(and(eq(coordinationItemTypes.projectId, projectId), eq(coordinationItemTypes.id, id)));
}

/** Appending a new type: one step after the current last row. */
export async function nextItemTypeSortOrder(db: QueryDb, projectId: string): Promise<number> {
  const [row] = await db
    .select({ value: max(coordinationItemTypes.sortOrder) })
    .from(coordinationItemTypes)
    .where(eq(coordinationItemTypes.projectId, projectId));
  return Number(row?.value ?? 0) + 10;
}

/** Drag-to-reorder: rewrite every row's sortOrder from the id order in one transaction. */
export async function reorderItemTypes(db: Db, projectId: string, ids: string[]): Promise<CoordinationItemType[]> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx
        .update(coordinationItemTypes)
        .set({ sortOrder: (i + 1) * 10, updatedAt: new Date() })
        .where(and(eq(coordinationItemTypes.projectId, projectId), eq(coordinationItemTypes.id, ids[i]!)));
    }
  });
  return listItemTypes(db, projectId, true);
}

/** How many jobs use the code; used to refuse deleting a type that is still on the map. */
export async function countItemsOfType(db: QueryDb, projectId: string, code: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(coordinationItems)
    .where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.icon, code)));
  return Number(row?.total ?? 0);
}
