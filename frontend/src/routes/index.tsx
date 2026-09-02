import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  type GatePassData,
  type GatePassRow,
  type ErpnextItem,
  type ErpnextWarehouse,
  type ErpnextMaterialTransfer,
} from "../lib/api";
import { FormSheet as RepackingFormSheet } from "../components/form/FormSheet";
import { useProductionForm } from "../hooks/useProductionForm";

function QrCode({ value, className = "" }: { value: string; className?: string }) {
  if (!value) return null;
  return (
    <QRCodeSVG
      value={value}
      size={44}
      level="M"
      marginSize={1}
      className={`block ${className}`}
      bgColor="#ffffff"
      fgColor="#000000"
    />
  );
}
import {
  Printer,
  CloudUpload,
  RefreshCw,
  Plus,
  Trash2,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  Truck,
  Layers,
  ChevronDown,
  Boxes,
} from "lucide-react";

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

const DEFAULT_ROW_COUNT = 9;
const OUTWARD_STORAGE_KEY = "mmmc-gatepass-outward-data";
const INWARD_STORAGE_KEY = "mmmc-gatepass-inward-data";

function createBlankRows(count = DEFAULT_ROW_COUNT): GatePassRow[] {
  return Array.from({ length: count }, () => ({
    qty: "",
    packing: "",
    itemCode: "",
    detail: "",
    weight: "",
    uom: "Kg",
  }));
}

function initialGatePassData(type: "outward" | "inward" = "outward"): GatePassData {
  return {
    type,
    no: "",
    relatedOutwardNo: "",
    date: new Date().toISOString().split("T")[0],
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
    rows: createBlankRows(DEFAULT_ROW_COUNT),
  };
}

/**
 * Standard A4 Responsive Sheet Wrapper (210mm Width) with proportional scaling
 */
