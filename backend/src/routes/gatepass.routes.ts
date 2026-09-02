import { Router } from "express";
import { globalGatePassService } from "../services/gatepass.service.js";
import { erpnextService } from "../services/erpnext.service.js";
import { erpnextConfig } from "../config/erpnext.config.js";
import { validateGatePassInput } from "../middleware/validation.middleware.js";
import type { GatePassType } from "../types/gatepass.types.js";

export const gatepassRouter = Router();

// Helper to determine type param
function resolveType(rawType?: unknown): GatePassType {
  const t = String(rawType || "outward").toLowerCase();
  return t === "inward" ? "inward" : "outward";
}

// GET /api/gatepass?type=outward|inward
gatepassRouter.get("/", (req, res) => {
  const type = resolveType(req.query.type);
  const form = globalGatePassService.getForm(type);
  const summary = globalGatePassService.calculateSummary(form);
  res.json({
    success: true,
    data: { form, summary },
  });
});

// POST /api/gatepass
gatepassRouter.post("/", (req, res) => {
  const validation = validateGatePassInput(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: "فارم کی معلومات درست نہیں ہیں",
      details: validation.errors,
    });
    return;
  }

  const type = resolveType(validation.data.type || req.query.type);
  const updated = globalGatePassService.updateForm(type, validation.data);
  const summary = globalGatePassService.calculateSummary(updated);

  res.json({
    success: true,
    message: "گیٹ پاس کامیابی سے اپ ڈیٹ ہو گیا",
    data: { form: updated, summary },
  });
});

// POST /api/gatepass/reset?type=outward|inward
gatepassRouter.post("/reset", (req, res) => {
  const type = resolveType(req.body?.type || req.query.type);
  const resetForm = globalGatePassService.resetForm(type);
  const summary = globalGatePassService.calculateSummary(resetForm);

  res.json({
    success: true,
    message: "نیا گیٹ پاس فارم تیار ہے",
    data: { form: resetForm, summary },
  });
});

// POST /api/gatepass/convert-to-inward
gatepassRouter.post("/convert-to-inward", (req, res) => {
  let outward = req.body;
  if (!outward || !outward.no) {
    outward = globalGatePassService.getForm("outward");
  }
  const inward = globalGatePassService.createInwardFromOutward(outward);
  const summary = globalGatePassService.calculateSummary(inward);

  res.json({
    success: true,
    message: "آؤٹ ورڈ سے ان ورڈ گیٹ پاس تیار کر لیا گیا ہے",
    data: { form: inward, summary },
  });
});

// GET /api/gatepass/history
gatepassRouter.get("/history", (_req, res) => {
  const history = globalGatePassService.getHistory();
  res.json({
    success: true,
    data: history,
  });
});

// GET /api/gatepass/items
gatepassRouter.get("/items", async (_req, res) => {
  const items = await erpnextService.getItemsList();
  res.json({
    success: true,
    data: items,
  });
});

// GET /api/gatepass/warehouses
gatepassRouter.get("/warehouses", async (_req, res) => {
  const warehouses = await erpnextService.getWarehousesList();
  res.json({
    success: true,
    data: warehouses,
  });
});

// GET /api/gatepass/transfers (Fetch recent Material Transfer Stock Entries from ERPNext)
gatepassRouter.get("/transfers", async (_req, res) => {
  const transfers = await erpnextService.getMaterialTransfersList();
  res.json({
    success: true,
    data: transfers,
  });
});

// GET /api/gatepass/transfers/:name
gatepassRouter.get("/transfers/:name", async (req, res) => {
  const name = req.params.name;
  const transfer = await erpnextService.getMaterialTransferById(name);
  if (!transfer) {
    res.status(404).json({
      success: false,
      error: `ERPNext Material Transfer ${name} نہیں مل سکا`,
    });
    return;
  }
  res.json({
    success: true,
    data: transfer,
  });
});

// POST /api/gatepass/sync-erpnext (Sync Gate Pass to ERPNext as Material Transfer)
gatepassRouter.post("/sync-erpnext", async (req, res) => {
  let formToSync = req.body;
  const type = resolveType(formToSync?.type);

  if (formToSync && Object.keys(formToSync).length > 0) {
    const validation = validateGatePassInput(formToSync);
    if (validation.success) {
      formToSync = globalGatePassService.updateForm(type, validation.data);
    }
  } else {
    formToSync = globalGatePassService.getForm(type);
  }

  // Pre-sync validation
  if (!formToSync.fromWarehouse && !erpnextConfig.defaultRawWarehouse) {
    res.status(400).json({
      success: false,
      error: "روانگی گودام (Source Warehouse) منتخب کرنا لازمی ہے۔",
    });
    return;
  }

  if (!formToSync.toWarehouse && !erpnextConfig.defaultFinishedWarehouse) {
    res.status(400).json({
      success: false,
      error: "منزل گودام (Destination Warehouse) منتخب کرنا لازمی ہے۔",
    });
    return;
  }

  const result = await erpnextService.syncGatePass(formToSync);

  if (!result.success) {
    res.status(500).json({
      success: false,
      error: result.error,
      details: result.details,
    });
    return;
  }

  // Update local form with ERP document name and save to history
  formToSync.erpDocName = result.documentName;
  globalGatePassService.updateForm(type, { erpDocName: result.documentName });
  globalGatePassService.saveToHistory(formToSync);

  res.json({
    success: true,
    message: `گیٹ پاس ERPNext میٹریل ٹرانسفر میں کامیابی سے درج ہو گیا ہے: ${result.documentName}`,
    documentName: result.documentName,
    docUrl: result.docUrl,
    rawResponse: result.rawResponse,
  });
});

// POST /api/gatepass/test-connection
gatepassRouter.post("/test-connection", async (_req, res) => {
  const result = await erpnextService.testConnection();
  res.json(result);
});

// GET /api/gatepass/config
gatepassRouter.get("/config", (_req, res) => {
  const config = erpnextConfig.getConfig();
  res.json({
    success: true,
    data: {
      url: config.url,
      isConfigured: erpnextConfig.isConfigured,
      docType: config.docType,
      defaultRawWarehouse: config.defaultRawWarehouse,
      defaultFinishedWarehouse: config.defaultFinishedWarehouse,
    },
  });
});

