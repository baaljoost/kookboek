"use client";

import { useState } from "react";
import { useEenheid } from "./EenheidContext";
import PortieKiezer from "./PortieKiezer";
import { converteerIngredientVeld, converteerStapTekst } from "@/lib/unitConversie";
import { eenheidWeergave } from "@/lib/eenheden";
import { formatHoeveelheid } from "@/lib/hoeveelheidWeergave";

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
        <PortieKiezer
          porties={porties}
          standaard={standaardPorties}
          onChange={setPorties}
          className="mb-5 pb-5 border-b border-neutral-100"
        />
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
          // Rekenen met het getal; afronden gebeurt pas bij het tonen.
          const geschaaldHoeveelheid =
            ing.hoeveelheid != null && Number.isFinite(ing.hoeveelheid)
              ? ing.hoeveelheid * factor
              : null;

          // Omrekenen voor regels die nog niet metrisch zijn opgeslagen
          const converted = metrisch && geschaaldHoeveelheid != null
            ? converteerIngredientVeld(geschaaldHoeveelheid, ing.eenheid, ing.naam)
            : {
                hoeveelheid: geschaaldHoeveelheid,
                eenheid: ing.eenheid,
                naam: ing.naam,
              };

          const eenheidTekst = eenheidWeergave(converted.eenheid, converted.hoeveelheid);

          const convertedNotitie =
            metrisch && ing.notitie ? converteerStapTekst(ing.notitie) : ing.notitie;

          return (
            <li key={ing.id} className="text-sm text-neutral-700 flex gap-2">
              <span className="font-medium text-neutral-900 whitespace-nowrap">
                {converted.hoeveelheid != null
                  ? `${formatHoeveelheid(converted.hoeveelheid)}${eenheidTekst ? ` ${eenheidTekst}` : ""}`
                  : eenheidTekst}
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
