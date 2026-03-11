"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  fotoUrl: string;
  fotoId: number;
  receptId: number;
  altTekst: string;
  onSluiten: () => void;
  onOpgeslagen: () => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function FotoEditor({
  fotoUrl,
  fotoId,
  receptId,
  altTekst,
  onSluiten,
  onOpgeslagen,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotatie, setRotatie] = useState(0); // graden: 0, 90, 180, 270
  const [afbeelding, setAfbeelding] = useState<HTMLImageElement | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  // Crop state
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropModus, setCropModus] = useState(false);

  // Laad afbeelding
  // Cache-buster nodig: iOS Safari hergebruikt anders de gecachede versie
  // van de <Image>-tag (zonder CORS-headers), waardoor de canvas tainted wordt
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setAfbeelding(img);
    img.onerror = () => setFout("Afbeelding laden mislukt (CORS?)");
    const sep = fotoUrl.includes("?") ? "&" : "?";
    img.src = `${fotoUrl}${sep}_t=${Date.now()}`;
  }, [fotoUrl]);

  // Teken canvas
  const tekenCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !afbeelding) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gedraaid = rotatie % 180 !== 0;
    const cw = gedraaid ? afbeelding.naturalHeight : afbeelding.naturalWidth;
    const ch = gedraaid ? afbeelding.naturalWidth : afbeelding.naturalHeight;

    // Schaal naar max 800px breed
    const schaal = Math.min(1, 800 / cw, 600 / ch);
    const w = Math.round(cw * schaal);
    const h = Math.round(ch * schaal);

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotatie * Math.PI) / 180);
    if (gedraaid) {
      ctx.drawImage(afbeelding, -h / 2, -w / 2, h, w);
    } else {
      ctx.drawImage(afbeelding, -w / 2, -h / 2, w, h);
    }
    ctx.restore();

    // Teken crop-overlay als actief
    if (cropRect && cropRect.w > 0 && cropRect.h > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, w, cropRect.y);
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
      ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, w - cropRect.x - cropRect.w, cropRect.h);
      ctx.fillRect(0, cropRect.y + cropRect.h, w, h - cropRect.y - cropRect.h);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }
  }, [afbeelding, rotatie, cropRect]);

  useEffect(() => {
    tekenCanvas();
  }, [tekenCanvas]);

  // Reset crop bij rotatie
  useEffect(() => {
    setCropRect(null);
  }, [rotatie]);

  function draaiLinks() {
    setRotatie((r) => (r - 90 + 360) % 360);
  }
  function draaiRechts() {
    setRotatie((r) => (r + 90) % 360);
  }

  // Refs voor touch-events (vermijdt stale closures in non-passive listeners)
  const cropModusRef = useRef(false);
  cropModusRef.current = cropModus;
  const isCroppingRef = useRef(false);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);

  // Touch-events voor crop (non-passive zodat preventDefault werkt op mobiel)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getPos(touch: Touch) {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: (touch.clientX - rect.left) * (canvas!.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas!.height / rect.height),
      };
    }

    function handleTouchStart(e: TouchEvent) {
      if (!cropModusRef.current || !e.touches[0]) return;
      e.preventDefault();
      const pos = getPos(e.touches[0]);
      cropStartRef.current = pos;
      isCroppingRef.current = true;
      setCropStart(pos);
      setCropRect(null);
      setIsCropping(true);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isCroppingRef.current || !cropStartRef.current || !e.touches[0]) return;
      e.preventDefault();
      const pos = getPos(e.touches[0]);
      const start = cropStartRef.current;
      setCropRect({
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        w: Math.abs(pos.x - start.x),
        h: Math.abs(pos.y - start.y),
      });
    }

    function handleTouchEnd() {
      isCroppingRef.current = false;
      setIsCropping(false);
    }

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [afbeelding]); // herregistreer wanneer canvas zichtbaar wordt (na laden afbeelding)

  // Muis-events voor crop
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!cropModus) return;
    const pos = getCanvasPos(e);
    setCropStart(pos);
    setCropRect(null);
    setIsCropping(true);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isCropping || !cropStart) return;
    const pos = getCanvasPos(e);
    const x = Math.min(cropStart.x, pos.x);
    const y = Math.min(cropStart.y, pos.y);
    const w = Math.abs(pos.x - cropStart.x);
    const h = Math.abs(pos.y - cropStart.y);
    setCropRect({ x, y, w, h });
  }

  function onMouseUp() {
    setIsCropping(false);
  }

  async function opslaan() {
    const canvas = canvasRef.current;
    if (!canvas || !afbeelding) return;
    setBezig(true);
    setFout("");

    try {
      let resultCanvas: HTMLCanvasElement;

      if (cropRect && cropRect.w > 5 && cropRect.h > 5) {
        // Bijgesneden versie renderen op originele resolutie
        const gedraaid = rotatie % 180 !== 0;
        const cw = gedraaid ? afbeelding.naturalHeight : afbeelding.naturalWidth;
        const ch = gedraaid ? afbeelding.naturalWidth : afbeelding.naturalHeight;
        const schaal = Math.min(1, 800 / cw, 600 / ch);
        const canvasSchaal = cw / (canvas.width / schaal) || 1;

        // Canvas-coördinaten omrekenen naar originele afbeelding schaal
        const origSchaal = cw / canvas.width;
        const origCrop = {
          x: cropRect.x * origSchaal,
          y: cropRect.y * origSchaal,
          w: cropRect.w * origSchaal,
          h: cropRect.h * origSchaal,
        };

        resultCanvas = document.createElement("canvas");
        resultCanvas.width = Math.round(origCrop.w);
        resultCanvas.height = Math.round(origCrop.h);
        const rctx = resultCanvas.getContext("2d")!;
        rctx.drawImage(canvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, origCrop.w, origCrop.h);
        void canvasSchaal;
      } else {
        // Geen crop, gebruik volledige geroteerde canvas
        resultCanvas = document.createElement("canvas");
        resultCanvas.width = canvas.width;
        resultCanvas.height = canvas.height;
        const rctx = resultCanvas.getContext("2d")!;
        rctx.drawImage(canvas, 0, 0);
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        resultCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas naar blob mislukt"))),
          "image/jpeg",
          0.92
        );
      });

      // Verwijder oude foto
      await fetch(`/api/admin/recepten/${receptId}/fotos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoId }),
      });

      // Upload nieuwe foto
      const fd = new FormData();
      fd.append("file", blob, "foto.jpg");
      fd.append("altTekst", altTekst);
      const res = await fetch(`/api/admin/recepten/${receptId}/fotos`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const tekst = await res.text().catch(() => "");
        throw new Error(`Upload mislukt (${res.status})${tekst ? `: ${tekst}` : ""}`);
      }
      onOpgeslagen();
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    }
    setBezig(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-white w-full max-w-2xl mx-4 shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="font-serif text-lg text-neutral-900">Foto bewerken</h3>
          <button
            type="button"
            onClick={onSluiten}
            className="text-neutral-400 hover:text-neutral-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4 bg-neutral-50 flex items-center justify-center">
          {!afbeelding ? (
            <p className="text-neutral-400 text-sm">Laden…</p>
          ) : (
            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-[50vh] object-contain ${cropModus ? "cursor-crosshair" : "cursor-default"}`}
              style={{ display: "block" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-t border-neutral-100 flex flex-wrap gap-2 items-center">
          {/* Draaien */}
          <button
            type="button"
            onClick={draaiLinks}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 hover:border-neutral-500 transition-colors"
            title="90° naar links draaien"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
            </svg>
            Links draaien
          </button>
          <button
            type="button"
            onClick={draaiRechts}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 hover:border-neutral-500 transition-colors"
            title="90° naar rechts draaien"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 scale-x-[-1]">
              <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
            </svg>
            Rechts draaien
          </button>

          <div className="w-px h-6 bg-neutral-200 mx-1" />

          {/* Bijsnijden */}
          <button
            type="button"
            onClick={() => {
              setCropModus((v) => !v);
              if (cropModus) setCropRect(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
              cropModus
                ? "bg-olive-700 text-white border-olive-700"
                : "border-neutral-300 hover:border-neutral-500"
            }`}
            title="Bijsnijden aan/uit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42L13.5 3.498a2.121 2.121 0 013.002 3.002L10.58 12.42a4 4 0 01-1.342.886l-3.154 1.26a.5.5 0 01-.651-.649z" />
              <path d="M3.5 3.75c0-.414.336-.75.75-.75H7a.75.75 0 010 1.5H4.5v2.5a.75.75 0 01-1.5 0V3.75zM16.5 16.25c0 .414-.336.75-.75.75H13a.75.75 0 010-1.5h2.5v-2.5a.75.75 0 011.5 0v2.75z" />
            </svg>
            {cropModus ? "Bijsnijden uit" : "Bijsnijden"}
          </button>
          {cropRect && cropRect.w > 5 && (
            <button
              type="button"
              onClick={() => { setCropRect(null); setCropModus(false); }}
              className="text-xs text-neutral-400 hover:text-neutral-600 px-2"
            >
              Selectie wissen
            </button>
          )}

          <div className="flex-1" />

          {/* Opslaan / Annuleren */}
          <button
            type="button"
            onClick={onSluiten}
            className="px-4 py-1.5 text-sm border border-neutral-300 hover:border-neutral-500 transition-colors"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={opslaan}
            disabled={bezig}
            className="px-4 py-1.5 text-sm bg-olive-700 text-white hover:bg-olive-800 transition-colors disabled:opacity-50"
          >
            {bezig ? "Opslaan…" : "Opslaan"}
          </button>
        </div>

        {fout && (
          <p className="px-5 pb-3 text-red-600 text-xs">{fout}</p>
        )}
        {cropModus && !cropRect && (
          <p className="px-5 pb-3 text-xs text-neutral-400">
            Sleep over de foto om een bijsnijdselectie te maken.
          </p>
        )}
      </div>
    </div>
  );
}
