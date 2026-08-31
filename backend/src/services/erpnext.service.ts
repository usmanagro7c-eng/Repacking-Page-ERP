import { erpnextConfig } from "../config/erpnext.config.js";
import type { ProductionFormData } from "../types/production-form.types.js";

export type ErpnextSyncResult =
  | { success: true; documentName: string; rawResponse: unknown }
  | { success: false; error: string; details?: unknown };

export class ErpnextService {
  /**
   * ERPNext base URL (without trailing slash) used to build document links.
   */
  public getBaseUrl(): string {
    return erpnextConfig.url.replace(/\/$/, "");
  }

  /**
   * Builds ERPNext Stock Entry document payload with stock_entry_type = "Repack"
   */
  public buildStockEntryPayload(formData: ProductionFormData, summaryStats: unknown) {
    const parseNum = (str: string): number => {
      const val = parseFloat(str);
      return isNaN(val) ? 0 : val;
    };

    const items: Array<Record<string, unknown>> = [];
    const defaultUOM = process.env.ERPNEXT_DEFAULT_UOM || "Kg";
    const defaultRawWarehouse = process.env.ERPNEXT_RAW_WAREHOUSE || "Stores - T";
    const defaultFinishedWarehouse = process.env.ERPNEXT_FINISHED_WAREHOUSE || "Finished Goods - T";

    // 1. Raw Material 1 (Source - Consumed)
    if (formData.rawName[0]?.trim()) {
      const lot = formData.lotNo[0]?.trim();
      const uom = formData.rawUom?.[0]?.trim() || defaultUOM;
      items.push({
        item_code: formData.rawName[0].trim(),
        qty: parseNum(formData.totalWeight[0]),
        uom,
        stock_uom: uom,
        s_warehouse: defaultRawWarehouse,
        is_finished_item: 0,
        allow_zero_valuation_rate: 1,
        description: `خام مال ۱ ${lot ? `(Lot No: ${lot}) ` : ""}(Cutting 25kg: ${formData.cutting25[0] || "0"}, 50kg: ${formData.cutting50[0] || "0"})`,
        ...(lot ? { batch_no: lot, use_serial_batch_fields: 1 } : {}),
      });
    }

    // 2. Raw Material 2 (Source - Consumed)
    if (formData.rawName[1]?.trim()) {
      const lot = formData.lotNo[1]?.trim();
      const uom = formData.rawUom?.[1]?.trim() || defaultUOM;
      items.push({
        item_code: formData.rawName[1].trim(),
        qty: parseNum(formData.totalWeight[1]),
        uom,
        stock_uom: uom,
        s_warehouse: defaultRawWarehouse,
        is_finished_item: 0,
        allow_zero_valuation_rate: 1,
        description: `خام مال ۲ ${lot ? `(Lot No: ${lot}) ` : ""}(Cutting 25kg: ${formData.cutting25[1] || "0"}, 50kg: ${formData.cutting50[1] || "0"})`,
        ...(lot ? { batch_no: lot, use_serial_batch_fields: 1 } : {}),
      });
    }

    // 3. Finished Goods / Ready Product (Target - Produced / Repacked)
    if (formData.readyName?.trim()) {
      // Use sum of raw material total weights as produced quantity in ERP
      const rawTotalWeight = parseNum(formData.totalWeight[0]) + parseNum(formData.totalWeight[1]);
      const lot = formData.readyLot?.trim();
      const uom = formData.readyUom?.trim() || defaultUOM;
      items.push({
        item_code: formData.readyName.trim(),
        qty: rawTotalWeight,
        uom,
        stock_uom: uom,
        t_warehouse: defaultFinishedWarehouse,
        is_finished_item: 1,
        allow_zero_valuation_rate: 1,
        description: `تیار شدہ مال ${lot ? `(Lot No: ${lot}) ` : ""}(Produced from raw weights: ${formData.totalWeight[0] || "0"} + ${formData.totalWeight[1] || "0"})`,
        ...(lot ? { batch_no: lot, use_serial_batch_fields: 1 } : {}),
      });
    }

    const remarksText = [
      `مال کی تیاری کی تفصیل - Form No: ${formData.formNo || "N/A"}`,
      formData.notes ? `تفصیلات: ${formData.notes}` : "",
      formData.signMaker ? `تیار کنندہ: ${formData.signMaker}` : "",
      formData.signIncharge ? `انچارج: ${formData.signIncharge}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      doctype: "Stock Entry",
      stock_entry_type: "Repack",
      purpose: "Repack",
      posting_date: formData.date || new Date().toISOString().split("T")[0],
      remarks: remarksText,
      items,
      custom_form_no: formData.formNo,
      custom_scan_barcode: formData.formNo,
      custom_summary_data: JSON.stringify(summaryStats),
      custom_form_json: JSON.stringify(formData),
    };
  }

  /**
   * Pushes a Production Form to ERPNext as a Stock Entry Document
   */
  public async syncProductionForm(
    formData: ProductionFormData,
    summaryStats: unknown,
  ): Promise<ErpnextSyncResult> {
    if (!erpnextConfig.isConfigured) {
      const errMsg = "ERPNext credentials not configured in backend environment (.env). Set ERPNEXT_URL, ERPNEXT_API_KEY, and ERPNEXT_API_SECRET.";
      console.error("❌ ERPNext Sync Error:", errMsg);
      return { success: false, error: errMsg };
    }

    // Validation before sending to ERPNext
    if (!formData.readyName?.trim()) {
      const errMsg = "ERPNext Repack Stock Entry require krti hai k 'تیار شدہ مال کا نام' (Ready Product Name) لازمی درج ہو۔";
      console.error("❌ Pre-Validation Error:", errMsg);
      return { success: false, error: errMsg };
    }

    const payload = this.buildStockEntryPayload(formData, summaryStats);

    if (payload.items.length === 0) {
      const errMsg = "فارم میں نہ خام مال موجود ہے اور نہ تیار شدہ مال۔ کم از کم ایک خام مال یا تیار شدہ مال درج کریں۔";
      console.error("❌ Pre-Validation Error:", errMsg);
      return { success: false, error: errMsg };
    }

    const targetUrl = `${erpnextConfig.url.replace(/\/$/, "")}/api/resource/Stock Entry`;

    console.log("--------------------------------------------------");
    console.log(`📤 Sending Stock Entry [Repack] to ERPNext: ${targetUrl}`);
    console.log("📦 Payload Items:", JSON.stringify(payload.items, null, 2));

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: erpnextConfig.headers,
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as {
        data?: { name?: string };
        message?: string;
        _server_messages?: string;
        exception?: string;
      };

      if (!response.ok) {
        console.error(`❌ ERPNext API Error (HTTP ${response.status}):`, JSON.stringify(json, null, 2));
        return {
          success: false,
          error: `ERPNext returned HTTP ${response.status}: ${json.message || json.exception || "Failed to create Stock Entry"}`,
          details: json,
        };
      }

      const docName = json.data?.name || "Created";
      console.log(`✅ ERPNext Stock Entry Created Successfully! Document Name: ${docName}`);
      console.log("--------------------------------------------------");
      return {
        success: true,
        documentName: docName,
        rawResponse: json,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error communicating with ERPNext";
      console.error("❌ Network / Fetch Exception during ERPNext Sync:", err);
      console.log("--------------------------------------------------");
      return {
        success: false,
        error: errMsg,
      };
    }
  }

  /**
   * Fetches Item list from ERPNext REST API
   */
  public async getItemsList(): Promise<Array<{ name: string; item_name?: string }>> {
    if (!erpnextConfig.isConfigured) return [];
    try {
      const targetUrl = `${erpnextConfig.url.replace(/\/$/, "")}/api/resource/Item?limit_page_length=500`;
      const res = await fetch(targetUrl, {
        headers: erpnextConfig.headers,
      });
      if (!res.ok) {
        console.error(`❌ ERPNext Items API Error (HTTP ${res.status}) for ${targetUrl}`);
        return [];
      }
      const json = (await res.json()) as { data?: Array<{ name: string; item_name?: string }> };
      return json.data || [];
    } catch (err) {
      console.error("Failed to fetch ERPNext items list:", err);
      return [];
    }
  }

  public async getBatchesForItem(itemCode: string): Promise<string[]> {
    if (!erpnextConfig.isConfigured || !itemCode?.trim()) return [];
    try {
      const query = new URLSearchParams({
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([[
          "Batch",
          "item",
          "=",
          itemCode.trim(),
        ]]),
        limit_page_length: "100",
      });
      const targetUrl = `${erpnextConfig.url.replace(/\/$/, "")}/api/resource/Batch?${query.toString()}`;
      const res = await fetch(targetUrl, {
        headers: erpnextConfig.headers,
      });
      if (!res.ok) {
        console.error(`❌ ERPNext Batches API Error (HTTP ${res.status}) for ${targetUrl}`);
        return [];
      }
      const json = await res.json() as { data?: Array<{ name: string }> };
      return (json.data || []).map((batch) => String(batch.name));
    } catch (err) {
      console.error("Failed to fetch ERPNext batches for item:", err);
      return [];
    }
  }

  public async getUomsForItem(itemCode: string): Promise<string[]> {
    if (!erpnextConfig.isConfigured || !itemCode?.trim()) return [];
    try {
      const targetUrl = `${erpnextConfig.url.replace(/\/$/, "")}/api/resource/Item/${encodeURIComponent(itemCode.trim())}?fields=${encodeURIComponent(JSON.stringify(["uoms"]))}`;
      const res = await fetch(targetUrl, {
        headers: erpnextConfig.headers,
      });
      if (!res.ok) {
        console.error(`❌ ERPNext UOMs API Error (HTTP ${res.status}) for ${targetUrl}`);
        return [];
      }
      const json = await res.json() as { data?: { uoms?: Array<{ uom?: string }> } };
      const uoms = (json.data?.uoms || [])
        .map((row) => String(row.uom || "").trim())
        .filter(Boolean);
      return [...new Set(uoms)];
    } catch (err) {
      console.error("Failed to fetch ERPNext UOMs for item:", err);
      return [];
    }
  }

  public async getUserLogo(): Promise<string> {
    if (!erpnextConfig.isConfigured) return "";
    try {
      const targetUrl = `${erpnextConfig.url.replace(/\/$/, "")}/api/resource/User/Administrator?fields=${encodeURIComponent(JSON.stringify(["user_image"]))}`;
      const res = await fetch(targetUrl, {
        headers: erpnextConfig.headers,
      });
      if (!res.ok) {
        console.error(`❌ ERPNext User Image API Error (HTTP ${res.status}) for ${targetUrl}`);
        return "";
      }
      const json = await res.json() as { data?: { user_image?: string; user_image_small?: string } };
      const image = json.data?.user_image || json.data?.user_image_small || "";
      if (!image) return "";
      return image.startsWith("http") ? image : `${erpnextConfig.url.replace(/\/$/, "")}${image}`;
    } catch (err) {
      console.error("Failed to fetch ERPNext user image:", err);
      return "";
    }
  }
}

export const erpnextService = new ErpnextService();
