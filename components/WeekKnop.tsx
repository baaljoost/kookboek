import Link from "next/link";

// Basisstijl van de zwevende knop rechtsonder. De overzichtspagina gebruikt
// dezelfde stijl ook voor de knop voor bezoekers.
export const ZWEVENDE_KNOP_KLASSE =
  "fixed bottom-6 right-6 bg-olive-700 text-white px-5 py-3 shadow-lg hover:bg-olive-800 transition-colors text-sm font-medium flex items-center gap-2 z-50";

// "Deze week · <aantal>", link naar het weekmenu. Gedeeld door het overzicht en
// de receptpagina.
export default function WeekKnop({ aantal }: { aantal: number }) {
  return (
    <Link href="/week" className={ZWEVENDE_KNOP_KLASSE}>
      Deze week · {aantal}
    </Link>
  );
}
