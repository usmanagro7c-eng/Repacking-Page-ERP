import { useProductionForm } from "../../hooks/useProductionForm";
import { FormSheet as RepackingFormSheet } from "../form/FormSheet";
import { ResponsiveSheetWrapper } from "../ui/ResponsiveSheetWrapper";

interface RepackingFormProps {
  userCanCreateStockEntry: boolean;
}

const btn =
  "inline-flex cursor-pointer select-none items-center justify-center gap-1 rounded-md border px-3.5 py-1.5 text-[13px] font-urdu whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:pointer-events-none disabled:opacity-50 max-sm:px-2 max-sm:py-1 max-sm:text-[11px]";

const btnSave = `${btn} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold`;
const btnNeutral = `${btn} border-slate-400 bg-white text-slate-900 hover:bg-amber-50/60 font-medium`;
const btnDanger = `${btn} border-red-300 bg-white text-red-700 hover:bg-red-50 font-medium`;
const btnSync = `${btn} border-emerald-600 bg-emerald-50 font-bold text-emerald-950 hover:bg-emerald-100`;

export function RepackingForm({ userCanCreateStockEntry }: RepackingFormProps) {
  const repacking = useProductionForm();

  return (
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
                disabled={repacking.isSyncing || !userCanCreateStockEntry}
                className={btnSync}
                title={
                  !userCanCreateStockEntry
                    ? "آپ کے ERPNext اکاؤنٹ کے پاس سٹاک انٹری بنانے کی اجازت نہیں ہے (Restricted by ERPNext)"
                    : "ERPNext میں سٹاک انٹری بنائیں"
                }
              >
                {repacking.isSyncing
                  ? "منتقل ہو رہا ہے..."
                  : !userCanCreateStockEntry
                  ? "سٹاک انٹری (اجازت نہیں ہے 🔒)"
                  : "سٹاک انٹری بنائیں ⚡ (Repack)"}
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
  );
}
