import { v4 as uuidv4 } from "uuid";
import { db } from "../../drizzle/db.js";
// import db from '../../lib/db.js';
import { transactions, deliveryRates, savedAddresses, transactionReceivers, drivers, userFcmTokens, users, services} from "../../drizzle/schema.js";
import { eq, and, lte, gte, isNull, or, sql, count, sum, inArray, ne } from "drizzle-orm";

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

// export async function getRate(deliveryType, eVehicle, distance) {
//   const rows = await db
//     .select()
//     .from(deliveryRates)
//     .where(
//       and(
//         eq(deliveryRates.deliveryType, deliveryType),
//         eq(deliveryRates.eVehicle, eVehicle),
//         lte(deliveryRates.minDistance, distance),
//         or(
//           gte(deliveryRates.maxDistance, distance),
//           isNull(deliveryRates.maxDistance)
//         )
//       )
//     )

//   return rows[0] || null
// }
function getPhilippinesNow() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila'
    })
  )
}
// function validateDeliveryTypeAvailability({
//   deliveryType,
//   pickupDateTime,
//   isHoliday,
//   isMakatiOrTaguig
// }) {
//   const hour = pickupDateTime.getHours()
//   const day = pickupDateTime.getDay()

//   const isWeekday = day >= 1 && day <= 5
//   const isWithinTime = hour >= 10 && hour < 18

//   const instantAvailable =
//     isWeekday &&
//     isWithinTime &&
//     !isHoliday &&
//     isMakatiOrTaguig

//   if (
//     (deliveryType === 'right-now' ||
//      deliveryType === 'anytime-today') &&
//     !instantAvailable
//   ) {
//     throw new Error('Instant pickup not available')
//   }
// }

export async function getRate(deliveryType, eVehicle, distance, insurance = false) {
  if (!distance || distance <= 0) {
    return { price: 0 }
  }

  const km = Math.ceil(distance / 1000)

  const applyInsurance = (price) => {
    if (!insurance) return price
    return price * 1.02
  }

  const isInstant =
    deliveryType === 'right-now' ||
    deliveryType === 'anytime-today'

  if (eVehicle === 'bike') {
    if (isInstant) {
      const baseKm = 3
      const basePrice = 50
      const extraPerKm = 12

      const price =
        km <= baseKm
          ? basePrice
          : basePrice + (km - baseKm) * extraPerKm

      return { price: applyInsurance(price) }
    }

    const baseKm = 3
    const basePrice = 40
    const extraPerKm = 10

    const price =
      km <= baseKm
        ? basePrice
        : basePrice + (km - baseKm) * extraPerKm

    return { price: applyInsurance(price) }
  }

  if (eVehicle === 'ebike') {
    if (isInstant) {
      const baseKm = 3
      const basePrice = 65
      const extraPerKm = 15

      const price =
        km <= baseKm
          ? basePrice
          : basePrice + (km - baseKm) * extraPerKm

      return { price: applyInsurance(price) }
    }

    const baseKm = 3
    const basePrice = 55
    const extraPerKm = 13

    const price =
      km <= baseKm
        ? basePrice
        : basePrice + (km - baseKm) * extraPerKm

    return { price: applyInsurance(price) }
  }

  if (eVehicle === 'ecar') {
    const price = isInstant ? km * 75 : km * 65
    return { price: applyInsurance(price) }
  }

  throw new Error('Invalid eVehicle or deliveryType')
}


