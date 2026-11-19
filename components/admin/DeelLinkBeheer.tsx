"use client";

import { useState } from "react";

export default function DeelLinkBeheer({ initieleCode }: { initieleCode: string | null }) {
  const [code, setCode] = useState(initieleCode);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState("");

  const link = code ? `${window.location.origin}/lijst/${code}` : "";

  function meld(tekst: string) {
    setMelding(tekst);
    setTimeout(() => setMelding(""), 3000);
  }

  async function vernieuw() {
    if (code && !confirm("De oude link werkt dan niet meer. Doorgaan?")) return;
    setBezig(true);
    try {
      const res = await fetch("/api/admin/deellink", { method: "POST" });
      if (!res.ok) return meld("Vernieuwen mislukt");
      setCode((await res.json()).code);
    } finally {
      setBezig(false);
    }
  }

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(link);
      meld("Link gekopieerd");
    } catch {
      meld("Kopiëren lukt niet; selecteer de link hierboven");
    }
  }

  return (
    <div className="max-w-2xl">
      {code ? (
        <>
          <label className="label" htmlFor="deellink">Link naar de boodschappenlijst</label>
          <input id="deellink" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input mb-3" />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={kopieer} className="btn-primary">Kopieer link</button>
            <button type="button" onClick={vernieuw} disabled={bezig} className="btn-secondary disabled:opacity-50">
              Vernieuw link
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={vernieuw} disabled={bezig} className="btn-primary disabled:opacity-50">
          Maak link
        </button>
      )}
      {melding && <p className="text-sm text-neutral-500 mt-3">{melding}</p>}
    </div>
  );
}
