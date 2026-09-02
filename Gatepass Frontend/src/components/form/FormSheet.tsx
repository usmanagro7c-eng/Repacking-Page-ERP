import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ErpnextItem } from "@/hooks/useProductionForm";
import { CellInput, type FormData } from "./FormTable";

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

type Props = {
  data: FormData;
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  itemList?: ErpnextItem[];
  batchOptions0?: string[];
  batchOptions1?: string[];
  batchOptionsReady?: string[];
  uomOptions0?: string[];
  uomOptions1?: string[];
  uomOptionsReady?: string[];
  logoUrl?: string;
  lastDocUrl?: string;
};

const cell = "border border-slate-900 p-0 align-middle text-center";
const labelCell =
  "border border-slate-900 px-3 py-1.5 text-right pr-4 text-[14px] font-urdu font-bold text-slate-900 bg-slate-50/60 w-[30%] whitespace-nowrap";

function PairCell({
  value,
  onChange,
  label,
  uom,
  onUom,
  uomOptions,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  uom: string;
  onUom: (v: string) => void;
  uomOptions: string[];
}) {
  return (
    <td className={cell}>
      <div className="flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap px-1 py-1 font-urdu text-[13px] text-slate-900">
        <CellInput oval value={value} onChange={onChange} numeric label={label} />
        <UomSelect value={uom} onChange={onUom} options={uomOptions} label={`${label} یونٹ`} />
      </div>
    </td>
  );
}

function UnitCell({
  value,
  onChange,
  label,
  uom,
  onUomChange,
  uomOptions,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  uom: string;
  onUomChange: (v: string) => void;
  uomOptions: string[];
}) {
  return (
    <td className={cell}>
      <div className="flex items-center justify-center gap-1.5 px-2 py-1 font-urdu text-[13px] text-slate-900">
        <CellInput
          value={value}
          onChange={onChange}
          numeric
          label={label}
          className="h-7 flex-1 border-b border-slate-900 font-mono text-[14px]"
        />
        <UomSelect value={uom} onChange={onUomChange} options={uomOptions} label={`${label} یونٹ`} />
      </div>
    </td>
  );
}

function UomSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = value || options[0] || "Kg";

  return (
    <div ref={ref} className="relative inline-block print:border-none">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-6 min-w-[52px] cursor-pointer items-center justify-center rounded border border-slate-400 bg-white px-2 font-urdu text-[12px] text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
      >
        <span className="text-center font-bold">{shown}</span>
        <ChevronDown open={open} className="absolute end-0.5" />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute start-0 z-30 mt-1 max-h-40 min-w-full overflow-auto rounded-md border border-slate-300 bg-white py-1 shadow-lg"
        >
          {options.map((opt) => (
            <li key={opt} role="option" aria-selected={opt === shown}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer whitespace-nowrap px-3 py-1 text-center font-urdu text-[12px] transition-colors hover:bg-amber-50 ${
                  opt === shown ? "bg-emerald-50 font-bold text-emerald-900" : ""
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ChevronDown({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${className}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ComboInput({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = value.trim().toLowerCase();
  const filtered = options
    .filter((o) => !q || o.value.toLowerCase().includes(q) || o.label.toLowerCase().includes(q))
    .slice(0, 60);

  return (
    <div ref={ref} className="relative flex h-9 w-full items-center">
      <input
        dir="rtl"
        aria-label={label}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-center font-urdu text-[14px] font-medium text-slate-900 outline-none focus:bg-amber-50/50"
      />
      {options.length > 0 && (
        <button
          type="button"
          aria-label={`${label} فہرست`}
          onClick={() => setOpen((o) => !o)}
          className="flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-700 print:hidden"
        >
          <ChevronDown open={open} />
        </button>
      )}
      {open && filtered.length > 0 ? (
        <ul
          role="listbox"
          className="absolute start-0 top-[115%] z-30 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-300 bg-white py-1 shadow-xl text-right"
        >
          {filtered.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer whitespace-nowrap px-3 py-1.5 text-right font-urdu text-[13px] transition-colors hover:bg-amber-50 ${
                  o.value === value ? "bg-emerald-50 font-bold text-emerald-900" : "text-slate-800"
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FormSheet({
  data,
  set,
  itemList = [],
  batchOptions0 = [],
  batchOptions1 = [],
  batchOptionsReady = [],
  uomOptions0 = [],
  uomOptions1 = [],
  uomOptionsReady = [],
  logoUrl = "",
  lastDocUrl = "",
}: Props) {
  const pair = <K extends keyof FormData>(key: K, i: 0 | 1) => (v: string) => {
    const arr = [...(data[key] as unknown as [string, string])] as [string, string];
    arr[i] = v;
    set(key, arr as FormData[K]);
  };

  const itemOptions = itemList.map((item) => ({
    value: item.name,
    label: item.item_name && item.item_name !== item.name ? `${item.item_name} (${item.name})` : item.name,
  }));
  const batch0Options = batchOptions0.map((b) => ({ value: b, label: b }));
  const batch1Options = batchOptions1.map((b) => ({ value: b, label: b }));
  const batchReadyOptions = batchOptionsReady.map((b) => ({ value: b, label: b }));

  return (
    <div
      dir="rtl"
      className="a4-sheet mx-auto w-[210mm] max-w-[210mm] bg-white p-7 text-slate-900 shadow-md border-2 border-slate-900 print:shadow-none print:border-2 print:border-black print:p-0"
    >
      {/* Header - Balanced Typography & Clear Spacing */}
      <header className="relative border-b-2 border-slate-900 pb-2.5 pt-1 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="لوگو"
            className="absolute top-1/2 right-1 h-14 w-14 -translate-y-1/2 object-contain"
          />
        ) : null}
        <div className="absolute top-1/2 left-1 -translate-y-1/2 print:block">
          {data.formNo ? <QrCode value={lastDocUrl || data.formNo} /> : null}
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

      {/* Title & Metadata Header Bar */}
      <div className="relative mt-3 flex items-center justify-between border-b border-slate-300 pb-3.5 pt-1 px-1">
        <div className="flex items-end gap-1.5">
          <span className="urdu text-[14px] font-bold">تاریخ:</span>
          <input
            dir="rtl"
            value={data.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-28 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-center font-mono text-[14px] outline-none"
          />
        </div>

        <h2 className="urdu text-[21px] font-bold text-slate-900 text-center leading-normal pb-1">
          مال کی تیاری کی تفصیل (ریپیکنگ)
        </h2>

        <div className="flex items-end gap-1.5">
          <span className="urdu text-[14px] font-bold">نمبر:</span>
          <input
            dir="rtl"
            value={data.formNo}
            onChange={(e) => set("formNo", e.target.value)}
            className="w-28 border-b border-slate-900 bg-transparent px-1 pb-0.5 text-center font-mono text-[14px] font-bold outline-none"
          />
        </div>
      </div>

      {/* Main Repacking Table */}
      <table className="mt-3.5 w-full table-fixed border-collapse border border-slate-900">
        <caption className="sr-only">مال کی تیاری کی تفصیل</caption>
        <thead>
          <tr className="bg-slate-100/90 text-slate-900 font-bold urdu text-[15px]">
            <th className={labelCell} />
            <th className="border border-slate-900 py-1.5 text-center">خام مال نمبر ۱</th>
            <th className="border border-slate-900 py-1.5 text-center">خام مال نمبر ۲</th>
          </tr>
        </thead>
        <tbody className="[&_tr]:h-10">
          {/* Raw Material Name */}
          <tr>
            <th scope="row" className={labelCell}>
              خام مال کا نام
            </th>
            <td className={cell}>
              <ComboInput
                value={data.rawName[0]}
                onChange={pair("rawName", 0)}
                label="خام مال کا نام ۱"
                options={itemOptions}
              />
            </td>
            <td className={cell}>
              <ComboInput
                value={data.rawName[1]}
                onChange={pair("rawName", 1)}
                label="خام مال کا نام ۲"
                options={itemOptions}
              />
            </td>
          </tr>

          {/* Total Weight */}
          <tr>
            <th scope="row" className={labelCell}>
              کل وزن
            </th>
            <UnitCell
              value={data.totalWeight[0]}
              onChange={pair("totalWeight", 0)}
              label="کل وزن ۱"
              uom={data.rawUom[0]}
              onUomChange={pair("rawUom", 0)}
              uomOptions={uomOptions0}
            />
            <UnitCell
              value={data.totalWeight[1]}
              onChange={pair("totalWeight", 1)}
              label="کل وزن ۲"
              uom={data.rawUom[1]}
              onUomChange={pair("rawUom", 1)}
              uomOptions={uomOptions1}
            />
          </tr>

          {/* Lot Number */}
          <tr>
            <th scope="row" className={labelCell}>
              لاٹ نمبر
            </th>
            <td className={cell}>
              <ComboInput
                value={data.lotNo[0]}
                onChange={pair("lotNo", 0)}
                label="لاٹ نمبر ۱"
                options={batch0Options}
              />
            </td>
            <td className={cell}>
              <ComboInput
                value={data.lotNo[1]}
                onChange={pair("lotNo", 1)}
                label="لاٹ نمبر ۲"
                options={batch1Options}
              />
            </td>
          </tr>

          {/* Remaining Bags */}
          <tr>
            <th scope="row" className={labelCell}>
              خام مال کی بقایا تعداد
            </th>
            <PairCell
              value={data.remaining[0]}
              onChange={pair("remaining", 0)}
              label="بقایا تعداد ۱"
              uom={data.rawUom[0]}
              onUom={pair("rawUom", 0)}
              uomOptions={uomOptions0}
            />
            <PairCell
              value={data.remaining[1]}
              onChange={pair("remaining", 1)}
              label="بقایا تعداد ۲"
              uom={data.rawUom[1]}
              onUom={pair("rawUom", 1)}
              uomOptions={uomOptions1}
            />
          </tr>

          {/* Ready Product Name */}
          <tr>
            <th scope="row" className={labelCell}>
              تیار شدہ مال کا نام
            </th>
            <td className={cell} colSpan={2}>
              <ComboInput
                value={data.readyName}
                onChange={(v) => set("readyName", v)}
                label="تیار شدہ مال کا نام"
                options={itemOptions}
              />
            </td>
          </tr>

          {/* Ready Lot Number */}
          <tr>
            <th scope="row" className={labelCell}>
              تیار شدہ لاٹ نمبر
            </th>
            <td className={cell} colSpan={2}>
              <ComboInput
                value={data.readyLot}
                onChange={(v) => set("readyLot", v)}
                label="تیار شدہ لاٹ نمبر"
                options={batchReadyOptions}
              />
            </td>
          </tr>

          {/* Ready Bags Count */}
          <tr>
            <th scope="row" className={labelCell}>
              تیار شدہ بیگ کی تعداد
            </th>
            <td className={cell} colSpan={2}>
              <div className="flex items-center justify-center gap-2 px-2 py-1 font-urdu text-[13px] text-slate-900">
                <CellInput
                  oval
                  value={data.readyBags}
                  onChange={(v) => set("readyBags", v)}
                  numeric
                  label="تیار شدہ بیگ کی تعداد"
                />
                <UomSelect
                  value={data.readyUom}
                  onChange={(v) => set("readyUom", v)}
                  options={uomOptionsReady}
                  label="یونٹ"
                />
              </div>
            </td>
          </tr>

          {/* Ready Total Weight */}
          <tr>
            <th scope="row" className={labelCell}>
              تیار شدہ مال کا وزن
            </th>
            <td className={cell} colSpan={2}>
              <div className="flex items-center justify-center gap-2 px-2 py-1 font-urdu text-[13px] text-slate-900">
                <CellInput
                  value={data.readyWeight}
                  onChange={() => {}}
                  numeric
                  label="تیار شدہ وزن"
                  className="h-7 w-48 border-b border-slate-900 font-mono text-[14px] font-bold text-center"
                  readOnly
                />
                <UomSelect
                  value={data.readyUom}
                  onChange={(v) => set("readyUom", v)}
                  options={uomOptionsReady}
                  label="تیار شدہ یونٹ"
                />
              </div>
            </td>
          </tr>

          {/* Total Stock */}
          <tr>
            <th scope="row" className={labelCell}>
              کل موجودہ اسٹاک (تیار شدہ)
            </th>
            <td className={cell} colSpan={2}>
              <div className="flex items-center justify-center gap-2 px-1 py-1 font-urdu text-[13px]">
                <CellInput oval value={data.stock} onChange={(v) => set("stock", v)} numeric label="اسٹاک" />
                <UomSelect
                  value={data.readyUom}
                  onChange={(v) => set("readyUom", v)}
                  options={uomOptionsReady}
                  label="اسٹاک یونٹ"
                />
              </div>
            </td>
          </tr>

          {/* Notes Section */}
          <tr className="h-auto">
            <td className={cell} colSpan={3}>
              <div className="px-3 py-2 text-right">
                <label htmlFor="notes" className="font-urdu text-[13.5px] font-bold block mb-1 text-slate-900">
                  مزید تفصیلات / ریمارکس:
                </label>
                <textarea
                  id="notes"
                  dir="rtl"
                  rows={3}
                  value={data.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="w-full resize-none bg-transparent font-urdu text-[13.5px] leading-relaxed outline-none border border-slate-200 rounded p-1.5 focus:bg-amber-50/50"
                  placeholder="کوئی اضافی نوٹس یا تفصیلات یہاں درج کریں..."
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-16 px-4 text-center">
        <label className="flex flex-col items-center gap-1">
          <input
            dir="rtl"
            value={data.signMaker}
            onChange={(e) => set("signMaker", e.target.value)}
            className="w-full border-b-2 border-slate-900 bg-transparent px-1 text-center font-urdu text-[14px] outline-none"
          />
          <span className="urdu text-[15px] font-bold text-slate-900">دستخط تیار کنندہ</span>
        </label>
        <label className="flex flex-col items-center gap-1">
          <input
            dir="rtl"
            value={data.signIncharge}
            onChange={(e) => set("signIncharge", e.target.value)}
            className="w-full border-b-2 border-slate-900 bg-transparent px-1 text-center font-urdu text-[14px] outline-none"
          />
          <span className="urdu text-[15px] font-bold text-slate-900">دستخط انچارج</span>
        </label>
      </div>
    </div>
  );
}
