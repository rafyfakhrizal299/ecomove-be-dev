import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import jwksClient from 'jwks-rsa'
import { eq } from 'drizzle-orm'
import dotenv from 'dotenv'
import db from '../../lib/db.js'
import { v4 as uuidv4 } from 'uuid'

import { users, services } from '../../drizzle/schema.js'

const googleClient = new OAuth2Client()
const appleJwks = jwksClient({ jwksUri: 'https://appleid.apple.com/auth/keys' })

const TOKEN_EXPIRES_IN = '7d'
const userId = uuidv4()

function generateToken(user) {
  const JWT_SECRET = process.env.JWT_SECRET
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  )
}

export const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'Email and password are required.', results: null })
  }

  const result = await req.db.select().from(users).where(eq(users.email, email))
  const user = result[0]

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ status: 401, message: 'Invalid credentials.', results: null })
  }

  if (!user.canAccessCMS) {
    return res.status(403).json({ status: 403, message: 'Access denied.', results: null })
  }

  const token = generateToken(user)
  res.json({ status: 200, message: 'Login successful', results: { token, user } })
}

function getAppleKey(header, callback) {
  appleJwks.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey()
    callback(null, signingKey)
  })
}

export const oauthLogin = async (req, res) => {
  const { provider, id_token } = req.body

  if (provider === 'google') {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      })
      const payload = ticket.getPayload()

      const { sub, email, given_name, family_name } = payload

      let user = (await req.db.select().from(users).where(eq(users.providerId, sub)))[0]

      if (!user) {
        const insertResult = await req.db.insert(users).values({
          firstName: given_name,
          lastName: family_name || '',
          email,
          provider: 'google',
          providerId: sub,
          role: 'USER',
          emailVerifiedAt: new Date()
        }).returning()

        user = insertResult[0]
      }

      const token = generateToken(user)
      return res.json({ status: 200, message: 'OAuth login successful', results: { token, user } })
    } catch (error) {
      console.error(error)
      return res.status(401).json({ status: 401, message: 'Invalid Google token.', results: null })
    }
  }

  if (provider === 'apple') {
    jwt.verify(id_token, getAppleKey, { algorithms: ['RS256'] }, async (err, payload) => {
      if (err) {
        console.error(err)
        return res.status(401).json({ status: 401, message: 'Invalid Apple token', results: null })
      }

      const { sub, email } = payload
      let user = (await req.db.select().from(users).where(eq(users.providerId, sub)))[0]

      if (!user) {
        const insertResult = await req.db.insert(users).values({
          firstName: 'Apple',
          lastName: 'User',
          email,
          provider: 'apple',
          providerId: sub,
          role: 'USER',
          emailVerifiedAt: new Date()
        }).returning()

        user = insertResult[0]
      }

      const token = generateToken(user)
      return res.json({ status: 200, message: 'OAuth login successful', results: { token, user } })
    })
  } else {
    return res.status(400).json({ status: 400, message: 'Unsupported provider.', results: null })
  }
}

export const register = async (req, res) => {
  const { firstName, lastName, email, password, mobileNumber, serviceId } = req.body

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ status: 400, message: 'Missing required fields.', results: null })
  }

  const existing = (await db.select().from(users).where(eq(users.email, email)))[0]
  if (existing) {
    return res.status(409).json({ status: 409, message: 'Email already registered.', results: null })
  }

  const service = (await db.select().from(services).where(eq(services.id, serviceId)))[0]
  if (!service) {
    return res.status(400).json({ status: 400, message: 'Invalid serviceId.', results: null })
  }

  const hashed = await bcrypt.hash(password, 10)

  const insertResult = await db.insert(users).values({
    id: userId,
    firstName,
    lastName,
    email,
    mobileNumber,
    password: hashed,
    serviceId,
    role: 'USER',
    provider: null,
    providerId: null,
    emailVerifiedAt: null,
  }).returning()

  const user = insertResult[0]
  const token = generateToken(user)

  res.status(201).json({
    status: 201,
    message: 'Registration successful',
    results: { token, user },
  })
}

export const userLogin = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'Email and password are required.', results: null })
  }

  const result = await req.db.select().from(users).where(eq(users.email, email))
  const user = result[0]

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ status: 401, message: 'Invalid credentials.', results: null })
  }

  if (user.role !== 'USER') {
    return res.status(403).json({ status: 403, message: 'Not allowed for non-user role.', results: null })
  }

  const token = generateToken(user)
  res.json({ status: 200, message: 'Login successful', results: { token, user } })
}

export const getProfile = async (req, res) => {
  const userId = req.user.id

  const result = await req.db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    mobileNumber: users.mobileNumber,
    serviceId: users.serviceId,
    role: users.role
  }).from(users).where(eq(users.id, userId))

  const user = result[0]

  if (!user) {
    return res.status(404).json({ status: 404, message: 'User not found', results: null })
  }

  res.json({ status: 200, message: 'Profile fetched successfully', results: user })
}