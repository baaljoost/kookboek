"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Categorie } from "@prisma/client";
import { categorieLabels } from "@/lib/categorieLabels";

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
  ingebrachtDoor: string;
  tags: string;
  benodigdheden: string;
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

// JSON-LD parse-hulpfuncties (client-side)
function parseIsoDurClient(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  return (parseInt(m[1] ?? "0") * 60 + parseInt(m[2] ?? "0")) || null;
}

function parsePortiesClient(w: unknown): number | null {
  if (!w) return null;
  const s = Array.isArray(w) ? String(w[0]) : String(w);
  const m = s.match(/\d+/);
  return m ? parseInt(m[0]) : null;
}

function parseIngredientClient(tekst: string): Ingredient {
  const notitieMatch = tekst.match(/^(.+?),\s*(.+)$/);
  const notitie = notitieMatch ? notitieMatch[2].trim() : "";
  const basis = notitieMatch ? notitieMatch[1].trim() : tekst.trim();
  const m = basis.match(
    /^([\d\s\u00BC\u00BD\u00BE\u2150-\u215E\/\.]+)\s*(ml|dl|cl|l|liter|gram|gr|g|kg|el|tl|eetlepel|theelepel|kopje|kop|stuks?|stuk|bosje|teen|teentje|snufje|scheut|handvol|plak|plakje|blik|zakje|pak|ons|oz|cup|cups|tbsp|tsp)?\s*(.*)/i
  );
  if (m) return { hoeveelheid: m[1].trim(), eenheid: m[2]?.trim() ?? "", naam: m[3].trim() || basis, notitie };
  return { hoeveelheid: "", eenheid: "", naam: basis, notitie };
}

function parseInstructiesClient(instructies: unknown): string[] {
  if (!instructies) return [];
  if (typeof instructies === "string")
    return instructies.split(/\n+/).map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim()).filter((s) => s.length > 10);
  if (!Array.isArray(instructies)) return [];
  const stappen: string[] = [];
  for (const item of instructies) {
    if (typeof item === "string") stappen.push(item.trim());
    else if (item?.["@type"] === "HowToStep" && item?.text) stappen.push(String(item.text).trim());
    else if (item?.["@type"] === "HowToSection" && Array.isArray(item?.itemListElement))
      for (const sub of item.itemListElement)
        if (sub?.text) stappen.push(String(sub.text).trim());
  }
  return stappen.filter(Boolean);
}

function vindReceptInJsonLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj["@type"] === "Recipe") return obj;
  if (Array.isArray(data)) return (data.find((i) => i?.["@type"] === "Recipe") as Record<string, unknown>) ?? null;
  if (Array.isArray(obj["@graph"]))
    return ((obj["@graph"] as unknown[]).find((i) => (i as Record<string, unknown>)?.["@type"] === "Recipe") as Record<string, unknown>) ?? null;
  return null;
}

