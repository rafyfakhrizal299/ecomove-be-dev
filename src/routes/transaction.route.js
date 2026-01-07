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

// ===== PUBLIC (LOGIN REQUIRED) =====
router.post("/", createTransaction);
router.get("/", getAllTransactions);
router.get("/page", getTransactions);

// receiver
router.patch("/receivers/:id/cancel", cancelTransactionReceiver);

// ===== ADMIN ONLY =====
router.get("/dashboard", adminOnly, dashboardController);
router.put("/:id(eco[0-9]+)", adminOnly, updateTransaction);

// ===== BY ID (eco<number>) =====
router.get("/:id(eco[0-9]+)", getTransactionById);
router.delete("/:id(eco[0-9]+)", deleteTransaction);

export default router;
