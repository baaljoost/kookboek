"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const opties = [
  { label: "Vegetarisch", waarde: "vegetarisch" },
  { label: "Vegan", waarde: "vegan" },
];

interface Props {
  actieveFilter?: string;
  huidigeParams: Record<string, string | undefined>;
}

export default function DieetMenu({ actieveFilter, huidigeParams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function kies(waarde: string) {
    setOpen(false);
    const nieuweDieet = actieveFilter === waarde ? undefined : waarde;
    const params: Record<string, string | undefined> = {
      ...huidigeParams,
      dieet: nieuweDieet,
    };
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
    router.push(parts.length ? `/?${parts.join("&")}` : "/");
  }

  const actief = opties.find((o) => o.waarde === actieveFilter);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          actief ? "text-olive-700 font-medium" : "text-neutral-600 hover:text-neutral-900"
        }`}
      >
        {/* Blad icoon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {actief ? actief.label : "Vega/vegan"}
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-44 bg-white border border-neutral-200 shadow-lg z-20">
          {opties.map((optie) => (
            <button
              key={optie.waarde}
              type="button"
              onClick={() => kies(optie.waarde)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                actieveFilter === optie.waarde
                  ? "text-olive-700 font-medium"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {optie.label}
              {actieveFilter === optie.waarde && (
                <span className="text-olive-700 text-xs">✓</span>
              )}
            </button>
          ))}
          {actief && (
            <div className="border-t border-neutral-100 px-4 py-2">
              <button
                type="button"
                onClick={() => kies(actieveFilter!)}
                className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                × Wis filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
