import { v4 as uuidv4 } from "uuid";
import { db } from "../../drizzle/db.js";
import { transactions, deliveryRates, savedAddresses, transactionReceivers } from "../../drizzle/schema.js";
import { eq, and, lte, gte, isNull, or, sql } from "drizzle-orm";

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

export async function createTransaction(data) {
  try {
    let senderAddressId = data.senderAddressId || null;
    let senderData = {};

    if (data.savedAddressSender) {
      // ✅ ambil dari saved_addresses
      const [savedSender] = await db
        .select()
        .from(savedAddresses)
        .where(eq(savedAddresses.id, senderAddressId));

      if (!savedSender) throw new Error("Sender address not found");
      senderData = savedSender;
    } else {
      // ✅ cek dulu apakah sender sudah ada di saved_addresses
      const [existingSender] = await db
        .select()
        .from(savedAddresses)
        .where(
          and(
            eq(savedAddresses.userId, data.userId),
            eq(savedAddresses.pinnedLocation, data.pinnedLocation),
            eq(savedAddresses.contactName, data.contactName),
            eq(savedAddresses.contactNumber, data.contactNumber),
            eq(savedAddresses.type, "sender")
          )
        );

      if (existingSender) {
        senderAddressId = existingSender.id;
        senderData = existingSender;
      } else {
        const [newSenderAddr] = await db
          .insert(savedAddresses)
          .values({
            userId: data.userId,
            label: data.label || "Sender Address",
            address: data.address,
            unitStreet: data.unitStreet,
            pinnedLocation: data.pinnedLocation,
            contactName: data.contactName,
            contactNumber: data.contactNumber,
            contactEmail: data.contactEmail,
            type: "sender",
          })
          .returning();

        senderAddressId = newSenderAddr.id;
        senderData = newSenderAddr;
      }
    }

    // generate tranID
    const tranID = uuidv4();

    // ✅ simpan transaksi dengan data sender
    const [trx] = await db
      .insert(transactions)
      .values({
        userId: data.userId,
        senderAddressId,
        address: senderData.address,
        unitStreet: senderData.unitStreet,
        pinnedLocation: senderData.pinnedLocation,
        contactName: senderData.contactName,
        contactNumber: senderData.contactNumber,
        contactEmail: senderData.contactEmail,
        orderid: null, // 🚫 jangan dari payload
        tranID,
        paymentStatus: "pending",
        modeOfPayment: data.modeOfPayment || "fiuuu",
      })
      .returning();

    // Receivers
    let totalFee = 0;
    let totalDistance = 0;

    if (data.receivers && Array.isArray(data.receivers)) {
      for (const rc of data.receivers) {
        let receiverAddressId = rc.receiverAddressId || null;
        let receiverData = {};

        if (rc.savedAddress) {
          // ✅ fetch receiver dari saved_addresses
          const [savedReceiver] = await db
            .select()
            .from(savedAddresses)
            .where(eq(savedAddresses.id, receiverAddressId));

          if (!savedReceiver) throw new Error("Receiver address not found");
          receiverData = savedReceiver;
        } else {
          // ✅ cek dulu apakah udah ada di saved_addresses
          const [existingAddr] = await db
            .select()
            .from(savedAddresses)
            .where(
              and(
                eq(savedAddresses.userId, data.userId),
                eq(savedAddresses.pinnedLocation, rc.pinnedLocation),
                eq(savedAddresses.contactName, rc.contactName),
                eq(savedAddresses.contactNumber, rc.contactNumber),
                eq(savedAddresses.type, "receiver")
              )
            );

          if (existingAddr) {
            receiverAddressId = existingAddr.id;
            receiverData = existingAddr;
          } else {
            const [newReceiverAddr] = await db
              .insert(savedAddresses)
              .values({
                userId: data.userId,
                label: rc.label || "Receiver Address",
                address: rc.address,
                unitStreet: rc.unitStreet,
                pinnedLocation: rc.pinnedLocation,
                contactName: rc.contactName,
                contactNumber: rc.contactNumber,
                contactEmail: rc.contactEmail,
                type: "receiver",
              })
              .returning();

            receiverAddressId = newReceiverAddr.id;
            receiverData = newReceiverAddr;
          }
        }

        // ✅ hitung rate
        const rate = await getRate(rc.deliveryType, rc.packageSize, rc.distance);
        const fee = rate ? rate.price : 0;

        totalFee += fee;
        totalDistance += rc.distance;

        // ✅ simpan receiver transaction
        await db.insert(transactionReceivers).values({
          transactionId: trx.id,
          receiverAddressId,
          address: receiverData.address,
          unitStreet: receiverData.unitStreet,
          pinnedLocation: receiverData.pinnedLocation,
          contactName: receiverData.contactName,
          contactNumber: receiverData.contactNumber,
          contactEmail: receiverData.contactEmail,
          label: rc.label || receiverData.label,
          deliveryType: rc.deliveryType,
          packageSize: rc.packageSize,
          itemType: rc.itemType,
          packageType: rc.packageType || "standard",
          cod: rc.cod || false,
          itemProtection: rc.itemProtection || false,
          deliveryNotes: rc.deliveryNotes || null,
          distance: rc.distance,
          fee,
          insurance: rc.insurance === true,
          insuranceDetails: rc.insuranceDetails,
        });
      }
    }

    // update total fee & distance
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
  return await db.select().from(transactions);
}

export async function getTransactionById(id) {
  const [trx] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!trx) return null;

  const receivers = await db
    .select()
    .from(transactionReceivers)
    .where(eq(transactionReceivers.transactionId, id));

  return { ...trx, receivers };
}

export async function updateTransaction(id, data) {
  const trx = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(transactions)
      .set({
        paymentStatus: data.paymentStatus,
        driverId: data.driverId,
        modeOfPayment: data.modeOfPayment,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    if (!updated) return null;

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
          pinnedLocation: receiver.pinnedLocation,
          contactName: receiver.contactName,
          contactNumber: receiver.contactNumber,
          contactEmail: receiver.contactEmail,
          label: receiver.label,
          deliveryType: receiver.deliveryType,
          packageSize: receiver.packageSize, // ✅ fix
          itemType: receiver.itemType,
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

    return updated;
  });

  return trx;
}

export async function deleteTransaction(id) {
  const [deleted] = await db.delete(transactions).where(eq(transactions.id, id)).returning();
  return deleted;
}

export async function getTransactions({ page = 1, limit = 10, filters = {} }) {
  const offset = (page - 1) * limit;
  const conditions = [];

  if (filters.paymentStatus) conditions.push(eq(transactions.paymentStatus, filters.paymentStatus));
  if (filters.userId) conditions.push(eq(transactions.userId, filters.userId));

  let whereCondition = undefined;
  if (conditions.length === 1) whereCondition = conditions[0];
  else if (conditions.length > 1) whereCondition = and(...conditions);

  const totalQuery = db
    .select({ count: sql`count(*)` })
    .from(transactions)
    .where(whereCondition);

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
