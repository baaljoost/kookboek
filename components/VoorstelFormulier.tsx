"use client";

import { useState } from "react";
import { Categorie } from "@prisma/client";
import { categorieLabels } from "@/lib/categorieLabels";
import VoorstellenPopup from "@/components/VoorstellenPopup";

interface Ingredient {
  hoeveelheid: string;
  eenheid: string;
  naam: string;
  notitie: string;
}

interface Stap {
  tekst: string;
}

interface FormData {
  titel: string;
  categorie: Categorie;
  porties: string;
  bereidingstijd: string;
  herkomstNaam: string;
  herkomstUrl: string;
  fotoUrl: string;
  ingredienten: Ingredient[];
  stappen: Stap[];
}

const leegIngredient = (): Ingredient => ({
  hoeveelheid: "",
  eenheid: "",
  naam: "",
  notitie: "",
});

const legeStap = (): Stap => ({ tekst: "" });

export default function VoorstelFormulier() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [receptData, setReceptData] = useState<object | null>(null);
  const [fout, setFout] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importBezig, setImportBezig] = useState(false);
  const [importFout, setImportFout] = useState("");
  const [fotoBezig, setFotoBezig] = useState(false);
  const [fotoFout, setFotoFout] = useState("");
  const [basisInfoOpen, setBasisInfoOpen] = useState(false);

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
      fotoUrl: data.fotoUrl || prev.fotoUrl,
      ingredienten: data.ingredienten?.length ? data.ingredienten : prev.ingredienten,
      stappen: data.stappen?.length ? data.stappen : prev.stappen,
    }));

    setImportBezig(false);
    setBasisInfoOpen(true);
  }

  const [formData, setFormData] = useState<FormData>({
    titel: "",
    categorie: Categorie.PASTA,
    porties: "",
    bereidingstijd: "",
    herkomstNaam: "",
    herkomstUrl: "",
    fotoUrl: "",
    ingredienten: [leegIngredient()],
    stappen: [legeStap()],
  });

  async function handleFotoUpload(bestand: File) {
    setFotoBezig(true);
    setFotoFout("");
    const fd = new FormData();
    fd.append("bestand", bestand);
    const res = await fetch("/api/recepten/voorstellen/foto", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const { url } = await res.json();
      setVeld("fotoUrl", url);
    } else {
      setFotoFout("Foto uploaden mislukt");
    }
    setFotoBezig(false);
  }

  function setVeld<K extends keyof FormData>(veld: K, waarde: FormData[K]) {
    setFormData((prev) => ({ ...prev, [veld]: waarde }));
  }

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

  function updateStap(i: number, tekst: string) {
    const nieuw = [...formData.stappen];
    nieuw[i] = { tekst };
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFout("");

    const geldigeIngredienten = formData.ingredienten.filter((ing) => ing.naam.trim());
    const geldigeStappen = formData.stappen.filter((s) => s.tekst.trim());

    if (geldigeIngredienten.length === 0) {
      setFout("Voeg minimaal één ingrediënt toe.");
      return;
    }
    if (geldigeStappen.length === 0) {
      setFout("Voeg minimaal één bereidingsstap toe.");
      return;
    }

    const payload = {
      ...formData,
      porties: formData.porties ? parseInt(formData.porties) : null,
      bereidingstijd: formData.bereidingstijd ? parseInt(formData.bereidingstijd) : null,
      ingredienten: geldigeIngredienten,
      stappen: geldigeStappen,
    };

    setReceptData(payload);
    setPopupOpen(true);
  }

  return (
    <>
      <form id="voorstel-form" onSubmit={handleSubmit} className="space-y-10">
        {/* URL Import */}
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

        {/* Basisinfo — inklapbaar */}
        <section>
          <button
            type="button"
            onClick={() => setBasisInfoOpen((v) => !v)}
            className="w-full flex items-center justify-between pb-2 border-b border-neutral-100 group"
          >
            <h2 className="font-serif text-xl text-neutral-900">
              Recept beschrijven
            </h2>
            <span className={`text-neutral-400 text-sm transition-transform duration-200 ${basisInfoOpen ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {basisInfoOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                <label className="label">Bron / herkomst</label>
                <input
                  type="text"
                  value={formData.herkomstNaam}
                  onChange={(e) => setVeld("herkomstNaam", e.target.value)}
                  className="input"
                  placeholder="Bijv. kookboek of website"
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
            </div>
          )}
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

        {/* Foto */}
        <section>
          <h2 className="font-serif text-xl text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
            Foto (optioneel)
          </h2>
          {formData.fotoUrl ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.fotoUrl}
                alt="Recept foto"
                className="w-32 h-32 object-cover bg-neutral-100"
              />
              <button
                type="button"
                onClick={() => setVeld("fotoUrl", "")}
                className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          ) : (
            <div>
              <label className="flex flex-col items-start gap-2 cursor-pointer">
                <span className="text-xs text-neutral-400">
                  Voeg een foto toe van het gerecht
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const bestand = e.target.files?.[0];
                    if (bestand) handleFotoUpload(bestand);
                  }}
                />
                <span className="btn-secondary text-xs">
                  {fotoBezig ? "Uploaden…" : "Foto kiezen"}
                </span>
              </label>
              {fotoFout && <p className="text-red-600 text-xs mt-2">{fotoFout}</p>}
            </div>
          )}
        </section>

        {fout && <p className="text-red-600 text-sm">{fout}</p>}

        {/* Ruimte zodat de sticky knop de content niet overlapt */}
        <div className="h-20" />
      </form>

      {/* Sticky floating knop */}
      <div className="fixed bottom-6 right-6 z-40">
        {fout && (
          <p className="text-red-600 text-xs mb-2 text-right bg-white px-3 py-1 shadow">
            {fout}
          </p>
        )}
        <button
          type="submit"
          form="voorstel-form"
          className="bg-olive-700 text-white px-5 py-3 shadow-lg hover:bg-olive-800 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <span className="text-lg leading-none">→</span>
          Doorgaan
        </button>
      </div>

      {popupOpen && receptData && (
        <VoorstellenPopup
          receptData={receptData}
          onSluiten={() => setPopupOpen(false)}
        />
      )}
    </>
  );
}
