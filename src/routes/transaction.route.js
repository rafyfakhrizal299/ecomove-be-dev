import express from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
} from "../controllers/transaction.controller.js";

const router = express.Router();

router.post("/", createTransaction);
router.get("/", getAllTransactions);
router.get("/page", getTransactions); // ✅ sudah support pagination & filter
router.get("/:id", getTransactionById);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
