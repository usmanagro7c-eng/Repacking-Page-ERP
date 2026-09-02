import type {
  GatePassData,
  GatePassRow,
  GatePassSummary,
  PartialGatePassData,
} from "../types/gatepass.types.js";
import { GatePassSchema } from "../types/gatepass.types.js";

const DEFAULT_ROWS_COUNT = 9;

export function createEmptyRows(count: number = DEFAULT_ROWS_COUNT): GatePassRow[] {
  return Array.from({ length: count }, () => ({
    qty: "",
    packing: "",
    itemCode: "",
    detail: "",
    weight: "",
    uom: "Kg",
  }));
}

export function createInitialGatePass(type: "outward" | "inward" = "outward"): GatePassData {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: `gp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    no: "",
    relatedOutwardNo: "",
    date: today,
    adda: "",
    baraye: "",
    party: "",
    phone: "",
    fromWarehouse: "",
    toWarehouse: "",
    godam: "",
    vehicle: "",
    driver: "",
    contact: "",
    rickshaw: "",
    extra: "",
    receiverSign: "",
    godownInchargeSign: "",
    inchargeSign: "",
    rows: createEmptyRows(DEFAULT_ROWS_COUNT),
    docstatus: 0,
    createdAt: new Date().toISOString(),
  };
}

export class GatePassService {
  private activeOutwardForm: GatePassData;
  private activeInwardForm: GatePassData;
  private history: GatePassData[] = [];

  constructor() {
    this.activeOutwardForm = createInitialGatePass("outward");
    this.activeInwardForm = createInitialGatePass("inward");
  }

  public getForm(type: "outward" | "inward"): GatePassData {
    return type === "inward" ? { ...this.activeInwardForm } : { ...this.activeOutwardForm };
  }

  public updateForm(type: "outward" | "inward", patch: PartialGatePassData): GatePassData {
    const current = type === "inward" ? this.activeInwardForm : this.activeOutwardForm;
    const merged = { ...current, ...patch, type, updatedAt: new Date().toISOString() };
    
    // Ensure rows array is valid
    if (merged.rows && merged.rows.length < DEFAULT_ROWS_COUNT) {
      const needed = DEFAULT_ROWS_COUNT - merged.rows.length;
      merged.rows = [...merged.rows, ...createEmptyRows(needed)];
    }

    const parsed = GatePassSchema.parse(merged);
    if (type === "inward") {
      this.activeInwardForm = parsed;
    } else {
      this.activeOutwardForm = parsed;
    }
    return parsed;
  }

  public resetForm(type: "outward" | "inward"): GatePassData {
    const newForm = createInitialGatePass(type);
    if (type === "outward") {
      this.activeOutwardForm = newForm;
    } else {
      this.activeInwardForm = newForm;
    }
    return newForm;
  }

  public saveToHistory(form: GatePassData): GatePassData {
    const existingIdx = this.history.findIndex(
      (h) => (h.id && h.id === form.id) || (h.no && h.no === form.no),
    );
    const updatedForm = { ...form, updatedAt: new Date().toISOString() };

    if (existingIdx >= 0) {
      this.history[existingIdx] = updatedForm;
    } else {
      this.history.unshift(updatedForm);
    }
    return updatedForm;
  }

  public getHistory(): GatePassData[] {
    return [...this.history];
  }

  public getHistoryById(idOrNo: string): GatePassData | null {
    return this.history.find((h) => h.id === idOrNo || h.no === idOrNo) || null;
  }

  /**
   * Pre-fills an Inward Gate Pass from an Outward Gate Pass
   */
  public createInwardFromOutward(outward: GatePassData): GatePassData {
    const inward: GatePassData = {
      ...createInitialGatePass("inward"),
      no: "",
      relatedOutwardNo: outward.no || outward.erpDocName || "",
      date: new Date().toISOString().split("T")[0],
      adda: outward.adda || "",
      baraye: outward.baraye || "",
      party: outward.party || "",
      phone: outward.phone || "",
      fromWarehouse: outward.fromWarehouse || "",
      toWarehouse: outward.toWarehouse || "",
      godam: outward.godam || "",
      vehicle: outward.vehicle || "",
      driver: outward.driver || "",
      contact: outward.contact || "",
      rickshaw: outward.rickshaw || "",
      extra: `Outward Ref: ${outward.no}. ${outward.extra || ""}`.trim(),
      rows: outward.rows && outward.rows.length > 0 ? [...outward.rows] : createEmptyRows(DEFAULT_ROWS_COUNT),
      docstatus: 0,
    };
    this.activeInwardForm = inward;
    return inward;
  }

  public calculateSummary(form: GatePassData): GatePassSummary {
    const parseNum = (val?: string): number => {
      if (!val) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    let totalQty = 0;
    let totalWeight = 0;
    let rowCount = 0;

    for (const r of form.rows || []) {
      const q = parseNum(r.qty);
      const w = parseNum(r.weight);
      const p = parseNum(r.packing);

      if (q > 0 || w > 0 || r.detail?.trim()) {
        rowCount += 1;
      }
      totalQty += q;

      if (w > 0) {
        totalWeight += w;
      } else if (q > 0 && p > 0) {
        totalWeight += q * p;
      }
    }

    return {
      totalQty: Math.round(totalQty * 100) / 100,
      totalWeight: Math.round(totalWeight * 100) / 100,
      rowCount,
    };
  }
}

export const globalGatePassService = new GatePassService();
