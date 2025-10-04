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

app.get("/well-known/assetlinks", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(`[InternetShortcut]
URL=file:///d%3A/freelance/ecomove-mobile/assetlinks.json`);
});

app.use(express.urlencoded({ extended: true }));
app.use('/auth', authRoutes)
app.use('/transaction', transactionRoutes)
app.use('/address', addressRoutes)
app.use('/payment', paymentRoutes)
app.use('/driver', driverRoutes)
app.use('/export', excelRoutes)

export default app