function normalizePinnedLocation(val) {
  if (!val) return null;
  if (typeof val === "object" && "x" in val && "y" in val) {
    return `${val.x},${val.y}`;
  }
  return String(val);
}
async function generateTransactionId() {
  const result = await db.execute(sql`
    SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)) AS max_id
    FROM transactions
    WHERE id LIKE 'eco%'
  `)

  const lastId = result.rows[0]?.max_id || 0
  return `eco${lastId + 1}`
}
export async function createTransaction(data) {
  try {
    let senderAddressId = data.senderAddressId || null
    let senderData = {}

    // === SENDER ===
    if (data.savedAddressSender) {
      const [savedSender] = await db
        .select()
        .from(savedAddresses)
        .where(eq(savedAddresses.id, senderAddressId))

      if (!savedSender) throw new Error('Sender address not found')

      senderData = {
        address: savedSender.address,
        unitStreet: savedSender.unitStreet,
        pinnedLocation: normalizePinnedLocation(savedSender.pinnedLocation),
        contactName: savedSender.contactName,
        contactNumber: savedSender.contactNumber,
        contactEmail: savedSender.contactEmail,
      }
    } else {
      senderData = {
        address: data.address,
        unitStreet: data.unitStreet,
        pinnedLocation: normalizePinnedLocation(data.pinnedLocation),
        contactName: data.contactName,
        contactNumber: data.contactNumber,
        contactEmail: data.contactEmail,
      }

      if (data.addAddress) {
        const [newSenderAddr] = await db
          .insert(savedAddresses)
          .values({
            userId: data.userId,
            label: data.label || 'Sender Address',
            ...senderData,
            type: 'sender',
          })
          .returning()

        senderAddressId = newSenderAddr.id
      }
    }

    // === PICKUP ===
    const pickupType = data.pickupType || 'now'
    const pickupDate =
      pickupType === 'now'
        ? getPhilippinesNow().toISOString().split('T')[0] // YYYY-MM-DD
        : data.pickupDate

    const pickupTime = pickupType === 'now' ? 'now' : data.pickupTime

    const transactionId = await generateTransactionId()
    const [trx] = await db
      .insert(transactions)
      .values({
        id: transactionId,
        userId: data.userId,
        senderAddressId,
        ...senderData,
        pickupType,
        pickupDate,
        pickupTime,
        deliveryNotes: data.deliveryNotes || null,
        orderid: null,
        paymentStatus: 'pending',
        modeOfPayment: [...new Set(data.receivers.map(r => r.methodofpayment))].join(', ') || '-',
        addAddress: data.addAddress ?? false,
      })
      .returning()

    let totalFee = 0
    let totalDistance = 0

    if (Array.isArray(data.receivers)) {
      for (const rc of data.receivers) {
        let receiverAddressId = rc.receiverAddressId || null
        let receiverData = {}

        if (rc.savedAddress) {
          const [savedReceiver] = await db
            .select()
            .from(savedAddresses)
            .where(eq(savedAddresses.id, receiverAddressId))

          if (!savedReceiver) throw new Error('Receiver address not found')

          receiverData = {
            address: savedReceiver.address,
            unitStreet: savedReceiver.unitStreet,
            pinnedLocation: normalizePinnedLocation(savedReceiver.pinnedLocation),
            contactName: savedReceiver.contactName,
            contactNumber: savedReceiver.contactNumber,
            contactEmail: savedReceiver.contactEmail,
            label: savedReceiver.label,
          }
        } else {
          receiverData = {
            address: rc.address,
            unitStreet: rc.unitStreet || null,
            pinnedLocation: rc.pinnedLocation ? normalizePinnedLocation(rc.pinnedLocation) : null, // Handle missing pinnedLocation
            contactName: rc.contactName,
            contactNumber: rc.contactNumber,
            contactEmail: rc.contactEmail || null,
            label: rc.label || null,
          }

          if (rc.addAddress) {
            const [newReceiverAddr] = await db
              .insert(savedAddresses)
              .values({
                userId: data.userId,
                label: rc.label || 'Receiver Address',
                ...receiverData,
                type: 'receiver',
              })
              .returning()

            receiverAddressId = newReceiverAddr.id
          }
        }

        // const rate = await getRate(rc.deliveryType, rc.eVehicle, rc.distance, rc.itemProtection === true || rc.itemProtection === 'true')
        // const fee = rate ? Number(rate.price).toFixed(2) : '0.00'

        // totalFee += Number(fee)
        totalDistance += rc.distance

        const insertData = {
          transactionId: trx.id,
          savedAddress: rc.savedAddress === true,
          addAddress: rc.addAddress === true,
          ...(receiverAddressId !== null && receiverAddressId !== undefined && { receiverAddressId }),
          address: receiverData.address,
          unitStreet: receiverData.unitStreet,
          pinnedLocation: receiverData.pinnedLocation,
          contactName: receiverData.contactName,
          contactNumber: receiverData.contactNumber,
          contactEmail: receiverData.contactEmail,
          deliveryType: rc.deliveryType,
          eVehicle: rc.eVehicle,
          modeOfPayment: rc.modeOfPayment || 'cash-on-delivery',
          distance: rc.distance,
          fee: rc.fee,
          bringPouch: rc.bringPouch === true || rc.bringPouch === 'true',
          itemType: rc.itemType || null,
          packageType: rc.packageType || 'standard',
          cod: rc.cod === true || rc.cod === 'true',
          itemProtection: rc.itemProtection === true || rc.itemProtection === 'true',
          deliveryNotes: rc.deliveryNotes || null,
          weight: rc.weight || null,
          co: rc.co ? Number(rc.co) : null,
          eta: rc.eta ? Number(rc.eta) : null,
        }

        console.log('Insert data:', JSON.stringify(insertData, null, 2))
        console.log('pinnedLocation type:', typeof insertData.pinnedLocation)
        console.log('pinnedLocation value:', insertData.pinnedLocation)

        await db.insert(transactionReceivers).values(insertData)
      }
    }

    const [updatedTrx] = await db
      .update(transactions)
      .set({ totalFee, totalDistance })
      .where(eq(transactions.id, trx.id))
      .returning()

      //push notif
    try {
      const transactionObject = updatedTrx;

      if (transactionObject) {
        const tokens = await db
          .select()
          .from(userFcmTokens)
          .where(eq(userFcmTokens.userId, transactionObject.userId));

        const registrationTokens = tokens
          .map(t => t.token)
          .filter(token => token && token.length > 0);

        if (registrationTokens.length > 0) {
          const payload = {
            notification: {
              title: "Transaction Booked Success",
              body: `Your order #${transactionObject.id} has been successfully booked.`,
            },
            data: {
              transactionId: String(transactionObject.id),
              status: transactionObject.status || 'Booked',
            },
          };

          const messaging = getFirebaseMessagingService();

          const response = await messaging.sendEachForMulticast({
            tokens: registrationTokens,
            notification: payload.notification,
            data: payload.data,
          });

          console.log(
            `✅ Create Transaction notification sent to ${response.successCount} devices.`
          );
        } else {
          console.log(
            `⚠️ No FCM token found for user ${transactionObject.userId}`
          );
        }
      }
    } catch (err) {
      console.error("❌ Failed to send create transaction notification:", err);
    }

    return updatedTrx
  } catch (err) {
    console.error('🔥 SQL ERROR:', err)
    throw err
  }
}

