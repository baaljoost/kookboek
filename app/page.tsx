import { prisma } from "@/lib/prisma";
import { categorieLabels } from "@/lib/categorieLabels";
import { Categorie } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";

interface SearchParams {
  categorie?: string;
  tag?: string;
  q?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { categorie, tag, q } = params;

  const recepten = await prisma.recept.findMany({
    where: {
      ...(categorie && { categorie: categorie as Categorie }),
      ...(tag && {
        tags: { some: { tag: { naam: tag } } },
      }),
      ...(q && {
        ingredienten: {
          some: { naam: { contains: q, mode: "insensitive" } },
        },
      }),
    },
    include: {
      fotos: { orderBy: { volgorde: "asc" }, take: 1 },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const alleTags = await prisma.tag.findMany({ orderBy: { naam: "asc" } });
  const categorieen = Object.values(Categorie);

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="font-serif text-4xl md:text-5xl text-neutral-900 tracking-tight">
            Het Kookboek van Joost
          </h1>
          <p className="mt-1 text-neutral-500 font-sans text-sm tracking-wide">
            {recepten.length} recepten
          </p>
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
            {tag && <input type="hidden" name="tag" value={tag} />}
            <button type="submit" className="btn-primary whitespace-nowrap">
              Zoeken
            </button>
          </div>
        </form>

        {/* Categoriefilter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Link
            href="/"
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
              href={`/?categorie=${cat}${tag ? `&tag=${tag}` : ""}${q ? `&q=${q}` : ""}`}
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

        {/* Tagfilter */}
        {alleTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {alleTags.map((t) => (
              <Link
                key={t.id}
                href={`/?tag=${t.naam}${categorie ? `&categorie=${categorie}` : ""}${q ? `&q=${q}` : ""}`}
                className={`px-2.5 py-0.5 text-xs border rounded-full transition-colors ${
                  tag === t.naam
                    ? "bg-terracotta-500 text-white border-terracotta-500"
                    : "border-neutral-300 text-neutral-500 hover:border-terracotta-400"
                }`}
              >
                {t.naam}
              </Link>
            ))}
          </div>
        )}

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
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating knop: recept toevoegen */}
      <Link
        href="/admin/recepten/nieuw"
        className="fixed bottom-6 right-6 bg-olive-700 text-white px-5 py-3 shadow-lg hover:bg-olive-800 transition-colors text-sm font-medium flex items-center gap-2 z-50"
      >
        <span className="text-lg leading-none">+</span>
        Recept toevoegen
      </Link>
    </div>
  );
}
