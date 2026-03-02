"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import FotoEditor from "./FotoEditor";

interface Foto {
  id: number;
  url: string;
  altTekst: string | null;
}

interface Props {
  receptId: number;
  fotos: Foto[];
  receptTitel: string;
}

export default function FotoBewerken({ receptId, fotos, receptTitel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlInvoer, setUrlInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [bewerkFoto, setBewerkFoto] = useState<Foto | null>(null);

  async function uploadBestand(file: File) {
    setBezig(true);
    setFout("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("altTekst", receptTitel);
    const res = await fetch(`/api/admin/recepten/${receptId}/fotos`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      router.refresh();
      setOpen(false);
    } else {
      setFout("Upload mislukt");
    }
    setBezig(false);
  }

  async function voegUrlToe() {
    if (!urlInvoer.trim()) return;
    setBezig(true);
    setFout("");
    const res = await fetch(`/api/admin/recepten/${receptId}/fotos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlInvoer.trim(), altTekst: receptTitel }),
    });
    if (res.ok) {
      router.refresh();
      setOpen(false);
      setUrlInvoer("");
    } else {
      setFout("Toevoegen mislukt");
    }
    setBezig(false);
  }

  async function verwijderFoto(fotoId: number) {
    if (!confirm("Foto verwijderen?")) return;
    setBezig(true);
    await fetch(`/api/admin/recepten/${receptId}/fotos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fotoId }),
    });
    router.refresh();
    setBezig(false);
  }

  return (
    <>
      {/* Bewerk-knop rechtsonder op het foto-blok */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Foto bewerken"
        aria-label="Foto toevoegen of bewerken"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
        </svg>
      </button>

      {/* Foto-editor */}
      {bewerkFoto && (
        <FotoEditor
          fotoUrl={bewerkFoto.url}
          fotoId={bewerkFoto.id}
          receptId={receptId}
          altTekst={bewerkFoto.altTekst ?? receptTitel}
          onSluiten={() => setBewerkFoto(null)}
          onOpgeslagen={() => {
            setBewerkFoto(null);
            router.refresh();
          }}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white w-full max-w-md mx-4 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-neutral-900">Foto&apos;s beheren</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">×</button>
            </div>

            {/* Huidige foto's */}
            {fotos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Huidige foto&apos;s</p>
                <div className="flex flex-wrap gap-2">
                  {fotos.map((foto) => (
                    <div key={foto.id} className="relative group/thumb">
                      <div className="w-20 h-20 overflow-hidden bg-neutral-100">
                        <Image src={foto.url} alt={foto.altTekst ?? ""} width={80} height={80} className="w-full h-full object-cover" />
                      </div>
                      {/* Bewerk-overlay */}
                      <button
                        type="button"
                        onClick={() => setBewerkFoto(foto)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                        title="Foto bewerken"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-6 h-6">
                          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => verwijderFoto(foto.id)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                        title="Verwijderen"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-3 mb-4 border-b border-neutral-100">
              <button
                type="button"
                onClick={() => setTab("upload")}
                className={`pb-2 text-sm font-medium transition-colors ${tab === "upload" ? "text-olive-700 border-b-2 border-olive-700 -mb-px" : "text-neutral-400"}`}
              >
                Bestand uploaden
              </button>
              <button
                type="button"
                onClick={() => setTab("url")}
                className={`pb-2 text-sm font-medium transition-colors ${tab === "url" ? "text-olive-700 border-b-2 border-olive-700 -mb-px" : "text-neutral-400"}`}
              >
                Via URL
              </button>
            </div>

            {tab === "upload" && (
              <div>
                <div
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 hover:border-olive-500 cursor-pointer p-6 text-center transition-colors"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadBestand(file);
                      e.target.value = "";
                    }}
                  />
                  <p className="text-sm text-neutral-500">
                    <span className="font-medium text-neutral-700">Klik om te uploaden</span>
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">JPG, PNG, WEBP</p>
                </div>
              </div>
            )}

            {tab === "url" && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInvoer}
                  onChange={(e) => setUrlInvoer(e.target.value)}
                  placeholder="https://..."
                  className="input flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); voegUrlToe(); } }}
                />
                <button
                  type="button"
                  onClick={voegUrlToe}
                  disabled={bezig || !urlInvoer.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {bezig ? "…" : "Toevoegen"}
                </button>
              </div>
            )}

            {fout && <p className="text-red-600 text-xs mt-2">{fout}</p>}
            {bezig && <p className="text-xs text-neutral-400 mt-2">Even geduld…</p>}
          </div>
        </div>
      )}
    </>
  );
}
