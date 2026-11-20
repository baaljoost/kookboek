"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSBAAR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Pop-up in de stijl van de bestaande pop-ups. Sluit met het kruisje, een tik
// buiten de pop-up en Escape. Houdt het toetsenbord binnen de pop-up en zet de
// focus na het sluiten terug op wat hem opende.
export default function Popup({ titel, onSluiten, children }: { titel: string; onSluiten: () => void; children: ReactNode }) {
  const venster = useRef<HTMLDivElement>(null);
  const sluit = useRef(onSluiten);
  sluit.current = onSluiten;

  useEffect(() => {
    const vorige = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    venster.current?.focus();

    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        sluit.current();
      } else if (e.key === "Tab" && venster.current) {
        const items = Array.from(venster.current.querySelectorAll<HTMLElement>(FOCUSBAAR)).filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const eerste = items[0];
        const laatste = items[items.length - 1];
        const actief = document.activeElement;
        if (e.shiftKey && (actief === eerste || actief === venster.current)) {
          e.preventDefault();
          laatste.focus();
        } else if (!e.shiftKey && actief === laatste) {
          e.preventDefault();
          eerste.focus();
        }
      }
    }
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("keydown", toets);
      document.body.style.overflow = scroll;
      vorige?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      // mousedown, niet click: een tekstselectie die buiten het venster eindigt sluit niets
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSluiten();
      }}
    >
      <div
        ref={venster}
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        tabIndex={-1}
        className="relative bg-white w-full max-w-md shadow-xl p-8 max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <button
          type="button"
          onClick={onSluiten}
          aria-label="Sluiten"
          title="Sluiten"
          className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 className="font-serif text-2xl text-neutral-900 mb-2 pr-8">{titel}</h2>
        {children}
      </div>
    </div>
  );
}
