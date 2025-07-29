import db from '../../lib/db.js'
import { savedAddresses } from '../../drizzle/schema.js'
import { eq } from 'drizzle-orm'

export const getAllSavedAddresses = async (req, res) => {
  try {
    const result = await db.select().from(savedAddresses)
    res.json({ status: 200, message: 'Success', results: result })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch addresses', error: err.message })
  }
}

export const getSavedAddressesByUser = async (req, res) => {
  try {
    const userId = req.params.userId

    const result = await db.select()
      .from(savedAddresses)
      .where(eq(savedAddresses.userId, userId))

    res.json({ status: 200, message: 'Success', results: result })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch addresses for user', error: err.message })
  }
}

export const getSavedAddressById = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const result = await db.select().from(savedAddresses).where(eq(savedAddresses.id, id))
    if (!result.length) return res.status(404).json({ message: 'Address not found' })
    res.json({ status: 200, message: 'Success', results: result[0] })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch address', error: err.message })
  }
}

export const createSavedAddress = async (req, res) => {
  try {
    const data = req.body
    const result = await db.insert(savedAddresses).values(data).returning()
    res.status(201).json({ status: 201, message: 'Success', results: result[0] })
  } catch (err) {
    res.status(400).json({ message: 'Failed to create address', error: err.message })
  }
}

export const updateSavedAddress = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = req.body
    const result = await db.update(savedAddresses).set(data).where(eq(savedAddresses.id, id)).returning()
    if (!result.length) return res.status(404).json({ message: 'Address not found' })
    res.json({ status: 200, message: 'Success', results: result[0] })
  } catch (err) {
    res.status(400).json({ message: 'Failed to update address', error: err.message })
  }
}

export const deleteSavedAddress = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const result = await db.delete(savedAddresses).where(eq(savedAddresses.id, id)).returning()
    if (!result.length) return res.status(404).json({ message: 'Address not found' })
    res.json({ status: 200, message: 'Address deleted successfully' })
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete address', error: err.message })
  }
}