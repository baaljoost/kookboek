"use client";

import { useCallback, useEffect, useState } from "react";
import { EIGEN_SECTIE, telRegels, type LijstSectie } from "@/lib/boodschappenlijst";

interface Stand {
  secties: LijstSectie[];
  afgevinkt: string[];
}

interface Props {
  initieel: Stand;
  // /api/admin/week/lijst voor de eigenaar, /api/lijst/<code> voor de deellink
  apiBasis: string;
  magEigenRegelsVerwijderen: boolean;
}

export default function LijstWeergave({ initieel, apiBasis, magEigenRegelsVerwijderen }: Props) {
  const [stand, setStand] = useState<Stand>(initieel);
  const [nieuw, setNieuw] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  const meld = useCallback((tekst: string) => {
    setFout(tekst);
    setTimeout(() => setFout(""), 4000);
  }, []);

  // De stand opnieuw ophalen als je de pagina weer opent
  const ververs = useCallback(async () => {
    try {
      const res = await fetch(apiBasis, { cache: "no-store" });
      if (res.ok) setStand(await res.json());
    } catch {
      // offline: de oude stand blijft staan
    }
  }, [apiBasis]);

  useEffect(() => {
    ververs();
    const bijZichtbaar = () => {
      if (document.visibilityState === "visible") ververs();
    };
    document.addEventListener("visibilitychange", bijZichtbaar);
    window.addEventListener("pageshow", bijZichtbaar);
    return () => {
      document.removeEventListener("visibilitychange", bijZichtbaar);
      window.removeEventListener("pageshow", bijZichtbaar);
    };
  }, [ververs]);

  async function voegToe(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuw.trim() || bezig) return;
    setBezig(true);
    try {
      const res = await fetch(`${apiBasis}/regels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst: nieuw }),
      });
      if (res.ok) {
        setStand(await res.json());
        setNieuw("");
      } else {
        const data = await res.json().catch(() => ({}));
        meld(data.error ?? "Toevoegen mislukt");
      }
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(sleutel: string) {
    const id = sleutel.slice(1); // "e12" → "12"
    const res = await fetch(`${apiBasis}/regels/${id}`, { method: "DELETE" });
    if (res.ok) setStand(await res.json());
    else meld("Verwijderen mislukt");
  }

  const afgevinkt = new Set(stand.afgevinkt);
  const { totaal } = telRegels(stand.secties, afgevinkt);
  const heeftEigen = stand.secties.some((s) => s.id === EIGEN_SECTIE);

  return (
    <div>
      <p className="text-sm text-neutral-500 mb-6">
        {totaal === 0 ? "Er staat nog niets op de lijst" : `${totaal} ${totaal === 1 ? "regel" : "regels"}`}
      </p>
      {fout && <p className="text-sm text-red-600 mb-4">{fout}</p>}

      {stand.secties.map((sectie) => (
        <section key={sectie.id} className="mb-8">
          <h2 className="font-sans text-xs uppercase tracking-widest text-neutral-500 mb-1">{sectie.label}</h2>
          <ul className="border-t border-neutral-200">
            {sectie.regels.map((regel) => (
              <li key={regel.sleutel} className="flex items-center gap-3 min-h-[52px] py-2 border-b border-neutral-200">
                <div className="flex-1 min-w-0">
                  <span className="text-neutral-900">{regel.tekst}</span>
                  {regel.detail && <span className="block text-xs text-neutral-400">{regel.detail}</span>}
                </div>
                {sectie.id === EIGEN_SECTIE && magEigenRegelsVerwijderen && (
                  <button
                    type="button"
                    onClick={() => verwijder(regel.sleutel)}
                    aria-label={`${regel.tekst} verwijderen`}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <form onSubmit={voegToe} className="mb-8">
        <label className="label" htmlFor="eigen-regel">
          {heeftEigen ? "Nog een eigen regel" : "Eigen regel toevoegen"}
        </label>
        <div className="flex gap-2">
          <input
            id="eigen-regel"
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
            maxLength={80}
            placeholder="bijv. wc-papier"
            className="input flex-1"
            autoComplete="off"
          />
          <button type="submit" disabled={bezig || !nieuw.trim()} className="btn-primary disabled:opacity-50">
            Toevoegen
          </button>
        </div>
      </form>
    </div>
  );
}
