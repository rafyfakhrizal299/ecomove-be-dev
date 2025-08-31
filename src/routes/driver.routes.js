import express from "express";
import {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver
} from "../controllers/driver.controller.js";

const router = express.Router();

router.post("/", createDriver);
router.get("/", getAllDrivers);
router.get("/:id", getDriverById);
router.put("/:id", updateDriver);
router.delete("/:id", deleteDriver);

export default router;
