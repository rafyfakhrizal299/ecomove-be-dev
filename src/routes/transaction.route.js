import express from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  dashboardController,
  cancelTransactionReceiver
} from "../controllers/transaction.controller.js";
import authMiddleware from '../middlewares/auth.middleware.js'
import adminOnly from '../middlewares/admin.middleware.js'

const router = express.Router();

router.use(authMiddleware);

router.post("/", createTransaction);
router.get("/", getAllTransactions);
router.get("/page", getTransactions);
router.get("/:id", getTransactionById);
router.delete("/:id", deleteTransaction);
router.patch('/receivers/:id/cancel', cancelTransactionReceiver)

router.use(adminOnly);
router.get("/dashboard", dashboardController);
router.put("/:id", updateTransaction);

export default router;