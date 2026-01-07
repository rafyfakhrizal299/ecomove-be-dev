import * as trxService from "../services/transaction.service.js";

export async function dashboardController(req, res) {
  try {
    const data = await trxService.getDashboardData();
    res.status(200).json({ status: 200, data });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
}

export const createTransaction = async (req, res) => {
  try {
    const trx = await trxService.createTransaction({
      ...req.body,
      userId: req.user.id,
    });

    const fullData = await trxService.getTransactionById(trx.id);
    res.status(201).json({ status: 201, data: fullData });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const result = await trxService.getAllTransactions(req.user);
    res.json({ status: 200, data: result });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};


export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ validasi eco<number>
    if (!/^eco\d+$/.test(id)) {
      return res.status(404).json({
        status: 404,
        message: "Transaction not found",
      });
    }

    const trx = await trxService.getTransactionById(id);

    if (!trx) {
      return res.status(404).json({
        status: 404,
        message: "Transaction not found",
      });
    }

    // 🔒 proteksi ownership
    if (req.user.role !== "ADMIN" && trx.userId !== req.user.id) {
      return res.status(403).json({ status: 403, message: "Forbidden" });
    }

    res.json({ status: 200, data: trx });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};


export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^eco\d+$/.test(id)) {
      return res.status(404).json({
        status: 404,
        message: "Transaction not found",
      });
    }

    const trx = await trxService.getTransactionById(id);

    if (!trx) {
      return res.status(404).json({ status: 404, message: "Transaction not found" });
    }

    if (req.user.role !== "ADMIN" && trx.userId !== req.user.id) {
      return res.status(403).json({ status: 403, message: "Forbidden" });
    }

    const updated = await trxService.updateTransaction(id, req.body);

    res.json({ status: 200, message: "Transaction updated", data: updated });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};


export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^eco\d+$/.test(id)) {
      return res.status(404).json({
        status: 404,
        message: "Transaction not found",
      });
    }

    const trx = await trxService.getTransactionById(id);

    if (!trx) {
      return res.status(404).json({ status: 404, message: "Transaction not found" });
    }

    if (trx.userId !== req.user.id) {
      return res.status(403).json({ status: 403, message: "Forbidden" });
    }

    await trxService.deleteTransaction(id);

    res.json({ status: 200, message: "Transaction deleted" });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};


export const cancelTransactionReceiver = async (req, res) => {
  try {
    const receiverId = Number(req.params.id)

    // 1. Ambil receiver + transaction
    const receiver = await trxService.getTransactionReceiverById(receiverId)

    if (!receiver) {
      return res
        .status(404)
        .json({ status: 404, message: 'Transaction receiver not found' })
    }

    // 2. Ambil transaction
    const trx = await trxService.getTransactionById(receiver.transactionId)

    if (!trx) {
      return res
        .status(404)
        .json({ status: 404, message: 'Transaction not found' })
    }

    // 3. Pencegahan: hanya owner / ADMIN
    if (req.user.role !== 'ADMIN' && trx.userId !== req.user.id) {
      return res
        .status(403)
        .json({ status: 403, message: 'Forbidden' })
    }

    // 4. Cancel receiver
    await trxService.cancelTransactionReceiver({
      transactionId: trx.id,
      receiverId,
    })

    res.json({
      status: 200,
      message: 'Transaction receiver canceled successfully',
    })
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message })
  }
}


export const getTransactions = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const filters = {
      paymentStatus: req.query.paymentStatus,
      deliveryType: req.query.deliveryType,
    };

    let result = await trxService.getTransactions({ page, limit, filters });

    if (req.user.role !== "ADMIN") {
      result.data = result.data.filter(trx => trx.userId === req.user.id);
    }

    res.json({ status: 200, message: "Success", ...result });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};
