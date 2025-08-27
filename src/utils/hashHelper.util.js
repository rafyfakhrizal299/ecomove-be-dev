import dotenv from 'dotenv'
import crypto from 'crypto'
dotenv.config()

// generate vcode
export function generateVCode(amount, orderid, merchantid) {
  return crypto
    .createHash("md5")
    .update(amount + merchantid + orderid + process.env.FIUU_VKEY)
    .digest("hex");
}

// verify skey (from notify)
export function verifySKey(data) {
  const {
    tranID,
    orderid,
    status,
    domain,
    amount,
    currency,
    paydate,
    appcode,
    skey,
  } = data;

  const key0 = crypto
    .createHash("md5")
    .update(tranID + orderid + status + domain + amount + currency)
    .digest("hex");

  const key1 = crypto
    .createHash("md5")
    .update(paydate + domain + key0 + appcode + process.env.FIUU_SKEY)
    .digest("hex");

  return skey === key1;
}