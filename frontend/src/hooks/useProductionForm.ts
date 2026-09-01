import { useCallback, useEffect, useState } from "react";
import { emptyForm, type FormData } from "../components/form/FormTable";

const STORAGE_KEY = "mirza-mushtaq-form";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export type ErpnextItem = {
  name: string;
  item_name?: string;
};

export function useProductionForm() {
  const [data, setData] = useState<FormData>(emptyForm);
  const [message, setMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [itemList, setItemList] = useState<ErpnextItem[]>([]);
  const [batchOptions0, setBatchOptions0] = useState<string[]>([]);
  const [batchOptions1, setBatchOptions1] = useState<string[]>([]);
  const [batchOptionsReady, setBatchOptionsReady] = useState<string[]>([]);
  const [uomOptions0, setUomOptions0] = useState<string[]>(["Kg"]);
  const [uomOptions1, setUomOptions1] = useState<string[]>(["Kg"]);
  const [uomOptionsReady, setUomOptionsReady] = useState<string[]>(["Kg"]);
  const [logoUrl, setLogoUrl] = useState("");
  const [erpnextUrl, setErpnextUrl] = useState("");
  const [lastDocUrl, setLastDocUrl] = useState("");

  const load = useCallback((silent = false) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData({ ...emptyForm, ...(JSON.parse(raw) as FormData) });
        if (!silent) setMessage("محفوظ شدہ ڈیٹا لوڈ ہو گیا");
      } else if (!silent) {
        setMessage("کوئی محفوظ شدہ ڈیٹا موجود نہیں");
      }
    } catch {
      if (!silent) setMessage("ڈیٹا لوڈ نہیں ہو سکا");
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/production-form/items`);
      if (!res.ok) return;
      const json = (await res.json()) as { success: boolean; data: ErpnextItem[] };
      if (json.success && Array.isArray(json.data)) {
        setItemList(json.data);
      }
    } catch {
      // Backend not running or ERPNext offline
    }
  }, []);

  const fetchLogo = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/production-form/logo`);
      if (!res.ok) return;
      const json = (await res.json()) as { success: boolean; data: string };
      if (json.success && json.data) {
        setLogoUrl(json.data);
      }
    } catch {
      // Backend not running or ERPNext offline
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/production-form/config`);
      if (!res.ok) return;
      const json = (await res.json()) as { success: boolean; data: { erpnextUrl?: string } };
      if (json.success && json.data?.erpnextUrl) {
        setErpnextUrl(json.data.erpnextUrl);
      }
    } catch {
      // Backend not running
    }
  }, []);

  const fetchBatches = useCallback(async (itemCode: string, index: 0 | 1 | 2): Promise<string[]> => {
    const setBatchOptions =
      index === 0 ? setBatchOptions0 : index === 1 ? setBatchOptions1 : setBatchOptionsReady;

    if (!itemCode) {
      setBatchOptions([]);
      return [];
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/production-form/batches?item=${encodeURIComponent(itemCode)}`);
      if (!res.ok) {
        setBatchOptions([]);
        return [];
      }
      const json = (await res.json()) as { success: boolean; data: string[] };
      if (json.success && Array.isArray(json.data)) {
        setBatchOptions(json.data);
        return json.data;
      }
      setBatchOptions([]);
      return [];
    } catch {
      setBatchOptions([]);
      return [];
    }
  }, []);

  const fetchUoms = useCallback(async (itemCode: string, index: 0 | 1 | 2): Promise<string[]> => {
    const setUomOptions =
      index === 0 ? setUomOptions0 : index === 1 ? setUomOptions1 : setUomOptionsReady;

    if (!itemCode) {
      setUomOptions(["Kg"]);
      return ["Kg"];
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/production-form/uoms?item=${encodeURIComponent(itemCode)}`);
      if (!res.ok) {
        setUomOptions(["Kg"]);
        return ["Kg"];
      }
      const json = (await res.json()) as { success: boolean; data: string[] };
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setUomOptions(json.data);
        return json.data;
      }
      setUomOptions(["Kg"]);
      return ["Kg"];
    } catch {
      setUomOptions(["Kg"]);
      return ["Kg"];
    }
  }, []);

  useEffect(() => {
    load(true);
    fetchItems();
    fetchLogo();
    fetchConfig();
  }, [load, fetchItems, fetchLogo, fetchConfig]);

  useEffect(() => {
    let cancelled = false;
    fetchBatches(data.rawName[0], 0).then((batches) => {
      if (cancelled || batches.length === 0) return;
      setData((prev) => {
        if (prev.lotNo[0]) return prev;
        const arr = [...prev.lotNo] as [string, string];
        arr[0] = batches[0];
        return { ...prev, lotNo: arr };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data.rawName[0], fetchBatches]);

  useEffect(() => {
    let cancelled = false;
    fetchBatches(data.rawName[1], 1).then((batches) => {
      if (cancelled || batches.length === 0) return;
      setData((prev) => {
        if (prev.lotNo[1]) return prev;
        const arr = [...prev.lotNo] as [string, string];
        arr[1] = batches[0];
        return { ...prev, lotNo: arr };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data.rawName[1], fetchBatches]);

  useEffect(() => {
    let cancelled = false;
    fetchBatches(data.readyName, 2).then((batches) => {
      if (cancelled || batches.length === 0) return;
      setData((prev) => {
        if (prev.readyLot) return prev;
        return { ...prev, readyLot: batches[0] };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data.readyName, fetchBatches]);

  useEffect(() => {
    let cancelled = false;
    fetchUoms(data.rawName[0], 0).then((uoms) => {
      if (cancelled || uoms.length === 0) return;
      setData((prev) => {
        if (uoms.includes(prev.rawUom[0])) return prev;
        const arr = [...prev.rawUom] as [string, string];
        arr[0] = uoms[0];
        return { ...prev, rawUom: arr };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data.rawName[0], fetchUoms]);

  useEffect(() => {
    let cancelled = false;
    fetchUoms(data.rawName[1], 1).then((uoms) => {
      if (cancelled || uoms.length === 0) return;
      setData((prev) => {
        if (uoms.includes(prev.rawUom[1])) return prev;
        const arr = [...prev.rawUom] as [string, string];
        arr[1] = uoms[0];
        return { ...prev, rawUom: arr };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data.rawName[1], fetchUoms]);

  useEffect(() => {
    let cancelled = false;
    fetchUoms(data.readyName, 2).then((uoms) => {
      if (cancelled || uoms.length === 0) return;
      setData((prev) => {
        if (uoms.includes(prev.readyUom)) return prev;
        return { ...prev, readyUom: uoms[0] };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data.readyName, fetchUoms]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mirza-mushtaq-last-doc-url");
      if (saved) setLastDocUrl(saved);
    } catch {
      // ignore
    }
  }, []);

  const setField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setData((prev) => {
        const next: FormData = { ...prev, [key]: value } as FormData;
        try {
          if (key === "totalWeight") {
            const arr = value as unknown as [string, string];
            const a = parseFloat(arr[0] || "0") || 0;
            const b = parseFloat(arr[1] || "0") || 0;
            next.readyWeight = String(a + b);
          }
          if (key === "rawName") {
            const arr = value as unknown as [string, string];
            fetchBatches(arr[0] || "", 0);
            fetchBatches(arr[1] || "", 1);
          }
        } catch {
          // ignore
        }
        return next;
      });
    },
    [fetchBatches],
  );

  const save = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setMessage("فارم محفوظ ہو گیا ✓");
    } catch {
      setMessage("محفوظ نہیں ہو سکا");
    }
  }, [data]);

  const clear = useCallback(() => {
    setData(emptyForm);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("mirza-mushtaq-last-doc-url");
    setLastDocUrl("");
    setMessage("فارم خالی کر دیا گیا");
  }, []);

  const syncToErpnext = useCallback(async () => {
    setIsSyncing(true);
    setMessage("ERPNext کے ساتھ ڈیٹا منتقل ہو رہا ہے...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/production-form/sync-erpnext`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await res.json()) as { success: boolean; message?: string; error?: string; documentName?: string };

      if (result.success) {
        const docUrl = result.documentName ? `${erpnextUrl}/app/stock-entry/${result.documentName}` : "";
        if (docUrl) {
          setLastDocUrl(docUrl);
          try {
            localStorage.setItem("mirza-mushtaq-last-doc-url", docUrl);
          } catch {
            // ignore
          }
        }
        setMessage(`✓ ERPNext میں منتقل ہو گیا! (Document: ${result.documentName || "Done"})`);
      } else {
        setMessage(`⚠️ خطاء: ${result.error || "ERPNext میں منتقل نہیں ہو سکا"}`);
      }
    } catch {
      setMessage("⚠️ ایکسپریس سرور سے رابطہ نہیں ہو سکا (Check Express Backend at :5000)");
    } finally {
      setIsSyncing(false);
    }
  }, [data, erpnextUrl]);

  return {
    data,
    message,
    isSyncing,
    itemList,
    batchOptions0,
    batchOptions1,
    batchOptionsReady,
    uomOptions0,
    uomOptions1,
    uomOptionsReady,
    logoUrl,
    lastDocUrl,
    setField,
    save,
    load,
    clear,
    syncToErpnext,
  };
}
