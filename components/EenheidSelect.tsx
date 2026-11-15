"use client";

import { useState } from "react";
import { EENHEID_OPTIES, isEenheidCode } from "@/lib/eenheden";

interface Props {
  waarde: string;
  onChange: (waarde: string) => void;
}

// Keuzelijst met de vaste eenheden. Een oude waarde die niet op de lijst
// staat (bijv. "scheut") blijft als extra optie kiesbaar, zodat opslaan
// van een nog niet omgezet recept niets weggooit.
export default function EenheidSelect({ waarde, onChange }: Props) {
  const [beginwaarde] = useState(waarde);
  const oudeWaarden = [...new Set([beginwaarde, waarde])].filter((w) => w && !isEenheidCode(w));

  return (
    <select
      value={waarde}
      onChange={(e) => onChange(e.target.value)}
      className="input w-24 shrink-0"
      aria-label="Eenheid"
    >
      <option value="">—</option>
      {EENHEID_OPTIES.map((optie) => (
        <option key={optie.code} value={optie.code}>
          {optie.label}
        </option>
      ))}
      {oudeWaarden.map((oud) => (
        <option key={`oud-${oud}`} value={oud}>
          {oud} (oud)
        </option>
      ))}
    </select>
  );
}
