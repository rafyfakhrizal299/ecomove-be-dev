import express from 'express'
import cors from 'cors'
// import transactionRoutes from './routes/transaction.route.js'
import authRoutes from './routes/auth.route.js'
import addressRoutes from './routes/address.route.js'
import paymentRoutes from './routes/payment.route.js'
import transactionRoutes from "./routes/transaction.route.js";
import driverRoutes from "./routes/driver.routes.js";
import excelRoutes from "./routes/excel.route.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express()

app.use(cors())
app.use(express.json())
// app.use(express.static("public"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.ecomove",
        sha256_cert_fingerprints: [
          "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
        ]
      }
    }
  ]);
});


app.use(express.urlencoded({ extended: true }));
app.use('/auth', authRoutes)
app.use('/transaction', transactionRoutes)
app.use('/address', addressRoutes)
app.use('/payment', paymentRoutes)
app.use('/driver', driverRoutes)
app.use('/export', excelRoutes)

export default app