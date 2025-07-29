import express from 'express'
import { login, oauthLogin, register, userLogin, getProfile, getAllServices  } from '../controllers/auth.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'

const router = express.Router()

router.post('/login', login)
router.post('/user-login', userLogin)
router.post('/oauth', oauthLogin)
router.post('/register', register)
router.get('/services', getAllServices)
router.get('/profile', authMiddleware, getProfile)


export default router