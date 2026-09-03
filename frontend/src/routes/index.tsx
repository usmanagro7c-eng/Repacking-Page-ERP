import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Boxes,
  Truck,
  Layers,
  ChevronDown,
  LogOut,
  UserCircle,
  Loader2,
} from "lucide-react";
import { api, type ErpnextItem, type ErpnextWarehouse, type ErpnextMaterialTransfer } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { SignInPage } from "../components/auth/SignInPage";
import { RepackingModule } from "../components/repacking/RepackingModule";
import { GatePassModule } from "../components/gatepass/GatePassModule";
import { TransfersModule } from "../components/transfers/TransfersModule";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مرزا محمد مشتاق اینڈ کمپنی — پورٹل (ریپیکنگ و گیٹ پاس)" },
      {
        name: "description",
        content:
          "مرزا محمد مشتاق اینڈ کمپنی، فیصل آباد — ریپیکنگ (مال کی تیاری) اور آؤٹ ورڈ و ان ورڈ گیٹ پاس سسٹم۔",
      },
    ],
  }),
  component: MainPortalApp,
});

export function MainPortalApp() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  // Active Navigation Tab: 'repacking' | 'outward' | 'inward' | 'transfers'
  const [activeModule, setActiveModule] = useState<"repacking" | "outward" | "inward" | "transfers">("outward");
  const [gatepassDropdownOpen, setGatepassDropdownOpen] = useState(false);
  const gatepassDropdownRef = useRef<HTMLDivElement>(null);

  // ERP Reference Data
  const [items, setItems] = useState<ErpnextItem[]>([]);
  const [warehouses, setWarehouses] = useState<ErpnextWarehouse[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (gatepassDropdownRef.current && !gatepassDropdownRef.current.contains(e.target as Node)) {
        setGatepassDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Filter Warehouses strictly based on ERPNext User Permissions
  const permittedWarehouses = useMemo(() => {
    if (!user || !user.permissions || !user.permissions.allowedWarehouses || user.permissions.allowedWarehouses.length === 0) {
      return warehouses;
    }
    const allowed = new Set(user.permissions.allowedWarehouses.map((w) => w.toLowerCase().trim()));
    return warehouses.filter(
      (wh) => allowed.has(wh.name.toLowerCase().trim()) || allowed.has((wh.warehouse_name || "").toLowerCase().trim())
    );
  }, [warehouses, user]);

  // Dynamic check for Stock Entry creation permission
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

  // Dynamic check for Transfers viewing
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

  // Fetch Items and Warehouses once
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

  // Handle loading a transfer into gatepass
  const handleLoadTransferIntoGatepass = (
    _transfer: ErpnextMaterialTransfer,
    targetType: "outward" | "inward"
  ) => {
    setActiveModule(targetType);
  };

  // Auth Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400 mb-4" />
        <p className="text-sm font-urdu font-medium text-slate-300">سسٹم میں سیشن چیک کیا جا رہا ہے...</p>
      </div>
    );
  }

  // Auth Protection Gate
  if (!isAuthenticated) {
    return <SignInPage />;
  }

  return (
    <main
      className="min-h-screen bg-slate-100 py-3 sm:py-5 px-1 sm:px-4 font-sans text-slate-900 transition-colors"
      dir="rtl"
    >
      <div className="mx-auto flex flex-col items-center">
        {/* ========================================================================= */}
        {/* TOP TOOLBAR: Brand Header, Module Switcher & User Profile                 */}
        {/* ========================================================================= */}
        <div className="no-print mb-4 w-full max-w-[210mm] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:px-4 rounded-xl shadow-xs border border-slate-200">
          {/* Logo & Company Title */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-xs font-bold text-base">
              MM
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-urdu leading-tight text-slate-900">
                مرزا محمد مشتاق اینڈ کمپنی
              </h2>
              <span className="text-[11px] text-slate-500 font-sans tracking-tight">
                ERP Forms Portal (Repacking & Gate Pass)
              </span>
            </div>
          </div>

          {/* Module Selection Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
            {/* 1. Repacking Form Tab */}
            <button
              type="button"
              onClick={() => setActiveModule("repacking")}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all cursor-pointer ${
                activeModule === "repacking"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>ریپیکنگ (مال کی تیاری)</span>
            </button>

            {/* 2. Gate Pass Outward Tab */}
            <button
              type="button"
              onClick={() => setActiveModule("outward")}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all cursor-pointer ${
                activeModule === "outward"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>گیٹ پاس (آؤٹ ورڈ)</span>
            </button>

            {/* 3. Gate Pass Inward Tab */}
            <button
              type="button"
              onClick={() => setActiveModule("inward")}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all cursor-pointer ${
                activeModule === "inward"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-200"
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
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all cursor-pointer ${
                  activeModule === "transfers"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>میٹریل ٹرانسفرز</span>
              </button>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-right">
              <UserCircle className="h-6 w-6 text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.fullName || user?.email}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1 rounded border border-amber-200">
                    {user?.roles?.[0] || "User"}
                  </span>
                  {user?.permissions?.allowedWarehouses && user.permissions.allowedWarehouses.length > 0 && (
                    <span className="text-[9.5px] text-slate-600 bg-slate-100 px-1 rounded border border-slate-300">
                      {user.permissions.allowedWarehouses.length} گودام
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="لاگ آؤٹ کریں (Log Out)"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ACTIVE MODULE CONTAINER                                                   */}
        {/* ========================================================================= */}
        {activeModule === "repacking" && (
          <RepackingModule userCanCreateStockEntry={userCanCreateStockEntry} />
        )}

        {(activeModule === "outward" || activeModule === "inward") && (
          <GatePassModule
            activeType={activeModule}
            onSwitchType={(type) => setActiveModule(type)}
            userCanCreateStockEntry={userCanCreateStockEntry}
            permittedWarehouses={permittedWarehouses}
            items={items}
          />
        )}

        {activeModule === "transfers" && (
          <TransfersModule onLoadTransferIntoGatepass={handleLoadTransferIntoGatepass} />
        )}
      </div>
    </main>
  );
}
