"use client";

// De −/+ knoppen voor het aantal porties. Gedeeld door de receptpagina
// (PortieSchuif) en het weekmenu, zodat ze er hetzelfde uitzien.

interface Props {
  porties: number;
  standaard: number;
  onChange: (porties: number) => void;
  className?: string;
}

export default function PortieKiezer({ porties, standaard, onChange, className = "" }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, porties - 1))}
        className="w-8 h-8 border border-neutral-300 flex items-center justify-center text-neutral-600 hover:border-olive-600 transition-colors text-lg leading-none"
        aria-label="Minder porties"
      >
        −
      </button>
      <span className="text-sm font-medium text-neutral-900 min-w-[80px] text-center">
        {porties} {porties === 1 ? "portie" : "porties"}
      </span>
      <button
        type="button"
        onClick={() => onChange(porties + 1)}
        className="w-8 h-8 border border-neutral-300 flex items-center justify-center text-neutral-600 hover:border-olive-600 transition-colors text-lg leading-none"
        aria-label="Meer porties"
      >
        +
      </button>
      {porties !== standaard && (
        <button
          type="button"
          onClick={() => onChange(standaard)}
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors ml-1"
        >
          Reset
        </button>
      )}
    </div>
  );
}
