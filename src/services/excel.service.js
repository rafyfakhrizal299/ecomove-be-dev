import ExcelJS from "exceljs";
import { db } from "../../drizzle/db.js";
import {
  transactions,
  drivers,
  transactionReceivers
} from "../../drizzle/schema.js";
import {
  and,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

export async function generateTransactionExcel({ startDate, endDate }) {

  const formatPaymentMethods = (receivers) => {
    if (!receivers || receivers.length === 0) return '';

    const unique = [];
    const seen = new Set();

    receivers.forEach(r => {
      if (!r.paymentMethod) return;

      const rawMethods = r.paymentMethod
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);

      rawMethods.forEach(method => {
        const normalized = method.toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          unique.push(method);
        }
      });
    });

    return unique
      .map(m =>
        m
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
      )
      .join(', ');
  };

  let where = undefined;
  if (startDate && endDate) {
    where = and(
      sql`${transactions.createdAt} >= ${new Date(startDate)}`,
      sql`${transactions.createdAt} <= ${new Date(endDate)}`
    );
  }
  const rows = await db
    .select({
      transaction: transactions,
      driver: drivers,
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id))
    .where(where);

  if (!rows || rows.length === 0) {
    const workbook = new ExcelJS.Workbook();
    return workbook.xlsx.writeBuffer();
  }

  const transactionIds = rows.map(r => r.transaction.id);

  const receivers = await db
    .select()
    .from(transactionReceivers)
    .where(inArray(transactionReceivers.transactionId, transactionIds));

  const receiverMap = {};
  receivers.forEach(rc => {
    if (!receiverMap[rc.transactionId]) {
      receiverMap[rc.transactionId] = [];
    }
    receiverMap[rc.transactionId].push(rc);
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Transactions");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "User ID", key: "userId", width: 15 },
    { header: "Driver", key: "driverName", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Payment Status", key: "paymentStatus", width: 20 },
    { header: "Payment Method", key: "paymentMethod", width: 30 },
    { header: "Total Fee", key: "totalFee", width: 15 },
    { header: "Created At", key: "createdAt", width: 25 },
  ];
  rows.forEach(({ transaction, driver }) => {
    const trxReceivers = receiverMap[transaction.id] || [];

    const totalFee = trxReceivers.reduce(
      (sum, r) => sum + (Number(r.fee) || 0),
      0
    );

    const paymentMethod = formatPaymentMethods(trxReceivers);

    sheet.addRow({
      id: transaction.id,
      userId: transaction.userId,
      driverName: driver ? driver.name : '-',
      status: transaction.status,
      paymentStatus: transaction.paymentStatus,
      paymentMethod,
      totalFee,
      createdAt: transaction.createdAt
        ? transaction.createdAt.toISOString()
        : '',
    });
  });

  return await workbook.xlsx.writeBuffer();
}
