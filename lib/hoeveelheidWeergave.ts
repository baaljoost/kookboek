// Toont een hoeveelheid op de receptpagina. Rekenen gebeurt met het getal;
// pas hier wordt er een nette breuk of één decimaal van gemaakt.

const BREUKEN: [number, string][] = [
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

const MARGE = 0.02;

function metKomma(waarde: number): string {
  return String(waarde).replace(".", ",");
}

// 0.25 → "¼", 1.5 → "1½", 2.333 → "2⅓", 0.3 → "0,3", 354.75 → "354,8", 3 → "3".
export function formatHoeveelheid(waarde: number): string {
  if (!Number.isFinite(waarde)) return "";

  const heel = Math.round(waarde);
  if (heel > 0 && Math.abs(waarde - heel) < MARGE) return String(heel);

  // Breuken alleen bij kleine getallen: "354¾ ml" leest niet.
  if (waarde > 0 && waarde < 10) {
    const onder = Math.floor(waarde);
    const rest = waarde - onder;
    for (const [breuk, teken] of BREUKEN) {
      if (Math.abs(rest - breuk) < MARGE) return onder > 0 ? `${onder}${teken}` : teken;
    }
  }

  const eenDecimaal = Math.round(waarde * 10) / 10;
  if (eenDecimaal === 0 && waarde !== 0) return metKomma(Math.round(waarde * 100) / 100);
  return metKomma(eenDecimaal);
}
