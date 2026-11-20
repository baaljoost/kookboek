import Link from "next/link";

export type LijstTab = "weekmenu" | "boodschappen";

// De twee tabbladen op de gedeelde pagina, in de stijl van de categorielabels
// op het overzicht (CategorieFilter). Gewone links: het gekozen tabblad staat in
// de URL, dus terug-knop en verversen werken.
export default function LijstTabs({ code, actief }: { code: string; actief: LijstTab }) {
  const tabs: { tab: LijstTab; label: string }[] = [
    { tab: "weekmenu", label: "Weekmenu" },
    { tab: "boodschappen", label: "Boodschappen" },
  ];
  return (
    <nav aria-label="Weergave" className="flex flex-wrap gap-2 mb-6">
      {tabs.map(({ tab, label }) => (
        <Link
          key={tab}
          href={`/lijst/${code}?tab=${tab}`}
          aria-current={tab === actief ? "page" : undefined}
          className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors whitespace-nowrap ${
            tab === actief
              ? "bg-olive-700 text-white border-olive-700"
              : "border-neutral-300 text-neutral-600 hover:border-olive-600"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
