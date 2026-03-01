import { prisma } from "@/lib/prisma";
import { categorieLabels } from "@/lib/categorieLabels";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PortieSchuif from "@/components/PortieSchuif";

export async function generateStaticParams() {
  const recepten = await prisma.recept.findMany({ select: { slug: true } });
  return recepten.map((r) => ({ slug: r.slug }));
}

export default async function ReceptPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const recept = await prisma.recept.findUnique({
    where: { slug },
    include: {
      ingredienten: { orderBy: { volgorde: "asc" } },
      stappen: { orderBy: { volgorde: "asc" } },
      fotos: { orderBy: { volgorde: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recept) notFound();

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Het Kookboek
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Titel & meta */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3">
            {categorieLabels[recept.categorie]}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-neutral-900 leading-tight mb-4">
            {recept.titel}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
            {recept.bereidingstijd && (
              <span>{recept.bereidingstijd} minuten</span>
            )}
            {recept.porties && <span>{recept.porties} porties</span>}
            {recept.beoordeling && (
              <span className="text-terracotta-500">
                {"★".repeat(recept.beoordeling)}
                {"☆".repeat(5 - recept.beoordeling)}
              </span>
            )}
          </div>
          {/* Tags */}
          {recept.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {recept.tags.map(({ tag }) => (
                <Link
                  key={tag.id}
                  href={`/?tag=${tag.naam}`}
                  className="px-2.5 py-0.5 text-xs border border-neutral-200 rounded-full text-neutral-500 hover:border-terracotta-400 transition-colors"
                >
                  {tag.naam}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Foto's */}
        {recept.fotos.length > 0 && (
          <div
            className={`mb-10 ${
              recept.fotos.length === 1
                ? ""
                : "grid grid-cols-2 gap-3"
            }`}
          >
            {recept.fotos.map((foto, i) => (
              <div
                key={foto.id}
                className={`overflow-hidden bg-neutral-100 ${
                  recept.fotos.length === 1
                    ? "aspect-[16/9]"
                    : "aspect-square"
                } ${i === 0 && recept.fotos.length > 1 ? "col-span-2 aspect-[16/7]" : ""}`}
              >
                <Image
                  src={foto.url}
                  alt={foto.altTekst ?? recept.titel}
                  width={1200}
                  height={675}
                  className="w-full h-full object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Ingrediënten */}
          <div className="md:col-span-1">
            <div className="sticky top-6">
              <h2 className="font-serif text-2xl text-neutral-900 mb-4">
                Ingrediënten
              </h2>
              {recept.porties && (
                <PortieSchuif
                  standaardPorties={recept.porties}
                  ingredienten={recept.ingredienten.map((ing) => ({
                    id: ing.id,
                    hoeveelheid: ing.hoeveelheid,
                    eenheid: ing.eenheid,
                    naam: ing.naam,
                    notitie: ing.notitie,
                  }))}
                />
              )}
              {!recept.porties && (
                <ul className="space-y-2.5">
                  {recept.ingredienten.map((ing) => (
                    <li key={ing.id} className="text-sm text-neutral-700 flex gap-2">
                      <span className="font-medium text-neutral-900 whitespace-nowrap">
                        {ing.hoeveelheid
                          ? `${ing.hoeveelheid}${ing.eenheid ? ` ${ing.eenheid}` : ""}`
                          : ing.eenheid ?? ""}
                      </span>
                      <span>
                        {ing.naam}
                        {ing.notitie && (
                          <span className="text-neutral-400">, {ing.notitie}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Stappen */}
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl text-neutral-900 mb-6">
              Bereiding
            </h2>
            <ol className="space-y-6">
              {recept.stappen.map((stap, i) => (
                <li key={stap.id} className="flex gap-4">
                  <span className="font-serif text-3xl text-neutral-200 leading-none mt-1 select-none w-8 shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-neutral-700 leading-relaxed pt-1">
                    {stap.tekst}
                  </p>
                </li>
              ))}
            </ol>

            {/* Herkomst */}
            {recept.herkomstNaam && (
              <div className="mt-12 pt-6 border-t border-neutral-200">
                <p className="text-xs uppercase tracking-widest text-neutral-400 mb-1">
                  Bron
                </p>
                {recept.herkomstUrl ? (
                  <a
                    href={recept.herkomstUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-olive-700 hover:underline"
                  >
                    {recept.herkomstNaam}
                  </a>
                ) : (
                  <p className="text-sm text-neutral-600">{recept.herkomstNaam}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
