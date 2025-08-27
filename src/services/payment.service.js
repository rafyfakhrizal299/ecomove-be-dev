import db from '../../lib/db.js';
import { transactions } from '../../drizzle/schema.js';
import { generateVCode, verifySKey } from '../utils/hashHelper.util.js';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm'

dotenv.config();

export async function createPaymentService(transactionId) {
  // ambil data transaksi dari DB
  const trx = await db.select().from(transactions).where(eq(transactions.id, transactionId))
  if (!trx.length) throw new Error("Transaction not found")

  const transaction = trx[0]
  const orderid = "ORD_" + Date.now()
  const amount = transaction.fee?.toString() || "0.00"
    // const amount = "100.00"
  const currency = "PHP"
  const vcode = generateVCode(amount, orderid, process.env.FIUU_MERCHANT_ID)

  const url = `${process.env.FIUU_BASE_URL}/${process.env.FIUU_MERCHANT_ID}/`

  // update orderid ke transaksi
  await db.update(transactions)
    .set({ orderid })
    .where(eq(transactions.id, transactionId))
  return {
    url,
    params: {
      amount,
      orderid,
      bill_name: transaction.contactName,
      bill_email: transaction.contactEmail, // bisa diganti user.email
      bill_mobile: transaction.contactNumber,
      bill_desc: "Delivery Payment",
      country: "PH",
      currency,
      vcode,
    }
  }
}

export async function notifyPaymentService(data) {
  if (!verifySKey(data)) throw new Error("Invalid skey")

  const status = data.status === "00" ? "success" : "failed"

  await db.update(transactions)
    .set({ paymentStatus: status, tranID: data.tranID })
    .where(eq(transactions.orderid, data.orderid))

  return { orderid: data.orderid, status }
}