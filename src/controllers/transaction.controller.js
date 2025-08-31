import * as trxService from "../services/transaction.service.js";

export const createTransaction = async (req, res) => {
  try {
    const trx = await trxService.createTransaction(req.body);
    res.status(201).json({ status: 201, message: "Transaction created", data: trx });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const result = await trxService.getAllTransactions();
    res.json({ status: 200, data: result });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const trx = await trxService.getTransactionById(Number(req.params.id));
    if (!trx) return res.status(404).json({ status: 404, message: "Transaction not found" });
    res.json({ status: 200, data: trx });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const trx = await trxService.updateTransaction(Number(req.params.id), req.body);
    if (!trx) return res.status(404).json({ status: 404, message: "Transaction not found" });
    res.json({ status: 200, message: "Transaction updated", data: trx });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const trx = await trxService.deleteTransaction(Number(req.params.id));
    if (!trx) return res.status(404).json({ status: 404, message: "Transaction not found" });
    res.json({ status: 200, message: "Transaction deleted" });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const filters = {
      paymentStatus: req.query.paymentStatus,
      deliveryType: req.query.deliveryType,
      userId: req.query.userId,
    };

    const result = await trxService.getTransactions({ page, limit, filters });
    res.json({ status: 200, message: "Success", ...result });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};