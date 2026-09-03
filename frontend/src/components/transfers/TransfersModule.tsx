import { useState, useEffect } from "react";
import { RefreshCw, Layers } from "lucide-react";
import { api, type ErpnextMaterialTransfer } from "../../lib/api";

interface TransfersModuleProps {
  onLoadTransferIntoGatepass?: (
    transfer: ErpnextMaterialTransfer,
    targetType: "outward" | "inward",
  ) => void;
}

export function TransfersModule({ onLoadTransferIntoGatepass }: TransfersModuleProps) {
  const [transfers, setTransfers] = useState<ErpnextMaterialTransfer[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);

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
    loadTransfers();
  }, []);

  const btnNeutral =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-[13px] font-urdu font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-all shadow-xs cursor-pointer";

  return (
    <div className="w-[210mm] max-w-full mx-auto rounded-2xl bg-white p-6 shadow-sm border border-slate-200 print:hidden">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-urdu">
            میٹریل ٹرانسفر ریکارڈز (Stock Entries)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-urdu">
            حالیہ میٹریل ٹرانسفر دیکھ کر براہ راست ان ورڈ یا آؤٹ ورڈ گیٹ پاس میں لوڈ کریں۔
          </p>
        </div>
        <button onClick={loadTransfers} disabled={isLoadingTransfers} className={btnNeutral}>
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
                    {onLoadTransferIntoGatepass && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onLoadTransferIntoGatepass(t, "inward")}
                          className="rounded-md bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 shadow-2xs font-urdu cursor-pointer"
                        >
                          ان ورڈ میں لوڈ کریں
                        </button>
                        <button
                          onClick={() => onLoadTransferIntoGatepass(t, "outward")}
                          className="rounded-md bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700 shadow-2xs font-urdu cursor-pointer"
                        >
                          آؤٹ ورڈ میں لوڈ کریں
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
