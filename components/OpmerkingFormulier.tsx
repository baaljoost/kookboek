"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Props {
  slug: string;
}

export default function OpmerkingFormulier({ slug }: Props) {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [bericht, setBericht] = useState("");
  const [sterren, setSterren] = useState<number | null>(null);
  const [hoverSterren, setHoverSterren] = useState<number | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [verstuurd, setVerstuurd] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  function onFotoKiezen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    const url = URL.createObjectURL(file);
    setFotoPreview(url);
  }

  function verwijderFoto() {
    setFoto(null);
    setFotoPreview(null);
    if (fotoRef.current) fotoRef.current.value = "";
  }

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim() || !bericht.trim()) return;

    setBezig(true);
    setFout("");

    const fd = new FormData();
    fd.append("naam", naam.trim());
    fd.append("bericht", bericht.trim());
    if (sterren) fd.append("sterren", String(sterren));
    if (foto) fd.append("foto", foto);

    const res = await fetch(`/api/recepten/${slug}/opmerkingen`, {
      method: "POST",
      body: fd,
    });

    if (res.ok) {
      setVerstuurd(true);
      setNaam("");
      setBericht("");
      setSterren(null);
      setFoto(null);
      setFotoPreview(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setFout(data.error ?? "Versturen mislukt, probeer opnieuw.");
    }
    setBezig(false);
  }

  if (verstuurd) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 p-6 text-center">
        <p className="text-neutral-700 font-medium">Bedankt voor je opmerking!</p>
        <button
          type="button"
          onClick={() => setVerstuurd(false)}
          className="mt-3 text-xs text-neutral-400 hover:text-neutral-600 underline"
        >
          Nog een opmerking toevoegen
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={verstuur} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Naam */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1.5">
            Naam <span className="text-terracotta-500">*</span>
          </label>
          <input
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Jouw naam"
            required
            className="input w-full"
          />
        </div>

        {/* Sterren */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1.5">
            Beoordeling <span className="text-neutral-300">(optioneel)</span>
          </label>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSterren(sterren === n ? null : n)}
                onMouseEnter={() => setHoverSterren(n)}
                onMouseLeave={() => setHoverSterren(null)}
                className="text-2xl leading-none transition-colors focus:outline-none"
                aria-label={`${n} ster${n > 1 ? "ren" : ""}`}
              >
                <span className={
                  (hoverSterren ?? sterren ?? 0) >= n
                    ? "text-amber-400"
                    : "text-neutral-200"
                }>★</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bericht */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1.5">
          Bericht <span className="text-terracotta-500">*</span>
        </label>
        <textarea
          value={bericht}
          onChange={(e) => setBericht(e.target.value)}
          placeholder="Deel je ervaring met dit recept…"
          required
          rows={4}
          className="input w-full resize-none"
        />
      </div>

      {/* Foto */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1.5">
          Foto <span className="text-neutral-300">(optioneel)</span>
        </label>
        {fotoPreview ? (
          <div className="relative inline-block">
            <div className="w-24 h-24 overflow-hidden bg-neutral-100">
              <Image src={fotoPreview} alt="Preview" width={96} height={96} className="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              onClick={verwijderFoto}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >×</button>
          </div>
        ) : (
          <div
            onClick={() => fotoRef.current?.click()}
            className="border-2 border-dashed border-neutral-200 hover:border-neutral-400 cursor-pointer p-4 text-center transition-colors inline-block"
          >
            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFotoKiezen}
            />
            <p className="text-xs text-neutral-400">Klik om een foto toe te voegen</p>
          </div>
        )}
      </div>

      {fout && <p className="text-red-600 text-xs">{fout}</p>}

      <button
        type="submit"
        disabled={bezig || !naam.trim() || !bericht.trim()}
        className="btn-primary disabled:opacity-50"
      >
        {bezig ? "Versturen…" : "Opmerking plaatsen"}
      </button>
    </form>
  );
}
