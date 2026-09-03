import { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Truck,
  Layers,
  LogOut,
  UserCircle,
  Loader2,
  LayoutGrid,
  ArrowRight,
  PackageCheck,
  FileSpreadsheet,
  ArrowDownLeft,
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

  // Navigation Modules: 'menu' (Default Dashboard) | 'repacking' | 'outward' | 'inward' | 'transfers'
  const [activeModule, setActiveModule] = useState<"menu" | "repacking" | "outward" | "inward" | "transfers">("menu");

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
      erpDocName: undefined,
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

  // =========================================================================
  // VIEW 1: HOME DASHBOARD / FORMS SELECTION MENU (جب یوزر لاگ اِن ہو)
  // =========================================================================
  if (activeModule === "menu") {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-100/80 py-8 px-4 sm:px-6 font-sans">
        <div className="max-w-4xl mx-auto">
          {/* Top Brand & User Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md font-bold text-lg font-mono">
                MM
              </div>
              <div className="text-right">
                <h1 className="text-lg sm:text-xl font-bold font-urdu text-slate-900 leading-tight">
                  مرزا محمد مشتاق اینڈ کمپنی
                </h1>
                <p className="text-xs text-slate-500 font-urdu mt-0.5">
                  ای آر پی پورٹل — مرکزی مینو (ERP Forms Dashboard)
                </p>
              </div>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-right">
                <UserCircle className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-urdu text-slate-900 leading-tight">
                      {user?.fullName || user?.username}
                    </span>
                    {user?.roles && user.roles.length > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                        {user.roles[0]}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-sans block">
                    {user?.email || user?.username}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold font-urdu text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-xs"
                title="لاگ آؤٹ کریں (Log Out)"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>لاگ آؤٹ</span>
              </button>
            </div>
          </div>

          {/* Section Heading */}
          <div className="text-center mb-8">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold font-urdu mb-2">
              دستیاب ماڈیولز و فارمز
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-urdu text-slate-900 leading-normal">
              آپ کس فارم پر کام کرنا چاہتے ہیں؟
            </h2>
            <p className="text-xs sm:text-sm font-urdu text-slate-600 mt-1">
              نیچے دیے گئے کسی بھی بٹن پر کلک کریں تاکہ صرف متعلقہ فارم کھلے:
            </p>
          </div>

          {/* Grid of Dedicated Page Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* 1. REPACKING FORM BUTTON */}
            <button
              type="button"
              onClick={() => setActiveModule("repacking")}
              className="group relative flex flex-col justify-between p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all text-right cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold font-urdu bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                    سٹاک انٹری
                  </span>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Boxes className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold font-urdu text-slate-900 group-hover:text-emerald-700 transition-colors">
                  ریپیکنگ (مال کی تیاری)
                </h3>
                <p className="text-xs text-slate-500 font-urdu mt-2 leading-relaxed">
                  خام مال سے تیار مال کی ریپیکنگ تفصیل، بیچ نمبر، یوم اور ERPNext میں خودکار سٹاک انٹری اندراج۔
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 text-emerald-700 text-xs font-bold font-urdu">
                <span>فارم کھولیں</span>
                <span className="group-hover:-translate-x-1.5 transition-transform text-base">➔</span>
              </div>
            </button>

            {/* 2. GATE PASS OUTWARD BUTTON */}
            <button
              type="button"
              onClick={() => setActiveModule("outward")}
              className="group relative flex flex-col justify-between p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all text-right cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold font-urdu bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                    روانگی و ترسیل
                  </span>
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold font-urdu text-slate-900 group-hover:text-amber-700 transition-colors">
                  گیٹ پاس (آؤٹ ورڈ)
                </h3>
                <p className="text-xs text-slate-500 font-urdu mt-2 leading-relaxed">
                  گودام سے مال کی روانگی، اڈہ کا نام، پارٹی، گاڑی، ڈرائیور، رکشہ کرایہ اور آؤٹ ورڈ پرنٹ نکالیں۔
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 text-amber-700 text-xs font-bold font-urdu">
                <span>فارم کھولیں</span>
                <span className="group-hover:-translate-x-1.5 transition-transform text-base">➔</span>
              </div>
            </button>

            {/* 3. GATE PASS INWARD BUTTON */}
            <button
              type="button"
              onClick={() => setActiveModule("inward")}
              className="group relative flex flex-col justify-between p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all text-right cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold font-urdu bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                    موصولی و وصولی
                  </span>
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowDownLeft className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold font-urdu text-slate-900 group-hover:text-blue-700 transition-colors">
                  گیٹ پاس (ان ورڈ)
                </h3>
                <p className="text-xs text-slate-500 font-urdu mt-2 leading-relaxed">
                  گودام میں مال کی موصولی، متعلقہ آؤٹ ورڈ نمبر کا حوالہ، بھیجنے والی پارٹی اور موصولہ از روانگی گودام۔
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 text-blue-700 text-xs font-bold font-urdu">
                <span>فارم کھولیں</span>
                <span className="group-hover:-translate-x-1.5 transition-transform text-base">➔</span>
              </div>
            </button>

            {/* 4. MATERIAL TRANSFERS BUTTON (اگر اجازت ہو) */}
            {userCanReadTransfers && (
              <button
                type="button"
                onClick={() => setActiveModule("transfers")}
                className="group relative flex flex-col justify-between p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all text-right cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold font-urdu bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                      ای آر پی ہسٹری
                    </span>
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold font-urdu text-slate-900 group-hover:text-indigo-700 transition-colors">
                    میٹریل ٹرانسفرز ریکارڈز
                  </h3>
                  <p className="text-xs text-slate-500 font-urdu mt-2 leading-relaxed">
                    تمام حالیہ میٹریل ٹرانسفرز کی لسٹ دیکھیں اور براہ راست ان ورڈ یا آؤٹ ورڈ گیٹ پاس میں لوڈ کریں۔
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 text-indigo-700 text-xs font-bold font-urdu">
                  <span>ریکارڈز دیکھیں</span>
                  <span className="group-hover:-translate-x-1.5 transition-transform text-base">➔</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW 2: DEDICATED FORM VIEW (جس پیج پر یوزر نے کلک کیا ہے)
  // =========================================================================
  return (
    <main dir="rtl" className="min-h-screen bg-slate-100/70 py-5 px-2 sm:px-4 print:bg-white print:p-0">
      <div className="w-full max-w-[210mm] mx-auto">
        {/* ========================================================================= */}
        {/* MASTER TOP APPLICATION NAVBAR (With Back to Menu Button)                   */}
        {/* ========================================================================= */}
        <div className="no-print mb-3.5 w-full">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-xs border border-slate-200">
            {/* Back to Home/Menu Button & Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {/* BACK TO MAIN MENU BUTTON */}
              <button
                type="button"
                onClick={() => setActiveModule("menu")}
                className="flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                title="مرکزی مینو پر واپس جائیں"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-amber-400" />
                <span>تمام فارمز (مینو)</span>
              </button>

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
                <span>ریپیکنگ</span>
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
                <span>آؤٹ ورڈ</span>
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
                <span>ان ورڈ</span>
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
                  <span>ٹرانسفرز</span>
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
