"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DeelLijstPopup from "./DeelLijstPopup";
import {
  afgevinktOnderaan,
  EIGEN_SECTIE,
  telRegels,
  type LijstSectie,
} from "@/lib/boodschappenlijst";

interface Stand {
  secties: LijstSectie[];
  afgevinkt: string[];
}

interface Props {
  initieel: Stand;
  // /api/admin/week/lijst voor de eigenaar, /api/lijst/<code> voor de deellink
  apiBasis: string;
  magEigenRegelsVerwijderen: boolean;
  // Op de deellink zelf is de code al bekend; zonder haalt de pop-up hem op
  deelCode?: string;
}

export default function LijstWeergave({ initieel, apiBasis, magEigenRegelsVerwijderen, deelCode }: Props) {
  const [stand, setStand] = useState<Stand>(initieel);
  const [nieuw, setNieuw] = useState("");
  const [fout, setFout] = useState("");
  const [deelOpen, setDeelOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const lopend = useRef(0); // aantal vinkverzoeken onderweg

  const meld = useCallback((tekst: string) => {
    setFout(tekst);
    setTimeout(() => setFout(""), 4000);
  }, []);

  // De stand opnieuw ophalen als je de pagina weer opent
  const ververs = useCallback(async () => {
    if (lopend.current > 0) return; // een eigen wijziging is nog onderweg
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

  async function vink(sleutel: string, aan: boolean) {
    const vorige = stand;
    setStand((huidig) => ({
      ...huidig,
      afgevinkt: aan ? [...huidig.afgevinkt, sleutel] : huidig.afgevinkt.filter((k) => k !== sleutel),
    }));
    lopend.current++;
    try {
      const res = await fetch(`${apiBasis}/vink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleutel, aan }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setStand(vorige);
      meld("Vinkje opslaan mislukt");
    } finally {
      lopend.current--;
    }
  }

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
  const { totaal, afgevinkt: aantalKlaar } = telRegels(stand.secties, afgevinkt);
  const heeftEigen = stand.secties.some((s) => s.id === EIGEN_SECTIE);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <p className="text-sm text-neutral-500">
          {totaal === 0 ? "Er staat nog niets op de lijst" : `${aantalKlaar} van ${totaal} afgevinkt`}
        </p>
        {totaal > 0 && (
          <button type="button" onClick={() => setDeelOpen(true)} className="btn-secondary !py-1.5 !px-4">
            Delen
          </button>
        )}
      </div>
      {fout && <p className="text-sm text-red-600 mb-4">{fout}</p>}
      {deelOpen && <DeelLijstPopup code={deelCode} onSluiten={() => setDeelOpen(false)} />}

      {stand.secties.map((sectie) => (
        <section key={sectie.id} className="mb-8">
          <h2 className="font-sans text-xs uppercase tracking-widest text-neutral-500 mb-1">{sectie.label}</h2>
          <ul className="border-t border-neutral-200">
            {afgevinktOnderaan(sectie.regels, afgevinkt).map((regel) => {
              const klaar = afgevinkt.has(regel.sleutel);
              return (
                <li key={regel.sleutel} className="flex items-center border-b border-neutral-200">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={klaar}
                    onClick={() => vink(regel.sleutel, !klaar)}
                    className="flex-1 min-w-0 flex items-center gap-4 min-h-[52px] py-2 text-left"
                  >
                    <span
                      className={`w-7 h-7 shrink-0 border flex items-center justify-center ${
                        klaar ? "bg-olive-700 border-olive-700 text-white" : "bg-white border-neutral-300"
                      }`}
                    >
                      {klaar && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={klaar ? "text-neutral-400 line-through" : "text-neutral-900"}>{regel.tekst}</span>
                      {regel.detail && <span className="block text-xs text-neutral-400">{regel.detail}</span>}
                    </span>
                  </button>
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
              );
            })}
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
