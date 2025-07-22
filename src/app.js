import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.route.js'

const app = express()

app.use(cors())
app.use(express.json())
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' })
})
app.use('/auth', authRoutes)

export default app