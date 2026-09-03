export interface GatePassRow {
  qty: string;
  packing: string;
  itemCode?: string;
  detail: string;
  weight: string;
  uom?: string;
}

export interface GatePassData {
  id?: string;
  type: "outward" | "inward";
  no: string;
  relatedOutwardNo?: string;
  date: string;
  adda: string;
  baraye: string;
  party: string;
  phone: string;
  fromWarehouse: string;
  toWarehouse: string;
  godam?: string;
  vehicle: string;
  driver: string;
  contact: string;
  rickshaw: string;
  extra: string;
  receiverSign?: string;
  godownInchargeSign?: string;
  inchargeSign?: string;
  rows: GatePassRow[];
  erpDocName?: string;
  docstatus?: number;
}

export interface GatePassSummary {
  totalQty: number;
  totalWeight: number;
  rowCount: number;
}

export interface ErpnextItem {
  name: string;
  item_name?: string;
  item_code?: string;
  stock_uom?: string;
  description?: string;
  item_group?: string;
}

export interface ErpnextWarehouse {
  name: string;
  warehouse_name?: string;
  company?: string;
  is_group?: number;
}

export interface ErpnextMaterialTransfer {
  name: string;
  posting_date: string;
  posting_time?: string;
  purpose: string;
  from_warehouse?: string;
  to_warehouse?: string;
  docstatus: number;
  remarks?: string;
  total_qty?: number;
  items?: Array<{
    item_code: string;
    item_name?: string;
    description?: string;
    qty: number;
    uom?: string;
    stock_uom?: string;
    s_warehouse?: string;
    t_warehouse?: string;
  }>;
  custom_gate_pass_no?: string;
  custom_vehicle_no?: string;
  custom_driver_name?: string;
  custom_rickshaw_fare?: string;
  custom_party_name?: string;
}

export interface ErpConfig {
  url: string;
  isConfigured: boolean;
  docType: string;
  defaultRawWarehouse: string;
  defaultFinishedWarehouse: string;
}

// API base can be configured at build time via Vite env `VITE_API_BASE`.
// Fallback to local dev server in development or the deployed Worker URL in production.
const API_BASE =
  import.meta.env["VITE_API_BASE"] ||
  (import.meta.env.DEV ? "http://localhost:5000" : "https://mmmc-backend.m-jawadahmad116.workers.dev");

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  // Automatically inject logged-in user's session sid so all ERP calls run under the user's identity
  const authHeaders: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("mmmc_erp_auth_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.sid) {
          authHeaders["x-user-sid"] = u.sid;
          authHeaders["Authorization"] = `Bearer ${u.sid}`;
        }
      }
    } catch {
      // non-fatal
    }
  }

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err: unknown) {
    // In development only, allow falling back to a relative path (vite proxy or local server).
    // In production we should not retry a relative path because that will hit the Pages site and produce 404s.
    if (import.meta.env.DEV) {
      try {
        const fallbackRes = await fetch(endpoint, {
          headers: { "Content-Type": "application/json", ...options.headers },
          ...options,
        });
        const data = await fallbackRes.json();
        if (!fallbackRes.ok) throw new Error(data?.error || data?.message || "Request failed");
        return data;
      } catch {
        throw new Error("Backend سرور سے رابطہ نہیں ہو سکا (Backend server is offline or unreachable)");
      }
    }
    throw err;
  }
}

export const api = {
  async getHealth() {
    return apiFetch<{ status: string; erpnextConfigured: boolean; erpnextUrl: string }>("/api/health");
  },

  async getGatePass(type: "outward" | "inward" = "outward") {
    return apiFetch<{
      success: boolean;
      data: { form: GatePassData; summary: GatePassSummary };
    }>(`/api/gatepass?type=${type}`);
  },

  async updateGatePass(formData: Partial<GatePassData>) {
    return apiFetch<{
      success: boolean;
      message: string;
      data: { form: GatePassData; summary: GatePassSummary };
    }>("/api/gatepass", {
      method: "POST",
      body: JSON.stringify(formData),
    });
  },

  async resetGatePass(type: "outward" | "inward" = "outward") {
    return apiFetch<{
      success: boolean;
      message: string;
      data: { form: GatePassData; summary: GatePassSummary };
    }>("/api/gatepass/reset", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
  },

  async convertToInward(outwardData?: GatePassData) {
    return apiFetch<{
      success: boolean;
      message: string;
      data: { form: GatePassData; summary: GatePassSummary };
    }>("/api/gatepass/convert-to-inward", {
      method: "POST",
      body: JSON.stringify(outwardData || {}),
    });
  },

  async getItems() {
    return apiFetch<{ success: boolean; data: ErpnextItem[] }>("/api/gatepass/items");
  },

  async getWarehouses() {
    return apiFetch<{ success: boolean; data: ErpnextWarehouse[] }>("/api/gatepass/warehouses");
  },

  async getTransfers() {
    return apiFetch<{ success: boolean; data: ErpnextMaterialTransfer[] }>("/api/gatepass/transfers");
  },

  async getTransferById(name: string) {
    return apiFetch<{ success: boolean; data: ErpnextMaterialTransfer }>(`/api/gatepass/transfers/${encodeURIComponent(name)}`);
  },

  async syncToERPNext(formData: GatePassData) {
    return apiFetch<{
      success: boolean;
      message: string;
      documentName: string;
      docUrl: string;
      rawResponse?: unknown;
    }>("/api/gatepass/sync-erpnext", {
      method: "POST",
      body: JSON.stringify(formData),
    });
  },

  async testConnection() {
    return apiFetch<{ success: boolean; message: string; user?: string }>("/api/gatepass/test-connection", {
      method: "POST",
    });
  },

  async getConfig() {
    return apiFetch<{ success: boolean; data: ErpConfig }>("/api/gatepass/config");
  },

  async getHistory() {
    return apiFetch<{ success: boolean; data: GatePassData[] }>("/api/gatepass/history");
  },

  // Authentication API endpoints
  async login(usr: string, pwd: string, erpUrl?: string) {
    return apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ usr, pwd, erpUrl }),
    });
  },

  async loginWithApiKey(apiKey: string, apiSecret: string, erpUrl?: string) {
    return apiFetch<AuthResponse>("/api/auth/login-api-key", {
      method: "POST",
      body: JSON.stringify({ apiKey, apiSecret, erpUrl }),
    });
  },

  async verifySession(sid: string, erpUrl?: string) {
    return apiFetch<{ success: boolean; valid: boolean; user?: string }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ sid, erpUrl }),
    });
  },

  async logout(sid?: string, erpUrl?: string) {
    return apiFetch<{ success: boolean; message: string }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ sid, erpUrl }),
    });
  },
};

export interface UserPermissions {
  roles: string[];
  allowedWarehouses: string[];
  canReadStockEntry: boolean;
  canCreateStockEntry: boolean;
  canSubmitStockEntry: boolean;
}

export interface AuthUser {
  username: string;
  fullName: string;
  email: string;
  roles?: string[];
  permissions?: UserPermissions;
  sid?: string;
  erpUrl: string;
  authType?: "password" | "apiKey";
  loginTime?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  error?: string;
}

