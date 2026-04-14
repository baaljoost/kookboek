import { prisma } from "@/lib/prisma";
import { categorieLabels } from "@/lib/categorieLabels";
import { heeftAmerikaanseEenheden } from "@/lib/unitConversie";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import PortieSchuif from "@/components/PortieSchuif";
import StappenLijst from "@/components/StappenLijst";
import { EenheidProvider } from "@/components/EenheidContext";
import Sterrenbeoordeling from "@/components/Sterrenbeoordeling";
import FotoBewerken from "@/components/FotoBewerken";
import VerwijderReceptKnop from "@/components/VerwijderReceptKnop";
import OpmerkingFormulier from "@/components/OpmerkingFormulier";
import VerwijderOpmerkingKnop from "@/components/VerwijderOpmerkingKnop";
import SchermWakeLock from "@/components/SchermWakeLock";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recept = await prisma.recept.findUnique({
    where: { slug },
    select: { titel: true, fotos: { select: { url: true }, take: 1 } },
  });

  if (!recept) return {};

  return {
    title: recept.titel,
    description: `Bekijk dit recept in Het Kookboek van Joost`,
    openGraph: {
      title: recept.titel,
      description: `Bekijk dit recept in Het Kookboek van Joost`,
      type: "website",
      images: recept.fotos.length > 0 ? [{ url: recept.fotos[0].url }] : [],
    },
  };
}

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

  const cookieStore = await cookies();
  const isBeheerder = cookieStore.get(MODUS_COOKIE)?.value === MODUS_BEHEERDER;

  const recept = await prisma.recept.findUnique({
    where: { slug },
    include: {
      ingredienten: { orderBy: { volgorde: "asc" } },
      stappen: { orderBy: { volgorde: "asc" } },
      fotos: { orderBy: { volgorde: "asc" } },
      tags: { include: { tag: true } },
      opmerkingen: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!recept) notFound();

  // Detect American units in ingredients and steps
  const heeftAmerikaans = heeftAmerikaanseEenheden(
    recept.ingredienten.map((ing) => ({
      hoeveelheid: ing.hoeveelheid,
      eenheid: ing.eenheid,
      naam: ing.naam,
      notitie: ing.notitie,
    })),
    recept.stappen.map((stap) => ({ tekst: stap.tekst }))
  );

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
          {isBeheerder && <VerwijderReceptKnop id={recept.id} titel={recept.titel} />}
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
          <p className="text-sm text-neutral-400 mt-2">
            Ingebracht door{" "}
            <Link
              href={`/?ingebracht=${encodeURIComponent(recept.ingebrachtDoor ?? "Joost")}`}
              className="text-neutral-600 hover:text-olive-700 transition-colors"
            >
              {recept.ingebrachtDoor ?? "Joost"}
            </Link>
          </p>
          {recept.voorstelBericht && (
            <p className="text-sm text-neutral-400 mt-1 italic">
              &ldquo;{recept.voorstelBericht}&rdquo;
            </p>
          )}
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

        <EenheidProvider>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Ingrediënten */}
            <div className="md:col-span-1">
              <div className="sticky top-6">
                <SchermWakeLock />
                <h2 className="font-serif text-2xl text-neutral-900 mb-4">
                  Ingrediënten
                </h2>
                <PortieSchuif
                  standaardPorties={recept.porties ?? undefined}
                  ingredienten={recept.ingredienten.map((ing) => ({
                    id: ing.id,
                    hoeveelheid: ing.hoeveelheid,
                    eenheid: ing.eenheid,
                    naam: ing.naam,
                    notitie: ing.notitie,
                  }))}
                  heeftAmerikaanseEenheden={heeftAmerikaans}
                />
              </div>
            </div>

            {/* Stappen */}
            <div className="md:col-span-2">
              <StappenLijst
                stappen={recept.stappen.map((stap) => ({
                  id: stap.id,
                  tekst: stap.tekst,
                }))}
              />

              {/* Benodigdheden */}
              {recept.benodigdheden.length > 0 && (
                <div className="mt-12 pt-6 border-t border-neutral-200">
                  <h2 className="font-serif text-2xl text-neutral-900 mb-4">
                    Benodigdheden
                  </h2>
                  <ul className="space-y-1">
                    {recept.benodigdheden.map((item, i) => (
                      <li key={i} className="text-sm text-neutral-700 flex gap-2">
                        <span className="text-neutral-300 select-none">—</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
        </EenheidProvider>

        {/* Opmerkingen */}
        <div className="mt-16 pt-10 border-t border-neutral-200">
          <h2 className="font-serif text-2xl text-neutral-900 mb-8">Opmerkingen</h2>

          {/* Bestaande opmerkingen */}
          {recept.opmerkingen.length > 0 && (
            <div className="space-y-8 mb-12">
              {recept.opmerkingen.map((o) => (
                <div key={o.id} className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 font-medium text-sm shrink-0">
                    {o.naam[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-medium text-neutral-900 text-sm">{o.naam}</span>
                      {o.sterren && (
                        <span className="text-amber-400 text-xs">{"★".repeat(o.sterren)}</span>
                      )}
                      <span className="text-neutral-400 text-xs">
                        {o.createdAt.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <VerwijderOpmerkingKnop slug={recept.slug} opmerkingId={o.id} />
                    </div>
                    <p className="text-neutral-700 text-sm leading-relaxed">{o.bericht}</p>
                    {o.fotoUrl && (
                      <div className="mt-3 w-40 h-40 overflow-hidden bg-neutral-100">
                        <Image src={o.fotoUrl} alt={`Foto van ${o.naam}`} width={160} height={160} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulier */}
          <div>
            <h3 className="font-serif text-lg text-neutral-900 mb-5">
              {recept.opmerkingen.length === 0 ? "Wees de eerste die een opmerking plaatst" : "Opmerking toevoegen"}
            </h3>
            <OpmerkingFormulier slug={recept.slug} />
          </div>
        </div>
      </main>
    </div>
  );
}
