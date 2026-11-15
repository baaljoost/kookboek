// CSV schrijven en lezen voor controle.csv.
// Schrijven: komma als scheidingsteken, aanhalingstekens waar nodig.
// Lezen: ook puntkomma (Excel), een BOM en Windows-regeleinden.

function veld(waarde: string): string {
  return /[",;\n\r]/.test(waarde) || waarde !== waarde.trim() ? `"${waarde.replace(/"/g, '""')}"` : waarde;
}

export function naarCsv(rijen: string[][]): string {
  return rijen.map((rij) => rij.map(veld).join(",")).join("\n") + "\n";
}

export function leesCsv(tekst: string): string[][] {
  const inhoud = tekst.replace(/^﻿/, "");
  const eersteRegel = inhoud.split(/\r?\n/, 1)[0] ?? "";
  const scheiding = eersteRegel.split(";").length > eersteRegel.split(",").length ? ";" : ",";

  const rijen: string[][] = [];
  let rij: string[] = [];
  let huidig = "";
  let inAanhaling = false;

  for (let i = 0; i < inhoud.length; i++) {
    const c = inhoud[i];
    if (inAanhaling) {
      if (c === '"' && inhoud[i + 1] === '"') {
        huidig += '"';
        i++;
      } else if (c === '"') {
        inAanhaling = false;
      } else {
        huidig += c;
      }
    } else if (c === '"' && huidig === "") {
      inAanhaling = true;
    } else if (c === scheiding) {
      rij.push(huidig);
      huidig = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && inhoud[i + 1] === "\n") i++;
      rij.push(huidig);
      huidig = "";
      rijen.push(rij);
      rij = [];
    } else {
      huidig += c;
    }
  }
  if (huidig !== "" || rij.length > 0) {
    rij.push(huidig);
    rijen.push(rij);
  }
  // Lege regels overslaan
  return rijen.filter((r) => r.some((v) => v.trim() !== ""));
}
