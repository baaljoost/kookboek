// Haalt per bron-URL uit export.json de pagina één keer op en bewaart de
// originele ingrediëntregels in data/omzetting/bronnen.json.
// Gebruikt de database niet. Al opgehaalde pagina's worden overgeslagen;
// met --opnieuw worden mislukte pagina's nog een keer geprobeerd.
//
//   npx tsx scripts/ingredienten/bronnen-ophalen.ts [--opnieuw]

import { existsSync, readFileSync } from "node:fs";
import { vindReceptRegels } from "./bron";
import { draai, leesJson, schrijfJson, uitvoerPad, vlag } from "./gedeeld";
import type { BronBestand, BronPagina, ExportBestand } from "./soorten";

const PAUZE_MS = 1500;

async function haalOp(url: string): Promise<BronPagina> {
  const opgehaaldOp = new Date().toISOString();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.7",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { opgehaaldOp, status: "fout", melding: `HTTP ${res.status}`, regels: [] };
    const regels = vindReceptRegels(await res.text());
    if (!regels?.length) return { opgehaaldOp, status: "geen-recept", melding: "geen JSON-LD-recept op de pagina", regels: [] };
    return { opgehaaldOp, status: "ok", regels };
  } catch (fout) {
    return { opgehaaldOp, status: "fout", melding: fout instanceof Error ? fout.message : String(fout), regels: [] };
  }
}

draai(async () => {
  const exportBestand = leesJson<ExportBestand>(uitvoerPad("export.json"), "Draai eerst exporteer.ts.");
  const pad = uitvoerPad("bronnen.json");
  const bronnen: BronBestand = existsSync(pad) ? JSON.parse(readFileSync(pad, "utf8")) : {};
  const opnieuw = vlag("opnieuw");

  // Alleen recepten met regels die nog niet zijn omgezet
  const urls = [
    ...new Set(
      exportBestand.recepten
        .filter((r) => r.herkomstUrl && /^https?:\/\//i.test(r.herkomstUrl) && r.ingredienten.some((i) => i.herstel))
        .map((r) => r.herkomstUrl as string)
    ),
  ];
  const teDoen = urls.filter((url) => !bronnen[url] || (opnieuw && bronnen[url].status === "fout"));
  console.log(`${urls.length} bron-URL's, ${urls.length - teDoen.length} al opgehaald, ${teDoen.length} te doen\n`);

  for (const [i, url] of teDoen.entries()) {
    const pagina = await haalOp(url);
    bronnen[url] = pagina;
    schrijfJson(pad, bronnen); // na elke pagina, zodat afbreken niets kost
    const uitkomst = pagina.status === "ok" ? `${pagina.regels.length} regels` : `${pagina.status}: ${pagina.melding}`;
    console.log(`  [${i + 1}/${teDoen.length}] ${uitkomst.padEnd(40)} ${url.slice(0, 80)}`);
    if (i < teDoen.length - 1) await new Promise((klaar) => setTimeout(klaar, PAUZE_MS));
  }

  const telling = { ok: 0, "geen-recept": 0, fout: 0 };
  for (const url of urls) if (bronnen[url]) telling[bronnen[url].status]++;
  console.log(`\nMet bronregels: ${telling.ok} · zonder recept op de pagina: ${telling["geen-recept"]} · mislukt: ${telling.fout}`);
  console.log(`Bronregels staan in ${pad}`);
  console.log("Recepten zonder bronregels worden alleen op de database beoordeeld.");
});