function formatEtaFromSeconds(seconds) {
  const totalSeconds = Number(seconds) || 0
  if (totalSeconds <= 0) return null

  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const parts = []
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)

  return parts.join(' ')
}

export async function getAllTransactions(user) {
  let whereCondition = undefined;

  if (user.role !== 'ADMIN') {
    whereCondition = and(
      eq(transactions.userId, user.id),
      ne(transactions.status, 'Cancelled')
    );
  }

  const rows = await db
    .select({
      transaction: transactions,
      driver: drivers,
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id))
    .where(whereCondition)
    .orderBy(
      sql`
        CASE
          WHEN ${transactions.status} IN (
            'Delivered',
            'multiple delivery attempts failed',
            'Returned to Sender'
          )
          THEN 1
          ELSE 0
        END ASC
      `
    );

  if (rows.length === 0) return [];

  const transactionIds = rows.map(r => r.transaction.id);

  const receivers = await db
    .select()
    .from(transactionReceivers)
    .where(inArray(transactionReceivers.transactionId, transactionIds));

  const receiverMap = {};
  for (const rc of receivers) {
    if (!receiverMap[rc.transactionId]) {
      receiverMap[rc.transactionId] = [];
    }
    receiverMap[rc.transactionId].push(rc);
  }

  return rows.map(row => {
    const trxReceivers = receiverMap[row.transaction.id] || [];

    const totalEtaSeconds = trxReceivers.reduce(
      (sum, r) => sum + (Number(r.eta) || 0),
      0
    );

    const totalCO2 = trxReceivers.reduce(
      (sum, r) => sum + (Number(r.co) || 0),
      0
    );

    return {
      ...row.transaction,
      driver: row.driver || null,
      totalETA: formatEtaFromSeconds(totalEtaSeconds),
      totalCO2,
      receivers: trxReceivers.map(r => ({
        ...r,
        etaFormatted: formatEtaFromSeconds(r.eta),
      })),
    };
  });
}




