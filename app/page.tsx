import { prisma } from "@/lib/prisma";
import { categorieLabels } from "@/lib/categorieLabels";
import { Categorie } from "@prisma/client";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import Link from "next/link";
import Image from "next/image";
import SorteerMenu from "@/components/SorteerMenu";
import IngebrachtMenu from "@/components/IngebrachtMenu";

interface SearchParams {
  categorie?: string;
  q?: string;
  ingebracht?: string;
  sorteer?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { categorie, q, ingebracht, sorteer } = params;

  const cookieStore = await cookies();
  const isBeheerder = cookieStore.get(MODUS_COOKIE)?.value === MODUS_BEHEERDER;

  // Ingebracht-filter: komma-gescheiden namen
  const ingebrachtNamen = ingebracht
    ? ingebracht.split(",").map((n) => n.trim()).filter(Boolean)
    : [];

  // Bouw OR-filter: null = Joost, anders naam
  const ingebrachtFilter =
    ingebrachtNamen.length > 0
      ? {
          OR: ingebrachtNamen.map((naam) => ({
            ingebrachtDoor: naam === "Joost" ? null : naam,
          })),
        }
      : {};

  const [recepten, inbrengersRaw] = await Promise.all([
    prisma.recept.findMany({
      where: {
        ...(categorie && { categorie: categorie as Categorie }),
        ...(q && {
          ingredienten: {
            some: { naam: { contains: q, mode: "insensitive" } },
          },
        }),
        ...ingebrachtFilter,
      },
      include: {
        fotos: { orderBy: { volgorde: "asc" }, take: 1 },
        _count: { select: { opmerkingen: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Alle unieke ingebracht-namen met telling (voor het dropdown menu)
    prisma.recept.groupBy({
      by: ["ingebrachtDoor"],
      _count: { id: true },
    }),
  ]);

  // Zet null → "Joost" en sorteer alfabetisch
  const inbrengers = inbrengersRaw
    .map((r) => ({ naam: r.ingebrachtDoor ?? "Joost", aantal: r._count.id }))
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));

  // Sorteren
  if (sorteer === "sterren-hoog") {
    recepten.sort((a, b) => (b.beoordeling ?? 0) - (a.beoordeling ?? 0));
  } else if (sorteer === "sterren-laag") {
    recepten.sort((a, b) => (a.beoordeling ?? 6) - (b.beoordeling ?? 6));
  } else if (sorteer === "az") {
    recepten.sort((a, b) => a.titel.localeCompare(b.titel, "nl"));
  } else {
    // Standaard (nieuwste eerst): recepten met foto's eerst
    recepten.sort((a, b) => {
      const aHeeftFoto = a.fotos.length > 0 ? 0 : 1;
      const bHeeftFoto = b.fotos.length > 0 ? 0 : 1;
      return aHeeftFoto - bHeeftFoto;
    });
  }

  const categorieen = Object.values(Categorie);

  function maakUrl(wijzigingen: Record<string, string | undefined>) {
    const huidig: Record<string, string | undefined> = { categorie, q, ingebracht, sorteer };
    const nieuw = { ...huidig, ...wijzigingen };
    const parts = Object.entries(nieuw)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
    return parts.length ? `/?${parts.join("&")}` : "/";
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-neutral-900 tracking-tight">
              Het Kookboek van Joost
            </h1>
            <p className="mt-1 text-neutral-500 font-sans text-sm tracking-wide">
              {recepten.length} recepten
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Zoekbalk */}
        <form method="GET" className="mb-8">
          <div className="flex gap-3 max-w-lg">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Zoek op ingrediënt…"
              className="input flex-1"
            />
            {categorie && (
              <input type="hidden" name="categorie" value={categorie} />
            )}
            <button type="submit" className="btn-primary whitespace-nowrap">
              Zoeken
            </button>
          </div>
        </form>

        {/* Filter op ingebracht door */}
        {ingebrachtNamen.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <p className="text-sm text-neutral-600">
              Recepten van{" "}
              <span className="font-medium">{ingebrachtNamen.join(", ")}</span>
            </p>
            <Link
              href={maakUrl({ ingebracht: undefined })}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              × Wis filter
            </Link>
          </div>
        )}

        {/* Categoriefilter + sorteer */}
        <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href={maakUrl({ categorie: undefined })}
              className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors ${
                !categorie
                  ? "bg-olive-700 text-white border-olive-700"
                  : "border-neutral-300 text-neutral-600 hover:border-olive-600"
              }`}
            >
              Alles
            </Link>
            {categorieen.map((cat) => (
              <Link
                key={cat}
                href={maakUrl({ categorie: cat })}
                className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors ${
                  categorie === cat
                    ? "bg-olive-700 text-white border-olive-700"
                    : "border-neutral-300 text-neutral-600 hover:border-olive-600"
                }`}
              >
                {categorieLabels[cat]}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <IngebrachtMenu
              inbrengers={inbrengers}
              actieveNamen={ingebrachtNamen}
              huidigeParams={{ categorie, q, sorteer }}
            />
            <SorteerMenu
              huidigeSorteer={sorteer}
              huidigeParams={{ categorie, q, ingebracht }}
            />
          </div>
        </div>


        {/* Receptenraster */}
        {recepten.length === 0 ? (
          <p className="text-neutral-500 text-center py-20">
            Geen recepten gevonden.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {recepten.map((recept) => (
              <Link
                key={recept.id}
                href={`/recepten/${recept.slug}`}
                className="group block"
              >
                <div className="aspect-[4/3] bg-neutral-100 overflow-hidden mb-3">
                  {recept.fotos[0] ? (
                    <Image
                      src={recept.fotos[0].url}
                      alt={recept.fotos[0].altTekst ?? recept.titel}
                      width={600}
                      height={450}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-neutral-400 mb-1">
                    {categorieLabels[recept.categorie]}
                  </p>
                  <h2 className="font-serif text-xl text-neutral-900 group-hover:text-olive-700 transition-colors leading-snug">
                    {recept.titel}
                  </h2>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-400">
                    {recept.bereidingstijd && (
                      <span>{recept.bereidingstijd} min</span>
                    )}
                    {recept.beoordeling && (
                      <span>{"★".repeat(recept.beoordeling)}</span>
                    )}
                    {recept._count.opmerkingen > 0 && (
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-3.579a.78.78 0 01.527-.224 41.202 41.202 0 005.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zm0 7a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 11-2 0 1 1 0 012 0zm7 1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        {recept._count.opmerkingen}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating knop */}
      <Link
        href={isBeheerder ? "/admin/recepten/nieuw" : "/recepten/voorstellen"}
        className="fixed bottom-6 right-6 bg-olive-700 text-white px-5 py-3 shadow-lg hover:bg-olive-800 transition-colors text-sm font-medium flex items-center gap-2 z-50"
      >
        <span className="text-lg leading-none">+</span>
        {isBeheerder ? "Recept toevoegen" : "Recept voorstellen"}
      </Link>
    </div>
  );
}
