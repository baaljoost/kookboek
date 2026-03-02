"use client";

import { useState } from "react";
import Link from "next/link";

interface Categorie {
  waarde: string | undefined;
  label: string;
  href: string;
  actief: boolean;
}

interface Props {
  categorieen: Categorie[];
  // Hoeveel items zichtbaar op mobiel vóór uitklap (exclusief "Meer"-knop)
  zichtbaarOpMobiel?: number;
}

export default function CategorieFilter({ categorieen, zichtbaarOpMobiel = 7 }: Props) {
  const [uitgeklapt, setUitgeklapt] = useState(false);

  const zichtbaar = categorieen.slice(0, zichtbaarOpMobiel);
  const verborgen = categorieen.slice(zichtbaarOpMobiel);
  const heeftVerborgen = verborgen.length > 0;

  const itemClass = (actief: boolean) =>
    `px-3 py-1 text-xs uppercase tracking-widest border transition-colors whitespace-nowrap ${
      actief
        ? "bg-olive-700 text-white border-olive-700"
        : "border-neutral-300 text-neutral-600 hover:border-olive-600"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Altijd zichtbare items */}
      {zichtbaar.map((cat) => (
        <Link key={cat.label} href={cat.href} className={itemClass(cat.actief)}>
          {cat.label}
        </Link>
      ))}

      {/* Op md+ altijd alle verborgen items tonen */}
      {heeftVerborgen && (
        <>
          {verborgen.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className={`${itemClass(cat.actief)} ${uitgeklapt ? "" : "hidden md:inline-flex"}`}
            >
              {cat.label}
            </Link>
          ))}

          {/* "Meer / Minder" knop — alleen zichtbaar op mobiel */}
          {!uitgeklapt ? (
            <button
              type="button"
              onClick={() => setUitgeklapt(true)}
              className="md:hidden px-3 py-1 text-xs uppercase tracking-widest border border-dashed border-neutral-300 text-neutral-500 hover:border-olive-600 transition-colors"
            >
              Meer…
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setUitgeklapt(false)}
              className="md:hidden px-3 py-1 text-xs uppercase tracking-widest border border-dashed border-neutral-300 text-neutral-500 hover:border-olive-600 transition-colors"
            >
              Minder
            </button>
          )}
        </>
      )}
    </div>
  );
}
