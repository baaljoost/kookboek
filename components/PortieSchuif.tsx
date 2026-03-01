"use client";

import { useState } from "react";

interface Ingredient {
  id: number;
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
}

interface Props {
  standaardPorties: number;
  ingredienten: Ingredient[];
}

function formatHoeveelheid(waarde: number): string {
  // Laat nette breuken zien bij schaling
  if (waarde === Math.round(waarde)) return String(waarde);
  // Afronden op 1 decimaal
  return (Math.round(waarde * 10) / 10).toString();
}

export default function PortieSchuif({ standaardPorties, ingredienten }: Props) {
  const [porties, setPorties] = useState(standaardPorties);
  const factor = porties / standaardPorties;

  return (
    <div>
      {/* Portie selector */}
      <div className="flex items-center gap-3 mb-5 pb-5 border-b border-neutral-100">
        <button
          onClick={() => setPorties((p) => Math.max(1, p - 1))}
          className="w-8 h-8 border border-neutral-300 flex items-center justify-center text-neutral-600 hover:border-olive-600 transition-colors text-lg leading-none"
          aria-label="Minder porties"
        >
          −
        </button>
        <span className="text-sm font-medium text-neutral-900 min-w-[80px] text-center">
          {porties} {porties === 1 ? "portie" : "porties"}
        </span>
        <button
          onClick={() => setPorties((p) => p + 1)}
          className="w-8 h-8 border border-neutral-300 flex items-center justify-center text-neutral-600 hover:border-olive-600 transition-colors text-lg leading-none"
          aria-label="Meer porties"
        >
          +
        </button>
        {porties !== standaardPorties && (
          <button
            onClick={() => setPorties(standaardPorties)}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors ml-1"
          >
            Reset
          </button>
        )}
      </div>

      {/* Ingrediëntenlijst */}
      <ul className="space-y-2.5">
        {ingredienten.map((ing) => {
          const geschaaldHoeveelheid =
            ing.hoeveelheid != null
              ? formatHoeveelheid(ing.hoeveelheid * factor)
              : null;

          return (
            <li key={ing.id} className="text-sm text-neutral-700 flex gap-2">
              <span className="font-medium text-neutral-900 whitespace-nowrap">
                {geschaaldHoeveelheid != null
                  ? `${geschaaldHoeveelheid}${ing.eenheid ? ` ${ing.eenheid}` : ""}`
                  : ing.eenheid ?? ""}
              </span>
              <span>
                {ing.naam}
                {ing.notitie && (
                  <span className="text-neutral-400">, {ing.notitie}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
