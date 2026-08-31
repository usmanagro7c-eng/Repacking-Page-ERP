import type {
  PartialProductionFormData,
  ProductionFormData,
  ProductionFormSummary,
} from "../types/production-form.types.js";
import { ProductionFormSchema } from "../types/production-form.types.js";

export const EMPTY_PRODUCTION_FORM: ProductionFormData = {
  date: "",
  formNo: "",
  rawName: ["", ""],
  totalWeight: ["", ""],
  cutting25: ["", ""],
  cutting50: ["", ""],
  lotNo: ["", ""],
  remaining: ["", ""],
  rawUom: ["Kg", "Kg"],
  readyName: "",
  readyLot: "",
  readyUom: "Kg",
  readyBags: "",
  readyWeight: "",
  stock: "",
  notes: "",
  signMaker: "",
  signIncharge: "",
};

function cleanDefined<T extends object>(obj?: T): Partial<T> {
  if (!obj) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

export class ProductionFormService {
  private currentForm: ProductionFormData;

  constructor(initialData?: PartialProductionFormData) {
    this.currentForm = ProductionFormSchema.parse({
      ...EMPTY_PRODUCTION_FORM,
      ...cleanDefined(initialData),
    });
  }

  public getForm(): ProductionFormData {
    return { ...this.currentForm };
  }

  public updateForm(patch: PartialProductionFormData): ProductionFormData {
    const rawMerged: Record<string, unknown> = { ...this.currentForm };
    if (patch) {
      for (const [key, value] of Object.entries(patch)) {
        if (value !== undefined) {
          rawMerged[key] = value;
        }
      }
    }
    const parsed = ProductionFormSchema.parse(rawMerged);
    this.currentForm = parsed;
    return this.getForm();
  }

  public resetForm(): ProductionFormData {
    this.currentForm = { ...EMPTY_PRODUCTION_FORM };
    return this.getForm();
  }

  public calculateSummary(data: ProductionFormData = this.currentForm): ProductionFormSummary {
    const parseNum = (str: string): number => {
      const val = parseFloat(str);
      return isNaN(val) ? 0 : val;
    };

    const rawTotalWeightKg = parseNum(data.totalWeight[0]) + parseNum(data.totalWeight[1]);
    const readyTotalWeightKg = parseNum(data.totalWeight[0]) + parseNum(data.totalWeight[1]);

    const readyBagsTotal = parseNum(data.readyBags);

    const cutting25Total = parseNum(data.cutting25[0]) + parseNum(data.cutting25[1]);
    const cutting50Total = parseNum(data.cutting50[0]) + parseNum(data.cutting50[1]);

    const remainingTotal = parseNum(data.remaining[0]) + parseNum(data.remaining[1]);

    const stockKg = parseNum(data.stock);

    return {
      rawTotalWeightKg,
      readyTotalWeightKg,
      readyBagsTotal,
      cutting25Total,
      cutting50Total,
      remainingTotal,
      stockKg,
    };
  }
}

export const globalProductionFormService = new ProductionFormService();
