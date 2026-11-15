"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AFDELINGEN, afdelingLabel } from "@/lib/afdelingen";

export interface KoppelGroep {
  sleutel: string;
  aantal: number;
  namen: string[];
  recepten: { slug: string; titel: string }[];
}

interface Product {
  id: number;
  naam: string;
  afdeling: string;
}

interface Props {
  groepen: KoppelGroep[];
  producten: Product[];
}

const PER_PAGINA = 50;

export default function KoppelLijst({ groepen: initieel, producten: initieleProducten }: Props) {
  const router = useRouter();
  const [groepen, setGroepen] = useState(initieel);
  const [producten, setProducten] = useState(initieleProducten);
  const [filter, setFilter] = useState("");
  const [zichtbaar, setZichtbaar] = useState(PER_PAGINA);

  const gefilterd = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return groepen;
    return groepen.filter(
      (g) => g.sleutel.includes(term) || g.namen.some((n) => n.toLowerCase().includes(term))
    );
  }, [groepen, filter]);

  function klaar(sleutel: string, product: Product | null) {
    setGroepen((prev) => prev.filter((g) => g.sleutel !== sleutel));
    if (product) {
      setProducten((prev) =>
        prev.some((p) => p.id === product.id)
          ? prev
          : [...prev, product].sort((a, b) => a.naam.localeCompare(b.naam, "nl"))
      );
    }
    router.refresh(); // teller in het menu bijwerken
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <input
          type="search"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setZichtbaar(PER_PAGINA);
          }}
          placeholder="Filter op naam…"
          className="input max-w-xs"
          aria-label="Filter op naam"
        />
        <span className="text-sm text-neutral-400">
          {gefilterd.length} {gefilterd.length === 1 ? "naam" : "namen"}
        </span>
      </div>

      {/* Eén gedeelde lijst voor alle zoekvelden */}
      <datalist id="koppel-producten">
        {producten.map((p) => (
          <option key={p.id} value={p.naam}>
            {afdelingLabel(p.afdeling)}
          </option>
        ))}
      </datalist>

      <div className="divide-y divide-neutral-100">
        {gefilterd.slice(0, zichtbaar).map((groep) => (
          <KoppelRij key={groep.sleutel} groep={groep} producten={producten} onKlaar={klaar} />
        ))}
      </div>

      {gefilterd.length > zichtbaar && (
        <button
          type="button"
          onClick={() => setZichtbaar((n) => n + PER_PAGINA)}
          className="mt-6 text-sm text-olive-700 hover:underline"
        >
          Toon meer ({gefilterd.length - zichtbaar} resterend)
        </button>
      )}
    </div>
  );
}

function KoppelRij({
  groep,
  producten,
  onKlaar,
}: {
  groep: KoppelGroep;
  producten: Product[];
  onKlaar: (sleutel: string, product: Product | null) => void;
}) {
  const [keuze, setKeuze] = useState("");
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [nieuwNaam, setNieuwNaam] = useState(groep.sleutel);
  const [nieuwAfdeling, setNieuwAfdeling] = useState("");
  const [altijdInHuis, setAltijdInHuis] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const gekozen = producten.find((p) => p.naam === keuze.trim().toLowerCase());
  const andereNamen = groep.namen.filter((n) => n.toLowerCase() !== groep.sleutel);

  async function verstuur(payload: object, nieuwProduct?: { naam: string; afdeling: string }) {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/admin/koppelen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleutel: groep.sleutel, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error ?? "Koppelen mislukt");
        setBezig(false);
        return;
      }
      onKlaar(
        groep.sleutel,
        nieuwProduct ? { id: data.productId, naam: data.productNaam, afdeling: nieuwProduct.afdeling } : null
      );
    } catch {
      setFout("Koppelen mislukt");
      setBezig(false);
    }
  }

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900">
            {groep.sleutel}{" "}
            <span className="text-neutral-400 font-normal">· {groep.aantal}×</span>
          </p>
          {andereNamen.length > 0 && (
            <p className="text-xs text-neutral-400 mt-0.5">
              ook als: {andereNamen.slice(0, 4).join(" · ")}
              {andereNamen.length > 4 && ` · +${andereNamen.length - 4}`}
            </p>
          )}
          <p className="text-xs text-neutral-400 mt-1">
            {groep.recepten.slice(0, 4).map((r, i) => (
              <span key={r.slug}>
                {i > 0 && ", "}
                <Link href={`/recepten/${r.slug}`} className="text-olive-700 hover:underline">
                  {r.titel}
                </Link>
              </span>
            ))}
            {groep.recepten.length > 4 && ` en ${groep.recepten.length - 4} andere`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            list="koppel-producten"
            value={keuze}
            onChange={(e) => setKeuze(e.target.value)}
            placeholder="Kies product…"
            className="input w-48"
            aria-label={`Product voor ${groep.sleutel}`}
          />
          <button
            type="button"
            onClick={() => gekozen && verstuur({ productId: gekozen.id })}
            disabled={bezig || !gekozen}
            className="btn-primary disabled:opacity-50"
          >
            Koppel
          </button>
          <button
            type="button"
            onClick={() => setNieuwOpen((v) => !v)}
            className="text-xs text-neutral-500 hover:text-olive-700 transition-colors whitespace-nowrap"
          >
            {nieuwOpen ? "Annuleer" : "Nieuw product"}
          </button>
        </div>
      </div>

      {nieuwOpen && (
        <div className="mt-3 p-4 bg-cream-100 border border-neutral-200 flex items-end gap-3 flex-wrap">
          <div>
            <label className="label">Productnaam (enkelvoud)</label>
            <input
              type="text"
              value={nieuwNaam}
              onChange={(e) => setNieuwNaam(e.target.value)}
              className="input w-56"
            />
          </div>
          <div>
            <label className="label">Afdeling</label>
            <select
              value={nieuwAfdeling}
              onChange={(e) => setNieuwAfdeling(e.target.value)}
              className="input w-56"
            >
              <option value="">— kies —</option>
              {AFDELINGEN.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 pb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={altijdInHuis}
              onChange={(e) => setAltijdInHuis(e.target.checked)}
            />
            Altijd in huis
          </label>
          <button
            type="button"
            onClick={() =>
              verstuur(
                { nieuw: { naam: nieuwNaam, afdeling: nieuwAfdeling, altijdInHuis } },
                { naam: nieuwNaam, afdeling: nieuwAfdeling }
              )
            }
            disabled={bezig || !nieuwNaam.trim() || !nieuwAfdeling}
            className="btn-primary disabled:opacity-50"
          >
            Maak en koppel
          </button>
        </div>
      )}

      {fout && <p className="text-red-600 text-xs mt-2">{fout}</p>}
    </div>
  );
}
