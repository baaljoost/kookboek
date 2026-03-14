"use client";

import { useEenheid } from "./EenheidContext";
import { converteerStapTekst } from "@/lib/unitConversie";

interface Stap {
  id: number;
  tekst: string;
}

interface Props {
  stappen: Stap[];
}

export default function StappenLijst({ stappen }: Props) {
  const { metrisch } = useEenheid();

  return (
    <>
      <h2 className="font-serif text-2xl text-neutral-900 mb-6">Bereiding</h2>
      <ol className="space-y-6">
        {stappen.map((stap, i) => (
          <li key={stap.id} className="flex gap-4">
            <span className="font-serif text-3xl text-neutral-200 leading-none mt-1 select-none w-8 shrink-0">
              {i + 1}
            </span>
            <p className="text-neutral-700 leading-relaxed pt-1">
              {metrisch ? converteerStapTekst(stap.tekst) : stap.tekst}
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}
