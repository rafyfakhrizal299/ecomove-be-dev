import * as driverService from "../services/driver.service.js";

export const createDriver = async (req, res) => {
  try {
    const driver = await driverService.createDriver(req.body);
    res.status(201).json({ status: 201, message: "Driver created", data: driver });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};

export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await driverService.getAllDrivers();
    res.json({ status: 200, data: drivers });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};

export const getDriverById = async (req, res) => {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    if (!driver) return res.status(404).json({ status: 404, message: "Driver not found" });
    res.json({ status: 200, data: driver });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
};

export const updateDriver = async (req, res) => {
  try {
    const driver = await driverService.updateDriver(req.params.id, req.body);
    if (!driver) return res.status(404).json({ status: 404, message: "Driver not found" });
    res.json({ status: 200, message: "Driver updated", data: driver });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};

export const deleteDriver = async (req, res) => {
  try {
    const driver = await driverService.deleteDriver(req.params.id);
    if (!driver) return res.status(404).json({ status: 404, message: "Driver not found" });
    res.json({ status: 200, message: "Driver deleted" });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message });
  }
};
