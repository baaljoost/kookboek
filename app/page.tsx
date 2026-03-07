import { prisma } from "@/lib/prisma";
import { categorieLabels } from "@/lib/categorieLabels";
import { Categorie } from "@prisma/client";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import Link from "next/link";
import Image from "next/image";
import SorteerMenu from "@/components/SorteerMenu";
import IngebrachtMenu from "@/components/IngebrachtMenu";
import CategorieFilter from "@/components/CategorieFilter";
import DieetMenu from "@/components/DieetMenu";
import { isVegetarisch, isVegan } from "@/lib/dieetFilter";

interface SearchParams {
  categorie?: string;
  q?: string;
  ingebracht?: string;
  sorteer?: string;
  dieet?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { categorie, q, ingebracht, sorteer, dieet } = params;

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

  const [alleRecepten, inbrengersRaw] = await Promise.all([
    prisma.recept.findMany({
      where: {
        ...(categorie && { categorie: categorie as Categorie }),
        ...(q && {
          OR: [
            {
              ingredienten: {
                some: { naam: { contains: q, mode: "insensitive" } },
              },
            },
            {
              titel: { contains: q, mode: "insensitive" },
            },
          ],
        }),
        ...ingebrachtFilter,
      },
      include: {
        fotos: { orderBy: { volgorde: "asc" }, take: 1 },
        _count: { select: { opmerkingen: true } },
        // Ingrediënten meeladen voor dieet-detectie
        ingredienten: { select: { naam: true } },
        // Meest recente opmerking voor 'Recent' sortering
        opmerkingen: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.recept.groupBy({
      by: ["ingebrachtDoor"],
      _count: { id: true },
    }),
  ]);

  // Dieetfilter in TypeScript met woordgrens-matching
  const recepten = dieet === "vegetarisch"
    ? alleRecepten.filter((r) => isVegetarisch(r.ingredienten))
    : dieet === "vegan"
    ? alleRecepten.filter((r) => isVegan(r.ingredienten))
    : alleRecepten;

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
  } else if (sorteer === "nieuw") {
    // Nieuwste eerst: recepten met foto's eerst
    recepten.sort((a, b) => {
      const aHeeftFoto = a.fotos.length > 0 ? 0 : 1;
      const bHeeftFoto = b.fotos.length > 0 ? 0 : 1;
      return aHeeftFoto - bHeeftFoto;
    });
  } else {
    // Standaard (Meest recent): max van updatedAt en laatste opmerking createdAt
    recepten.sort((a, b) => {
      const aRecent = Math.max(
        a.updatedAt.getTime(),
        a.opmerkingen[0]?.createdAt.getTime() ?? 0
      );
      const bRecent = Math.max(
        b.updatedAt.getTime(),
        b.opmerkingen[0]?.createdAt.getTime() ?? 0
      );
      return bRecent - aRecent;
    });
  }

  function maakUrl(wijzigingen: Record<string, string | undefined>) {
    const huidig: Record<string, string | undefined> = { categorie, q, ingebracht, sorteer, dieet };
    const nieuw = { ...huidig, ...wijzigingen };
    const parts = Object.entries(nieuw)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
    return parts.length ? `/?${parts.join("&")}` : "/";
  }

  const categorieItems = [
    { waarde: undefined, label: "Alles", href: maakUrl({ categorie: undefined }), actief: !categorie },
    ...Object.values(Categorie).map((cat) => ({
      waarde: cat,
      label: categorieLabels[cat],
      href: maakUrl({ categorie: cat }),
      actief: categorie === cat,
    })),
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-start justify-between">
          <div>
            <Link href="/">
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-neutral-900 tracking-tight hover:text-olive-700 transition-colors">
                Het Kookboek van{" "}
                {ingebrachtNamen.length === 0
                  ? "Joost"
                  : ingebrachtNamen.length === 1
                  ? ingebrachtNamen[0]
                  : ingebrachtNamen.slice(0, -1).join(", ") + " en " + ingebrachtNamen.at(-1)}
              </h1>
            </Link>
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
              placeholder="Zoek op ingrediënt of maaltijd…"
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

        {/* Categoriefilter */}
        <div className="mb-4">
          <CategorieFilter categorieen={categorieItems} />
        </div>

        {/* Sorteer + ingebracht + dieet */}
        <div className="flex justify-start gap-4 mb-6">
          <IngebrachtMenu
            inbrengers={inbrengers}
            actieveNamen={ingebrachtNamen}
            huidigeParams={{ categorie, q, sorteer, dieet }}
          />
          <SorteerMenu
            huidigeSorteer={sorteer}
            huidigeParams={{ categorie, q, ingebracht, dieet }}
          />
          <DieetMenu
            actieveFilter={dieet}
            huidigeParams={{ categorie, q, ingebracht, sorteer }}
          />
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
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs uppercase tracking-widest text-neutral-400">
                      {categorieLabels[recept.categorie]}
                    </p>
                    {!recept.goedgekeurd && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200">
                        in afwachting
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-xl text-neutral-900 group-hover:text-olive-700 transition-colors leading-snug">
                    {recept.titel}
                  </h2>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-400">
                    {recept.bereidingstijd && (
                      <span>{recept.bereidingstijd} min</span>
                    )}
                    {recept.ingebrachtDoor && (
                      <Link
                        href={`/?${new URLSearchParams({
                          ...Object.fromEntries(
                            Object.entries({ categorie, q, sorteer, dieet }).filter(
                              ([, v]) => v !== undefined && v !== ""
                            )
                          ),
                          ingebracht: recept.ingebrachtDoor,
                        }).toString()}`}
                        className="hover:underline"
                      >
                        door {recept.ingebrachtDoor}
                      </Link>
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
        {isBeheerder ? "Recept toevoegen" : "Stuur een recept in!"}
      </Link>
    </div>
  );
}
