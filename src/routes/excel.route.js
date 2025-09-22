import express from "express";
import { Router } from "express";
import { downloadTransactionExcel } from "../controllers/excel.controller.js";

const router = express.Router();

router.get("/transactions/excel", downloadTransactionExcel);

export default router;
