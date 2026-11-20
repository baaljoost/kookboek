"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// De link in een veld met een knop "Kopieer link", die kort "Gekopieerd" toont.
// Gedeeld door de pop-up op weekmenu en boodschappenlijst en de beheerpagina; knoppen
// die alleen daar horen (zoals "Vernieuw link") komen als children achter de
// kopieerknop.
export default function KopieerLink({ link, children }: { link: string; children?: ReactNode }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const [fout, setFout] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function kopieer() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(link);
      setFout(false);
      setGekopieerd(true);
      timer.current = setTimeout(() => setGekopieerd(false), 2500);
    } catch {
      setGekopieerd(false);
      setFout(true);
    }
  }

  return (
    <div>
      <label className="label" htmlFor="deellink">Deellink</label>
      <input id="deellink" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input mb-3" />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={kopieer} className="btn-primary">
          {gekopieerd ? "Gekopieerd" : "Kopieer link"}
        </button>
        {children}
      </div>
      <p role="status" className="text-sm text-neutral-500 mt-3 empty:hidden">
        {fout ? "Kopiëren lukt niet; selecteer de link hierboven" : ""}
      </p>
    </div>
  );
}
