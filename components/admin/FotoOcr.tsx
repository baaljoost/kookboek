"use client";

import { useState, useRef } from "react";
import { parseReceptTekst, type ParsedRecept } from "@/lib/parseReceptTekst";

interface Props {
  onImport: (data: ParsedRecept) => void;
}

type Fase = "idle" | "ocr" | "review" | "klaar";

export default function FotoOcr({ onImport }: Props) {
  const [fase, setFase] = useState<Fase>("idle");
  const [voortgang, setVoortgang] = useState(0);
  const [voortgangLabel, setVoortgangLabel] = useState("");
  const [fout, setFout] = useState("");
  const [ruwtekst, setRuwtekst] = useState("");
  const [parsed, setParsed] = useState<ParsedRecept | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleBestand(bestand: File) {
    setFout("");
    setFase("ocr");
    setVoortgang(0);
    setVoortgangLabel("Tesseract laden…");

    try {
      // Dynamisch importeren zodat Tesseract alleen geladen wordt als nodig
      const Tesseract = (await import("tesseract.js")).default;

      const resultaat = await Tesseract.recognize(bestand, "nld+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setVoortgang(Math.round(m.progress * 100));
            setVoortgangLabel(`OCR bezig… ${Math.round(m.progress * 100)}%`);
          } else {
            setVoortgangLabel(
              m.status === "loading language traineddata"
                ? "Taalmodel laden…"
                : m.status === "initializing api"
                ? "Initialiseren…"
                : m.status
            );
          }
        },
      });

      const tekst = resultaat.data.text;
      setRuwtekst(tekst);
      const parsedData = parseReceptTekst(tekst);
      setParsed(parsedData);
      setFase("review");
    } catch (e) {
      setFout(`OCR mislukt: ${e instanceof Error ? e.message : String(e)}`);
      setFase("idle");
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (bestand) handleBestand(bestand);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const bestand = e.dataTransfer.files?.[0];
    if (bestand && bestand.type.startsWith("image/")) handleBestand(bestand);
  }

  function handleImport() {
    if (!parsed) return;
    onImport(parsed);
    setFase("klaar");
  }

  function opnieuw() {
    setFase("idle");
    setRuwtekst("");
    setParsed(null);
    setFout("");
  }

  function updateRuwtekst(tekst: string) {
    setRuwtekst(tekst);
    setParsed(parseReceptTekst(tekst));
  }

  if (fase === "klaar") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3">
        <span>✓ Recept ingevuld vanuit foto</span>
        <button type="button" onClick={opnieuw} className="ml-auto text-neutral-400 hover:text-neutral-600 text-xs underline">
          Opnieuw
        </button>
      </div>
    );
  }

  if (fase === "ocr") {
    return (
      <div className="border border-neutral-200 bg-cream-100 p-5">
        <p className="text-sm text-neutral-600 mb-3">{voortgangLabel}</p>
        <div className="w-full bg-neutral-200 h-2 rounded">
          <div
            className="bg-olive-700 h-2 rounded transition-all duration-200"
            style={{ width: `${voortgang}%` }}
          />
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Dit kan 10–30 seconden duren afhankelijk van de foto.
        </p>
      </div>
    );
  }

  if (fase === "review" && parsed) {
    return (
      <div className="border border-neutral-200 bg-cream-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg text-neutral-900">Gelezen tekst</h3>
          <button type="button" onClick={opnieuw} className="text-xs text-neutral-400 hover:text-neutral-600 underline">
            Andere foto
          </button>
        </div>

        {/* Ruwe tekst — bewerkbaar */}
        <div>
          <label className="label">Tekst uit foto (controleer en corrigeer indien nodig)</label>
          <textarea
            value={ruwtekst}
            onChange={(e) => updateRuwtekst(e.target.value)}
            rows={10}
            className="input font-mono text-xs w-full"
            spellCheck={false}
          />
        </div>

        {/* Preview van wat er ingevuld wordt */}
        <div className="bg-white border border-neutral-100 p-4 space-y-3 text-sm">
          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Wat er ingevuld wordt</p>

          {parsed.titel && (
            <div><span className="text-neutral-400 text-xs">Titel:</span> <strong>{parsed.titel}</strong></div>
          )}
          <div className="flex gap-6">
            {parsed.porties && <div><span className="text-neutral-400 text-xs">Porties:</span> {parsed.porties}</div>}
            {parsed.bereidingstijd && <div><span className="text-neutral-400 text-xs">Bereidingstijd:</span> {parsed.bereidingstijd} min</div>}
          </div>

          {parsed.ingredienten.length > 0 && (
            <div>
              <p className="text-xs text-neutral-400 mb-1">{parsed.ingredienten.length} ingrediënten:</p>
              <ul className="space-y-0.5 text-xs text-neutral-600">
                {parsed.ingredienten.slice(0, 6).map((ing, i) => (
                  <li key={i}>
                    {[ing.hoeveelheid, ing.eenheid, ing.naam, ing.notitie ? `(${ing.notitie})` : ""].filter(Boolean).join(" ")}
                  </li>
                ))}
                {parsed.ingredienten.length > 6 && (
                  <li className="text-neutral-400">… en {parsed.ingredienten.length - 6} meer</li>
                )}
              </ul>
            </div>
          )}

          {parsed.stappen.length > 0 && (
            <div>
              <p className="text-xs text-neutral-400 mb-1">{parsed.stappen.length} stappen:</p>
              <ol className="space-y-0.5 text-xs text-neutral-600 list-decimal list-inside">
                {parsed.stappen.slice(0, 3).map((s, i) => (
                  <li key={i}>{s.tekst.substring(0, 80)}{s.tekst.length > 80 ? "…" : ""}</li>
                ))}
                {parsed.stappen.length > 3 && (
                  <li className="text-neutral-400 list-none ml-4">… en {parsed.stappen.length - 3} meer</li>
                )}
              </ol>
            </div>
          )}

          {parsed.ingredienten.length === 0 && parsed.stappen.length === 0 && (
            <p className="text-neutral-400 text-xs italic">
              Geen ingrediënten of stappen herkend. Pas de tekst hierboven aan en probeer opnieuw.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleImport}
            disabled={!parsed.titel && parsed.ingredienten.length === 0 && parsed.stappen.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            Velden invullen
          </button>
          <button type="button" onClick={opnieuw} className="btn-secondary">
            Annuleren
          </button>
        </div>
      </div>
    );
  }

  // Idle: upload zone
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-neutral-300 bg-cream-100 hover:border-olive-500 hover:bg-cream-200 transition-colors cursor-pointer p-6 text-center"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        <p className="text-sm text-neutral-500">
          <span className="font-medium text-neutral-700">Klik om een foto te uploaden</span>
          {" "}of sleep hem hierheen
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          Foto van een kookboek of tijdschrift · JPG, PNG, WEBP
        </p>
      </div>
      {fout && <p className="text-red-600 text-xs mt-2">{fout}</p>}
    </div>
  );
}
