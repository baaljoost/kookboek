// Standaard kookboek URL – pas aan via instellingen
const STANDAARD_URL = "https://kookboek-baaljoosts-projects.vercel.app";

let receptData = null;
let kookboekUrl = STANDAARD_URL;

// DOM-elementen
const statusLaden = document.getElementById("status-laden");
const statusFout = document.getElementById("status-fout");
const statusSucces = document.getElementById("status-succes");
const preview = document.getElementById("preview");
const previewTitel = document.getElementById("preview-titel");
const previewMeta = document.getElementById("preview-meta");
const previewIngredienten = document.getElementById("preview-ingredienten");
const meerIngredienten = document.getElementById("meer-ingredienten");
const fotoPreview = document.getElementById("foto-preview");
const btnOpslaan = document.getElementById("btn-opslaan");
const btnAnnuleer = document.getElementById("btn-annuleer");
const toggleInstellingen = document.getElementById("toggle-instellingen");
const instellingenPanel = document.getElementById("instellingen-panel");
const inputUrl = document.getElementById("input-url");
const opslaanUrl = document.getElementById("opslaan-url");

// Laad opgeslagen URL
chrome.storage.local.get(["kookboekUrl"], (result) => {
  kookboekUrl = result.kookboekUrl || STANDAARD_URL;
  inputUrl.value = kookboekUrl;
  start();
});

function toonLaden() {
  statusLaden.style.display = "flex";
  statusFout.style.display = "none";
  statusSucces.style.display = "none";
  preview.style.display = "none";
}

function toonFout(bericht) {
  statusLaden.style.display = "none";
  statusFout.style.display = "block";
  statusFout.textContent = bericht;
  preview.style.display = "none";
}

function toonPreview(data) {
  statusLaden.style.display = "none";
  statusFout.style.display = "none";
  preview.style.display = "block";
  receptData = data;

  // Titel
  previewTitel.textContent = data.titel || "(geen titel)";

  // Meta chips
  previewMeta.innerHTML = "";
  if (data.bereidingstijd) {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    chip.textContent = `${data.bereidingstijd} min`;
    previewMeta.appendChild(chip);
  }
  if (data.porties) {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    chip.textContent = `${data.porties} porties`;
    previewMeta.appendChild(chip);
  }

  // Foto
  if (data.fotoUrl) {
    fotoPreview.src = data.fotoUrl;
    fotoPreview.style.display = "block";
    fotoPreview.onerror = () => { fotoPreview.style.display = "none"; };
  } else {
    fotoPreview.style.display = "none";
  }

  // Ingrediënten
  const ingredienten = data.ingredienten || [];
  if (ingredienten.length > 0) {
    previewIngredienten.innerHTML = ingredienten
      .map((ing) => {
        const hoeveelheid = ing.hoeveelheid
          ? `<strong>${ing.hoeveelheid}${ing.eenheid ? " " + ing.eenheid : ""}</strong> `
          : "";
        const notitie = ing.notitie ? `, <em>${ing.notitie}</em>` : "";
        return `<div>${hoeveelheid}${ing.naam}${notitie}</div>`;
      })
      .join("");

    if (ingredienten.length > 4) {
      previewIngredienten.classList.add("ingeklapt");
      meerIngredienten.style.display = "block";
      meerIngredienten.textContent = `Toon alle ${ingredienten.length} ingrediënten`;
    } else {
      previewIngredienten.classList.remove("ingeklapt");
      meerIngredienten.style.display = "none";
    }
  } else {
    previewIngredienten.textContent = "(geen ingrediënten gevonden)";
    meerIngredienten.style.display = "none";
  }
}

function toonSucces(receptUrl) {
  statusLaden.style.display = "none";
  statusFout.style.display = "none";
  preview.style.display = "none";
  statusSucces.style.display = "block";
  statusSucces.innerHTML = receptData
    ? `✓ "${receptData.titel}" opgeslagen! <a href="${receptUrl}" target="_blank">Bekijk recept →</a>`
    : `✓ Recept opgeslagen!`;
}

