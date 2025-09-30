import { v4 as uuidv4 } from "uuid";
import { db } from "../../drizzle/db.js";
// import db from '../../lib/db.js';
import { transactions, deliveryRates, savedAddresses, transactionReceivers, drivers, userFcmTokens, users} from "../../drizzle/schema.js";
import { eq, and, lte, gte, isNull, or, sql, count, sum } from "drizzle-orm";

import { getFirebaseMessagingService } from '../utils/fcmIntegration.js'; 
//--------------------------------------------------------------------------------------------------------------------
// 🔹 Summary
export async function getTransactionSummary() {
  const [summary] = await db
    .select({
      totalDelivery: count().as("totalDelivery"),
      totalUser: sql`COUNT(DISTINCT ${transactions.userId})`.as("totalUser"),
      totalRevenue: sum(transactions.totalFee).mapWith(Number).as("totalRevenue"),
    })
    .from(transactions)
    .where(eq(transactions.status, "Delivered"));

  return {
    totalDelivery: Number(summary?.totalDelivery ?? 0),
    totalUser: Number(summary?.totalUser ?? 0),
    totalRevenue: Number(summary?.totalRevenue ?? 0),
  };
}

// 🔹 Yearly Chart
export async function getYearlyChart() {
  const result = await db
    .select({
      year: sql`EXTRACT(YEAR FROM ${transactions.createdAt})`.as("year"),
      delivery: count().as("delivery"),
      revenue: sum(transactions.totalFee).mapWith(Number).as("revenue"),
    })
    .from(transactions)
    .where(eq(transactions.status, "Delivered"))
    .groupBy(sql`year`)
    .orderBy(sql`year`);

  return result.map(r => ({
    name: String(r.year),
    delivery: Number(r.delivery),
    revenue: Number(r.revenue),
  }));
}

// 🔹 Monthly Chart
export async function getMonthlyChart() {
  const result = await db
    .select({
      month: sql`TO_CHAR(${transactions.createdAt}, 'Mon')`.as("month"),
      delivery: count().as("delivery"),
      revenue: sum(transactions.totalFee).mapWith(Number).as("revenue"),
      monthOrder: sql`EXTRACT(MONTH FROM ${transactions.createdAt})`.as("monthOrder"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "Delivered"),
        sql`EXTRACT(YEAR FROM ${transactions.createdAt}) = EXTRACT(YEAR FROM CURRENT_DATE)`
      )
    )
    .groupBy(
      sql`TO_CHAR(${transactions.createdAt}, 'Mon')`,
      sql`EXTRACT(MONTH FROM ${transactions.createdAt})`
    )
    .orderBy(sql`EXTRACT(MONTH FROM ${transactions.createdAt})`);

  return result.map(r => ({
    name: r.month,
    delivery: Number(r.delivery),
    revenue: Number(r.revenue),
  }));
}


// 🔹 Weekly Chart
export async function getWeeklyChart() {
  const result = await db
    .select({
      day: sql`TO_CHAR(${transactions.createdAt}, 'Dy')`.as("day"),
      delivery: count().as("delivery"),
      revenue: sum(transactions.totalFee).mapWith(Number).as("revenue"),
      dow: sql`EXTRACT(DOW FROM ${transactions.createdAt})`.as("dow"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "Delivered"),
        sql`${transactions.createdAt} >= NOW() - INTERVAL '7 days'`
      )
    )
    .groupBy(sql`TO_CHAR(${transactions.createdAt}, 'Dy')`, sql`EXTRACT(DOW FROM ${transactions.createdAt})`)
    .orderBy(sql`EXTRACT(DOW FROM ${transactions.createdAt})`);

  return result.map(r => ({
    name: r.day,
    delivery: Number(r.delivery),
    revenue: Number(r.revenue),
  }));
}


// 🔹 Dashboard data
export async function getDashboardData() {
  const [summary, yearly, monthly, weekly] = await Promise.all([
    getTransactionSummary(),
    getYearlyChart(),
    getMonthlyChart(),
    getWeeklyChart(),
  ]);

  return {
    transactionSummary: summary,
    charts: {
      yearly,
      monthly,
      weekly,
    },
  };
}
// --------------------------------------------------------------------------------------------------------------------

