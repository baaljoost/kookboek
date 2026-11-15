// Vaste lijst winkelafdelingen, in de volgorde waarin je door de winkel loopt.
// In de database staat de `code` (Product.afdeling).

export interface Afdeling {
  code: string;
  label: string;
}

export const AFDELINGEN: Afdeling[] = [
  { code: "groente-fruit", label: "Groente & fruit" },
  { code: "brood", label: "Brood & bakkerij" },
  { code: "vlees-vis", label: "Vlees & vis" },
  { code: "vega", label: "Vegetarisch & vegan" },
  { code: "zuivel", label: "Zuivel & eieren" },
  { code: "kaas", label: "Kaas" },
  { code: "pasta-rijst", label: "Pasta, rijst & granen" },
  { code: "conserven", label: "Conserven & potten" },
  { code: "wereldkeuken", label: "Wereldkeuken" },
  { code: "kruiden", label: "Kruiden & specerijen" },
  { code: "olie-sauzen", label: "Olie, azijn & sauzen" },
  { code: "bakken", label: "Bakproducten" },
  { code: "noten", label: "Noten, zaden & gedroogd fruit" },
  { code: "ontbijt", label: "Ontbijt & beleg" },
  { code: "diepvries", label: "Diepvries" },
  { code: "dranken", label: "Dranken" },
  { code: "overig", label: "Overig" },
];

const labels = new Map(AFDELINGEN.map((a) => [a.code, a.label]));

export function isAfdelingCode(waarde: unknown): waarde is string {
  return typeof waarde === "string" && labels.has(waarde);
}

export function afdelingLabel(code: string): string {
  return labels.get(code) ?? code;
}
