import { useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  Trash2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { api, type ErpnextItem, type ErpnextWarehouse } from "../../lib/api";
import { ResponsiveSheetWrapper } from "../ui/ResponsiveSheetWrapper";

export interface GatePassRow {
  qty: string;
  packing: string;
  itemCode: string;
  detail: string;
  weight: string;
  uom: string;
}

export interface GatePassData {
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
  godam: string;
  vehicle: string;
  driver: string;
  contact: string;
  rickshaw: string;
  extra: string;
  receiverSign: string;
  godownInchargeSign: string;
  inchargeSign: string;
  rows: GatePassRow[];
  erpDocName?: string;
}

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

const DEFAULT_ROW_COUNT = 9;
const OUTWARD_STORAGE_KEY = "mmmc-gatepass-outward-data";

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

function initialOutwardData(): GatePassData {
  return {
    type: "outward",
    no: "",
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

const btn =
  "inline-flex cursor-pointer select-none items-center justify-center gap-1 rounded-md border px-3.5 py-1.5 text-[13px] font-urdu whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:pointer-events-none disabled:opacity-50 max-sm:px-2 max-sm:py-1 max-sm:text-[11px]";

const btnSave = `${btn} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold`;
const btnNeutral = `${btn} border-slate-400 bg-white text-slate-900 hover:bg-amber-50/60 font-medium`;
const btnDanger = `${btn} border-red-300 bg-white text-red-700 hover:bg-red-50 font-medium`;
const btnSync = `${btn} border-emerald-600 bg-emerald-50 font-bold text-emerald-950 hover:bg-emerald-100`;

const cell =
  "w-full bg-transparent px-2 py-1.5 text-center text-[14px] outline-none focus:bg-amber-50/50 print:focus:bg-transparent font-medium";

interface GatePassOutwardFormProps {
  userCanCreateStockEntry: boolean;
  permittedWarehouses: ErpnextWarehouse[];
  items: ErpnextItem[];
  onConvertToInward?: (outwardData: GatePassData) => void;
}

export function GatePassOutwardForm({
  userCanCreateStockEntry,
  permittedWarehouses,
  items,
  onConvertToInward,
}: GatePassOutwardFormProps) {
  const [formData, setFormData] = useState<GatePassData>(() => initialOutwardData());
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [syncSuccessResult, setSyncSuccessResult] = useState<{
    docName: string;
    docUrl: string;
    message: string;
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeItemSearchRow, setActiveItemSearchRow] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(OUTWARD_STORAGE_KEY);
      if (saved) setFormData(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Flash toast message
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const saveLocal = () => {
    try {
      localStorage.setItem(OUTWARD_STORAGE_KEY, JSON.stringify(formData));
      setMessage("گیٹ پاس محفوظ ہو گیا ✓");
    } catch {
      setMessage("محفوظ نہیں ہو سکا");
    }
  };

  const loadLocal = () => {
    try {
      const raw = localStorage.getItem(OUTWARD_STORAGE_KEY);
      if (raw) {
        setFormData(JSON.parse(raw));
        setMessage("محفوظ شدہ ڈیٹا لوڈ ہو گیا ✓");
      } else {
        setMessage("کوئی محفوظ شدہ ڈیٹا موجود نہیں");
      }
    } catch {
      setMessage("ڈیٹا لوڈ نہیں ہو سکا");
    }
  };

  const clearLocal = () => {
    setFormData(initialOutwardData());
    localStorage.removeItem(OUTWARD_STORAGE_KEY);
    setSyncSuccessResult(null);
    setSyncError(null);
    setMessage("فارم خالی کر دیا گیا");
  };

  const setField = (field: keyof GatePassData, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const setRowCell = (idx: number, col: keyof GatePassRow, val: string) => {
    setFormData((prev) => {
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

  const addRow = () => {
    setFormData((prev) => ({
      ...prev,
      rows: [...prev.rows, { qty: "", packing: "", itemCode: "", detail: "", weight: "", uom: "Kg" }],
    }));
  };

  const removeRow = (idx: number) => {
    setFormData((prev) => {
      if (prev.rows.length <= 1) return prev;
      const updated = prev.rows.filter((_, i) => i !== idx);
      return { ...prev, rows: updated };
    });
  };

  const totalQty = useMemo(
    () =>
      Math.round(
        formData.rows.reduce((a, r) => a + (parseFloat(r.qty) || 0), 0) * 100
      ) / 100,
    [formData.rows]
  );

  const totalWeight = useMemo(
    () =>
      Math.round(
        formData.rows.reduce((a, r) => a + (parseFloat(r.weight) || 0), 0) * 100
      ) / 100,
    [formData.rows]
  );

  const handleSyncToErp = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessResult(null);
    setMessage("سسٹم میں میٹریل ٹرانسفر منتقل ہو رہا ہے...");

    try {
      const result = await api.syncToERPNext(formData);
      if (result.success) {
        setSyncSuccessResult({
          docName: result.documentName,
          docUrl: result.docUrl,
          message: result.message,
        });
        setFormData((prev) => ({ ...prev, erpDocName: result.documentName }));
        setMessage(`✓ سسٹم میں کامیابی سے درج ہو گیا! (دستاویز نمبر: ${result.documentName})`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "سسٹم میں ڈیٹا منتقل کرنے میں مسئلہ پیش آیا۔";
      setSyncError(errMsg);
      setMessage(`⚠️ خطاء: ${errMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return items.slice(0, 10);
    const q = itemSearchQuery.toLowerCase();
    return items
      .filter(
        (itm) =>
          (itm.item_name && itm.item_name.toLowerCase().includes(q)) ||
          (itm.item_code && itm.item_code.toLowerCase().includes(q)) ||
          (itm.name && itm.name.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [items, itemSearchQuery]);

  return (
    <div className="w-full">
      {/* Sync Success Notification Card */}
      {syncSuccessResult && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-emerald-900 shadow-xs max-w-[210mm] mx-auto">
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
            className="text-xs font-medium text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            ✕ بند کریں
          </button>
        </div>
      )}

      {/* Sync Error Notification Card */}
      {syncError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-rose-900 shadow-xs max-w-[210mm] mx-auto">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <h4 className="font-bold text-sm">سنک میں خرابی</h4>
              <p className="text-xs text-rose-700 mt-0.5">{syncError}</p>
            </div>
          </div>
          <button
            onClick={() => setSyncError(null)}
            className="text-xs font-medium text-rose-700 hover:text-rose-950 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <ResponsiveSheetWrapper
        toolbar={
          <>
            <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
              <button type="button" onClick={saveLocal} className={btnSave}>
                محفوظ کریں
              </button>
              <button type="button" onClick={loadLocal} className={btnNeutral}>
                لوڈ کریں
              </button>
              <button type="button" onClick={clearLocal} className={btnDanger}>
                خالی کریں
              </button>
              <button type="button" onClick={() => window.print()} className={btnNeutral}>
                پرنٹ کریں
              </button>
              {onConvertToInward && (
                <button
                  type="button"
                  onClick={() => onConvertToInward(formData)}
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
                onClick={handleSyncToErp}
                disabled={isSyncing || !userCanCreateStockEntry}
                className={btnSync}
                title={
                  !userCanCreateStockEntry
                    ? "آپ کے ERPNext اکاؤنٹ کے پاس میٹریل ٹرانسفر بنانے کی اجازت نہیں ہے (Restricted by ERPNext)"
                    : "ERPNext میں میٹریل ٹرانسفر بنائیں"
                }
              >
                {isSyncing
                  ? "منتقل ہو رہا ہے..."
                  : !userCanCreateStockEntry
                  ? "میٹریل ٹرانسفر (اجازت نہیں ہے 🔒)"
                  : "میٹریل ٹرانسفر بنائیں ⚡"}
              </button>
              <span
                aria-live="polite"
                className="rounded-full bg-white px-2.5 py-1 text-[12px] font-urdu text-slate-700 ring-1 ring-slate-300 shadow-xs max-w-[200px] truncate"
              >
                {message || "آؤٹ ورڈ گیٹ پاس تیار ہے"}
              </span>
            </div>
          </>
        }
      >
        <div className="a4-sheet mx-auto w-[210mm] max-w-[210mm] bg-white p-7 text-slate-900 shadow-md border-2 border-slate-900 print:shadow-none print:border-2 print:border-black print:p-0">
          {/* Header */}
          <header className="relative border-b-2 border-slate-900 pb-2 pt-1 text-center">
            <div className="absolute top-1/2 left-1 -translate-y-1/2 print:block">
              {formData.no ? (
                <QrCode value={syncSuccessResult?.docUrl || formData.erpDocName || formData.no} />
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
              گیٹ پاس (آؤٹ ورڈ)
            </h2>
            <div className="absolute left-0 top-1.5 print:hidden">
              <span className="rounded-full px-3 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                OUTWARD PASS
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
                  value={formData.no}
                  onChange={(e) => setField("no", e.target.value)}
                  placeholder="نمبر درج کریں..."
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[15px] outline-none font-bold placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                />
              </div>

              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">تاریخ:</span>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setField("date", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[14px] outline-none"
                />
              </div>

              {/* Adda Name */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">اڈہ کا نام:</span>
                <input
                  value={formData.adda}
                  onChange={(e) => setField("adda", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                />
              </div>

              {/* Baraye */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">برائے:</span>
                <input
                  value={formData.baraye}
                  onChange={(e) => setField("baraye", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                />
              </div>

              {/* Party */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">پارٹی / لینے والا:</span>
                <input
                  value={formData.party}
                  onChange={(e) => setField("party", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                />
              </div>

              {/* Phone */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">فون نمبر:</span>
                <input
                  value={formData.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[14px] outline-none"
                />
              </div>

              {/* Source Warehouse */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">روانگی گودام:</span>
                <div className="relative w-full">
                  <input
                    list="outward-warehouse-options"
                    value={formData.fromWarehouse}
                    onChange={(e) => setField("fromWarehouse", e.target.value)}
                    placeholder="گودام منتخب کریں..."
                    className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[14px] outline-none"
                  />
                </div>
              </div>

              {/* Destination Warehouse */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">منزل گودام:</span>
                <div className="relative w-full">
                  <input
                    list="outward-warehouse-options"
                    value={formData.toWarehouse}
                    onChange={(e) => setField("toWarehouse", e.target.value)}
                    placeholder="منزل گودام منتخب کریں..."
                    className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[14px] outline-none"
                  />
                </div>
              </div>

              {/* Warehouse Datalist */}
              <datalist id="outward-warehouse-options">
                {permittedWarehouses.map((wh) => (
                  <option key={wh.name} value={wh.name}>
                    {wh.warehouse_name || wh.name}
                  </option>
                ))}
              </datalist>

              {/* Vehicle Number */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">گاڑی نمبر:</span>
                <input
                  value={formData.vehicle}
                  onChange={(e) => setField("vehicle", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none font-mono"
                />
              </div>

              {/* Driver Name */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">ڈرائیور کا نام:</span>
                <input
                  value={formData.driver}
                  onChange={(e) => setField("driver", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
                />
              </div>

              {/* Driver Contact */}
              <div className="flex items-end gap-2">
                <span className="urdu shrink-0 text-[15px] font-bold leading-none">رابطہ نمبر:</span>
                <input
                  value={formData.contact}
                  onChange={(e) => setField("contact", e.target.value)}
                  className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 font-mono text-[14px] outline-none"
                />
              </div>
            </div>
          </section>

          {/* Items Table */}
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
                {formData.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-amber-50/20 transition-colors">
                    {/* Qty */}
                    <td className="border border-slate-900 p-0">
                      <input
                        value={r.qty}
                        onChange={(e) => setRowCell(i, "qty", e.target.value)}
                        className={cell}
                        placeholder=""
                      />
                    </td>

                    {/* Packing */}
                    <td className="border border-slate-900 p-0">
                      <input
                        value={r.packing}
                        onChange={(e) => setRowCell(i, "packing", e.target.value)}
                        className={cell}
                        placeholder=""
                      />
                    </td>

                    {/* Detail / Item Name with Autocomplete */}
                    <td className="border border-slate-900 p-0 relative">
                      <div className="relative flex items-center">
                        <input
                          value={r.detail}
                          onChange={(e) => {
                            setRowCell(i, "detail", e.target.value);
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
                            className="absolute left-1.5 top-2 text-slate-400 hover:text-slate-800 print:hidden p-0.5 cursor-pointer"
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
                              className="text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          {filteredItems.map((itm) => (
                            <button
                              key={itm.name}
                              type="button"
                              onClick={() => {
                                setRowCell(i, "detail", itm.item_name || itm.name);
                                setRowCell(i, "itemCode", itm.name);
                                if (itm.stock_uom) setRowCell(i, "uom", itm.stock_uom);
                                setActiveItemSearchRow(null);
                              }}
                              className="w-full text-right px-3 py-1.5 hover:bg-amber-50 border-b border-slate-100 last:border-none flex flex-col cursor-pointer"
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
                        onChange={(e) => setRowCell(i, "weight", e.target.value)}
                        className={`${cell} font-bold font-mono`}
                        placeholder=""
                      />
                    </td>

                    {/* Actions */}
                    <td className="border border-slate-900 p-0 text-center print:hidden">
                      <button
                        onClick={() => removeRow(i)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
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

            {/* Add Row Button */}
            <div className="mt-2 flex justify-start print:hidden">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
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
                value={formData.rickshaw}
                onChange={(e) => setField("rickshaw", e.target.value)}
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
              value={formData.extra}
              onChange={(e) => setField("extra", e.target.value)}
              className="w-full min-w-0 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-[15px] outline-none"
            />
          </div>

          {/* Symmetrical Signatures Section */}
          <div className="mt-14 grid grid-cols-3 gap-8 text-center">
            {["وصول کرنے والا", "گودام انچارج", "انچارج"].map((s) => (
              <div key={s}>
                <div className="mx-auto mb-1.5 w-full border-t-2 border-slate-900" />
                <span className="urdu text-[17px] font-bold text-slate-900">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </ResponsiveSheetWrapper>
    </div>
  );
}
