import express from 'express'
import cors from 'cors'
// import transactionRoutes from './routes/transaction.route.js'
import authRoutes from './routes/auth.route.js'
import addressRoutes from './routes/address.route.js'
import paymentRoutes from './routes/payment.route.js'
import transactionRoutes from "./routes/transaction.route.js";
import driverRoutes from "./routes/driver.routes.js";
import excelRoutes from "./routes/excel.route.js";

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use('/auth', authRoutes)
app.use('/transaction', transactionRoutes)
app.use('/address', addressRoutes)
app.use('/payment', paymentRoutes)
app.use('/driver', driverRoutes)
app.use('/export', excelRoutes)

export default app