// Gedeelde hulpfuncties voor de omzetscripts: databaseverbinding, vlaggen
// en bestanden in data/omzetting/.

import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ProductDefinitie } from "../../lib/productLijst";
import { valideerProductLijst } from "../../lib/productLijst";

export const UITVOER_MAP = join(process.cwd(), "data", "omzetting");

export function uitvoerPad(naam: string): string {
  mkdirSync(UITVOER_MAP, { recursive: true });
  return join(UITVOER_MAP, naam);
}

// --- vlaggen ---------------------------------------------------------------

export function vlag(naam: string): boolean {
  return process.argv.slice(2).includes(`--${naam}`);
}

// "--naam=waarde" of "--naam waarde"
export function optie(naam: string): string | null {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith(`--${naam}=`)) return args[i].slice(naam.length + 3);
    if (args[i] === `--${naam}` && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1];
  }
  return null;
}

export function stop(bericht: string): never {
  console.error(`\nGestopt: ${bericht}`);
  process.exit(1);
}

// --- database --------------------------------------------------------------

export interface Database {
  prisma: PrismaClient;
  host: string;
}

// Maakt verbinding en meldt met welke database. De URL komt uit .env, net
// als bij Prisma zelf; het wachtwoord wordt nooit getoond.
export function verbind(): Database {
  try {
    process.loadEnvFile(join(process.cwd(), ".env"));
  } catch {
    // geen .env: dan moeten de variabelen al in de omgeving staan
  }
  const url = process.env.POSTGRES_PRISMA_URL;
  if (!url) stop("POSTGRES_PRISMA_URL ontbreekt (in .env of in de omgeving).");
  let host: string;
  let naam: string;
  try {
    const delen = new URL(url);
    host = delen.hostname;
    naam = delen.pathname.replace(/^\//, "");
  } catch {
    stop("POSTGRES_PRISMA_URL is geen geldige URL.");
  }
  console.log(`Database: ${host} (${naam})`);
  // Expliciet dezelfde URL meegeven, zodat de gemelde host ook echt de
  // database is waarmee het script praat.
  return { prisma: new PrismaClient({ datasourceUrl: url }), host };
}

// Schrijven mag alleen met --uitvoeren én --host=<de gemelde host>.
// Zonder --uitvoeren is het een proefrun.
export function magSchrijven(db: Database): boolean {
  if (!vlag("uitvoeren")) return false;
  const opgegeven = optie("host");
  if (!opgegeven) stop(`--uitvoeren vereist ook --host=<database-host>. Deze verbinding is met: ${db.host}`);
  if (opgegeven !== db.host) {
    stop(`--host=${opgegeven} komt niet overeen met de verbonden database (${db.host}). Er is niets geschreven.`);
  }
  return true;
}

// --- bestanden -------------------------------------------------------------

// JSON kent geen NaN; die wordt als "NaN" bewaard (zie soorten.ts).
export function schrijfJson(pad: string, data: unknown): void {
  const tekst = JSON.stringify(data, (_sleutel, waarde) => (typeof waarde === "number" && Number.isNaN(waarde) ? "NaN" : waarde), 2);
  writeFileSync(pad, tekst + "\n");
}

export function leesJson<T>(pad: string, uitleg: string): T {
  if (!existsSync(pad)) stop(`${pad} bestaat niet. ${uitleg}`);
  return JSON.parse(readFileSync(pad, "utf8")) as T;
}

export function leesProductLijst(): ProductDefinitie[] {
  const lijst = leesJson<ProductDefinitie[]>(join(process.cwd(), "data", "producten.json"), "");
  const fouten = valideerProductLijst(lijst);
  if (fouten.length) stop(`data/producten.json klopt niet:\n  ${fouten.join("\n  ")}`);
  return lijst;
}

export function tijdstempel(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}

// Draai een script en sluit de verbinding netjes af.
export function draai(hoofd: () => Promise<void>, db?: Database): void {
  hoofd()
    .catch((fout) => {
      console.error(fout);
      process.exitCode = 1;
    })
    .finally(() => db?.prisma.$disconnect());
}
