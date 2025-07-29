import express from 'express'
import {
  getAllSavedAddresses,
  getSavedAddressById,
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  getSavedAddressesByUser
} from '../controllers/address.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import adminOnly from '../middlewares/admin.middleware.js'

const router = express.Router()

router.get('/get-by-user/:userId', authMiddleware, getSavedAddressesByUser)

router.use(authMiddleware, adminOnly)

router.get('/', getAllSavedAddresses)
router.get('/:id', getSavedAddressById)
router.post('/', createSavedAddress)
router.put('/:id', updateSavedAddress)
router.delete('/:id', deleteSavedAddress)


export default router