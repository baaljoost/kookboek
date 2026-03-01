"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Categorie } from "@prisma/client";
import { categorieLabels } from "@/lib/categorieLabels";
import FotoOcr from "@/components/admin/FotoOcr";
import type { ParsedRecept } from "@/lib/parseReceptTekst";

interface Ingredient {
  id?: number;
  hoeveelheid: string;
  eenheid: string;
  naam: string;
  notitie: string;
}

interface Stap {
  id?: number;
  tekst: string;
}

interface Foto {
  id?: number;
  url: string;
  altTekst: string;
}

interface FormData {
  titel: string;
  categorie: Categorie;
  porties: string;
  bereidingstijd: string;
  beoordeling: string;
  herkomstNaam: string;
  herkomstUrl: string;
  tags: string;
  ingredienten: Ingredient[];
  stappen: Stap[];
  fotos: Foto[];
}

interface Props {
  receptId?: number;
  initieleWaarden?: Partial<FormData>;
}

const leegIngredient = (): Ingredient => ({
  hoeveelheid: "",
  eenheid: "",
  naam: "",
  notitie: "",
});

const legeStap = (): Stap => ({ tekst: "" });

export default function ReceptFormulier({ receptId, initieleWaarden }: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [uploadBezig, setUploadBezig] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importBezig, setImportBezig] = useState(false);
  const [importFout, setImportFout] = useState("");

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImportBezig(true);
    setImportFout("");

    const res = await fetch("/api/admin/importeer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: importUrl.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setImportFout(data.error ?? "Importeren mislukt");
      setImportBezig(false);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      titel: data.titel || prev.titel,
      porties: data.porties ? String(data.porties) : prev.porties,
      bereidingstijd: data.bereidingstijd ? String(data.bereidingstijd) : prev.bereidingstijd,
      herkomstNaam: data.herkomstNaam || prev.herkomstNaam,
      herkomstUrl: data.herkomstUrl || prev.herkomstUrl,
      ingredienten: data.ingredienten?.length ? data.ingredienten : prev.ingredienten,
      stappen: data.stappen?.length ? data.stappen : prev.stappen,
      fotos: data.fotoUrl
        ? [{ url: data.fotoUrl, altTekst: data.titel ?? "" }, ...prev.fotos].slice(0, 5)
        : prev.fotos,
    }));

    setImportBezig(false);
  }

  function handleOcrImport(data: ParsedRecept) {
    setFormData((prev) => ({
      ...prev,
      titel: data.titel || prev.titel,
      porties: data.porties || prev.porties,
      bereidingstijd: data.bereidingstijd || prev.bereidingstijd,
      ingredienten: data.ingredienten.length > 0 ? data.ingredienten : prev.ingredienten,
      stappen: data.stappen.length > 0 ? data.stappen : prev.stappen,
    }));
  }

  const [formData, setFormData] = useState<FormData>({
    titel: initieleWaarden?.titel ?? "",
    categorie: initieleWaarden?.categorie ?? Categorie.PASTA,
    porties: initieleWaarden?.porties ?? "",
    bereidingstijd: initieleWaarden?.bereidingstijd ?? "",
    beoordeling: initieleWaarden?.beoordeling ?? "",
    herkomstNaam: initieleWaarden?.herkomstNaam ?? "",
    herkomstUrl: initieleWaarden?.herkomstUrl ?? "",
    tags: initieleWaarden?.tags ?? "",
    ingredienten: initieleWaarden?.ingredienten ?? [leegIngredient()],
    stappen: initieleWaarden?.stappen ?? [legeStap()],
    fotos: initieleWaarden?.fotos ?? [],
  });

  function setVeld<K extends keyof FormData>(veld: K, waarde: FormData[K]) {
    setFormData((prev) => ({ ...prev, [veld]: waarde }));
  }

  // Ingrediënten
  function updateIngredient(i: number, veld: keyof Ingredient, waarde: string) {
    const nieuw = [...formData.ingredienten];
    nieuw[i] = { ...nieuw[i], [veld]: waarde };
    setVeld("ingredienten", nieuw);
  }
  function voegIngredientToe() {
    setVeld("ingredienten", [...formData.ingredienten, leegIngredient()]);
  }
  function verwijderIngredient(i: number) {
    setVeld("ingredienten", formData.ingredienten.filter((_, idx) => idx !== i));
  }

  // Stappen
  function updateStap(i: number, tekst: string) {
    const nieuw = [...formData.stappen];
    nieuw[i] = { ...nieuw[i], tekst };
    setVeld("stappen", nieuw);
  }
  function voegStapToe() {
    setVeld("stappen", [...formData.stappen, legeStap()]);
  }
  function verwijderStap(i: number) {
    setVeld("stappen", formData.stappen.filter((_, idx) => idx !== i));
  }
  function verplaatsStap(i: number, richting: -1 | 1) {
    const nieuw = [...formData.stappen];
    const j = i + richting;
    if (j < 0 || j >= nieuw.length) return;
    [nieuw[i], nieuw[j]] = [nieuw[j], nieuw[i]];
    setVeld("stappen", nieuw);
  }

  // Foto upload
  const uploadFoto = useCallback(async (file: File) => {
    setUploadBezig(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/fotos", { method: "POST", body: fd });
    const data = await res.json();
    setUploadBezig(false);
    return data.url as string;
  }, []);

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const resterend = 5 - formData.fotos.length;
    const teUploaden = files.slice(0, resterend);
    for (const file of teUploaden) {
      const url = await uploadFoto(file);
      setFormData((prev) => ({
        ...prev,
        fotos: [...prev.fotos, { url, altTekst: "" }],
      }));
    }
    e.target.value = "";
  }

  function verwijderFoto(i: number) {
    setFormData((prev) => ({
      ...prev,
      fotos: prev.fotos.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout("");

    const payload = {
      ...formData,
      porties: formData.porties ? parseInt(formData.porties) : null,
      bereidingstijd: formData.bereidingstijd
        ? parseInt(formData.bereidingstijd)
        : null,
      beoordeling: formData.beoordeling ? parseInt(formData.beoordeling) : null,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ingredienten: formData.ingredienten.filter((ing) => ing.naam.trim()),
      stappen: formData.stappen.filter((s) => s.tekst.trim()),
    };

    const url = receptId
      ? `/api/admin/recepten/${receptId}`
      : "/api/admin/recepten";
    const method = receptId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/admin/recepten");
      router.refresh();
    } else {
      const data = await res.json();
      setFout(data.error ?? "Er ging iets mis");
      setBezig(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* URL Import */}
      {!receptId && (
        <section className="bg-cream-100 border border-neutral-200 p-5">
          <h2 className="font-serif text-xl text-neutral-900 mb-1">
            Importeer van website
          </h2>
          <p className="text-xs text-neutral-400 mb-3">
            Plak een URL van een receptwebsite. Het recept wordt automatisch ingevuld.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://www.allerhande.nl/recept/..."
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={importBezig || !importUrl.trim()}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {importBezig ? "Importeren…" : "Importeer"}
            </button>
          </div>
          {importFout && (
            <p className="text-red-600 text-xs mt-2">{importFout}</p>
          )}
        </section>
      )}

      {/* Foto OCR Import */}
      {!receptId && (
        <section className="bg-cream-100 border border-neutral-200 p-5">
          <h2 className="font-serif text-xl text-neutral-900 mb-1">
            Importeer van foto
          </h2>
          <p className="text-xs text-neutral-400 mb-3">
            Upload een foto van een recept (kookboek, tijdschrift). De tekst wordt automatisch uitgelezen.
          </p>
          <FotoOcr onImport={handleOcrImport} />
        </section>
      )}

      {/* Basisinfo */}
      <section>
        <h2 className="font-serif text-xl text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
          Basisinfo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Titel *</label>
            <input
              type="text"
              value={formData.titel}
              onChange={(e) => setVeld("titel", e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Categorie *</label>
            <select
              value={formData.categorie}
              onChange={(e) => setVeld("categorie", e.target.value as Categorie)}
              className="input"
            >
              {Object.values(Categorie).map((cat) => (
                <option key={cat} value={cat}>
                  {categorieLabels[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Porties</label>
            <input
              type="number"
              min="1"
              value={formData.porties}
              onChange={(e) => setVeld("porties", e.target.value)}
              className="input"
              placeholder="4"
            />
          </div>
          <div>
            <label className="label">Bereidingstijd (minuten)</label>
            <input
              type="number"
              min="1"
              value={formData.bereidingstijd}
              onChange={(e) => setVeld("bereidingstijd", e.target.value)}
              className="input"
              placeholder="30"
            />
          </div>
          <div>
            <label className="label">Beoordeling (1–5 sterren)</label>
            <select
              value={formData.beoordeling}
              onChange={(e) => setVeld("beoordeling", e.target.value)}
              className="input"
            >
              <option value="">— geen beoordeling —</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)} ({n})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Bron / herkomst</label>
            <input
              type="text"
              value={formData.herkomstNaam}
              onChange={(e) => setVeld("herkomstNaam", e.target.value)}
              className="input"
              placeholder="Ottolenghi Simple"
            />
          </div>
          <div>
            <label className="label">URL (optioneel)</label>
            <input
              type="url"
              value={formData.herkomstUrl}
              onChange={(e) => setVeld("herkomstUrl", e.target.value)}
              className="input"
              placeholder="https://…"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Tags (kommagescheiden)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setVeld("tags", e.target.value)}
              className="input"
              placeholder="vegetarisch, makkelijk, snel"
            />
          </div>
        </div>
      </section>

      {/* Ingrediënten */}
      <section>
        <h2 className="font-serif text-xl text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
          Ingrediënten
        </h2>
        <div className="space-y-2">
          {formData.ingredienten.map((ing, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={ing.hoeveelheid}
                onChange={(e) => updateIngredient(i, "hoeveelheid", e.target.value)}
                className="input w-20 shrink-0"
                placeholder="200"
              />
              <input
                type="text"
                value={ing.eenheid}
                onChange={(e) => updateIngredient(i, "eenheid", e.target.value)}
                className="input w-20 shrink-0"
                placeholder="gram"
              />
              <input
                type="text"
                value={ing.naam}
                onChange={(e) => updateIngredient(i, "naam", e.target.value)}
                className="input flex-1"
                placeholder="knoflookteentjes"
                required
              />
              <input
                type="text"
                value={ing.notitie}
                onChange={(e) => updateIngredient(i, "notitie", e.target.value)}
                className="input flex-1"
                placeholder="fijngehakt (optioneel)"
              />
              <button
                type="button"
                onClick={() => verwijderIngredient(i)}
                className="text-neutral-300 hover:text-red-400 transition-colors mt-2 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={voegIngredientToe}
          className="mt-3 text-sm text-olive-700 hover:underline"
        >
          + Ingrediënt toevoegen
        </button>
      </section>

      {/* Stappen */}
      <section>
        <h2 className="font-serif text-xl text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
          Bereiding
        </h2>
        <div className="space-y-3">
          {formData.stappen.map((stap, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="font-serif text-2xl text-neutral-200 mt-1 w-6 shrink-0 text-center select-none">
                {i + 1}
              </span>
              <textarea
                value={stap.tekst}
                onChange={(e) => updateStap(i, e.target.value)}
                className="input flex-1 resize-none"
                rows={2}
                placeholder="Beschrijf deze stap…"
              />
              <div className="flex flex-col gap-1 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => verplaatsStap(i, -1)}
                  disabled={i === 0}
                  className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 text-xs"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => verplaatsStap(i, 1)}
                  disabled={i === formData.stappen.length - 1}
                  className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 text-xs"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => verwijderStap(i)}
                  className="text-neutral-300 hover:text-red-400 transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={voegStapToe}
          className="mt-3 text-sm text-olive-700 hover:underline"
        >
          + Stap toevoegen
        </button>
      </section>

      {/* Foto's */}
      <section>
        <h2 className="font-serif text-xl text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
          Foto&apos;s ({formData.fotos.length}/5)
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {formData.fotos.map((foto, i) => (
            <div key={i} className="relative aspect-square bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.url}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => verwijderFoto(i)}
                className="absolute top-1 right-1 bg-black/50 text-white w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {formData.fotos.length < 5 && (
          <label className="cursor-pointer">
            <span className={`btn-secondary inline-block ${uploadBezig ? "opacity-50" : ""}`}>
              {uploadBezig ? "Uploaden…" : "Foto uploaden"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFotoUpload}
              disabled={uploadBezig}
              className="sr-only"
            />
          </label>
        )}
      </section>

      {fout && <p className="text-red-600 text-sm">{fout}</p>}

      <div className="flex gap-3 pt-4 border-t border-neutral-100">
        <button type="submit" disabled={bezig} className="btn-primary disabled:opacity-50">
          {bezig ? "Opslaan…" : receptId ? "Wijzigingen opslaan" : "Recept toevoegen"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/recepten")}
          className="btn-secondary"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
