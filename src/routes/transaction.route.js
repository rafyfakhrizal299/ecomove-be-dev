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
import authMiddleware from '../middlewares/auth.middleware.js';
import adminOnly from '../middlewares/admin.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard", adminOnly, dashboardController);
router.get("/page", getTransactions);

router.post("/", createTransaction);
router.get("/", getAllTransactions);

router.patch("/receivers/:id/cancel", cancelTransactionReceiver);

router.get("/:id", getTransactionById);
router.put("/:id", adminOnly, updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
