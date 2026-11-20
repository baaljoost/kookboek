"use client";

import { useEffect, useState } from "react";
import KopieerLink from "@/components/KopieerLink";

export default function DeelLinkBeheer({ initieleCode }: { initieleCode: string | null }) {
  const [code, setCode] = useState(initieleCode);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState("");
  // De server kent het domein niet; pas in de browser kan de volledige link
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

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

  return (
    <div className="max-w-2xl">
      {code ? (
        <KopieerLink link={`${origin}/lijst/${code}`}>
          <button type="button" onClick={vernieuw} disabled={bezig} className="btn-secondary disabled:opacity-50">
            Vernieuw link
          </button>
        </KopieerLink>
      ) : (
        <button type="button" onClick={vernieuw} disabled={bezig} className="btn-primary disabled:opacity-50">
          Maak link
        </button>
      )}
      {melding && <p className="text-sm text-neutral-500 mt-3">{melding}</p>}
    </div>
  );
}