export async function getTransactionById(id) {
  const [row] = await db
    .select({
      transaction: transactions,
      driver: drivers,
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id))
    .where(eq(transactions.id, id))

  if (!row) return null

  const receivers = await db
    .select()
    .from(transactionReceivers)
    .where(eq(transactionReceivers.transactionId, id))

  const totalEtaSeconds = receivers.reduce(
    (sum, r) => sum + (Number(r.eta) || 0),
    0
  )

  const totalCO2 = receivers.reduce(
    (sum, r) => sum + (Number(r.co) || 0),
    0
  )

  return {
    ...row.transaction,
    driver: row.driver || null,
    totalETA: formatEtaFromSeconds(totalEtaSeconds),
    totalCO2,
    receivers: receivers.map(r => ({
      ...r,
      etaFormatted: formatEtaFromSeconds(r.eta),
    })),
  }
}

export async function getTransactionReceiverById(id) {
  const [receiver] = await db
    .select()
    .from(transactionReceivers)
    .where(eq(transactionReceivers.id, id))

  return receiver || null
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
        // paymentStatus: data.paymentStatus,
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
        const rate = await getRate(receiver.deliveryType, receiver.eVehicle, receiver.distance);
        const fee = rate ? rate.price : 0;

        totalFee += fee;
        totalDistance += receiver.distance;

        await tx.insert(transactionReceivers).values({
          transactionId: id,
          savedAddress: receiver.savedAddress === true,
          addAddress: receiver.addAddress === true,
          ...(receiver.receiverAddressId && { receiverAddressId: receiver.receiverAddressId }),

          address: receiver.address,
          unitStreet: receiver.unitStreet,
          pinnedLocation: receiver.pinnedLocation
            ? normalizePinnedLocation(receiver.pinnedLocation)
            : null,

          contactName: receiver.contactName,
          contactNumber: receiver.contactNumber,
          contactEmail: receiver.contactEmail,
          label: receiver.label,

          deliveryType: receiver.deliveryType,
          eVehicle: receiver.eVehicle,
          distance: receiver.distance,
          fee,

          bringPouch: receiver.bringPouch === true || receiver.bringPouch === 'true',
          itemType: receiver.itemType || null,
          packageType: receiver.packageType || 'standard',
          cod: receiver.cod === true || receiver.cod === 'true',
          itemProtection: receiver.itemProtection === true || receiver.itemProtection === 'true',
          deliveryNotes: receiver.deliveryNotes || null,
          weight: receiver.weight || null,
          co: receiver.co ? Number(receiver.co) : null,
          eta: receiver.eta ? Number(rc.eta) : null,
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

    if (transactionObject) {
      const tokens = await db.select()
          .from(userFcmTokens)
          .where(eq(userFcmTokens.userId, transactionObject.userId));

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

export async function cancelTransactionReceiver({
  transactionId,
  receiverId,
}) {
  // 1. Ambil status transaction
  const [trx] = await db
    .select({
      id: transactions.id,
      status: transactions.status,
    })
    .from(transactions)
    .where(eq(transactions.id, transactionId))

  if (!trx) {
    throw new Error('Transaction not found')
  }

  // 2. Validasi status transaction (TIDAK BOLEH)
  const forbiddenStatuses = [
    'Delivered',
    'multiple delivery attempts failed',
    'Returned to Sender',
  ]

  if (forbiddenStatuses.includes(trx.status)) {
    throw new Error(
      `Cannot cancel receiver. Transaction already ${trx.status}`
    )
  }

  // 3. Pastikan receiver ada & milik transaction tsb
  const [receiver] = await db
    .select()
    .from(transactionReceivers)
    .where(
      and(
        eq(transactionReceivers.id, receiverId),
        eq(transactionReceivers.transactionId, transactionId)
      )
    )

  if (!receiver) {
    throw new Error('Transaction receiver not found')
  }

  // 4. Jika sudah canceled
  if (receiver.statusCanceled === true) {
    return
  }

  // 5. Update statusCanceled
  await db
    .update(transactionReceivers)
    .set({
      statusCanceled: true,
      updatedAt: new Date(),
    })
    .where(eq(transactionReceivers.id, receiverId))
}


export async function deleteTransaction(id) {
  await db
    .update(transactions)
    .set({
      status: 'Cancelled',
      updatedAt: new Date()
    })
    .where(eq(transactions.id, id));

  return true;
}

function formatETA(seconds) {
  if (!seconds || seconds <= 0) return '0 min'

  const hrs = Math.floor(seconds / 3600)
  const mins = Math.ceil((seconds % 3600) / 60)

  if (hrs > 0) {
    return `${hrs} hr ${mins} min`
  }

  return `${mins} min`
}

export async function getTransactions({ page = 1, limit = 10, filters = {} }) {
  const conditions = []
  page = Number(page)
  limit = Number(limit)

  if (filters.paymentStatus)
    conditions.push(eq(transactions.paymentStatus, filters.paymentStatus))
  if (filters.userId)
    conditions.push(eq(transactions.userId, filters.userId))

  let whereCondition = undefined
  if (conditions.length === 1) whereCondition = conditions[0]
  else if (conditions.length > 1) whereCondition = and(...conditions)

  const sanitizeUser = (user) => {
    if (!user) return null
    const { password, ...rest } = user
    return rest
  }
  const fetchTransactions = async (withLimit = true) => {
    let q = db
      .select({
        transaction: transactions,
        driver: drivers,
        user: users,
      })
      .from(transactions)
      .leftJoin(drivers, eq(transactions.driverId, drivers.id))
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(whereCondition)

    if (withLimit) {
      q = q.limit(limit).offset((page - 1) * limit)
    }

    return q
  }

  const totalQuery = db
    .select({ count: sql`count(*)` })
    .from(transactions)
    .where(whereCondition)

  const [{ count }] = await totalQuery
  const rows =
    page === 0 && limit === 0
      ? await fetchTransactions(false)
      : await fetchTransactions(true)

  if (rows.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    }
  }

  /** ===============================
   * FETCH RECEIVERS
   =============================== */
  const transactionIds = rows.map((r) => r.transaction.id)

  const receivers = await db
    .select()
    .from(transactionReceivers)
    .where(inArray(transactionReceivers.transactionId, transactionIds))

  const receiverMap = {}
  for (const rc of receivers) {
    if (!receiverMap[rc.transactionId]) {
      receiverMap[rc.transactionId] = []
    }
    receiverMap[rc.transactionId].push(rc)
  }

  /** ===============================
   * BUILD RESPONSE
   =============================== */
  const data = rows.map((r) => {
    const trxReceivers = receiverMap[r.transaction.id] || []

    const totalETA = trxReceivers.reduce(
      (sum, x) => sum + (Number(x.eta) || 0),
      0
    )

    const totalCO2 = trxReceivers.reduce(
      (sum, x) => sum + (Number(x.co) || 0),
      0
    )

    return {
      ...r.transaction,
      driver: r.driver || null,
      user: sanitizeUser(r.user),
      totalETA,
      totalETAFormatted: formatETA(totalETA),
      totalCO2,
      receivers: trxReceivers,
    }
  })

  return {
    data,
    pagination: {
      page: page === 0 ? 1 : page,
      limit: page === 0 ? Number(count) : limit,
      total: Number(count),
      totalPages: page === 0 ? 1 : Math.ceil(Number(count) / limit),
    },
  }
}
