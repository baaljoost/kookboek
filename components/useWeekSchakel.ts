"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWeekAantal } from "./WeekAantal";

// Recept in of uit het mandje, met direct zichtbaar resultaat. Faalt de server,
// dan springt de stand terug. Na elke wijziging wordt de pagina ververst, zodat
// het aantal in "Deze week" klopt. Staat er een WeekAantalProvider omheen, dan
// beweegt het aantal daarin direct mee.
export function useWeekSchakel(receptId: number, initieel: boolean) {
  const router = useRouter();
  const week = useWeekAantal();
  const [aan, setAan] = useState(initieel);
  const [bezig, setBezig] = useState(false);

  useEffect(() => setAan(initieel), [initieel]);

  async function schakel() {
    if (bezig) return;
    const nieuw = !aan;
    setAan(nieuw);
    week?.pasAan(nieuw ? 1 : -1);
    setBezig(true);
    try {
      const res = nieuw
        ? await fetch("/api/admin/week", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receptId }),
          })
        : await fetch(`/api/admin/week/${receptId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setAan(!nieuw);
      week?.pasAan(nieuw ? -1 : 1);
    } finally {
      setBezig(false);
    }
  }

  return { aan, bezig, schakel };
}
