import express from 'express'
import { createPayment, notifyPayment } from '../controllers/payment.controller.js'

const router = express.Router()

router.post('/create', createPayment)
router.post('/notify', notifyPayment)

export default router