export async function getRate(deliveryType, packageSize, distance) {
  const rows = await db
    .select()
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

function normalizePinnedLocation(val) {
  if (!val) return null;
  if (typeof val === "object" && "x" in val && "y" in val) {
    return `${val.x},${val.y}`;
  }
  return String(val);
}

export async function createTransaction(data) {
  try {
    let senderAddressId = data.senderAddressId || null;
    let senderData = {};

    // === SENDER ===
    if (data.savedAddressSender) {
      const [savedSender] = await db
        .select()
        .from(savedAddresses)
        .where(eq(savedAddresses.id, senderAddressId));

      if (!savedSender) throw new Error("Sender address not found");

      senderData = {
        address: savedSender.address,
        unitStreet: savedSender.unitStreet,
        pinnedLocation: normalizePinnedLocation(savedSender.pinnedLocation),
        contactName: savedSender.contactName,
        contactNumber: savedSender.contactNumber,
        contactEmail: savedSender.contactEmail,
      };
    } else {
      senderData = {
        address: data.address,
        unitStreet: data.unitStreet,
        pinnedLocation: normalizePinnedLocation(data.pinnedLocation),
        contactName: data.contactName,
        contactNumber: data.contactNumber,
        contactEmail: data.contactEmail,
      };

      if (data.addAddress) {
        const [newSenderAddr] = await db
          .insert(savedAddresses)
          .values({
            userId: data.userId,
            label: data.label || "Sender Address",
            ...senderData,
            type: "sender",
          })
          .returning();

        senderAddressId = newSenderAddr.id;
      }
    }

    const pickupTime = new Date(data.pickupTime);

    // === TRANSACTION ===
    const [trx] = await db
      .insert(transactions)
      .values({
        userId: data.userId,
        senderAddressId,
        ...senderData,
        pickupTime,
        deliveryNotes: data.deliveryNotes || null,
        orderid: null,
        paymentStatus: "pending",
        modeOfPayment: data.modeOfPayment || "fiuuu",
        addAddress: data.addAddress ?? false,
      })
      .returning();

    // === RECEIVERS ===
    let totalFee = 0;
    let totalDistance = 0;

    if (Array.isArray(data.receivers)) {
      for (const rc of data.receivers) {
        let receiverAddressId = rc.receiverAddressId || null;
        let receiverData = {};

        if (rc.savedAddress) {
          const [savedReceiver] = await db
            .select()
            .from(savedAddresses)
            .where(eq(savedAddresses.id, receiverAddressId));

          if (!savedReceiver) throw new Error("Receiver address not found");

          receiverData = {
            address: savedReceiver.address,
            unitStreet: savedReceiver.unitStreet,
            pinnedLocation: normalizePinnedLocation(savedReceiver.pinnedLocation),
            contactName: savedReceiver.contactName,
            contactNumber: savedReceiver.contactNumber,
            contactEmail: savedReceiver.contactEmail,
            label: savedReceiver.label,
          };
        } else {
          receiverData = {
            address: rc.address,
            unitStreet: rc.unitStreet,
            pinnedLocation: normalizePinnedLocation(rc.pinnedLocation),
            contactName: rc.contactName,
            contactNumber: rc.contactNumber,
            contactEmail: rc.contactEmail,
            label: rc.label,
          };

          if (rc.addAddress) {
            const [newReceiverAddr] = await db
              .insert(savedAddresses)
              .values({
                userId: data.userId,
                label: rc.label || "Receiver Address",
                ...receiverData,
                type: "receiver",
              })
              .returning();

            receiverAddressId = newReceiverAddr.id;
          }
        }

        const rate = await getRate(rc.deliveryType, rc.packageSize, rc.distance);
        const fee = rate ? rate.price : 0;

        totalFee += fee;
        totalDistance += rc.distance;

        await db.insert(transactionReceivers).values({
          transactionId: trx.id,
          receiverAddressId,
          ...receiverData,
          deliveryType: rc.deliveryType,
          packageSize: rc.packageSize,
          itemType: rc.itemType,
          bringPouch: rc.bringPouch ?? false,
          packageType: rc.packageType || "standard",
          cod: rc.cod || false,
          itemProtection: rc.itemProtection ?? false,
          deliveryNotes: rc.deliveryNotes || null,
          distance: rc.distance,
          fee,
          weight: rc.weight || null,
          addAddress: rc.addAddress ?? false,
        });
      }
    }

    // === UPDATE TOTAL ===
    const [updatedTrx] = await db
      .update(transactions)
      .set({ totalFee, totalDistance })
      .where(eq(transactions.id, trx.id))
      .returning();

    return updatedTrx;
  } catch (err) {
    console.error("🔥 SQL ERROR:", err);
    throw err;
  }
}

export async function getAllTransactions() {
  // return await db.select().from(transactions);
  const rows = await db
    .select({
      transaction: transactions,
      driver: drivers,
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id));

  return rows.map((row) => ({
    ...row.transaction,
    driver: row.driver || null,
  }));
}

export async function getTransactionById(id) {
  // const [trx] = await db.select().from(transactions).where(eq(transactions.id, id));
  const [trx] = await db
    .select({
      transaction: transactions,
      driver: drivers,
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id))
    .where(eq(transactions.id, id));

  if (!trx) return null;

  const receivers = await db
    .select()
    .from(transactionReceivers)
    .where(eq(transactionReceivers.transactionId, id));

  // return { ...trx, receivers };
  return {
    ...trx.transaction,
    driver: trx.driver || null,
    receivers,
  };
}

export async function updateTransaction(id, data) {
  const trx = await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({
        paymentStatus: data.paymentStatus,
        driverId: data.driverId,
        deliveryNotes: data.deliveryNotes,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    const updatedTrx = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))

    if (!updatedTrx) return null;

    let totalFee = 0;
    let totalDistance = 0;

    if (data.receivers && data.receivers.length) {
      await tx.delete(transactionReceivers).where(eq(transactionReceivers.transactionId, id));

      for (const receiver of data.receivers) {
        const rate = await getRate(receiver.deliveryType, receiver.packageSize, receiver.distance);
        const fee = rate ? rate.price : 0;

        totalFee += fee;
        totalDistance += receiver.distance;

        await tx.insert(transactionReceivers).values({
          transactionId: id,
          receiverAddressId: receiver.receiverAddressId || null,
          address: receiver.address,
          unitStreet: receiver.unitStreet,
          pinnedLocation: receiver.pinnedLocation ? String(receiver.pinnedLocation) : null,
          contactName: receiver.contactName,
          contactNumber: receiver.contactNumber,
          contactEmail: receiver.contactEmail,
          label: receiver.label,
          deliveryType: receiver.deliveryType,
          packageSize: receiver.packageSize,
          itemType: receiver.itemType,
          bringPouch: receiver.bringPouch || false,
          packageType: receiver.packageType || "standard",
          cod: receiver.cod || false,
          itemProtection: receiver.itemProtection || false,
          deliveryNotes: receiver.deliveryNotes || null,
          insurance: receiver.insurance === true,
          insuranceDetails: receiver.insuranceDetails,
          distance: receiver.distance,
          fee,
        });
      }

      await tx
        .update(transactions)
        .set({ totalFee, totalDistance })
        .where(eq(transactions.id, id));
    }

    return updatedTrx;
  });
  let notif = null
 const transactionObject = trx && trx.length > 0 ? trx[0] : null;

    // --- 3. Logika Push Notification FCM ---
    if (transactionObject) {
      // Ambil semua token FCM untuk user ini
      const tokens = await db.select()
          .from(userFcmTokens)
          .where(eq(userFcmTokens.userId, transactionObject.userId));

      // 🚨 Filter dan Validasi Token (Solusi error: Exactly one of topic, token or condition is required)
      const registrationTokens = tokens
          .map((t) => t.token)
          .filter(token => token && token.length > 0); 

      notif = tokens;

      if (registrationTokens.length > 0) {
          const payload = {
              notification: {
                  title: "📦 Transaction Update",
                  body: `Your order #${transactionObject.id} is now ${transactionObject.status}`,
              },
              data: {
                  // FCM data payload harus berupa string
                  transactionId: String(transactionObject.id), 
                  status: transactionObject.status,
              },
          };

          try {
              const messaging = getFirebaseMessagingService(); 

              // Panggil sendMulticast dengan struktur yang benar
              const response = await messaging.sendEachForMulticast({
                  tokens: registrationTokens, 
                  notification: payload.notification,
                  data: payload.data,
              });

              console.log(`✅ Push notification sent successfully to ${response.successCount} devices.`);
              console.log('FCM Multicast Response:', response);

          } catch (err) {
              console.error("❌ Failed to send push notification:", err);
          }
      } else {
            console.log(`⚠️ Skipping notification: No valid FCM tokens found for user ${transactionObject.userId}.`);
      }
    }

  return {
    transaction: trx,
    notif: notif,
  };
}

