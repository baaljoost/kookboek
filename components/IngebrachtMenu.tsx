"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface Inbrenger {
  naam: string;
  aantal: number;
}

interface Props {
  inbrengers: Inbrenger[];
  actieveNamen: string[];
  huidigeParams: Record<string, string | undefined>;
}

export default function IngebrachtMenu({ inbrengers, actieveNamen, huidigeParams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [geselecteerd, setGeselecteerd] = useState<string[]>(actieveNamen);
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

  function toggle(naam: string) {
    const nieuw = geselecteerd.includes(naam)
      ? geselecteerd.filter((n) => n !== naam)
      : [...geselecteerd, naam];
    setGeselecteerd(nieuw);
    navigeer(nieuw);
  }

  function navigeer(namen: string[]) {
    const params: Record<string, string | undefined> = {
      ...huidigeParams,
      ingebracht: namen.length > 0 ? namen.join(",") : undefined,
    };
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
    router.push(parts.length ? `/?${parts.join("&")}` : "/");
  }

  const aantalActief = geselecteerd.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        {/* Persoon icoon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
        Ingebracht door
        {aantalActief > 0 && (
          <span className="ml-0.5 bg-olive-700 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {aantalActief}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white border border-neutral-200 shadow-lg z-20">
          {inbrengers.map((inbrenger) => {
            const isActief = geselecteerd.includes(inbrenger.naam);
            return (
              <label
                key={inbrenger.naam}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isActief}
                  onChange={() => toggle(inbrenger.naam)}
                  className="accent-olive-700"
                />
                <span className="flex-1">{inbrenger.naam}</span>
                <span className="text-neutral-400 text-xs">({inbrenger.aantal})</span>
              </label>
            );
          })}
          {aantalActief > 0 && (
            <div className="border-t border-neutral-100 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setGeselecteerd([]);
                  navigeer([]);
                  setOpen(false);
                }}
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
