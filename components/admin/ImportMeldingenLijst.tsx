"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Melding {
  id: number;
  url: string;
  bron: string;
  createdAt: Date | string;
}

interface Props {
  meldingen: Melding[];
}

export default function ImportMeldingenLijst({ meldingen: initieel }: Props) {
  const router = useRouter();
  const [meldingen, setMeldingen] = useState(initieel);
  const [bezig, setBezig] = useState<number | null>(null);

  async function verwijder(id: number) {
    setBezig(id);
    await fetch(`/api/admin/import-meldingen/${id}`, { method: "DELETE" });
    setMeldingen((prev) => prev.filter((m) => m.id !== id));
    setBezig(null);
    router.refresh();
  }

  return (
    <div className="divide-y divide-neutral-100">
      {meldingen.map((melding) => {
        const datum = new Date(melding.createdAt).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        let hostname = melding.url;
        try { hostname = new URL(melding.url).hostname.replace(/^www\./, ""); } catch { /* */ }

        return (
          <div key={melding.id} className="py-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <a
                href={melding.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-olive-700 hover:underline text-sm font-medium break-all"
              >
                {melding.url}
              </a>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-neutral-400">{datum}</span>
                <span className="text-xs text-neutral-300">·</span>
                <span className="text-xs text-neutral-400">
                  {melding.bron === "voorstellen" ? "recept voorstellen" : "recept toevoegen"}
                </span>
                <span className="text-xs text-neutral-300">·</span>
                <span className="text-xs text-neutral-400">{hostname}</span>
              </div>
            </div>
            <a
              href={`/admin/recepten/nieuw?herkomstUrl=${encodeURIComponent(melding.url)}&herkomstNaam=${encodeURIComponent(hostname)}`}
              className="text-xs text-olive-700 hover:underline whitespace-nowrap mt-0.5"
            >
              Handmatig toevoegen →
            </a>
            <button
              type="button"
              onClick={() => verwijder(melding.id)}
              disabled={bezig === melding.id}
              className="text-neutral-300 hover:text-red-400 transition-colors text-lg leading-none mt-0.5 disabled:opacity-50"
              title="Verwijderen"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
