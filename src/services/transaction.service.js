import { db } from "../../drizzle/db.js";
import { transactions, deliveryRates } from "../../drizzle/schema.js";
import { eq, and, lte, gte, isNull, or, sql } from "drizzle-orm";

export async function getRate(deliveryType, packageSize, distance) {
  const rows = await db.select()
    .from(deliveryRates)
    .where(
      and(
        eq(deliveryRates.deliveryType, deliveryType),
        eq(deliveryRates.packageSize, packageSize),
        lte(deliveryRates.minDistance, distance),
        or(
          gte(deliveryRates.maxDistance, distance),
          isNull(deliveryRates.maxDistance)
        )
      )
    );

  return rows[0] || null;
}

export async function createTransaction(data) {
  try {
    const [trx] = await db.insert(transactions)
      .values({
        userId: data.userId,
        senderAddressId: data.senderAddressId || null,
        address: data.address,
        unitStreet: data.unitStreet,
        pinnedLocation: data.pinnedLocation,
        contactName: data.contactName,
        contactNumber: data.contactNumber,
        contactEmail: data.contactEmail,
        pickupDate: data.pickupDate,
        deliveryType: data.deliveryType,
        packageSize: data.packageSize,
        distance: data.distance,
        fee: 150,
        bringPouch: data.bringPouch === true,
        packageType: data.packageType,
        cod: data.cod === true,
        itemProtection: data.itemProtection === true,
        deliveryNotes: data.deliveryNotes || null,
      })
      .returning();
    return trx;
  } catch (err) {
    console.error("🔥 SQL ERROR:", err);  // ✅ cetak detail error
    throw err;
  }
}


export async function getAllTransactions() {
  return await db.select().from(transactions);
}

export async function getTransactionById(id) {
  const rows = await db.select().from(transactions).where(eq(transactions.id, id));
  return rows[0] || null;
}

export async function updateTransaction(id, data) {
  const [updated] = await db.update(transactions)
    .set(data)
    .where(eq(transactions.id, id))
    .returning();
  return updated;
}

export async function deleteTransaction(id) {
  const [deleted] = await db.delete(transactions)
    .where(eq(transactions.id, id))
    .returning();
  return deleted;
}

export async function getTransactions({ page = 1, limit = 10, filters = {} }) {
  const offset = (page - 1) * limit;

  const conditions = [];
  if (filters.paymentStatus) {
    conditions.push(eq(transactions.paymentStatus, filters.paymentStatus));
  }
  if (filters.deliveryType) {
    conditions.push(eq(transactions.deliveryType, filters.deliveryType));
  }
  if (filters.userId) {
    conditions.push(eq(transactions.userId, filters.userId));
  }

  // ✅ kondisi WHERE
  let whereCondition = undefined;
  if (conditions.length === 1) {
    whereCondition = conditions[0];
  } else if (conditions.length > 1) {
    whereCondition = and(...conditions);
  }

  console.log("Where Condition:", whereCondition);

  // ✅ total count
  const totalQuery = db
    .select({ count: sql`count(*)` })
    .from(transactions)
    .where(whereCondition);

  // ✅ data query
  const dataQuery = db
    .select()
    .from(transactions)
    .where(whereCondition)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await totalQuery;
  const rows = await dataQuery;

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}