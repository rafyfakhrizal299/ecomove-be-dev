// services/excel.service.js
import ExcelJS from "exceljs";
import { db } from "../../drizzle/db.js";
import { transactions, drivers } from "../../drizzle/schema.js";
import { eq, and, sql } from "drizzle-orm";

export async function generateTransactionExcel({ startDate, endDate }) {
  // filter data sesuai periode (optional)
  let where = undefined;
  if (startDate && endDate) {
    where = and(
      sql`${transactions.createdAt} >= ${new Date(startDate)}`,
      sql`${transactions.createdAt} <= ${new Date(endDate)}`
    );
  }

  const rows = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      status: transactions.status,
      paymentStatus: transactions.paymentStatus,
      totalFee: transactions.totalFee,
      createdAt: transactions.createdAt,
      driverName: drivers.name,
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id))
    .where(where);

  // buat workbook
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Transactions");

  // header
  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "User ID", key: "userId", width: 15 },
    { header: "Driver", key: "driverName", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Payment Status", key: "paymentStatus", width: 20 },
    { header: "Total Fee", key: "totalFee", width: 15 },
    { header: "Created At", key: "createdAt", width: 25 },
  ];

  // isi data
  rows.forEach((row) => {
    sheet.addRow({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : "",
    });
  });

  // return buffer (biar bisa langsung di-download)
  return await workbook.xlsx.writeBuffer();
}
