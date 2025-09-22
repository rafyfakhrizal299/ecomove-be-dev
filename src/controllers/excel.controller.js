// controllers/excel.controller.js
import { generateTransactionExcel } from "../services/excel.service.js";

export const downloadTransactionExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const buffer = await generateTransactionExcel({ startDate, endDate });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (err) {
    console.error("❌ Excel export error:", err);
    res.status(500).json({ status: 500, message: err.message });
  }
};
