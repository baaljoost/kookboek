"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  receptData: object;
  onSluiten: () => void;
}

export default function VoorstellenPopup({ receptData, onSluiten }: Props) {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [bericht, setBericht] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout("");

    const res = await fetch("/api/recepten/voorstellen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ naam, bericht, receptData }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/recepten/${data.slug}`);
    } else {
      const data = await res.json();
      setFout(data.error ?? "Er ging iets mis");
      setBezig(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-md shadow-xl p-8">
        <h2 className="font-serif text-2xl text-neutral-900 mb-2">
          Bijna klaar!
        </h2>
        <p className="text-neutral-500 text-sm mb-6">
          Laat weten wie je bent en voeg eventueel een berichtje toe.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Naam *</label>
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="input"
              required
              placeholder="Je naam"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Bericht (optioneel)</label>
            <textarea
              value={bericht}
              onChange={(e) => setBericht(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Bijv. dit is een familierecept van mijn oma…"
            />
          </div>
          {fout && <p className="text-red-600 text-sm">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={bezig || !naam.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {bezig ? "Versturen…" : "Recept versturen"}
            </button>
            <button
              type="button"
              onClick={onSluiten}
              className="btn-secondary"
            >
              Annuleren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
