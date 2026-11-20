"use client";

import { useEffect, useState } from "react";
import Popup from "./Popup";
import KopieerLink from "./KopieerLink";

// Pop-up met de geheime deellink voor weekmenu en boodschappenlijst, met één
// code. `tab` bepaalt welk tabblad de link opent. Op /lijst/<code> is de code
// al bekend; op /week en /week/lijst wordt hij opgehaald en, als er nog geen
// link is, aangemaakt. Vernieuwen kan alleen in beheer.
export default function DeelLijstPopup({
  code: bekendeCode,
  tab,
  onSluiten,
}: {
  code?: string;
  tab: "weekmenu" | "boodschappen";
  onSluiten: () => void;
}) {
  const [code, setCode] = useState<string | null>(bekendeCode ?? null);
  const [fout, setFout] = useState(false);

  useEffect(() => {
    if (bekendeCode) return;
    let weg = false;
    // PUT maakt de link alleen als hij ontbreekt en verandert nooit een bestaande code
    fetch("/api/admin/deellink", { method: "PUT" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!weg) setCode(data.code);
      })
      .catch(() => !weg && setFout(true));
    return () => {
      weg = true;
    };
  }, [bekendeCode]);

  return (
    <Popup titel="Delen" onSluiten={onSluiten}>
      <p className="text-neutral-500 text-sm mb-6">
        Iedereen met deze link kan het weekmenu en de boodschappenlijst aanpassen.
      </p>
      {code ? (
        <KopieerLink link={`${window.location.origin}/lijst/${code}?tab=${tab}`} />
      ) : fout ? (
        <p className="text-red-600 text-sm">De link kon niet worden opgehaald. Probeer het later opnieuw.</p>
      ) : (
        <p className="text-neutral-400 text-sm">Link ophalen…</p>
      )}
    </Popup>
  );
}
