import { Router } from "express";
import { globalProductionFormService } from "../services/production-form.service.js";
import { erpnextService } from "../services/erpnext.service.js";
import { validateProductionFormInput } from "../middleware/validation.middleware.js";

export const productionFormRouter = Router();

// GET /api/production-form
productionFormRouter.get("/", (_req, res) => {
  const form = globalProductionFormService.getForm();
  const summary = globalProductionFormService.calculateSummary(form);
  res.json({
    success: true,
    data: { form, summary },
  });
});

// GET /api/production-form/items (Fetch ERPNext item dropdown list)
productionFormRouter.get("/items", async (_req, res) => {
  const items = await erpnextService.getItemsList();
  res.json({
    success: true,
    data: items,
  });
});

// GET /api/production-form/batches?item=ITEM_CODE
productionFormRouter.get("/batches", async (req, res) => {
  const itemCode = String(req.query.item || "").trim();
  const batches = itemCode ? await erpnextService.getBatchesForItem(itemCode) : [];
  res.json({
    success: true,
    data: batches,
  });
});

// GET /api/production-form/uoms?item=ITEM_CODE
productionFormRouter.get("/uoms", async (req, res) => {
  const itemCode = String(req.query.item || "").trim();
  const uoms = itemCode ? await erpnextService.getUomsForItem(itemCode) : [];
  res.json({
    success: true,
    data: uoms,
  });
});

// GET /api/production-form/config (ERPNext base URL for barcode links)
productionFormRouter.get("/config", (_req, res) => {
  res.json({
    success: true,
    data: { erpnextUrl: erpnextService.getBaseUrl() },
  });
});

// GET /api/production-form/logo (ERPNext Administrator user image)
productionFormRouter.get("/logo", async (_req, res) => {
  const logo = await erpnextService.getUserLogo();
  res.json({
    success: true,
    data: logo,
  });
});

// POST /api/production-form
productionFormRouter.post("/", (req, res) => {
  const validation = validateProductionFormInput(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: validation.errors,
    });
    return;
  }

  const updated = globalProductionFormService.updateForm(validation.data);
  const summary = globalProductionFormService.calculateSummary(updated);

  res.json({
    success: true,
    message: "Form updated successfully",
    data: { form: updated, summary },
  });
});

// POST /api/production-form/reset
productionFormRouter.post("/reset", (_req, res) => {
  const reset = globalProductionFormService.resetForm();
  const summary = globalProductionFormService.calculateSummary(reset);

  res.json({
    success: true,
    message: "Form reset to initial template",
    data: { form: reset, summary },
  });
});

// POST /api/production-form/sync-erpnext
productionFormRouter.post("/sync-erpnext", async (req, res) => {
  // Option to update form before syncing
  if (req.body && Object.keys(req.body).length > 0) {
    const validation = validateProductionFormInput(req.body);
    if (validation.success) {
      globalProductionFormService.updateForm(validation.data);
    }
  }

  const currentForm = globalProductionFormService.getForm();
  const summary = globalProductionFormService.calculateSummary(currentForm);

  const result = await erpnextService.syncProductionForm(currentForm, summary);

  if (!result.success) {
    res.status(500).json({
      success: false,
      error: result.error,
      details: result.details,
    });
    return;
  }

  res.json({
    success: true,
    message: `Form successfully synced to ERPNext document: ${result.documentName}`,
    documentName: result.documentName,
    rawResponse: result.rawResponse,
  });
});