function ResponsiveSheetWrapper({
  children,
  toolbar,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const sheet = sheetRef.current;
    if (!outer || !sheet) return;

    const update = () => {
      const avail = outer.clientWidth;
      const sheetW = sheet.offsetWidth;
      if (avail <= 0 || sheetW <= 0) return;
      const s = Math.min(1, avail / sheetW);
      setScale(s);
      setHeight(sheet.offsetHeight * s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      {toolbar ? (
        <div
          className="no-print mx-auto mb-3.5 flex flex-nowrap items-center justify-between gap-2 overflow-x-auto pb-0.5"
          style={{ width: `calc(210mm * ${scale})`, maxWidth: "100%" }}
          dir="rtl"
        >
          {toolbar}
        </div>
      ) : null}
      <div className="sheet-scale-wrap w-full" style={{ height: height || "auto" }}>
        <div className="flex justify-center">
          <div
            ref={sheetRef}
            className="sheet-scale w-[210mm] max-w-[210mm]"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function MainPortalApp() {
  // Navigation Modules: 'repacking' | 'outward' | 'inward' | 'transfers'
  const [activeModule, setActiveModule] = useState<"repacking" | "outward" | "inward" | "transfers">("outward");
  const [gatepassDropdownOpen, setGatepassDropdownOpen] = useState(false);
  const gatepassDropdownRef = useRef<HTMLDivElement>(null);

  // Repacking Form Hook
  const repacking = useProductionForm();

  // Gatepass Forms State
  const [outwardForm, setOutwardForm] = useState<GatePassData>(() => initialGatePassData("outward"));
  const [inwardForm, setInwardForm] = useState<GatePassData>(() => initialGatePassData("inward"));

  const currentGatePass = activeModule === "inward" ? inwardForm : outwardForm;
  const setCurrentGatePass = (updater: (prev: GatePassData) => GatePassData) => {
    if (activeModule === "inward") {
      setInwardForm(updater);
    } else {
      setOutwardForm(updater);
    }
  };

  // ERPNext Global State (Safely fetched from backend without exposing API secrets)
  const [items, setItems] = useState<ErpnextItem[]>([]);
  const [warehouses, setWarehouses] = useState<ErpnextWarehouse[]>([]);
  const [transfers, setTransfers] = useState<ErpnextMaterialTransfer[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [erpConfigured, setErpConfigured] = useState<boolean>(false);
  const [erpUrl, setErpUrl] = useState<string>("https://dev16.mmmc.pk");

  // Gatepass Action & Sync State
  const [isSyncingGatePass, setIsSyncingGatePass] = useState(false);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [syncSuccessResult, setSyncSuccessResult] = useState<{
    docName: string;
    docUrl: string;
    message: string;
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [gatepassMessage, setGatepassMessage] = useState("");
  const [activeItemSearchRow, setActiveItemSearchRow] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Close Dropdown on click outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (gatepassDropdownRef.current && !gatepassDropdownRef.current.contains(e.target as Node)) {
        setGatepassDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Flash gatepass toast message
  useEffect(() => {
    if (!gatepassMessage) return;
    const timer = setTimeout(() => setGatepassMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [gatepassMessage]);

  // Load Saved Gatepass from LocalStorage on mount
  useEffect(() => {
    try {
      const savedOut = localStorage.getItem(OUTWARD_STORAGE_KEY);
      if (savedOut) setOutwardForm(JSON.parse(savedOut));
      const savedIn = localStorage.getItem(INWARD_STORAGE_KEY);
      if (savedIn) setInwardForm(JSON.parse(savedIn));
    } catch {
      // ignore
    }
  }, []);

  // Gatepass Local Save / Load / Clear
  const saveGatePassLocal = () => {
    try {
      const key = activeModule === "inward" ? INWARD_STORAGE_KEY : OUTWARD_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(currentGatePass));
      setGatepassMessage("گیٹ پاس محفوظ ہو گیا ✓");
    } catch {
      setGatepassMessage("محفوظ نہیں ہو سکا");
    }
  };

  const loadGatePassLocal = () => {
    try {
      const key = activeModule === "inward" ? INWARD_STORAGE_KEY : OUTWARD_STORAGE_KEY;
      const raw = localStorage.getItem(key);
      if (raw) {
        const loaded = JSON.parse(raw) as GatePassData;
        setCurrentGatePass(() => loaded);
        setGatepassMessage("محفوظ شدہ ڈیٹا لوڈ ہو گیا ✓");
      } else {
        setGatepassMessage("کوئی محفوظ شدہ ڈیٹا موجود نہیں");
      }
    } catch {
      setGatepassMessage("ڈیٹا لوڈ نہیں ہو سکا");
    }
  };

  const clearGatePassLocal = () => {
    const fresh = initialGatePassData(activeModule === "inward" ? "inward" : "outward");
    setCurrentGatePass(() => fresh);
    const key = activeModule === "inward" ? INWARD_STORAGE_KEY : OUTWARD_STORAGE_KEY;
    localStorage.removeItem(key);
    setSyncSuccessResult(null);
    setSyncError(null);
    setGatepassMessage("فارم خالی کر دیا گیا");
  };

  // Gatepass field updater
  const setGatePassField = (field: keyof GatePassData, val: any) => {
    setCurrentGatePass((prev) => ({ ...prev, [field]: val }));
  };

  const setGatePassRowCell = (idx: number, col: keyof GatePassRow, val: string) => {
    setCurrentGatePass((prev) => {
      const updatedRows = [...prev.rows];
      const row = { ...updatedRows[idx], [col]: val };

      if (col === "qty" || col === "packing") {
        const q = parseFloat(col === "qty" ? val : row.qty) || 0;
        const p = parseFloat(col === "packing" ? val : row.packing) || 0;
        if (q > 0 && p > 0) {
          row.weight = String(Math.round(q * p * 100) / 100);
        }
      }

      updatedRows[idx] = row;
      return { ...prev, rows: updatedRows };
    });
  };

  const addGatePassRow = () => {
    setCurrentGatePass((prev) => ({
      ...prev,
      rows: [...prev.rows, { qty: "", packing: "", itemCode: "", detail: "", weight: "", uom: "Kg" }],
    }));
  };

  const removeGatePassRow = (idx: number) => {
    setCurrentGatePass((prev) => {
      if (prev.rows.length <= 1) return prev;
      const updated = prev.rows.filter((_, i) => i !== idx);
      return { ...prev, rows: updated };
    });
  };

  // Gatepass Totals
  const sumGatePass = (k: "qty" | "weight") =>
    currentGatePass.rows.reduce((a, r) => a + (parseFloat(r[k]) || 0), 0);
  const totalQty = useMemo(() => Math.round(sumGatePass("qty") * 100) / 100, [currentGatePass.rows]);
  const totalWeight = useMemo(() => Math.round(sumGatePass("weight") * 100) / 100, [currentGatePass.rows]);

  // Initial Data Fetch (Safe Backend Endpoints)
  useEffect(() => {
    async function init() {
      try {
        const health = await api.getHealth();
        setBackendOnline(true);
        setErpConfigured(health.erpnextConfigured);
        if (health.erpnextUrl) setErpUrl(health.erpnextUrl);
      } catch {
        setBackendOnline(false);
      }

      try {
        const [itemsRes, whRes, configRes] = await Promise.all([
          api.getItems().catch(() => ({ success: false, data: [] })),
          api.getWarehouses().catch(() => ({ success: false, data: [] })),
          api.getConfig().catch(() => ({ success: false, data: null })),
        ]);

        if (itemsRes.data?.length) setItems(itemsRes.data);
        if (whRes.data?.length) setWarehouses(whRes.data);
        if (configRes.data) {
          setErpConfigured(configRes.data.isConfigured);
          if (configRes.data.url) setErpUrl(configRes.data.url);
        }
      } catch (err) {
        console.warn("Error loading ERP data:", err);
      }
    }
    init();
  }, []);

  // Load ERPNext Transfers
  const loadTransfers = async () => {
    setIsLoadingTransfers(true);
    try {
      const res = await api.getTransfers();
      if (res.data) setTransfers(res.data);
    } catch (err) {
      console.warn("Failed to load ERP transfers:", err);
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  useEffect(() => {
    if (activeModule === "transfers") {
      loadTransfers();
    }
  }, [activeModule]);

  // Sync Gatepass (Material Transfer via Backend)
  const handleSyncGatePassToErp = async () => {
    setIsSyncingGatePass(true);
    setSyncError(null);
    setSyncSuccessResult(null);
    setGatepassMessage("سسٹم میں میٹریل ٹرانسفر منتقل ہو رہا ہے...");

    try {
      const result = await api.syncToERPNext(currentGatePass);
      if (result.success) {
        setSyncSuccessResult({
          docName: result.documentName,
          docUrl: result.docUrl,
          message: result.message,
        });
        setCurrentGatePass((prev) => ({ ...prev, erpDocName: result.documentName }));
        setGatepassMessage(`✓ سسٹم میں کامیابی سے درج ہو گیا! (دستاویز نمبر: ${result.documentName})`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "سسٹم میں ڈیٹا منتقل کرنے میں مسئلہ پیش آیا۔";
      setSyncError(errMsg);
      setGatepassMessage(`⚠️ خطاء: ${errMsg}`);
    } finally {
      setIsSyncingGatePass(false);
    }
  };

  // Convert Outward to Inward
  const handleTransferToInward = () => {
    const newInward: GatePassData = {
      ...outwardForm,
      type: "inward",
      no: "",
      relatedOutwardNo: outwardForm.no || outwardForm.erpDocName || "",
      fromWarehouse: outwardForm.fromWarehouse || "",
      toWarehouse: outwardForm.toWarehouse || "",
      date: new Date().toISOString().split("T")[0],
      erpDocName: undefined,
      rows: outwardForm.rows.map((r) => ({ ...r })),
    };
    setInwardForm(newInward);
    setActiveModule("inward");
    setGatepassMessage("آؤٹ ورڈ سے ان ورڈ گیٹ پاس تیار کر لیا گیا ہے ✓");
  };

  // Load Transfer from ERP into Gatepass
  const handleLoadTransferIntoGatepass = async (transfer: ErpnextMaterialTransfer, targetType: "outward" | "inward") => {
    let fullTransfer = transfer;
    try {
      const single = await api.getTransferById(transfer.name);
      if (single.data) fullTransfer = single.data;
    } catch {
      // use transfer as is
    }

    const loadedRows: GatePassRow[] = (fullTransfer.items || []).map((itm) => ({
      qty: String(itm.qty || ""),
      packing: "50",
      itemCode: itm.item_code || "",
      detail: itm.description || itm.item_name || itm.item_code || "",
      weight: String(itm.qty || ""),
      uom: itm.uom || "Kg",
    }));

    while (loadedRows.length < DEFAULT_ROW_COUNT) {
      loadedRows.push({ qty: "", packing: "", itemCode: "", detail: "", weight: "", uom: "Kg" });
    }

    const newForm: GatePassData = {
      type: targetType,
      no: transfer.name || "",
      relatedOutwardNo: transfer.name,
      date: transfer.posting_date || new Date().toISOString().split("T")[0],
      adda: "",
      baraye: transfer.to_warehouse || "",
      party: transfer.custom_party_name || "",
      phone: "",
      fromWarehouse: transfer.from_warehouse || "",
      toWarehouse: transfer.to_warehouse || "",
      godam: "",
      vehicle: transfer.custom_vehicle_no || "",
      driver: transfer.custom_driver_name || "",
      contact: "",
      rickshaw: transfer.custom_rickshaw_fare || "",
      extra: transfer.remarks || `ERPNext Transfer Doc: ${transfer.name}`,
      receiverSign: "",
      godownInchargeSign: "",
      inchargeSign: "",
      rows: loadedRows,
      erpDocName: transfer.name,
    };

    if (targetType === "inward") {
      setInwardForm(newForm);
      setActiveModule("inward");
    } else {
      setOutwardForm(newForm);
      setActiveModule("outward");
    }
  };

  const filteredItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return items.slice(0, 10);
    const q = itemSearchQuery.toLowerCase();
    return items
      .filter(
        (itm) =>
          itm.name.toLowerCase().includes(q) ||
          (itm.item_name && itm.item_name.toLowerCase().includes(q)) ||
          (itm.description && itm.description.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [items, itemSearchQuery]);

  // Exact Repacking Button Theme for All Forms
  const btn =
    "inline-flex cursor-pointer select-none items-center justify-center gap-1 rounded-md border px-3.5 py-1.5 text-[13px] font-urdu whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:pointer-events-none disabled:opacity-50 max-sm:px-2 max-sm:py-1 max-sm:text-[11px]";

  const btnSave = `${btn} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold`;
  const btnNeutral = `${btn} border-slate-400 bg-white text-slate-900 hover:bg-amber-50/60 font-medium`;
  const btnDanger = `${btn} border-red-300 bg-white text-red-700 hover:bg-red-50 font-medium`;
  const btnSync = `${btn} border-emerald-600 bg-emerald-50 font-bold text-emerald-950 hover:bg-emerald-100`;

  const cell =
    "w-full bg-transparent px-2 py-1.5 text-center text-[14px] outline-none focus:bg-amber-50/50 print:focus:bg-transparent font-medium";

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
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all ${
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
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-semibold transition-all ${
                  activeModule === "outward"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-800 hover:bg-amber-50 hover:text-amber-900"
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                <span>گیٹ پاس (آؤٹ ورڈ)</span>
              </button>

              {/* 3. گیٹ پاس (ان ورڈ) - Disabled for now */}
              <button
                type="button"
                disabled
                title="ان ورڈ گیٹ پاس فی الحال غیر فعال ہے (جلد دستیاب ہوگا)"
                className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs sm:text-[13px] font-urdu font-medium bg-slate-100/70 text-slate-400 border border-dashed border-slate-300 cursor-not-allowed opacity-75 select-none"
              >
                <ArrowLeftRight className="h-3 w-3 text-slate-400" />
                <span>گیٹ پاس (ان ورڈ)</span>
                <span className="text-[9.5px] font-sans font-medium bg-slate-200/90 text-slate-500 px-1 py-0.2 rounded mr-1">
                  غیر فعال
                </span>
              </button>

              {/* 4. Transfers Records Tab */}
              <button
                type="button"
                onClick={() => setActiveModule("transfers")}
                className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-urdu font-semibold transition-all ${
                  activeModule === "transfers"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>میٹریل ٹرانسفرز</span>
              </button>
            </div>

            {/* Right Live Status & Connection Info */}
            <div className="flex shrink-0 items-center gap-2">
              {backendOnline !== null && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    backendOnline
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                  title={backendOnline ? "سرور آن لائن ہے (Port 5000)" : "سرور آف لائن ہے"}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${backendOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                  />
                  {backendOnline ? "سرور آن لائن" : "سرور آف لائن"}
                </span>
              )}
            </div>
          </div>

          {/* Sync Success Notification Card */}
          {syncSuccessResult && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-emerald-900 shadow-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-sm">سسٹم میں میٹریل ٹرانسفر بن گیا!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">{syncSuccessResult.message}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                      دستاویز نمبر: {syncSuccessResult.docName}
                    </span>
                    {syncSuccessResult.docUrl && (
                      <a
                        href={syncSuccessResult.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                      >
                        <span>دستاویز کھولیں</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSyncSuccessResult(null)}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-950"
              >
                ✕ بند کریں
              </button>
            </div>
          )}

          {/* Sync Error Notification Card */}
          {syncError && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-rose-900 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <h4 className="font-bold text-sm">سنک میں خرابی</h4>
                  <p className="text-xs text-rose-700 mt-0.5">{syncError}</p>
                </div>
              </div>
              <button
                onClick={() => setSyncError(null)}
                className="text-xs font-medium text-rose-700 hover:text-rose-950"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODULE 1: REPACKING FORM (مال کی تیاری کی تفصیل - A4 Sheet)               */}
        {/* ========================================================================= */}
        {activeModule === "repacking" && (
          <div className="w-full">
            <ResponsiveSheetWrapper
              toolbar={
                <>
                  <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
                    <button type="button" onClick={repacking.save} className={btnSave}>
                      محفوظ کریں
                    </button>
                    <button type="button" onClick={() => repacking.load()} className={btnNeutral}>
                      لوڈ کریں
                    </button>
                    <button type="button" onClick={repacking.clear} className={btnDanger}>
                      خالی کریں
                    </button>
                    <button type="button" onClick={() => window.print()} className={btnNeutral}>
                      پرنٹ کریں
                    </button>
                  </div>
                  <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={repacking.syncToErpnext}
                      disabled={repacking.isSyncing}
                      className={btnSync}
                    >
                      {repacking.isSyncing ? "منتقل ہو رہا ہے..." : "سٹاک انٹری بنائیں ⚡ (Repack)"}
                    </button>
                    <span
                      aria-live="polite"
                      className="rounded-full bg-white px-2.5 py-1 text-[12px] font-urdu text-slate-700 ring-1 ring-slate-300 shadow-xs max-w-[200px] truncate"
                    >
                      {repacking.message || "فارم تیار ہے"}
                    </span>
                  </div>
                </>
              }
            >
              <RepackingFormSheet
                data={repacking.data}
                set={repacking.setField}
                itemList={repacking.itemList}
                batchOptions0={repacking.batchOptions0}
                batchOptions1={repacking.batchOptions1}
                batchOptionsReady={repacking.batchOptionsReady}
                uomOptions0={repacking.uomOptions0}
                uomOptions1={repacking.uomOptions1}
                uomOptionsReady={repacking.uomOptionsReady}
                logoUrl={repacking.logoUrl}
                lastDocUrl={repacking.lastDocUrl}
              />
            </ResponsiveSheetWrapper>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 2: GATE PASS FORM (آؤٹ ورڈ / ان ورڈ گیٹ پاس - Single Line Toolbar)  */}
        {/* ========================================================================= */}
        {(activeModule === "outward" || activeModule === "inward") && (
          <div className="w-full">
            <ResponsiveSheetWrapper
              toolbar={
                <>
                  <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
                    <button type="button" onClick={saveGatePassLocal} className={btnSave}>
                      محفوظ کریں
                    </button>
                    <button type="button" onClick={loadGatePassLocal} className={btnNeutral}>
                      لوڈ کریں
                    </button>
                    <button type="button" onClick={clearGatePassLocal} className={btnDanger}>
                      خالی کریں
                    </button>
                    <button type="button" onClick={() => window.print()} className={btnNeutral}>
                      پرنٹ کریں
                    </button>
                    {activeModule === "outward" && (
                      <button
                        type="button"
                        onClick={handleTransferToInward}
                        className={`${btnNeutral} text-blue-800 font-bold hover:bg-blue-50 px-2.5`}
                        title="اس آؤٹ ورڈ سے فوری ان ورڈ پاس بنائیں"
                      >
                        ان ورڈ بنائیں ➔
                      </button>
                    )}
                  </div>
                  <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSyncGatePassToErp}
                      disabled={isSyncingGatePass}
                      className={btnSync}
                    >
                      {isSyncingGatePass ? "منتقل ہو رہا ہے..." : "میٹریل ٹرانسفر بنائیں ⚡"}
                    </button>
                    <span
                      aria-live="polite"
                      className="rounded-full bg-white px-2.5 py-1 text-[12px] font-urdu text-slate-700 ring-1 ring-slate-300 shadow-xs max-w-[200px] truncate"
                    >
                      {gatepassMessage || (activeModule === "outward" ? "آؤٹ ورڈ گیٹ پاس تیار ہے" : "ان ورڈ گیٹ پاس تیار ہے")}
                    </span>
                  </div>
                </>
              }
            >
              <div className="a4-sheet mx-auto w-[210mm] max-w-[210mm] bg-white p-7 text-slate-900 shadow-md border-2 border-slate-900 print:shadow-none print:border-2 print:border-black print:p-0">
                {/* Header */}
                <header className="relative border-b-2 border-slate-900 pb-2 pt-1 text-center">
                  <div className="absolute top-1/2 left-1 -translate-y-1/2 print:block">
                    {currentGatePass.no ? (
                      <QrCode value={syncSuccessResult?.docUrl || currentGatePass.erpDocName || currentGatePass.no} />
                    ) : null}
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <h1 className="urdu text-[24px] sm:text-[26px] font-bold text-slate-900 leading-tight">
                      مرزا محمد مشتاق اینڈ کمپنی
                    </h1>
                    <p className="urdu mt-1.5 text-[13.5px] text-slate-700 font-medium leading-normal text-center" dir="rtl">
                      دکان نمبر 11 نیو گرین مارکیٹ ڈجکوٹ روڈ فیصل آباد۔ فون: <span dir="ltr" className="font-urdu font-bold text-slate-900 text-[13.5px]">041-2602233</span>
                    </p>
                  </div>
                </header>

                {/* Title & Mode Bar */}
                <div className="relative mt-3 text-center border-b border-slate-300 pb-3 pt-1">
                  <h2 className="urdu text-[21px] font-bold text-slate-900 leading-normal pb-1">
                    {activeModule === "inward" ? "گیٹ پاس (ان ورڈ)" : "گیٹ پاس (آؤٹ ورڈ)"}
                  </h2>
                  <div className="absolute left-0 top-1.5 print:hidden">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                        activeModule === "inward"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {activeModule === "inward" ? "INWARD PASS" : "OUTWARD PASS"}
                    </span>
                  </div>
                </div>

                {/* Symmetrical Fields Grid */}
                <section className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {/* Row 1: Number & Date */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">نمبر:</span>
                      <input
                        value={currentGatePass.no}
                        onChange={(e) => setGatePassField("no", e.target.value)}
                        placeholder="نمبر درج کریں..."
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[15px] outline-none font-bold placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">تاریخ:</span>
                      <input
                        type="date"
                        value={currentGatePass.date}
                        onChange={(e) => setGatePassField("date", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[14px] outline-none"
                      />
                    </div>

                    {/* Inward Specific: Related Outward No */}
                    {activeModule === "inward" && (
                      <div className="flex items-end gap-2">
                        <span className="urdu shrink-0 text-[15px] font-bold leading-none">
                          متعلقہ آؤٹ ورڈ نمبر:
                        </span>
                        <input
                          value={currentGatePass.relatedOutwardNo || ""}
                          onChange={(e) => setGatePassField("relatedOutwardNo", e.target.value)}
                          placeholder="Outward Ref / Stock Entry ID"
                          className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[14px] outline-none placeholder:text-slate-400 placeholder:text-xs"
                        />
                      </div>
                    )}

                    {/* Adda Name */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">اڈہ کا نام:</span>
                      <input
                        value={currentGatePass.adda}
                        onChange={(e) => setGatePassField("adda", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                      />
                    </div>

                    {/* Baraye (Purpose / Destination) */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">برائے:</span>
                      <input
                        value={currentGatePass.baraye}
                        onChange={(e) => setGatePassField("baraye", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                      />
                    </div>

                    {/* Party / Receiver / Sender */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">
                        {activeModule === "inward" ? "بھیجنے والی پارٹی:" : "پارٹی / لینے والا:"}
                      </span>
                      <input
                        value={currentGatePass.party}
                        onChange={(e) => setGatePassField("party", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                      />
                    </div>

                    {/* Phone */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">فون نمبر:</span>
                      <input
                        value={currentGatePass.phone}
                        onChange={(e) => setGatePassField("phone", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[14px] outline-none"
                      />
                    </div>

                    {/* Source Warehouse */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">
                        {activeModule === "inward" ? "موصولہ از (روانگی):" : "روانگی گودام:"}
                      </span>
                      <div className="relative w-full">
                        <input
                          list="warehouse-options"
                          value={currentGatePass.fromWarehouse}
                          onChange={(e) => setGatePassField("fromWarehouse", e.target.value)}
                          placeholder="گودام منتخب کریں..."
                          className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[14px] outline-none"
                        />
                      </div>
                    </div>

                    {/* Destination Warehouse */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">
                        {activeModule === "inward" ? "موصولی گودام (منزل):" : "منزل گودام:"}
                      </span>
                      <div className="relative w-full">
                        <input
                          list="warehouse-options"
                          value={currentGatePass.toWarehouse}
                          onChange={(e) => setGatePassField("toWarehouse", e.target.value)}
                          placeholder="منزل گودام منتخب کریں..."
                          className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[14px] outline-none"
                        />
                      </div>
                    </div>

                    {/* Warehouse Auto-suggest datalist */}
                    <datalist id="warehouse-options">
                      {warehouses.map((wh) => (
                        <option key={wh.name} value={wh.name}>
                          {wh.warehouse_name || wh.name}
                        </option>
                      ))}
                    </datalist>

                    {/* Vehicle Number */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">گاڑی نمبر:</span>
                      <input
                        value={currentGatePass.vehicle}
                        onChange={(e) => setGatePassField("vehicle", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none font-mono"
                      />
                    </div>

                    {/* Driver Name */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">ڈرائیور کا نام:</span>
                      <input
                        value={currentGatePass.driver}
                        onChange={(e) => setGatePassField("driver", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                      />
                    </div>

                    {/* Driver Contact */}
                    <div className="flex items-end gap-2">
                      <span className="urdu shrink-0 text-[15px] font-bold leading-none">رابطہ نمبر:</span>
                      <input
                        value={currentGatePass.contact}
                        onChange={(e) => setGatePassField("contact", e.target.value)}
                        className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[14px] outline-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Items Table (جدول اشیاء) */}
                <div className="relative mt-5">
                  <table className="w-full table-fixed border-collapse border border-slate-900">
                    <thead>
                      <tr className="urdu text-[16px] bg-slate-100/90 text-slate-900 font-bold">
                        <th className="w-[15%] border border-slate-900 py-2 text-center">تعداد</th>
                        <th className="w-[18%] border border-slate-900 py-2 text-center">پیکنگ (کلو)</th>
                        <th className="border border-slate-900 py-2 text-center">تفصیل / آئٹم</th>
                        <th className="w-[18%] border border-slate-900 py-2 text-center">وزن (کلو)</th>
                        <th className="w-[6%] border border-slate-900 py-2 text-center print:hidden">عمل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentGatePass.rows.map((r, i) => (
                        <tr key={i} className="hover:bg-amber-50/20 transition-colors">
                          {/* Qty */}
                          <td className="border border-slate-900 p-0">
                            <input
                              value={r.qty}
                              onChange={(e) => setGatePassRowCell(i, "qty", e.target.value)}
                              className={cell}
                              placeholder=""
                            />
                          </td>

                          {/* Packing */}
                          <td className="border border-slate-900 p-0">
                            <input
                              value={r.packing}
                              onChange={(e) => setGatePassRowCell(i, "packing", e.target.value)}
                              className={cell}
                              placeholder=""
                            />
                          </td>

                          {/* Detail / Item Name with ERPNext Autocomplete */}
                          <td className="border border-slate-900 p-0 relative">
                            <div className="relative flex items-center">
                              <input
                                value={r.detail}
                                onChange={(e) => {
                                  setGatePassRowCell(i, "detail", e.target.value);
                                  setItemSearchQuery(e.target.value);
                                  setActiveItemSearchRow(i);
                                }}
                                onFocus={() => {
                                  setItemSearchQuery(r.detail || "");
                                  setActiveItemSearchRow(i);
                                }}
                                className={`${cell} urdu text-right pr-3 font-semibold`}
                                placeholder="آئٹم کا نام یا تفصیل..."
                              />
                              {items.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveItemSearchRow(activeItemSearchRow === i ? null : i);
                                    setItemSearchQuery("");
                                  }}
                                  className="absolute left-1.5 top-2 text-slate-400 hover:text-slate-800 print:hidden p-0.5"
                                  title="آئٹمز لسٹ"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Dropdown Suggestions */}
                            {activeItemSearchRow === i && (
                              <div className="absolute z-30 right-0 left-0 top-full mt-0.5 max-h-52 overflow-y-auto rounded-md border border-slate-300 bg-white shadow-xl text-right print:hidden">
                                <div className="sticky top-0 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 flex justify-between items-center border-b">
                                  <span>آئٹمز منتخب کریں ({filteredItems.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveItemSearchRow(null)}
                                    className="text-slate-500 hover:text-slate-800"
                                  >
                                    ✕
                                  </button>
                                </div>
                                {filteredItems.map((itm) => (
                                  <button
                                    key={itm.name}
                                    type="button"
                                    onClick={() => {
                                      setGatePassRowCell(i, "detail", itm.item_name || itm.name);
                                      setGatePassRowCell(i, "itemCode", itm.name);
                                      if (itm.stock_uom) setGatePassRowCell(i, "uom", itm.stock_uom);
                                      setActiveItemSearchRow(null);
                                    }}
                                    className="w-full text-right px-3 py-1.5 hover:bg-amber-50 border-b border-slate-100 last:border-none flex flex-col"
                                  >
                                    <span className="font-semibold text-xs text-slate-800">
                                      {itm.item_name || itm.name}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500">
                                      {itm.name} {itm.stock_uom ? `(${itm.stock_uom})` : ""}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Weight */}
                          <td className="border border-slate-900 p-0">
                            <input
                              value={r.weight}
                              onChange={(e) => setGatePassRowCell(i, "weight", e.target.value)}
                              className={`${cell} font-bold font-mono`}
                              placeholder=""
                            />
                          </td>

                          {/* Actions (Delete Row) */}
                          <td className="border border-slate-900 p-0 text-center print:hidden">
                            <button
                              onClick={() => removeGatePassRow(i)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="سطر ختم کریں"
                            >
                              <Trash2 className="h-3.5 w-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Symmetrical Totals Row */}
                      <tr className="bg-slate-50/90 font-bold print:bg-transparent">
                        <td colSpan={2} className="border border-slate-900 px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="urdu text-[17px] font-bold">کل تعداد</span>
                            <span className="inline-flex min-w-[110px] justify-center rounded-full border border-slate-900 px-4 py-0.5 text-[16px] font-mono font-bold">
                              {totalQty || "0"}
                            </span>
                          </div>
                        </td>
                        <td colSpan={3} className="border border-slate-900 px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="urdu text-[17px] font-bold">کل وزن</span>
                            <span className="min-w-[110px] border-b-2 border-slate-900 text-center font-mono text-[16px] font-bold">
                              {totalWeight || "0"}
                            </span>
                            <span className="urdu text-[15px] font-bold">(کلو)</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Add Row Button (Hidden in Print) */}
                  <div className="mt-2 flex justify-start print:hidden">
                    <button
                      type="button"
                      onClick={addGatePassRow}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ مزید سطر شامل کریں</span>
                    </button>
                  </div>
                </div>

                {/* Note & Rickshaw Fare Box */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-end gap-2 border border-slate-900 px-3 py-1.5">
                    <span className="urdu shrink-0 text-[15px] font-bold leading-none">رکشہ کرایہ</span>
                    <input
                      value={currentGatePass.rickshaw}
                      onChange={(e) => setGatePassField("rickshaw", e.target.value)}
                      className="w-24 border-b border-slate-900 bg-transparent px-1 text-[15px] font-mono outline-none font-bold text-center"
                    />
                  </div>
                  <p className="urdu flex-1 text-[15px] font-medium leading-relaxed text-slate-800">
                    نوٹ: مال موقع پر چیک کر لیں کمپنی بعد میں کسی نقصان کی ذمہ دار نہ ہوگی۔ شکریہ
                  </p>
                </div>

                {/* Extra Notes */}
                <div className="mt-3 flex items-end gap-2">
                  <span className="urdu shrink-0 text-[15px] font-bold leading-none">اضافی تفصیل:</span>
                  <input
                    value={currentGatePass.extra}
                    onChange={(e) => setGatePassField("extra", e.target.value)}
                    className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                  />
                </div>

                {/* Symmetrical Signatures Section */}
                <div className="mt-14 grid grid-cols-3 gap-8 text-center">
                  {[
                    activeModule === "inward" ? "وصول کنندہ" : "وصول کرنے والا",
                    "گودام انچارج",
                    "انچارج",
                  ].map((s) => (
                    <div key={s}>
                      <div className="mx-auto mb-1.5 w-full border-t-2 border-slate-900" />
                      <span className="urdu text-[17px] font-bold text-slate-900">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ResponsiveSheetWrapper>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 3: TRANSFERS HISTORY (A4 Width)                                     */}
        {/* ========================================================================= */}
        {activeModule === "transfers" && (
          <div className="w-[210mm] max-w-full mx-auto rounded-2xl bg-white p-6 shadow-sm border border-slate-200 print:hidden">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 font-urdu">میٹریل ٹرانسفر ریکارڈز (Stock Entries)</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-urdu">
                  حالیہ میٹریل ٹرانسفر دیکھ کر براہ راست ان ورڈ یا آؤٹ ورڈ گیٹ پاس میں لوڈ کریں۔
                </p>
              </div>
              <button
                onClick={loadTransfers}
                disabled={isLoadingTransfers}
                className={btnNeutral}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTransfers ? "animate-spin" : ""}`} />
                <span>ریفریش</span>
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              {transfers.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Layers className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  <p className="font-medium text-sm font-urdu">کوئی میٹریل ٹرانسفر ریکارڈ موجود نہیں ہے۔</p>
                  <p className="text-xs text-slate-400 mt-1 font-urdu">نیا گیٹ پاس بنا کر سنک کریں۔</p>
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600 font-semibold font-urdu text-[13px]">
                      <th className="p-3">دستاویز نمبر (Name)</th>
                      <th className="p-3">تاریخ</th>
                      <th className="p-3">روانگی گودام (From)</th>
                      <th className="p-3">منزل گودام (To)</th>
                      <th className="p-3">حالت (Status)</th>
                      <th className="p-3 text-center">ایکشن (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transfers.map((t) => (
                      <tr key={t.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700">{t.name}</td>
                        <td className="p-3 text-slate-600 font-mono">{t.posting_date}</td>
                        <td className="p-3 text-slate-800 font-urdu">{t.from_warehouse || "-"}</td>
                        <td className="p-3 text-slate-800 font-urdu">{t.to_warehouse || "-"}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                              t.docstatus === 1
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {t.docstatus === 1 ? "Submitted" : "Draft"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleLoadTransferIntoGatepass(t, "inward")}
                              className="rounded-md bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 shadow-2xs font-urdu"
                            >
                              ان ورڈ میں لوڈ کریں
                            </button>
                            <button
                              onClick={() => handleLoadTransferIntoGatepass(t, "outward")}
                              className="rounded-md bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700 shadow-2xs font-urdu"
                            >
                              آؤٹ ورڈ میں لوڈ کریں
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
