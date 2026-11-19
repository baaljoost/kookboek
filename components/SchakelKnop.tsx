"use client";

import type { ReactNode } from "react";

// Eén stijl voor alle knoppen die aan of uit staan: "Scherm aan houden" en
// "Op weekmenu". Uit = btn-secondary, aan = olive-700 met witte tekst.
// De aan-stand krijgt dezelfde rand als btn-secondary, zodat de knop bij het
// omschakelen niet van hoogte verandert.

interface Props {
  aan: boolean;
  labelUit: string;
  labelAan: string;
  icoonUit?: ReactNode;
  icoonAan?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export default function SchakelKnop({
  aan,
  labelUit,
  labelAan,
  icoonUit,
  icoonAan,
  onClick,
  disabled,
}: Props) {
  const icoon = aan ? icoonAan ?? icoonUit : icoonUit;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={aan}
      className={`w-full flex items-center justify-center gap-2 disabled:opacity-50 ${
        aan ? "btn-primary border border-olive-700" : "btn-secondary"
      }`}
    >
      {icoon}
      {aan ? labelAan : labelUit}
    </button>
  );
}

// Kleine lijnicoontjes, 16 px, in de kleur van de tekst.
const lijn = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SchermIcoon() {
  return (
    <svg {...lijn}>
      <rect x="3" y="4" width="18" height="12" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function PlusIcoon() {
  return (
    <svg {...lijn}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function VinkIcoon() {
  return (
    <svg {...lijn}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
