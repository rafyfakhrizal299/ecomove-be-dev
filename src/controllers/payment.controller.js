import { createPaymentService, notifyPaymentService } from '../services/payment.service.js'

export const createPayment = async (req, res) => {
  try {
    const { transactionId } = req.body
    const result = await createPaymentService(transactionId)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: 'Failed to create payment', error: err.message })
  }
}

export const notifyPayment = async (req, res) => {
  try {
    const result = await notifyPaymentService(req.body)
    res.json({ message: "OK", result })
  } catch (err) {
    res.status(400).json({ message: 'Notify failed', error: err.message })
  }
}