export default function ReceptFormulier({ receptId, initieleWaarden }: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [importTab, setImportTab] = useState<"url" | "jsonld">("url");
  const [importUrl, setImportUrl] = useState("");
  const [importBezig, setImportBezig] = useState(false);
  const [importFout, setImportFout] = useState("");
  const [jsonLdTekst, setJsonLdTekst] = useState("");
  const [jsonLdFout, setJsonLdFout] = useState("");

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImportBezig(true);
    setImportFout("");

    // Probeer de pagina vanuit de browser te laden (omzeilt bot-detectie, werkt voor CSR-sites)
    let jsonLdStrings: string[] | null = null;
    let pageHtml: string | null = null;
    try {
      const pageRes = await fetch(importUrl.trim());
      if (pageRes.ok) {
        const rawHtml = await pageRes.text();
        pageHtml = rawHtml.slice(0, 300000);
        const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        const scripts: string[] = [];
        let m;
        while ((m = scriptRegex.exec(rawHtml)) !== null) {
          if (m[1]) scripts.push(m[1]);
        }
        jsonLdStrings = scripts;
      }
    } catch {
      // CORS of netwerkfout — server doet de fetch
    }

    const res = await fetch("/api/admin/importeer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: importUrl.trim(), jsonLdStrings, pageHtml }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Sla de mislukte URL op in de import-meldingen lijst
      fetch("/api/import-meldingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim(), bron: "admin" }),
      }).catch(() => {});

      setImportFout(data.error ?? "Importeren mislukt. De URL is opgeslagen onder Import-meldingen.");
      if (data.partialData) {
        const pd = data.partialData;
        setFormData((prev) => ({
          ...prev,
          titel: pd.titel || prev.titel,
          herkomstNaam: pd.herkomstNaam || prev.herkomstNaam,
          herkomstUrl: pd.herkomstUrl || prev.herkomstUrl,
          ingredienten: pd.ingredienten?.length ? pd.ingredienten : prev.ingredienten,
          stappen: pd.stappen?.length ? pd.stappen : prev.stappen,
          fotos: pd.fotoUrl
            ? [{ url: pd.fotoUrl, altTekst: pd.titel ?? "" }, ...prev.fotos].slice(0, 5)
            : prev.fotos,
        }));
      }
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
      categorie: data.categorie || prev.categorie,
      ingredienten: data.ingredienten?.length ? data.ingredienten : prev.ingredienten,
      stappen: data.stappen?.length ? data.stappen : prev.stappen,
      fotos: data.fotoUrl
        ? [{ url: data.fotoUrl, altTekst: data.titel ?? "" }, ...prev.fotos].slice(0, 5)
        : prev.fotos,
    }));

    setImportBezig(false);
  }

  function handleJsonLdImport() {
    setJsonLdFout("");
    if (!jsonLdTekst.trim()) return;
    try {
      const cleaned = jsonLdTekst.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, " ");
      const data = JSON.parse(cleaned);
      const recept = vindReceptInJsonLd(data);
      if (!recept) {
        setJsonLdFout("Geen Recipe-object gevonden. Zorg dat de JSON-LD @type: \"Recipe\" bevat.");
        return;
      }

      let bereidingstijd: number | null = null;
      if (typeof recept.totalTime === "string") {
        bereidingstijd = parseIsoDurClient(recept.totalTime);
      } else if (recept.cookTime || recept.prepTime) {
        const cook = typeof recept.cookTime === "string" ? parseIsoDurClient(recept.cookTime) ?? 0 : 0;
        const prep = typeof recept.prepTime === "string" ? parseIsoDurClient(recept.prepTime) ?? 0 : 0;
        bereidingstijd = cook + prep || null;
      }

      const ingredienten = Array.isArray(recept.recipeIngredient)
        ? recept.recipeIngredient.map((i) => parseIngredientClient(String(i)))
        : [];
      const stappen = parseInstructiesClient(recept.recipeInstructions);

      let fotoUrl = "";
      if (typeof recept.image === "string") fotoUrl = recept.image;
      else if (Array.isArray(recept.image) && recept.image[0])
        fotoUrl = typeof recept.image[0] === "string" ? recept.image[0] : (recept.image[0] as Record<string, string>)?.url ?? "";
      else if (recept.image && typeof recept.image === "object")
        fotoUrl = (recept.image as Record<string, string>)?.url ?? "";

      setFormData((prev) => ({
        ...prev,
        titel: String(recept.name || "") || prev.titel,
        porties: parsePortiesClient(recept.recipeYield) ? String(parsePortiesClient(recept.recipeYield)) : prev.porties,
        bereidingstijd: bereidingstijd ? String(bereidingstijd) : prev.bereidingstijd,
        ingredienten: ingredienten.length ? ingredienten : prev.ingredienten,
        stappen: stappen.length ? stappen.map((tekst) => ({ tekst })) : prev.stappen,
        fotos: fotoUrl ? [{ url: fotoUrl, altTekst: String(recept.name || "") }, ...prev.fotos].slice(0, 5) : prev.fotos,
      }));

      setJsonLdTekst("");
      setImportTab("url");
    } catch {
      setJsonLdFout("Ongeldige JSON. Controleer het formaat en probeer opnieuw.");
    }
  }

  const [formData, setFormData] = useState<FormData>({
    titel: initieleWaarden?.titel ?? "",
    categorie: initieleWaarden?.categorie ?? Categorie.PASTA,
    porties: initieleWaarden?.porties ?? "",
    bereidingstijd: initieleWaarden?.bereidingstijd ?? "",
    beoordeling: initieleWaarden?.beoordeling ?? "",
    herkomstNaam: initieleWaarden?.herkomstNaam ?? "",
    herkomstUrl: initieleWaarden?.herkomstUrl ?? "",
    ingebrachtDoor: initieleWaarden?.ingebrachtDoor ?? "",
    tags: initieleWaarden?.tags ?? "",
    benodigdheden: initieleWaarden?.benodigdheden ?? "",
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
      ingebrachtDoor: formData.ingebrachtDoor.trim() || null,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      benodigdheden: formData.benodigdheden
        .split(",")
        .map((s) => s.trim())
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
      {/* Import */}
      {!receptId && (
        <section className="bg-cream-100 border border-neutral-200 p-5">
          <div className="flex gap-4 mb-4 border-b border-neutral-200 -mx-5 px-5">
            <button
              type="button"
              onClick={() => setImportTab("url")}
              className={`text-sm pb-2 border-b-2 transition-colors ${importTab === "url" ? "border-olive-700 text-neutral-900 font-medium" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}
            >
              Importeer van website
            </button>
            <button
              type="button"
              onClick={() => setImportTab("jsonld")}
              className={`text-sm pb-2 border-b-2 transition-colors ${importTab === "jsonld" ? "border-olive-700 text-neutral-900 font-medium" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}
            >
              JSON-LD plakken
            </button>
          </div>

          {importTab === "url" && (
            <>
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
            </>
          )}

          {importTab === "jsonld" && (
            <>
              <p className="text-xs text-neutral-400 mb-3">
                Plak een JSON-LD object van een recept (bijv. gekopieerd van ChatGPT of uit de paginabron).
              </p>
              <textarea
                value={jsonLdTekst}
                onChange={(e) => setJsonLdTekst(e.target.value)}
                placeholder={'{\n  "@type": "Recipe",\n  "name": "...",\n  "recipeIngredient": [...],\n  ...\n}'}
                className="input w-full font-mono text-xs resize-y"
                rows={8}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleJsonLdImport}
                  disabled={!jsonLdTekst.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  Verwerk JSON-LD
                </button>
              </div>
              {jsonLdFout && (
                <p className="text-red-600 text-xs mt-2">{jsonLdFout}</p>
              )}
            </>
          )}
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
            <label className="label">Ingebracht door</label>
            <input
              type="text"
              value={formData.ingebrachtDoor}
              onChange={(e) => setVeld("ingebrachtDoor", e.target.value)}
              className="input"
              placeholder="naam van inbrenger (leeg = jij)"
            />
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
          <div className="md:col-span-2">
            <label className="label">Benodigdheden (kommagescheiden, optioneel)</label>
            <input
              type="text"
              value={formData.benodigdheden}
              onChange={(e) => setVeld("benodigdheden", e.target.value)}
              className="input"
              placeholder="snelkookpan, keukenmixer, springvorm"
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

      {/* Foto's (alleen tonen als er al foto's zijn via import) */}
      {formData.fotos.length > 0 && (
        <section>
          <h2 className="font-serif text-xl text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
            Foto&apos;s ({formData.fotos.length})
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {formData.fotos.map((foto, i) => (
              <div key={i} className="relative aspect-square bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url} alt="" className="w-full h-full object-cover" />
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
        </section>
      )}

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
