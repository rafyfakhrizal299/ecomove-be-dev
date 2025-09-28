import express from 'express'
import { 
    requestEmailVerification, 
    verifyEmail, 
    login, 
    oauthLogin, 
    register, 
    userLogin, 
    getProfile, 
    getAllServices, 
    listUsers, 
    deleteUser, 
    editUser  
} from '../controllers/auth.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import adminOnly from '../middlewares/admin.middleware.js'

const router = express.Router()

router.post('/login', login)
router.post('/user-login', userLogin)
router.post('/oauth', oauthLogin)
router.post('/register', register)
router.get('/services', getAllServices)
router.get('/profile', authMiddleware, getProfile)
router.put('/edit-user/:id', authMiddleware, editUser)
router.post("/verify-email", requestEmailVerification);
router.get("/verify/:token", verifyEmail);

router.use(authMiddleware, adminOnly)

router.get('/list-pagination', authMiddleware, listUsers)
router.delete('/users/:id', authMiddleware, deleteUser);


export default router