import { z } from "zod";

export const GatePassTypeSchema = z.enum(["outward", "inward"]);
export type GatePassType = z.infer<typeof GatePassTypeSchema>;

export const GatePassRowSchema = z.object({
  qty: z.string().default(""),
  packing: z.string().default(""),
  itemCode: z.string().default(""),
  detail: z.string().default(""),
  weight: z.string().default(""),
  uom: z.string().default("Kg"),
});
export type GatePassRow = z.infer<typeof GatePassRowSchema>;

export const GatePassSchema = z.object({
  id: z.string().optional(),
  type: GatePassTypeSchema.default("outward"),
  no: z.string().default(""),
  relatedOutwardNo: z.string().default(""),
  date: z.string().default(""),
  adda: z.string().default(""),
  baraye: z.string().default(""),
  party: z.string().default(""),
  phone: z.string().default(""),
  fromWarehouse: z.string().default(""),
  toWarehouse: z.string().default(""),
  godam: z.string().default(""), // Legacy / Display field for godown
  vehicle: z.string().default(""),
  driver: z.string().default(""),
  contact: z.string().default(""),
  rickshaw: z.string().default(""),
  extra: z.string().default(""),
  receiverSign: z.string().default(""),
  godownInchargeSign: z.string().default(""),
  inchargeSign: z.string().default(""),
  rows: z.array(GatePassRowSchema).default([]),
  erpDocName: z.string().optional(),
  docstatus: z.number().default(0), // 0: Draft, 1: Submitted
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type GatePassData = z.infer<typeof GatePassSchema>;

export const PartialGatePassSchema = GatePassSchema.partial();
export type PartialGatePassData = z.infer<typeof PartialGatePassSchema>;

export type GatePassSummary = {
  totalQty: number;
  totalWeight: number;
  rowCount: number;
};

export type ErpnextItem = {
  name: string;
  item_name?: string;
  item_code?: string;
  stock_uom?: string;
  description?: string;
  item_group?: string;
};

export type ErpnextWarehouse = {
  name: string;
  warehouse_name?: string;
  company?: string;
  is_group?: number;
};

export type ErpnextMaterialTransfer = {
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
};
