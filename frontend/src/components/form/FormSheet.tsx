import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ErpnextItem } from "@/hooks/useProductionForm";
import { CellInput, type FormData } from "./FormTable";

function Wheat() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="currentColor">
      <path d="M12 2c1.6 1.4 2.4 3 2.4 4.6S13.6 9.8 12 11.2c-1.6-1.4-2.4-3-2.4-4.6S10.4 3.4 12 2zm0 6.6c1.6 1.4 2.4 3 2.4 4.6S13.6 16.4 12 17.8c-1.6-1.4-2.4-3-2.4-4.6s.8-3.2 2.4-4.6zM12 15v7h-1.2v-7H12zm-3.4-4.2c1.9.5 3 1.6 3.4 2.9-1.4.4-2.9-.1-4-1.1-.6-.5-1-1.2-1.2-1.9.6-.1 1.2-.1 1.8.1zm6.8 0c.6-.2 1.2-.2 1.8-.1-.2.7-.6 1.4-1.2 1.9-1.1 1-2.6 1.5-4 1.1.4-1.3 1.5-2.4 3.4-2.9z" />
    </svg>
  );
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

const cell = "border border-form-line p-0 align-middle";
const labelCell =
  "border border-form-line px-2 py-1 text-right pr-4 text-[13px] font-urdu text-form-ink w-[30%] whitespace-nowrap";

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
      <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap px-1 py-1 font-urdu text-[12px] text-form-ink">
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
      <div className="flex items-center gap-1 px-2 py-1 font-urdu text-[12px] text-form-ink">
        <CellInput value={value} onChange={onChange} numeric label={label} className="h-6 flex-1 border-b border-form-line" />
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
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-6 min-w-[52px] cursor-pointer items-center justify-center rounded border border-form-line bg-white px-2 font-urdu text-[12px] text-form-ink transition-colors hover:bg-form-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <span className="text-center">{shown}</span>
        <ChevronDown open={open} className="absolute end-0.5" />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute start-0 z-20 mt-1 max-h-40 min-w-full overflow-auto rounded-md border border-form-line bg-white py-1 shadow-lg"
        >
          {options.map((opt) => (
            <li key={opt} role="option" aria-selected={opt === shown}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer whitespace-nowrap px-3 py-1 text-center font-urdu text-[12px] transition-colors hover:bg-form-highlight ${
                  opt === shown ? "bg-emerald-50 font-semibold" : ""
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
    <div ref={ref} className="relative flex h-8 w-full items-center">
      <input
        dir="rtl"
        aria-label={label}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-center font-urdu text-form-ink outline-none focus:bg-form-highlight"
      />
      <button
        type="button"
        aria-label={`${label} فہرست`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-form-ink transition-colors hover:bg-form-highlight"
      >
        <ChevronDown open={open} />
      </button>
      {open && filtered.length > 0 ? (
        <ul
          role="listbox"
          className="absolute start-0 top-[115%] z-30 mt-1 max-h-48 w-full overflow-auto rounded-md border border-form-line bg-white py-1 shadow-lg"
        >
          {filtered.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer whitespace-nowrap px-3 py-1 text-center font-urdu text-[13px] transition-colors hover:bg-form-highlight ${
                  o.value === value ? "bg-emerald-50 font-semibold" : ""
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

export function FormSheet({ data, set, itemList = [], batchOptions0 = [], batchOptions1 = [], batchOptionsReady = [], uomOptions0 = [], uomOptions1 = [], uomOptionsReady = [], logoUrl = "", lastDocUrl = "" }: Props) {
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
      className="a4-sheet mx-auto w-[210mm] max-w-full bg-white p-[8mm] text-form-ink shadow-[0_1px_12px_rgba(0,0,0,0.15)] print:shadow-none"
    >
      {/*
        Personalized searchable lists for raw material items and batches.
        The ComboInput below renders a type-ahead dropdown from these options.
      */}

      <div className="border-2 border-form-line p-2">
        {/* Header */}
        <header className="relative border-b-2 border-form-line px-1 pt-2 pb-1 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="لوگو"
              className="absolute top-1/2 right-1 h-21 w-21 -translate-y-1/2 object-cover"
            />
          ) : null}
          <div className="absolute top-1/2 left-1 -translate-y-1/2">
            {data.formNo ? <QrCode value={lastDocUrl || data.formNo} /> : null}
          </div>
          <h1 className="font-urdu text-[26px] font-bold leading-[2]">
            مرزا محمد مشتاق اینڈ کمپنی
          </h1>
          <p className="font-urdu text-[11px] leading-[2]">
            دکان نمبر 11 نیو گرین مارکیٹ ڈجکوٹ روڈ فیصل آباد ۔ فون: 2602233-041
          </p>
        </header>

        {/* Date / No. */}
        <div className="flex items-center justify-between gap-4 px-2 py-2 font-urdu text-[13px]">
          <label className="flex items-center gap-1">
            <span>تاریخ:</span>
            <input
              dir="rtl"
              value={data.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-32 border-b border-form-line bg-transparent px-1 text-center font-urdu outline-none focus:bg-form-highlight"
            />
          </label>
          <h2 className="text-[17px] font-bold">مال کی تیاری کی تفصیل</h2>
          <label className="flex items-center gap-1">
            <span>نمبر:</span>
            <input
              dir="rtl"
              value={data.formNo}
              onChange={(e) => set("formNo", e.target.value)}
              className="w-24 border-b border-form-line bg-transparent px-1 text-center font-urdu outline-none focus:bg-form-highlight"
            />
          </label>
        </div>

        {/* Table */}
        <table className="w-full table-fixed border-collapse border border-form-line">
          <caption className="sr-only">مال کی تیاری کی تفصیل</caption>
          <thead>
            <tr>
              <th className={labelCell} />
              <th className="border border-form-line py-1 font-urdu text-[14px]">۱</th>
              <th className="border border-form-line py-1 font-urdu text-[14px]">۲</th>
            </tr>
          </thead>
          <tbody className="[&_tr]:h-11">
            <tr>
              <th scope="row" className={labelCell}>خام مال کا نام</th>
              <td className={cell}>
                <ComboInput value={data.rawName[0]} onChange={pair("rawName", 0)} label="خام مال کا نام ۱" options={itemOptions} />
              </td>
              <td className={cell}>
                <ComboInput value={data.rawName[1]} onChange={pair("rawName", 1)} label="خام مال کا نام ۲" options={itemOptions} />
              </td>
            </tr>
            <tr>
              <th scope="row" className={labelCell}>کل وزن</th>
              <UnitCell value={data.totalWeight[0]} onChange={pair("totalWeight", 0)} label="کل وزن ۱" uom={data.rawUom[0]} onUomChange={pair("rawUom", 0)} uomOptions={uomOptions0} />
              <UnitCell value={data.totalWeight[1]} onChange={pair("totalWeight", 1)} label="کل وزن ۲" uom={data.rawUom[1]} onUomChange={pair("rawUom", 1)} uomOptions={uomOptions1} />
            </tr>
            <tr>
              <th scope="row" className={labelCell}>لاٹ نمبر</th>
              <td className={cell}>
                <ComboInput value={data.lotNo[0]} onChange={pair("lotNo", 0)} label="لاٹ نمبر ۱" options={batch0Options} />
              </td>
              <td className={cell}>
                <ComboInput value={data.lotNo[1]} onChange={pair("lotNo", 1)} label="لاٹ نمبر ۲" options={batch1Options} />
              </td>
            </tr>
            <tr>
              <th scope="row" className={labelCell}>خام مال کی بقایا تعداد</th>
              <PairCell value={data.remaining[0]} onChange={pair("remaining", 0)} label="بقایا تعداد ۱" uom={data.rawUom[0]} onUom={pair("rawUom", 0)} uomOptions={uomOptions0} />
              <PairCell value={data.remaining[1]} onChange={pair("remaining", 1)} label="بقایا تعداد ۲" uom={data.rawUom[1]} onUom={pair("rawUom", 1)} uomOptions={uomOptions1} />
            </tr>
            <tr>
              <th scope="row" className={labelCell}>تیار شدہ مال کا نام</th>
              <td className={cell} colSpan={2}>
                <ComboInput value={data.readyName} onChange={(v) => set("readyName", v)} label="تیار شدہ مال کا نام" options={itemOptions} />
              </td>
            </tr>
            <tr>
              <th scope="row" className={labelCell}>تیار شدہ لاٹ نمبر</th>
              <td className={cell} colSpan={2}>
                <ComboInput value={data.readyLot} onChange={(v) => set("readyLot", v)} label="تیار شدہ لاٹ نمبر" options={batchReadyOptions} />
              </td>
            </tr>
            <tr>
              <th scope="row" className={labelCell}>تیار شدہ بیگ کی تعداد</th>
              <td className={cell} colSpan={2}>
                <div className="flex items-center justify-center gap-1 px-2 py-1 font-urdu text-[12px] text-form-ink">
                  <CellInput
                    oval
                    value={data.readyBags}
                    onChange={(v) => set("readyBags", v)}
                    numeric
                    label="تیار شدہ بیگ کی تعداد"
                  />
                  <UomSelect value={data.readyUom} onChange={(v) => set("readyUom", v)} options={uomOptionsReady} label="یونٹ" />
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" className={labelCell}>تیار شدہ مال کا وزن</th>
              <td className={cell} colSpan={2}>
                <div className="flex items-center gap-1 px-2 py-1 font-urdu text-[12px] text-form-ink">
                  <CellInput value={data.readyWeight} onChange={() => {}} numeric label="تیار شدہ وزن" className="h-6 flex-1 border-b border-form-line" readOnly />
                  <UomSelect value={data.readyUom} onChange={(v) => set("readyUom", v)} options={uomOptionsReady} label="تیار شدہ یونٹ" />
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" className={labelCell}>کل موجودہ اسٹاک (تیار شدہ)</th>
              <td className={cell} colSpan={2}>
                <div className="flex items-center justify-center gap-1 px-1 py-1 font-urdu text-[12px]">
                  <CellInput oval value={data.stock} onChange={(v) => set("stock", v)} numeric label="اسٹاک" />
                  <UomSelect value={data.readyUom} onChange={(v) => set("readyUom", v)} options={uomOptionsReady} label="اسٹاک یونٹ" />
                </div>
              </td>
            </tr>
            <tr className="h-auto">
              <td className={cell} colSpan={3}>
                <div className="px-2 py-1">
                  <label htmlFor="notes" className="font-urdu text-[13px]">
                    مزید تفصیلات:
                  </label>
                  <textarea
                    id="notes"
                    dir="rtl"
                    rows={5}
                    value={data.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    className="w-full resize-none bg-transparent font-urdu text-[13px] outline-none focus:bg-form-highlight"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer signatures */}
        <div className="mt-8 flex items-end justify-between gap-8 px-2 font-urdu text-[13px]">
          <label className="flex flex-1 flex-col items-center gap-1">
            <input
              dir="rtl"
              value={data.signMaker}
              onChange={(e) => set("signMaker", e.target.value)}
              className="w-full border-b border-form-line bg-transparent px-1 text-center font-urdu outline-none focus:bg-form-highlight"
            />
            <span>دستخط تیار کنندہ</span>
          </label>
          <label className="flex flex-1 flex-col items-center gap-1">
            <input
              dir="rtl"
              value={data.signIncharge}
              onChange={(e) => set("signIncharge", e.target.value)}
              className="w-full border-b border-form-line bg-transparent px-1 text-center font-urdu outline-none focus:bg-form-highlight"
            />
            <span>دستخط انچارج</span>
          </label>
        </div>
      </div>
    </div>
  );
}
