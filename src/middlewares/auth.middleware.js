import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Invalid token payload' })
    }

    req.user = decoded

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Authenticated user:', decoded)
    }

    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export default authMiddleware
