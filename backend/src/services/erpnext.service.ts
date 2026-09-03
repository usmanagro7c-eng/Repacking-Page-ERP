import { erpnextConfig } from "../config/erpnext.config.js";
import type {
  GatePassData,
  ErpnextItem,
  ErpnextWarehouse,
  ErpnextMaterialTransfer,
} from "../types/gatepass.types.js";
import type { ProductionFormData } from "../types/production-form.types.js";

export type ErpnextSyncResult =
  | { success: true; documentName: string; docUrl: string; rawResponse: unknown }
  | { success: false; error: string; details?: unknown };

export type ErpnextTestResult = {
  success: boolean;
  message: string;
  user?: string;
  details?: unknown;
};

export class ErpnextService {
  /**
   * Base ERPNext URL without trailing slash
   */
  public getBaseUrl(): string {
    return erpnextConfig.url.replace(/\/$/, "");
  }

  /**
   * Helper to build request headers.
   * When userSid is provided, requests are executed strictly within the authenticated user's session,
   * enforcing ERPNext's role permissions, user permissions (e.g. warehouse restrictions), and document access rules.
   */
  public getHeaders(userSid?: string): Record<string, string> {
    if (userSid && userSid.trim()) {
      return {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `sid=${userSid.trim()}`,
      };
    }
    return erpnextConfig.headers;
  }

  /**
   * Helper fetch with timeout
   */
  private async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Helper to safely parse JSON from Response
   */
  private async safeJson<T = Record<string, unknown>>(res: Response): Promise<{ isJson: boolean; data: T; text: string }> {
    try {
      const text = await res.text();
      try {
        const data = JSON.parse(text) as T;
        return { isJson: true, data, text };
      } catch {
        return { isJson: false, data: {} as T, text };
      }
    } catch {
      return { isJson: false, data: {} as T, text: "" };
    }
  }

  /**
   * Formats HTTP error response cleanly
   */
  private formatHttpError(status: number, text: string): string {
    if (status === 526) {
      return `ERPNext سرور نے HTTP 526 (Cloudflare SSL Error) کا جواب دیا ہے۔ (dev16.mmmc.pk کا SSL سرٹیفکیٹ چیک کریں)`;
    }
    if (status === 502 || status === 504) {
      return `ERPNext سرور عارضی طور پر جواب نہیں دے رہا (HTTP ${status} Bad Gateway/Timeout)`;
    }
    if (status === 401 || status === 403) {
      return `ERPNext API کیز کی توثیق نہیں ہو سکی (HTTP ${status} Unauthorized / Forbidden)`;
    }
    if (status === 404) {
      return `ERPNext پر مطلوبہ ڈاکٹائپ یا اینڈ پوائنٹ موجود نہیں ہے (HTTP 404 Not Found)`;
    }
    return `سرور سے رابطہ نہ ہو سکا (HTTP Status: ${status})${text ? ` - ${text.substring(0, 100)}` : ""}`;
  }

