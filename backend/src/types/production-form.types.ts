import { z } from "zod";

export const Tuple2StringSchema = z.tuple([z.string(), z.string()]);

export const ProductionFormSchema = z.object({
  date: z.string().default(""),
  formNo: z.string().default(""),
  rawName: Tuple2StringSchema.default(["", ""]),
  totalWeight: Tuple2StringSchema.default(["", ""]),
  cutting25: Tuple2StringSchema.default(["", ""]),
  cutting50: Tuple2StringSchema.default(["", ""]),
lotNo: Tuple2StringSchema.default(["", ""]),
  rawUom: Tuple2StringSchema.default(["Kg", "Kg"]),
  remaining: Tuple2StringSchema.default(["", ""]),
  readyName: z.string().default(""),
  readyLot: z.string().default(""),
  readyUom: z.string().default("Kg"),
  readyBags: z.string().default(""),
  readyWeight: z.string().default(""),
  stock: z.string().default(""),
  notes: z.string().default(""),
  signMaker: z.string().default(""),
  signIncharge: z.string().default(""),
});

export type ProductionFormData = z.infer<typeof ProductionFormSchema>;

export const PartialProductionFormSchema = ProductionFormSchema.partial();
export type PartialProductionFormData = z.infer<typeof PartialProductionFormSchema>;

export type ProductionFormSummary = {
  rawTotalWeightKg: number;
  readyTotalWeightKg: number;
  readyBagsTotal: number;
  remainingTotal: number;
  cutting25Total: number;
  cutting50Total: number;
  stockKg: number;
};
