// Getekende sessietoken voor de beheerlogin.
//
// Een token is `<verloop in ms>.<handtekening>`. De handtekening is een
// HMAC-SHA256 over het verloop, met een geheim dat alleen de server kent
// (SESSION_SECRET). Zonder dat geheim kan niemand een geldig token maken.
// Web Crypto, dus dit werkt in de middleware én in routes en tests.

export const SESSIE_DUUR_MS = 30 * 24 * 60 * 60 * 1000; // 30 dagen
const MIN_GEHEIM_LENGTE = 32;
const CONTEXT = "kookboek-sessie";

const encoder = new TextEncoder();

export function leesGeheim(): string {
  const geheim = process.env.SESSION_SECRET;
  if (!geheim || geheim.length < MIN_GEHEIM_LENGTE) {
    throw new Error(`SESSION_SECRET ontbreekt of is korter dan ${MIN_GEHEIM_LENGTE} tekens`);
  }
  return geheim;
}

function naarBase64Url(bytes: Uint8Array): string {
  let tekst = "";
  for (const b of bytes) tekst += String.fromCharCode(b);
  return btoa(tekst).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function vanBase64Url(tekst: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(tekst)) return null;
  const standaard = tekst.replace(/-/g, "+").replace(/_/g, "/");
  const opgevuld = standaard + "=".repeat((4 - (standaard.length % 4)) % 4);
  try {
    const binair = atob(opgevuld);
    return Uint8Array.from(binair, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sleutel(geheim: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(geheim) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bericht(verloop: string): BufferSource {
  return encoder.encode(`${CONTEXT}.${verloop}`) as BufferSource;
}

export async function maakSessieToken(
  geheim: string = leesGeheim(),
  nu: number = Date.now()
): Promise<string> {
  const verloop = String(nu + SESSIE_DUUR_MS);
  const handtekening = await crypto.subtle.sign("HMAC", await sleutel(geheim), bericht(verloop));
  return `${verloop}.${naarBase64Url(new Uint8Array(handtekening))}`;
}

// Geeft false bij alles wat niet klopt: leeg, verkeerde vorm, aangepast,
// ander geheim, verlopen of een ontbrekend geheim. Gooit nooit.
export async function controleerSessieToken(
  token: string | undefined | null,
  geheim?: string,
  nu: number = Date.now()
): Promise<boolean> {
  if (!token) return false;
  try {
    const sleutelTekst = geheim ?? leesGeheim();
    const delen = token.split(".");
    if (delen.length !== 2) return false;
    const [verloop, handtekeningTekst] = delen;
    if (!/^\d{1,16}$/.test(verloop)) return false;
    const handtekening = vanBase64Url(handtekeningTekst);
    if (!handtekening) return false;
    // verify vergelijkt in constante tijd
    const geldig = await crypto.subtle.verify(
      "HMAC",
      await sleutel(sleutelTekst),
      handtekening as BufferSource,
      bericht(verloop)
    );
    return geldig && Number(verloop) > nu;
  } catch {
    return false;
  }
}
