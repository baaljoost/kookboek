"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const opties = [
  { label: "Nieuwste eerst", waarde: "nieuw" },
  { label: "Meest recent", waarde: "recent" },
  { label: "Hoogste score eerst", waarde: "sterren-hoog" },
  { label: "Laagste score eerst", waarde: "sterren-laag" },
  { label: "A–Z", waarde: "az" },
];

interface Props {
  huidigeSorteer?: string;
  huidigeParams: Record<string, string | undefined>;
}

export default function SorteerMenu({ huidigeSorteer, huidigeParams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const actief = opties.find((o) => o.waarde === huidigeSorteer) ?? opties[0];

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
    const params = { ...huidigeParams, sorteer: waarde === "nieuw" ? undefined : waarde };
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
    router.push(parts.length ? `/?${parts.join("&")}` : "/");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        {/* Sorteer icoon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 000 2h10a1 1 0 100-2H3zm0 4a1 1 0 000 2h6a1 1 0 100-2H3zm0 4a1 1 0 000 2h3a1 1 0 100-2H3zm10-1V5a1 1 0 10-2 0v6.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L13 11.586z" />
        </svg>
        {actief.label}
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-48 bg-white border border-neutral-200 shadow-lg z-20">
          {opties.map((optie) => (
            <button
              key={optie.waarde}
              type="button"
              onClick={() => kies(optie.waarde)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                actief.waarde === optie.waarde
                  ? "text-olive-700 font-medium"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {optie.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