  /**
   * Tests connection to ERPNext
   */
  public async testConnection(): Promise<ErpnextTestResult> {
    if (!erpnextConfig.isConfigured) {
      return {
        success: false,
        message: "سسٹم کی ترتیبات نامکمل ہیں۔",
      };
    }

    try {
      const targetUrl = `${this.getBaseUrl()}/api/method/frappe.auth.get_logged_user`;
      const res = await this.secureFetch(targetUrl, {
        method: "GET",
        headers: erpnextConfig.headers,
      });

      const { data, text } = await this.safeJson<{ message?: string }>(res);

      if (!res.ok) {
        return {
          success: false,
          message: this.formatHttpError(res.status, text),
        };
      }

      return {
        success: true,
        message: `سسٹم کے ساتھ رابطہ کامیاب ہے! صارف: ${data.message || "Logged In"}`,
        user: data.message,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "نیٹ ورک مسئلہ";
      return {
        success: false,
        message: `سرور سے رابطہ منقطع ہے: ${errMsg}`,
        details: err,
      };
    }
  }

  /**
   * Fetches Item list from ERPNext REST API
   */
  public async getItemsList(userSid?: string): Promise<ErpnextItem[]> {
    if (!erpnextConfig.isConfigured && !userSid) {
      return [];
    }

    try {
      const query = new URLSearchParams({
        fields: JSON.stringify(["name", "item_name", "item_code", "stock_uom", "description", "item_group"]),
        limit_page_length: "500",
        order_by: "item_name asc",
      });
      const targetUrl = `${this.getBaseUrl()}/api/resource/Item?${query.toString()}`;
      
      const res = await this.secureFetch(targetUrl, {
        headers: this.getHeaders(userSid),
      });

      if (!res.ok) {
        return [];
      }

      const json = (await res.json()) as { data?: ErpnextItem[] };
      return json.data || [];
    } catch (err) {
      console.warn("Items fetch failed:", err);
      return [];
    }
  }

  /**
   * Fetches Warehouse list from ERPNext REST API
   * ERPNext filters warehouses strictly according to user permissions if userSid is provided.
   */
  public async getWarehousesList(userSid?: string): Promise<ErpnextWarehouse[]> {
    if (!erpnextConfig.isConfigured && !userSid) {
      return [];
    }

    try {
      const query = new URLSearchParams({
        fields: JSON.stringify(["name", "warehouse_name", "company", "is_group"]),
        filters: JSON.stringify([["Warehouse", "is_group", "=", 0]]),
        limit_page_length: "200",
      });
      const targetUrl = `${this.getBaseUrl()}/api/resource/Warehouse?${query.toString()}`;

      const res = await this.secureFetch(targetUrl, {
        headers: this.getHeaders(userSid),
      });

      if (!res.ok) {
        return [];
      }

      const json = (await res.json()) as { data?: ErpnextWarehouse[] };
      return json.data || [];
    } catch (err) {
      console.warn("Warehouses fetch failed:", err);
      return [];
    }
  }

  /**
   * Fetches batches for an item from ERPNext
   */
  public async getBatchesForItem(itemCode: string, userSid?: string): Promise<string[]> {
    if ((!erpnextConfig.isConfigured && !userSid) || !itemCode?.trim()) return [];
    try {
      const query = new URLSearchParams({
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([["Batch", "item", "=", itemCode.trim()]]),
        limit_page_length: "100",
      });
      const targetUrl = `${this.getBaseUrl()}/api/resource/Batch?${query.toString()}`;
      const res = await this.secureFetch(targetUrl, {
        headers: this.getHeaders(userSid),
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: Array<{ name: string }> };
      return (json.data || []).map((batch) => String(batch.name));
    } catch (err) {
      console.warn("Failed to fetch batches:", err);
      return [];
    }
  }

  /**
   * Fetches UOMs for an item from ERPNext
   */
  public async getUomsForItem(itemCode: string, userSid?: string): Promise<string[]> {
    if ((!erpnextConfig.isConfigured && !userSid) || !itemCode?.trim()) return ["Kg"];
    try {
      const targetUrl = `${this.getBaseUrl()}/api/resource/Item/${encodeURIComponent(itemCode.trim())}?fields=${encodeURIComponent(JSON.stringify(["uoms"]))}`;
      const res = await this.secureFetch(targetUrl, {
        headers: this.getHeaders(userSid),
      });
      if (!res.ok) return ["Kg"];
      const json = (await res.json()) as { data?: { uoms?: Array<{ uom?: string }> } };
      const uoms = (json.data?.uoms || [])
        .map((row) => String(row.uom || "").trim())
        .filter(Boolean);
      return uoms.length > 0 ? [...new Set(["Kg", ...uoms])] : ["Kg"];
    } catch (err) {
      console.warn("Failed to fetch UOMs:", err);
      return ["Kg"];
    }
  }

  /**
   * Fetches ERPNext user image / logo for logged in user
   */
  public async getUserLogo(userEmail?: string, userSid?: string): Promise<string> {
    if (!erpnextConfig.isConfigured && !userSid) return "";
    try {
      const targetUser = userEmail ? encodeURIComponent(userEmail.trim()) : "Administrator";
      const targetUrl = `${this.getBaseUrl()}/api/resource/User/${targetUser}?fields=${encodeURIComponent(JSON.stringify(["user_image", "user_image_small"]))}`;
      const res = await this.secureFetch(targetUrl, {
        headers: this.getHeaders(userSid),
      });
      if (!res.ok) return "";
      const json = (await res.json()) as {
        data?: { user_image?: string; user_image_small?: string };
      };
      const image = json.data?.user_image || json.data?.user_image_small || "";
      if (!image) return "";
      return image.startsWith("http") ? image : `${this.getBaseUrl()}${image}`;
    } catch (err) {
      return "";
    }
  }

  /**
   * Fetches recent Material Transfers (Stock Entry) from ERPNext
   * ERPNext filters results based on user's exact roles and permissions if userSid is provided.
   */
  public async getMaterialTransfersList(userSid?: string): Promise<ErpnextMaterialTransfer[]> {
    if (!erpnextConfig.isConfigured && !userSid) return [];

    try {
      const query = new URLSearchParams({
        filters: JSON.stringify([["Stock Entry", "purpose", "=", "Material Transfer"]]),
        fields: JSON.stringify([
          "name",
          "posting_date",
          "posting_time",
          "purpose",
          "from_warehouse",
          "to_warehouse",
          "docstatus",
          "remarks",
          "total_qty",
        ]),
        order_by: "creation desc",
        limit_page_length: "50",
      });
      const targetUrl = `${this.getBaseUrl()}/api/resource/Stock Entry?${query.toString()}`;

      const res = await this.secureFetch(targetUrl, {
        headers: this.getHeaders(userSid),
      });

      if (!res.ok) return [];

      const json = (await res.json()) as { data?: ErpnextMaterialTransfer[] };
      return json.data || [];
    } catch (err) {
      console.warn("Failed to fetch ERPNext Material Transfers:", err);
      return [];
    }
  }

  /**
   * Fetches a specific Material Transfer by ID from ERPNext
   */
  public async getMaterialTransferById(docName: string, userSid?: string): Promise<ErpnextMaterialTransfer | null> {
    if ((!erpnextConfig.isConfigured && !userSid) || !docName?.trim()) return null;

    try {
      const targetUrl = `${this.getBaseUrl()}/api/resource/Stock Entry/${encodeURIComponent(docName.trim())}`;
      const res = await this.secureFetch(targetUrl, {
        headers: this.getHeaders(userSid),
      });

      if (!res.ok) return null;

      const json = (await res.json()) as { data?: ErpnextMaterialTransfer };
      return json.data || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Builds ERPNext Stock Entry payload for Material Transfer (Gate Pass)
   */
  public buildMaterialTransferPayload(gatePassData: GatePassData) {
    const parseNum = (str: string): number => {
      const val = parseFloat(str);
      return isNaN(val) ? 0 : val;
    };

    const sWarehouse =
      gatePassData.fromWarehouse?.trim() || erpnextConfig.defaultRawWarehouse || "Stores - T";
    const tWarehouse =
      gatePassData.toWarehouse?.trim() || erpnextConfig.defaultFinishedWarehouse || "Finished Goods - T";

    const items: Array<Record<string, unknown>> = [];

    for (const row of gatePassData.rows) {
      const detail = row.detail?.trim() || "";
      const itemCode = row.itemCode?.trim() || detail;
      const qtyNum = parseNum(row.qty);
      const weightNum = parseNum(row.weight);
      const packingNum = parseNum(row.packing);

      let transferQty = weightNum;
      if (transferQty <= 0 && qtyNum > 0) {
        transferQty = packingNum > 0 ? qtyNum * packingNum : qtyNum;
      }
      if (transferQty <= 0) transferQty = 1;

      if (itemCode || detail || qtyNum > 0 || weightNum > 0) {
        items.push({
          item_code: itemCode || "General Item",
          qty: transferQty,
          transfer_qty: transferQty,
          uom: row.uom?.trim() || "Kg",
          stock_uom: row.uom?.trim() || "Kg",
          s_warehouse: sWarehouse,
          t_warehouse: tWarehouse,
          allow_zero_valuation_rate: 1,
          description: [
            detail ? `تفصیل: ${detail}` : "",
            qtyNum > 0 ? `تعداد: ${qtyNum}` : "",
            packingNum > 0 ? `پیکنگ: ${packingNum} کلو` : "",
            weightNum > 0 ? `کل وزن: ${weightNum} کلو` : "",
          ]
            .filter(Boolean)
            .join(" | "),
        });
      }
    }

    if (items.length === 0) {
      items.push({
        item_code: "General Item",
        qty: 1,
        transfer_qty: 1,
        uom: "Kg",
        stock_uom: "Kg",
        s_warehouse: sWarehouse,
        t_warehouse: tWarehouse,
        allow_zero_valuation_rate: 1,
        description: "گیٹ پاس میٹریل ٹرانسفر",
      });
    }

    const passTypeUrdu = gatePassData.type === "inward" ? "ان ورڈ گیٹ پاس (Inward)" : "آؤٹ ورڈ گیٹ پاس (Outward)";
    
    const remarksParts = [
      `[MMMC ${passTypeUrdu}]`,
      gatePassData.no ? `پاس نمبر: ${gatePassData.no}` : "",
      gatePassData.relatedOutwardNo ? `متعلقہ آؤٹ ورڈ نمبر: ${gatePassData.relatedOutwardNo}` : "",
      gatePassData.adda ? `اڈہ: ${gatePassData.adda}` : "",
      gatePassData.baraye ? `برائے: ${gatePassData.baraye}` : "",
      gatePassData.party ? `پارٹی / لینے والا: ${gatePassData.party}` : "",
      gatePassData.phone ? `فون: ${gatePassData.phone}` : "",
      gatePassData.fromWarehouse ? `روانگی گودام: ${gatePassData.fromWarehouse}` : "",
      gatePassData.toWarehouse ? `منزل گودام: ${gatePassData.toWarehouse}` : "",
      gatePassData.vehicle ? `گاڑی نمبر: ${gatePassData.vehicle}` : "",
      gatePassData.driver ? `ڈرائیور: ${gatePassData.driver}` : "",
      gatePassData.contact ? `ڈرائیور فون: ${gatePassData.contact}` : "",
      gatePassData.rickshaw ? `رکشہ کرایہ: ${gatePassData.rickshaw}` : "",
      gatePassData.extra ? `اضافی تفصیل: ${gatePassData.extra}` : "",
    ].filter(Boolean);

    return {
      doctype: "Stock Entry",
      purpose: "Material Transfer",
      stock_entry_type: "Material Transfer",
      from_warehouse: sWarehouse,
      to_warehouse: tWarehouse,
      posting_date: gatePassData.date || new Date().toISOString().split("T")[0],
      posting_time: new Date().toTimeString().split(" ")[0],
      remarks: remarksParts.join(" | "),
      items,
      docstatus: gatePassData.docstatus || 0,
      custom_gate_pass_no: gatePassData.no,
      custom_gate_pass_type: gatePassData.type,
      custom_vehicle_no: gatePassData.vehicle,
      custom_driver_name: gatePassData.driver,
      custom_driver_phone: gatePassData.contact,
      custom_rickshaw_fare: gatePassData.rickshaw,
      custom_party_name: gatePassData.party || gatePassData.baraye,
      custom_gate_pass_json: JSON.stringify(gatePassData),
    };
  }

  /**
   * Syncs Gate Pass to ERPNext as Material Transfer Stock Entry
   * When userSid is provided, the entry is created under the user's ERPNext session,
   * verifying user roles, permissions, and warehouse constraints.
   */
  public async syncGatePass(gatePassData: GatePassData, userSid?: string): Promise<ErpnextSyncResult> {
    if (!erpnextConfig.isConfigured && !userSid) {
      return {
        success: false,
        error: "ERPNext سیٹنگز موجود نہیں ہیں۔ براہ کرم لاگ اِن کریں یا کریڈینشلز چیک کریں۔",
      };
    }

    const payload = this.buildMaterialTransferPayload(gatePassData);
    const targetUrl = `${this.getBaseUrl()}/api/resource/Stock Entry`;

    try {
      const response = await this.secureFetch(targetUrl, {
        method: "POST",
        headers: this.getHeaders(userSid),
        body: JSON.stringify(payload),
      });

      const { isJson, data: json, text } = await this.safeJson<{
        data?: { name?: string };
        message?: string;
        _server_messages?: string;
        exception?: string;
      }>(response);

      if (!response.ok) {
        if (response.status === 403 || json.exception?.includes("PermissionError")) {
          return {
            success: false,
            error: "آپ کے ERPNext اکاؤنٹ کو میٹریل ٹرانسفر (Stock Entry) بنانے کی اجازت نہیں ہے۔ براہ کرم اپنے ایڈمنسٹریٹر سے رابطہ کریں۔ (Permission Denied)",
            details: json,
          };
        }

        let errorMsg: string = json.message || json.exception || "";
        if (!errorMsg && !isJson) {
          errorMsg = this.formatHttpError(response.status, text);
        } else if (!errorMsg) {
          errorMsg = `HTTP ${response.status} Failed to create Material Transfer`;
        }

        if (json._server_messages) {
          try {
            const parsedMsgs = JSON.parse(json._server_messages);
            const detailed = parsedMsgs.map((m: string) => {
              try { return JSON.parse(m).message; } catch { return m; }
            }).join(" | ");
            if (detailed) errorMsg = detailed;
          } catch {
            // ignore
          }
        }
        return {
          success: false,
          error: errorMsg || `HTTP ${response.status} Error`,
          details: json,
        };
      }

      const docName = json.data?.name || "MAT-STE-CREATED";
      const docUrl = `${this.getBaseUrl()}/app/stock-entry/${encodeURIComponent(docName)}`;

      return {
        success: true,
        documentName: docName,
        docUrl,
        rawResponse: json,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "ERPNext سرور کے ساتھ رابطہ نہیں ہو سکا";
      return {
        success: false,
        error: errMsg,
      };
    }
  }

  /**
   * Builds ERPNext Stock Entry payload for Repack (Production Form)
   */
  public buildRepackPayload(formData: ProductionFormData, summaryStats?: unknown) {
    const parseNum = (str: string): number => {
      const val = parseFloat(str);
      return isNaN(val) ? 0 : val;
    };

    const items: Array<Record<string, unknown>> = [];
    const defaultUOM = "Kg";
    const defaultRawWarehouse = erpnextConfig.defaultRawWarehouse || "Stores - T";
    const defaultFinishedWarehouse = erpnextConfig.defaultFinishedWarehouse || "Finished Goods - T";

    // Raw Material 1
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
        description: `خام مال ۱ ${lot ? `(Lot: ${lot})` : ""}`,
        ...(lot ? { batch_no: lot } : {}),
      });
    }

    // Raw Material 2
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
        description: `خام مال ۲ ${lot ? `(Lot: ${lot})` : ""}`,
        ...(lot ? { batch_no: lot } : {}),
      });
    }

