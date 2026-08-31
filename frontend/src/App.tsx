import { useEffect, useRef, useState, type ReactNode } from "react";
import { FormSheet } from "./components/form/FormSheet";
import { useProductionForm } from "./hooks/useProductionForm";

function ResponsiveSheet({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
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
          className="no-print mx-auto mb-4 flex flex-wrap items-center justify-between gap-2"
          style={{ width: `calc(210mm * ${scale})` }}
          dir="rtl"
        >
          {toolbar}
        </div>
      ) : null}
      <div className="sheet-scale-wrap w-full" style={{ height: height || "auto" }}>
        <div className="flex justify-center">
          <div
            ref={sheetRef}
            className="sheet-scale"
            style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { data, message, isSyncing, itemList, batchOptions0, batchOptions1, batchOptionsReady, uomOptions0, uomOptions1, uomOptionsReady, logoUrl, lastDocUrl, setField, save, load, clear, syncToErpnext } =
    useProductionForm();

  const btn =
    "inline-flex cursor-pointer select-none items-center justify-center gap-1 rounded-md border px-4 py-2 text-[13px] font-urdu transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:pointer-events-none disabled:opacity-50 max-sm:px-2.5 max-sm:py-1.5 max-sm:text-[11px]";

  const btnSave = `${btn} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`;
  const btnNeutral = `${btn} border-form-line bg-white text-form-ink hover:bg-form-highlight`;
  const btnDanger = `${btn} border-red-300 bg-white text-red-700 hover:bg-red-50`;
  const btnSync = `${btn} border-emerald-600 bg-emerald-50 font-semibold text-emerald-950 hover:bg-emerald-100`;

  return (
    <main className="min-h-screen bg-muted/40 py-6">
      <div className="px-2 sm:px-4">
        <ResponsiveSheet
          toolbar={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={save} className={btnSave}>
                  محفوظ کریں
                </button>
                <button type="button" onClick={() => load()} className={btnNeutral}>
                  لوڈ کریں
                </button>
                <button type="button" onClick={clear} className={btnDanger}>
                  خالی کریں
                </button>
                <button type="button" onClick={() => window.print()} className={btnNeutral}>
                  پرنٹ کریں
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={syncToErpnext}
                  disabled={isSyncing}
                  className={btnSync}
                >
                  {isSyncing ? "منتقل ہو رہا ہے..." : "سٹاک انٹری بنائیں ⚡"}
                </button>
                <span
                  aria-live="polite"
                  className="rounded-full bg-white/70 px-3 py-1.5 text-[13px] font-urdu text-muted-foreground ring-1 ring-form-line/30 max-sm:w-full max-sm:text-center"
                >
                  {message}
                </span>
              </div>
            </>
          }
        >
          <FormSheet data={data} set={setField} itemList={itemList} batchOptions0={batchOptions0} batchOptions1={batchOptions1} batchOptionsReady={batchOptionsReady} uomOptions0={uomOptions0} uomOptions1={uomOptions1} uomOptionsReady={uomOptionsReady} logoUrl={logoUrl} lastDocUrl={lastDocUrl} />
        </ResponsiveSheet>
      </div>
    </main>
  );
}
