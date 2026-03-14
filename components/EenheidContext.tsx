"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface EenheidContextType {
  metrisch: boolean;
  setMetrisch: (value: boolean) => void;
}

const EenheidContext = createContext<EenheidContextType | undefined>(undefined);

export function EenheidProvider({ children }: { children: ReactNode }) {
  const [metrisch, setMetrisch] = useState(false);

  return (
    <EenheidContext.Provider value={{ metrisch, setMetrisch }}>
      {children}
    </EenheidContext.Provider>
  );
}

export function useEenheid() {
  const context = useContext(EenheidContext);
  if (!context) {
    throw new Error("useEenheid must be used within EenheidProvider");
  }
  return context;
}
