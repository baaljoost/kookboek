"use client";

import SchakelKnop, { PlusIcoon, VinkIcoon } from "./SchakelKnop";
import { useWeekSchakel } from "./useWeekSchakel";

// Staat direct onder "Scherm aan houden" op de receptpagina, in dezelfde stijl.
export default function OpWeekmenuKnop({ receptId, opWeekmenu }: { receptId: number; opWeekmenu: boolean }) {
  const { aan, bezig, schakel } = useWeekSchakel(receptId, opWeekmenu);
  return (
    <SchakelKnop
      aan={aan}
      labelUit="Op weekmenu"
      labelAan="Op weekmenu"
      icoonUit={<PlusIcoon />}
      icoonAan={<VinkIcoon />}
      onClick={schakel}
      disabled={bezig}
    />
  );
}
