import express from 'express'
import cors from 'cors'
import transactionRoutes from './routes/transaction.route.js'
import authRoutes from './routes/auth.route.js'
import addressRoutes from './routes/address.route.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/auth', authRoutes)
// app.use('/transaction', transactionRoutes)
app.use('/address', addressRoutes)

export default app