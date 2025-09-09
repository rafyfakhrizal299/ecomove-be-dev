import express from 'express'
import { createPayment, notifyPayment, paymentReturn } from '../controllers/payment.controller.js'

const router = express.Router()

router.post('/create', createPayment);
router.post('/notify', notifyPayment);
router.post('/return', paymentReturn);

export default router
