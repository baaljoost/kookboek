"use client";

import { useWeekSchakel } from "./useWeekSchakel";

// Rond knopje rechtsboven op de foto van een receptkaart, in de stijl van
// "Foto bewerken". Staat naast de link van de kaart, niet erin, dus een tik
// opent nooit de receptpagina.
export default function WeekToevoegKnop({ receptId, opWeekmenu }: { receptId: number; opWeekmenu: boolean }) {
  const { aan, bezig, schakel } = useWeekSchakel(receptId, opWeekmenu);
  return (
    <button
      type="button"
      onClick={schakel}
      disabled={bezig}
      aria-pressed={aan}
      aria-label={aan ? "Van weekmenu halen" : "Op weekmenu zetten"}
      title={aan ? "Van weekmenu halen" : "Op weekmenu zetten"}
      className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full text-white flex items-center justify-center transition-opacity focus:opacity-100 disabled:opacity-60 ${
        aan
          ? "bg-olive-700 hover:bg-olive-800"
          : "bg-black/50 hover:bg-black/70 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        {aan ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
    </button>
  );
}
