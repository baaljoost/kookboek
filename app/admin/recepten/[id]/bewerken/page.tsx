import { isAuthenticated } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ReceptFormulier from "@/components/admin/ReceptFormulier";
import { Categorie } from "@prisma/client";

export default async function BewerkReceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) {
    redirect("/admin");
  }

  const { id } = await params;
  const recept = await prisma.recept.findUnique({
    where: { id: parseInt(id) },
    include: {
      ingredienten: { orderBy: { volgorde: "asc" } },
      stappen: { orderBy: { volgorde: "asc" } },
      fotos: { orderBy: { volgorde: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recept) notFound();

  const initieleWaarden = {
    titel: recept.titel,
    categorie: recept.categorie as Categorie,
    porties: recept.porties?.toString() ?? "",
    bereidingstijd: recept.bereidingstijd?.toString() ?? "",
    beoordeling: recept.beoordeling?.toString() ?? "",
    herkomstNaam: recept.herkomstNaam ?? "",
    herkomstUrl: recept.herkomstUrl ?? "",
    tags: recept.tags.map((rt) => rt.tag.naam).join(", "),
    ingredienten: recept.ingredienten.map((ing) => ({
      id: ing.id,
      hoeveelheid: ing.hoeveelheid?.toString() ?? "",
      eenheid: ing.eenheid ?? "",
      naam: ing.naam,
      notitie: ing.notitie ?? "",
    })),
    stappen: recept.stappen.map((s) => ({ id: s.id, tekst: s.tekst })),
    fotos: recept.fotos.map((f) => ({
      id: f.id,
      url: f.url,
      altTekst: f.altTekst ?? "",
    })),
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href="/admin/recepten"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Recepten
          </Link>
          <h1 className="font-serif text-2xl text-neutral-900 mt-1">
            {recept.titel} bewerken
          </h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <ReceptFormulier receptId={recept.id} initieleWaarden={initieleWaarden} />
      </main>
    </div>
  );
}
