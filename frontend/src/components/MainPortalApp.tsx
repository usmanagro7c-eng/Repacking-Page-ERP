import { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Truck,
  Layers,
  LogOut,
  UserCircle,
  Loader2,
} from "lucide-react";
import {
  api,
  type ErpnextItem,
  type ErpnextWarehouse,
  type ErpnextMaterialTransfer,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { SignInPage } from "./auth/SignInPage";
import { RepackingForm } from "./repacking/RepackingForm";
import { GatePassOutwardForm, type GatePassData } from "./gatepass/GatePassOutwardForm";
import { GatePassInwardForm } from "./gatepass/GatePassInwardForm";
import { TransfersModule } from "./transfers/TransfersModule";

export function MainPortalApp() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  // Navigation Modules: 'repacking' | 'outward' | 'inward' | 'transfers'
  const [activeModule, setActiveModule] = useState<"repacking" | "outward" | "inward" | "transfers">("outward");

  // ERP Reference Data
  const [items, setItems] = useState<ErpnextItem[]>([]);
  const [warehouses, setWarehouses] = useState<ErpnextWarehouse[]>([]);
  const [inwardPrefill, setInwardPrefill] = useState<GatePassData | null>(null);

  // Filter Warehouses based on ERPNext User Permissions
  const permittedWarehouses = useMemo(() => {
    if (
      !user ||
      !user.permissions ||
      !user.permissions.allowedWarehouses ||
      user.permissions.allowedWarehouses.length === 0
    ) {
      return warehouses;
    }
    const allowed = new Set(user.permissions.allowedWarehouses.map((w) => w.toLowerCase().trim()));
    return warehouses.filter(
      (wh) =>
        allowed.has(wh.name.toLowerCase().trim()) ||
        allowed.has((wh.warehouse_name || "").toLowerCase().trim())
    );
  }, [warehouses, user]);

  // Stock Entry creation permission
  const userCanCreateStockEntry = useMemo(() => {
    if (!user) return false;
    const roles = (user.roles || []).map((r) => r.toLowerCase().trim());
    const hasPrivilegedRole = roles.some(
      (r) =>
        r.includes("stock") ||
        r.includes("manager") ||
        r.includes("administrator") ||
        r.includes("system manager") ||
        r.includes("manufacturing")
    );
    if (hasPrivilegedRole) return true;
    if (user.permissions?.canCreateStockEntry) return true;
    return false;
  }, [user]);

  // Transfers viewing permission
  const userCanReadTransfers = useMemo(() => {
    if (!user) return false;
    const roles = (user.roles || []).map((r) => r.toLowerCase().trim());
    const hasPrivilegedRole = roles.some(
      (r) =>
        r.includes("stock") ||
        r.includes("manager") ||
        r.includes("administrator") ||
        r.includes("system manager") ||
        r.includes("manufacturing")
    );
    if (hasPrivilegedRole) return true;
    if (user.permissions?.canReadStockEntry) return true;
    return false;
  }, [user]);

  // Initial Data Fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadData() {
      try {
        const [itemsRes, whRes] = await Promise.all([
          api.getItems().catch(() => ({ success: false, data: [] })),
          api.getWarehouses().catch(() => ({ success: false, data: [] })),
        ]);
        if (itemsRes.data?.length) setItems(itemsRes.data);
        if (whRes.data?.length) setWarehouses(whRes.data);
      } catch (err) {
        console.warn("Failed to load ERP reference data:", err);
      }
    }
    loadData();
  }, [isAuthenticated]);

  // Convert Outward to Inward
  const handleTransferToInward = (outwardData: GatePassData) => {
    const newInward: GatePassData = {
      ...outwardData,
      type: "inward",
      no: "",
      relatedOutwardNo: outwardData.no || outwardData.erpDocName || "",
      fromWarehouse: outwardData.fromWarehouse || "",
      toWarehouse: outwardData.toWarehouse || "",
      date: new Date().toISOString().split("T")[0] ?? "",
      rows: outwardData.rows.map((r) => ({ ...r })),
    };
    setInwardPrefill(newInward);
    setActiveModule("inward");
  };

  // Load Transfer from ERP into Gatepass
  const handleLoadTransferIntoGatepass = (
    _transfer: ErpnextMaterialTransfer,
    targetType: "outward" | "inward"
  ) => {
    setActiveModule(targetType);
  };

  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-emerald-500" />
          <p className="font-urdu text-sm text-slate-300">سسٹم اور سیشن کی توثیق ہو رہی ہے...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignInPage />;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100/70 py-5 px-2 sm:px-4 print:bg-white print:p-0">
      <div className="w-full max-w-[210mm] mx-auto">
        {/* ========================================================================= */}
        {/* MASTER TOP APPLICATION NAVBAR (A4 Width Aligned - Single Row)              */}
        {/* ========================================================================= */}
        <div className="no-print mb-3.5 w-full">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-xs border border-slate-200">
            {/* Main Navigation Modules */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {/* 1. ریپیکنگ / مال کی تیاری (Repacking) */}
              <button
                type="button"
                onClick={() => setActiveModule("repacking")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all cursor-pointer ${
                  activeModule === "repacking"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-800 hover:bg-emerald-50 hover:text-emerald-900"
                }`}
              >
                <Boxes className="h-3.5 w-3.5" />
                <span>ریپیکنگ (مال کی تیاری)</span>
              </button>

              {/* 2. گیٹ پاس (آؤٹ ورڈ) */}
              <button
                type="button"
                onClick={() => setActiveModule("outward")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all cursor-pointer ${
                  activeModule === "outward"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-800 hover:bg-amber-50 hover:text-amber-900"
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                <span>گیٹ پاس (آؤٹ ورڈ)</span>
              </button>

              {/* 3. گیٹ پاس (ان ورڈ) */}
              <button
                type="button"
                onClick={() => setActiveModule("inward")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all cursor-pointer ${
                  activeModule === "inward"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-900"
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                <span>گیٹ پاس (ان ورڈ)</span>
              </button>

              {/* 4. Transfers Records Tab */}
              {userCanReadTransfers && (
                <button
                  type="button"
                  onClick={() => setActiveModule("transfers")}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-urdu font-semibold transition-all cursor-pointer ${
                    activeModule === "transfers"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>میٹریل ٹرانسفرز</span>
                </button>
              )}
            </div>

            {/* Right Live Status & User Profile Info */}
            <div className="flex shrink-0 items-center gap-2">
              {user && (
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                    <UserCircle className="h-4 w-4 text-emerald-600" />
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="block text-[11px] font-urdu font-bold text-slate-800 leading-tight">
                          {user.fullName || user.username}
                        </span>
                        {user.roles && user.roles.length > 0 && (
                          <span className="bg-emerald-100 text-emerald-800 font-sans text-[9px] font-bold px-1 rounded">
                            {user.roles[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="block text-[9.5px] text-slate-500 font-sans leading-tight">
                          {user.email || user.username}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="لاگ آؤٹ کریں (Log Out)"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 1: REPACKING FORM (مال کی تیاری کی تفصیل - A4 Sheet)               */}
        {/* ========================================================================= */}
        {activeModule === "repacking" && (
          <RepackingForm userCanCreateStockEntry={userCanCreateStockEntry} />
        )}

        {/* ========================================================================= */}
        {/* MODULE 2: GATE PASS OUTWARD FORM (گیٹ پاس آؤٹ ورڈ - A4 Sheet)             */}
        {/* ========================================================================= */}
        {activeModule === "outward" && (
          <GatePassOutwardForm
            userCanCreateStockEntry={userCanCreateStockEntry}
            permittedWarehouses={permittedWarehouses}
            items={items}
            onConvertToInward={handleTransferToInward}
          />
        )}

        {/* ========================================================================= */}
        {/* MODULE 3: GATE PASS INWARD FORM (گیٹ پاس ان ورڈ - A4 Sheet)               */}
        {/* ========================================================================= */}
        {activeModule === "inward" && (
          <GatePassInwardForm
            userCanCreateStockEntry={userCanCreateStockEntry}
            permittedWarehouses={permittedWarehouses}
            items={items}
            prefilledData={inwardPrefill}
          />
        )}

        {/* ========================================================================= */}
        {/* MODULE 4: TRANSFERS HISTORY (A4 Width)                                     */}
        {/* ========================================================================= */}
        {activeModule === "transfers" && (
          <TransfersModule onLoadTransferIntoGatepass={handleLoadTransferIntoGatepass} />
        )}
      </div>
    </main>
  );
}
