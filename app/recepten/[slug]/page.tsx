import { prisma } from "@/lib/prisma";
import { categorieLabels } from "@/lib/categorieLabels";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PortieSchuif from "@/components/PortieSchuif";
import Sterrenbeoordeling from "@/components/Sterrenbeoordeling";
import FotoBewerken from "@/components/FotoBewerken";
import VerwijderReceptKnop from "@/components/VerwijderReceptKnop";

export const dynamic = "force-dynamic";

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
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Het Kookboek van Joost
          </Link>
          <VerwijderReceptKnop id={recept.id} titel={recept.titel} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Foto's — boven de titel */}
        <div
          className={`relative group mb-8 ${
            recept.fotos.length === 0
              ? "aspect-[16/9] bg-neutral-100 flex items-center justify-center"
              : recept.fotos.length === 1
              ? ""
              : "grid grid-cols-2 gap-3"
          }`}
        >
          {recept.fotos.length === 0 && (
            <svg className="w-12 h-12 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
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
          <FotoBewerken
            receptId={recept.id}
            fotos={recept.fotos}
            receptTitel={recept.titel}
          />
        </div>

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
          </div>
          <div className="mt-3">
            <Sterrenbeoordeling slug={recept.slug} beoordeling={recept.beoordeling} />
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
