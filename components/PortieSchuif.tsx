"use client";

import { useState } from "react";
import { useEenheid } from "./EenheidContext";
import { converteerIngredientVeld, converteerStapTekst } from "@/lib/unitConversie";

interface Ingredient {
  id: number;
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
}

interface Props {
  standaardPorties?: number;
  ingredienten: Ingredient[];
  heeftAmerikaanseEenheden?: boolean;
}

function formatHoeveelheid(waarde: number): string {
  // Laat nette breuken zien bij schaling
  if (waarde === Math.round(waarde)) return String(waarde);
  // Afronden op 1 decimaal
  return (Math.round(waarde * 10) / 10).toString();
}

export default function PortieSchuif({
  standaardPorties = 0,
  ingredienten,
  heeftAmerikaanseEenheden = false,
}: Props) {
  const [porties, setPorties] = useState(standaardPorties);
  const { metrisch, setMetrisch } = useEenheid();
  const factor = standaardPorties > 0 ? porties / standaardPorties : 1;

  return (
    <div>
      {/* Portie selector */}
      {standaardPorties > 0 && (
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
      )}

      {/* Unit conversion toggle */}
      {heeftAmerikaanseEenheden && (
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-neutral-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative inline-flex h-5 w-9">
              <input
                type="checkbox"
                checked={metrisch}
                onChange={(e) => setMetrisch(e.target.checked)}
                className="peer sr-only"
                aria-label="Omrekenen naar metrisch"
              />
              <div className="absolute inset-0 rounded-full bg-neutral-200 transition-colors peer-checked:bg-olive-600" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-xs text-neutral-500">Omrekenen naar metrisch</span>
          </label>
        </div>
      )}

      {/* Ingrediëntenlijst */}
      <ul className="space-y-2.5">
        {ingredienten.map((ing) => {
          const geschaaldHoeveelheid =
            ing.hoeveelheid != null
              ? formatHoeveelheid(ing.hoeveelheid * factor)
              : null;

          // Apply unit conversion if metrisch is enabled
          const converted = metrisch && geschaaldHoeveelheid != null
            ? converteerIngredientVeld(
                parseFloat(geschaaldHoeveelheid),
                ing.eenheid,
                ing.naam
              )
            : {
                hoeveelheid: geschaaldHoeveelheid
                  ? parseFloat(geschaaldHoeveelheid)
                  : null,
                eenheid: ing.eenheid,
                naam: ing.naam,
              };

          const convertedNotitie =
            metrisch && ing.notitie ? converteerStapTekst(ing.notitie) : ing.notitie;

          return (
            <li key={ing.id} className="text-sm text-neutral-700 flex gap-2">
              <span className="font-medium text-neutral-900 whitespace-nowrap">
                {converted.hoeveelheid != null
                  ? `${
                      converted.hoeveelheid === Math.round(converted.hoeveelheid)
                        ? Math.round(converted.hoeveelheid)
                        : converted.hoeveelheid
                    }${converted.eenheid ? ` ${converted.eenheid}` : ""}`
                  : converted.eenheid ?? ""}
              </span>
              <span>
                {converted.naam}
                {convertedNotitie && (
                  <span className="text-neutral-400">, {convertedNotitie}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
