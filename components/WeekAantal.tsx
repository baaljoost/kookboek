"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import WeekKnop from "./WeekKnop";

// Houdt het aantal recepten in het mandje bij op pagina's waar het meteen moet
// meebewegen met "Op weekmenu", zonder te wachten op de server.

interface WeekAantalWaarde {
  aantal: number;
  pasAan: (verschil: number) => void;
}

const WeekAantalContext = createContext<WeekAantalWaarde | null>(null);

export function WeekAantalProvider({ initieel, children }: { initieel: number; children: React.ReactNode }) {
  const [aantal, setAantal] = useState(initieel);
  // Na router.refresh() komt de echte stand van de server binnen
  useEffect(() => setAantal(initieel), [initieel]);
  const pasAan = useCallback((verschil: number) => setAantal((n) => Math.max(0, n + verschil)), []);
  const waarde = useMemo(() => ({ aantal, pasAan }), [aantal, pasAan]);
  return <WeekAantalContext.Provider value={waarde}>{children}</WeekAantalContext.Provider>;
}

// null buiten een provider: dan werkt alles zoals voorheen
export function useWeekAantal() {
  return useContext(WeekAantalContext);
}

// De zwevende knop op de receptpagina: pas zichtbaar met minstens één recept.
export function ReceptWeekKnop() {
  const week = useWeekAantal();
  if (!week || week.aantal < 1) return null;
  return <WeekKnop aantal={week.aantal} />;
}
