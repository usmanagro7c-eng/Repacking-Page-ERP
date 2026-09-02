import type { ChangeEvent } from "react";

export type FormData = {
  date: string;
  formNo: string;
  rawName: [string, string];
  totalWeight: [string, string];
  cutting25: [string, string];
  cutting50: [string, string];
  lotNo: [string, string];
  rawUom: [string, string];
  remaining: [string, string];
  readyName: string;
  readyLot: string;
  readyUom: string;
  readyBags: string;
  readyWeight: string;
  stock: string;
  notes: string;
  signMaker: string;
  signIncharge: string;
};

export const emptyForm: FormData = {
  date: "",
  formNo: "",
  rawName: ["", ""],
  totalWeight: ["", ""],
  cutting25: ["", ""],
  cutting50: ["", ""],
  lotNo: ["", ""],
  rawUom: ["Kg", "Kg"],
  remaining: ["", ""],
  readyName: "",
  readyLot: "",
  readyUom: "Kg",
  readyBags: "",
  readyWeight: "",
  stock: "",
  notes: "",
  signMaker: "",
  signIncharge: "",
};

type CellInputProps = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  numeric?: boolean | undefined;
  className?: string | undefined;
  oval?: boolean | undefined;
  readOnly?: boolean | undefined;
  list?: string | undefined;
};

export function CellInput({ value, onChange, label, numeric, className, oval, list, readOnly }: CellInputProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (numeric && v !== "" && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
    onChange(v);
  };
  return (
    <input
      aria-label={label}
      dir="rtl"
      inputMode={numeric ? "decimal" : undefined}
      value={value}
      onChange={handle}
      readOnly={readOnly}
      list={list}
      className={[
        "bg-transparent outline-none text-center text-form-ink font-urdu",
        "focus:bg-form-highlight",
        oval
          ? "h-6 w-16 rounded-full border border-form-line px-1"
          : "h-full w-full border-0 px-1",
        className ?? "",
      ].join(" ")}
    />
  );
}
