"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PortieKiezer from "./PortieKiezer";

export interface MandjeItem {
  receptId: number;
  slug: string;
  titel: string;
  fotoUrl: string | null;
  standaardPorties: number | null;
  porties: number | null;
}

export interface ZoekRecept {
  receptId: number;
  slug: string;
  titel: string;
  fotoUrl: string | null;
  standaardPorties: number | null;
}

function Foto({ url, titel }: { url: string | null; titel: string }) {
  return (
    <div className="w-16 h-16 shrink-0 bg-neutral-100 overflow-hidden">
      {url && <Image src={url} alt={titel} width={128} height={128} className="w-full h-full object-cover" />}
    </div>
  );
}

export default function WeekMandje({ initieel, alle }: { initieel: MandjeItem[]; alle: ZoekRecept[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initieel);
  const [zoek, setZoek] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  function meld(tekst: string) {
    setFout(tekst);
    setTimeout(() => setFout(""), 4000);
  }

  function wijzigPorties(item: MandjeItem, porties: number) {
    setItems((huidig) => huidig.map((i) => (i.receptId === item.receptId ? { ...i, porties } : i)));
    // Pas na een korte pauze opslaan, zodat meerdere tikken één verzoek zijn
    clearTimeout(timers.current.get(item.receptId));
    timers.current.set(
      item.receptId,
      setTimeout(async () => {
        const res = await fetch(`/api/admin/week/${item.receptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ porties }),
        });
        if (!res.ok) meld("Porties opslaan mislukt");
      }, 400)
    );
  }

  async function weghalen(item: MandjeItem) {
    const vorige = items;
    setItems((huidig) => huidig.filter((i) => i.receptId !== item.receptId));
    const res = await fetch(`/api/admin/week/${item.receptId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else {
      setItems(vorige);
      meld("Weghalen mislukt");
    }
  }

  async function toevoegen(recept: ZoekRecept) {
    const res = await fetch("/api/admin/week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receptId: recept.receptId }),
    });
    if (!res.ok) return meld("Toevoegen mislukt");
    const { porties } = (await res.json()) as { porties: number | null };
    setItems((huidig) => [...huidig, { ...recept, porties }]);
    setZoek("");
    router.refresh();
  }

  async function nieuweWeek() {
    if (
      !confirm(
        "Nieuwe week beginnen? Het mandje en je eigen regels worden leeggemaakt. De recepten blijven bewaard in de geschiedenis."
      )
    )
      return;
    setBezig(true);
    const res = await fetch("/api/admin/week/nieuw", { method: "POST" });
    setBezig(false);
    if (!res.ok) return meld("Nieuwe week mislukt");
    setItems([]);
    router.refresh();
  }

  const q = zoek.trim().toLowerCase();
  const inMandje = new Set(items.map((i) => i.receptId));
  const resultaten = q
    ? alle.filter((r) => !inMandje.has(r.receptId) && r.titel.toLowerCase().includes(q)).slice(0, 8)
    : [];

  return (
    <div>
      {fout && <p className="text-sm text-red-600 mb-4">{fout}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500 mb-8">
          Er staan nog geen recepten op het weekmenu. Zoek hieronder een recept, of tik op de plus op een
          receptkaart.
        </p>
      ) : (
        <ul className="mb-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {items.map((item) => (
            <li key={item.receptId} className="py-4 flex gap-4">
              <Foto url={item.fotoUrl} titel={item.titel} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/recepten/${item.slug}`}
                    className="font-serif text-lg text-neutral-900 hover:text-olive-700 transition-colors leading-snug"
                  >
                    {item.titel}
                  </Link>
                  <button
                    type="button"
                    onClick={() => weghalen(item)}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors whitespace-nowrap"
                  >
                    Weghalen
                  </button>
                </div>
                {item.standaardPorties && item.porties ? (
                  <PortieKiezer
                    className="mt-3"
                    porties={item.porties}
                    standaard={item.standaardPorties}
                    onChange={(p) => wijzigPorties(item, p)}
                  />
                ) : (
                  <p className="mt-2 text-xs text-neutral-400">Dit recept heeft geen porties</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-10">
        <label className="label" htmlFor="week-zoek">
          Recept toevoegen
        </label>
        <input
          id="week-zoek"
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op titel…"
          className="input"
          autoComplete="off"
        />
        {q && (
          <ul className="mt-2 border border-neutral-200 bg-white divide-y divide-neutral-200">
            {resultaten.length === 0 && <li className="px-3 py-3 text-sm text-neutral-400">Niets gevonden</li>}
            {resultaten.map((r) => (
              <li key={r.receptId}>
                <button
                  type="button"
                  onClick={() => toevoegen(r)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-10 h-10 shrink-0 bg-neutral-100 overflow-hidden">
                    {r.fotoUrl && (
                      <Image src={r.fotoUrl} alt="" width={80} height={80} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="flex-1 font-serif text-neutral-900">{r.titel}</span>
                  <span className="text-xs uppercase tracking-widest text-olive-700 whitespace-nowrap">+ Toevoegen</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" onClick={nieuweWeek} disabled={bezig} className="btn-secondary disabled:opacity-50">
        Nieuwe week
      </button>
    </div>
  );
}