    // Finished Product
    if (formData.readyName?.trim()) {
      const rawTotalWeight = parseNum(formData.totalWeight[0]) + parseNum(formData.totalWeight[1]);
      const lot = formData.readyLot?.trim();
      const uom = formData.readyUom?.trim() || defaultUOM;
      items.push({
        item_code: formData.readyName.trim(),
        qty: rawTotalWeight > 0 ? rawTotalWeight : (parseNum(formData.readyWeight) || 1),
        uom,
        stock_uom: uom,
        t_warehouse: defaultFinishedWarehouse,
        is_finished_item: 1,
        allow_zero_valuation_rate: 1,
        description: `تیار شدہ مال ${lot ? `(Lot: ${lot})` : ""} (بیگ تعداد: ${formData.readyBags || "0"})`,
        ...(lot ? { batch_no: lot } : {}),
      });
    }

    const remarksText = [
      `مال کی تیاری کی تفصیل (Repack) - Form No: ${formData.formNo || "N/A"}`,
      formData.notes ? `تفصیلات: ${formData.notes}` : "",
      formData.signMaker ? `تیار کنندہ: ${formData.signMaker}` : "",
      formData.signIncharge ? `انچارج: ${formData.signIncharge}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      doctype: "Stock Entry",
      purpose: "Repack",
      stock_entry_type: "Repack",
      posting_date: formData.date || new Date().toISOString().split("T")[0],
      remarks: remarksText,
      items,
      custom_form_no: formData.formNo,
      custom_form_json: JSON.stringify(formData),
    };
  }

  /**
   * Syncs Repack / Production Form to ERPNext as Stock Entry (Repack)
   * When userSid is provided, the entry is created under the user's ERPNext session,
   * verifying user roles and manufacturing / stock entry permissions.
   */
  public async syncProductionForm(
    formData: ProductionFormData,
    summaryStats?: unknown,
    userSid?: string,
  ): Promise<ErpnextSyncResult> {
    if (!erpnextConfig.isConfigured && !userSid) {
      return {
        success: false,
        error: "ERPNext سیٹنگز موجود نہیں ہیں۔ براہ کرم لاگ اِن کریں یا کریڈینشلز چیک کریں۔",
      };
    }

    if (!formData.readyName?.trim()) {
      return {
        success: false,
        error: "ERPNext Repack Stock Entry کے لیے 'تیار شدہ مال کا نام' درج کرنا لازمی ہے۔",
      };
    }

    const payload = this.buildRepackPayload(formData, summaryStats);
    const targetUrl = `${this.getBaseUrl()}/api/resource/Stock Entry`;

    try {
      const response = await this.secureFetch(targetUrl, {
        method: "POST",
        headers: this.getHeaders(userSid),
        body: JSON.stringify(payload),
      });

      const { isJson, data: json, text } = await this.safeJson<{
        data?: { name?: string };
        message?: string;
        _server_messages?: string;
        exception?: string;
      }>(response);

      if (!response.ok) {
        if (response.status === 403 || json.exception?.includes("PermissionError")) {
          return {
            success: false,
            error: "آپ کے ERPNext اکاؤنٹ کو ریپیکنگ / سٹاک انٹری بنانے کی اجازت نہیں ہے۔ براہ کرم اپنے ایڈمنسٹریٹر سے رابطہ کریں۔ (Permission Denied)",
            details: json,
          };
        }

        let errorMsg: string = json.message || json.exception || "";
        if (!errorMsg && !isJson) {
          errorMsg = this.formatHttpError(response.status, text);
        } else if (!errorMsg) {
          errorMsg = `HTTP ${response.status} Failed to create Repack Stock Entry`;
        }

        if (json._server_messages) {
          try {
            const parsedMsgs = JSON.parse(json._server_messages);
            const detailed = parsedMsgs.map((m: string) => {
              try { return JSON.parse(m).message; } catch { return m; }
            }).join(" | ");
            if (detailed) errorMsg = detailed;
          } catch {
            // ignore
          }
        }
        return {
          success: false,
          error: errorMsg || `HTTP ${response.status} Error`,
          details: json,
        };
      }

      const docName = json.data?.name || "REPACK-STE-CREATED";
      const docUrl = `${this.getBaseUrl()}/app/stock-entry/${encodeURIComponent(docName)}`;

      return {
        success: true,
        documentName: docName,
        docUrl,
        rawResponse: json,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "ERPNext سرور کے ساتھ رابطہ نہیں ہو سکا";
      return {
        success: false,
        error: errMsg,
      };
    }
  }
}

export const erpnextService = new ErpnextService();
