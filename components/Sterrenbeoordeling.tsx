"use client";

import { useState } from "react";

interface Props {
  slug: string;
  beoordeling: number | null;
}

export default function Sterrenbeoordeling({ slug, beoordeling: initieel }: Props) {
  const [beoordeling, setBeoordeling] = useState<number | null>(initieel);
  const [hover, setHover] = useState<number | null>(null);
  const [bezig, setBezig] = useState(false);

  async function geefBeoordeling(sterren: number) {
    if (bezig) return;
    setBezig(true);
    const res = await fetch(`/api/recepten/${slug}/beoordeling`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sterren }),
    });
    if (res.ok) {
      const data = await res.json();
      setBeoordeling(data.beoordeling);
    }
    setBezig(false);
  }

  const actief = hover ?? beoordeling ?? 0;

  return (
    <div className="flex items-center gap-1" aria-label="Beoordeling">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => geefBeoordeling(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          disabled={bezig}
          aria-label={`${n} ster${n !== 1 ? "ren" : ""}`}
          className="text-2xl leading-none transition-colors disabled:cursor-default"
        >
          <span className={n <= actief ? "text-terracotta-500" : "text-neutral-200"}>
            ★
          </span>
        </button>
      ))}
      {beoordeling && (
        <span className="ml-1 text-xs text-neutral-400">
          {beoordeling}/5
        </span>
      )}
    </div>
  );
}