// Haal huidige tab-URL op en importeer recept
async function start() {
  toonLaden();

  let tabUrl;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabUrl = tab?.url;
  } catch {
    toonFout("Kon de pagina-URL niet ophalen.");
    return;
  }

  if (!tabUrl || (!tabUrl.startsWith("http://") && !tabUrl.startsWith("https://"))) {
    toonFout("Open een receptenpagina in je browser om te importeren.");
    return;
  }

  // Roep de importeer API aan
  try {
    const res = await fetch(`${kookboekUrl}/api/admin/importeer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tabUrl }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toonFout(data.error || `Fout bij importeren (${res.status}).`);
      return;
    }

    const data = await res.json();
    toonPreview(data);
  } catch (err) {
    toonFout(
      `Kan het kookboek niet bereiken.\n\nURL: ${kookboekUrl}\n\nControleer de instellingen of je internetverbinding.`
    );
  }
}

// Opslaan in kookboek
btnOpslaan.addEventListener("click", async () => {
  if (!receptData) return;
  btnOpslaan.disabled = true;
  btnOpslaan.textContent = "Opslaan…";

  try {
    // Maak het recept aan
    const res = await fetch(`${kookboekUrl}/api/admin/recepten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titel: receptData.titel,
        porties: receptData.porties,
        bereidingstijd: receptData.bereidingstijd,
        beoordeling: null,
        herkomstUrl: receptData.herkomstUrl,
        herkomstNaam: receptData.herkomstNaam,
        ingredienten: receptData.ingredienten,
        stappen: receptData.stappen,
        fotos: [],
        tags: [],
        categorie: receptData.categorie || "OVERIG",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toonFout(data.error || `Opslaan mislukt (${res.status}).`);
      btnOpslaan.disabled = false;
      btnOpslaan.textContent = "Opslaan in kookboek";
      return;
    }

    const nieuwRecept = await res.json();
    const slug = nieuwRecept.slug;

    // Voeg foto toe als die beschikbaar is
    if (receptData.fotoUrl && slug) {
      try {
        await fetch(`${kookboekUrl}/api/admin/recepten/${nieuwRecept.id}/fotos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: receptData.fotoUrl,
            altTekst: receptData.titel,
          }),
        });
      } catch {
        // Foto toevoegen mislukt, maar recept is al opgeslagen – geen probleem
      }
    }

    toonSucces(slug ? `${kookboekUrl}/recepten/${slug}` : kookboekUrl);
  } catch {
    toonFout("Opslaan mislukt. Probeer het opnieuw.");
    btnOpslaan.disabled = false;
    btnOpslaan.textContent = "Opslaan in kookboek";
  }
});

// Annuleer
btnAnnuleer.addEventListener("click", () => {
  window.close();
});

// Toon alle ingrediënten
let ingeklapt = true;
meerIngredienten.addEventListener("click", () => {
  ingeklapt = !ingeklapt;
  if (ingeklapt) {
    previewIngredienten.classList.add("ingeklapt");
    meerIngredienten.textContent = `Toon alle ${(receptData?.ingredienten || []).length} ingrediënten`;
  } else {
    previewIngredienten.classList.remove("ingeklapt");
    meerIngredienten.textContent = "Inklappen";
  }
});

// Instellingen panel
toggleInstellingen.addEventListener("click", () => {
  const open = instellingenPanel.style.display === "block";
  instellingenPanel.style.display = open ? "none" : "block";
  toggleInstellingen.textContent = open ? "⚙ instellingen" : "✕ instellingen";
});

opslaanUrl.addEventListener("click", () => {
  const url = inputUrl.value.trim().replace(/\/$/, "");
  if (!url) return;
  kookboekUrl = url;
  chrome.storage.local.set({ kookboekUrl: url }, () => {
    opslaanUrl.textContent = "Opgeslagen ✓";
    setTimeout(() => {
      opslaanUrl.textContent = "Opslaan";
      instellingenPanel.style.display = "none";
      toggleInstellingen.textContent = "⚙ instellingen";
      // Herlaad de preview met nieuwe URL
      start();
    }, 1000);
  });
});
