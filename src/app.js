import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.route.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api', authRoutes)

export default app