export async function deleteTransaction(id) {
  const [deleted] = await db.delete(transactions).where(eq(transactions.id, id)).returning();
  return deleted;
}

export async function getTransactions({ page = 1, limit = 10, filters = {} }) {
  const conditions = [];
  page = Number(page);
  limit = Number(limit);

  if (filters.paymentStatus) conditions.push(eq(transactions.paymentStatus, filters.paymentStatus));
  if (filters.userId) conditions.push(eq(transactions.userId, filters.userId));

  let whereCondition = undefined;
  if (conditions.length === 1) whereCondition = conditions[0];
  else if (conditions.length > 1) whereCondition = and(...conditions);
  // ------------- HISTORY TRANSACTION BY USER -------------
  if (page === 0 && limit === 0) {
    const totalQuery = db
      .select({ count: sql`count(*)` })
      .from(transactions)
      .where(whereCondition);

    const dataQuery = db
      .select({
        transaction: transactions,
        driver: drivers,
        user: users
      })
      .from(transactions)
      .leftJoin(drivers, eq(transactions.driverId, drivers.id))
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(whereCondition);

    const [{ count }] = await totalQuery;
    const rows = await dataQuery;

    return {
      data: rows.map(r => ({
        ...r.transaction,
        driver: r.driver,
        user: r.user,
      })),
      pagination: {
        page: 1,
        limit: Number(count),
        total: Number(count),
        totalPages: 1,
      },
    };
  }
  // ------------- DEFAULT CONDITION -------------
  const offset = (page - 1) * limit;
  const totalQuery = db
    .select({ count: sql`count(*)` })
    .from(transactions)
    .where(whereCondition);

  const dataQuery = db
    .select({
      transaction: transactions,
      driver: drivers, // 👈 ambil data driver juga
      user: users
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id))
    .leftJoin(users, eq(transactions.userId, users.id))
    .where(whereCondition)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await totalQuery;
  const rows = await dataQuery;

  return {
    data: rows.map(r => ({
      ...r.transaction,
      driver: r.driver, // 👈 embed detail driver
      user: r.user
    })),
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}