// Het adres waar je na inloggen naartoe gaat: /admin/login?terug=/recepten/...
// Alleen interne paden zijn toegestaan; alles wat naar een andere site kan
// wijzen valt terug op de standaard.

export const STANDAARD_TERUG = "/admin/recepten";

const NEP_HERKOMST = "http://intern.invalid";

export function veiligTerugAdres(waarde: unknown, standaard: string = STANDAARD_TERUG): string {
  if (typeof waarde !== "string" || !waarde.startsWith("/")) return standaard;
  // Laat de URL-parser beslissen: die behandelt "\", tabs en "//" zoals een
  // browser. Landt het adres op een andere herkomst, dan was het niet intern.
  let url: URL;
  try {
    url = new URL(waarde, NEP_HERKOMST);
  } catch {
    return standaard;
  }
  if (url.origin !== NEP_HERKOMST) return standaard;
  const pad = url.pathname + url.search + url.hash;
  // Niet terug naar de loginpagina zelf, en API-routes zijn geen pagina's
  if (url.pathname === "/admin/login" || url.pathname.startsWith("/api/")) return standaard;
  return pad;
}

// De link naar de loginpagina die na inloggen terugkeert naar `pad`.
export function loginLink(pad: string): string {
  return `/admin/login?terug=${encodeURIComponent(pad)}`;
}
