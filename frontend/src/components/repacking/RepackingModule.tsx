import { useProductionForm } from "../../hooks/useProductionForm";
import { FormSheet as RepackingFormSheet } from "../form/FormSheet";
import { ResponsiveSheetWrapper } from "../ui/ResponsiveSheetWrapper";

interface RepackingModuleProps {
  userCanCreateStockEntry: boolean;
}

export function RepackingModule({ userCanCreateStockEntry }: RepackingModuleProps) {
  const repacking = useProductionForm();

  // Consistent Toolbar Button Styles
  const btnBase =
    "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-bold transition-all shadow-xs cursor-pointer active:scale-98 select-none";
  const btnSave = `${btnBase} bg-emerald-800 hover:bg-emerald-900 text-white`;
  const btnNeutral = `${btnBase} bg-white hover:bg-slate-100 text-slate-800 border border-slate-300`;
  const btnDanger = `${btnBase} bg-rose-700 hover:bg-rose-800 text-white`;
  const btnSync = `${btnBase} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed`;

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
