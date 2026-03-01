import { prisma } from "@/lib/prisma";
import { categorieLabels } from "@/lib/categorieLabels";
import Link from "next/link";
import VerwijderKnop from "@/components/admin/VerwijderKnop";

export const dynamic = "force-dynamic";

export default async function AdminReceptenPage() {
  const recepten = await prisma.recept.findMany({
    orderBy: { createdAt: "desc" },
    include: { fotos: { take: 1, orderBy: { volgorde: "asc" } } },
  });

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors">
              ← Naar het kookboek
            </Link>
            <h1 className="font-serif text-2xl text-neutral-900 mt-1">
              Recepten beheren
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/recepten/nieuw" className="btn-primary">
              + Nieuw recept
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {recepten.length === 0 ? (
          <p className="text-neutral-500 text-center py-20">
            Nog geen recepten.{" "}
            <Link href="/admin/recepten/nieuw" className="text-olive-700 hover:underline">
              Voeg het eerste recept toe.
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recepten.map((recept) => (
              <div key={recept.id} className="py-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-100 shrink-0 overflow-hidden">
                  {recept.fotos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recept.fotos[0].url}
                      alt={recept.titel}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">
                    {recept.titel}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {categorieLabels[recept.categorie]}
                    {recept.beoordeling && ` · ${"★".repeat(recept.beoordeling)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/recepten/${recept.slug}`}
                    className="text-xs text-neutral-400 hover:text-neutral-700 px-2 py-1"
                    target="_blank"
                  >
                    Bekijk
                  </Link>
                  <Link
                    href={`/admin/recepten/${recept.id}/bewerken`}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Bewerken
                  </Link>
                  <VerwijderKnop id={recept.id} titel={recept.titel} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
