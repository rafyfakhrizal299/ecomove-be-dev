import { db } from "../../drizzle/db.js";
// import db from '../../lib/db.js';
import { drivers } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// CREATE
export async function createDriver(data) {
  const [driver] = await db.insert(drivers).values({
    id: randomUUID(),   // auto-generate ID di Node.js
    ...data,
  }).returning();
  return driver;
}
// READ ALL
export async function getAllDrivers() {
  return await db.select().from(drivers);
}

// READ BY ID
export async function getDriverById(id) {
  const rows = await db.select().from(drivers).where(eq(drivers.id, id));
  return rows[0] || null;
}

// UPDATE
export async function updateDriver(id, data) {
  const [updated] = await db.update(drivers).set(data).where(eq(drivers.id, id)).returning();
  return updated;
}

// DELETE
export async function deleteDriver(id) {
  const [deleted] = await db.delete(drivers).where(eq(drivers.id, id)).returning();
  return deleted;
}
