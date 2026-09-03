import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Standard A4 Responsive Sheet Wrapper (210mm Width) with proportional scaling for screen sizes.
 */
export function ResponsiveSheetWrapper({
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
