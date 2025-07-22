import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'

import { db } from '../drizzle/db.js'
import authRoutes from './routes/auth.route.js'

const app = express()

app.use((req, res, next) => {
  req.db = db
  next()
})

app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)

app.get('/', (req, res) => {
  res.send('API is running...')
})

export default app