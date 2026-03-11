import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import ImportMeldingenLijst from "@/components/admin/ImportMeldingenLijst";

export const dynamic = "force-dynamic";

export default async function ImportMeldingenPage() {
  const [meldingen, aantalVoorgesteld, aantalImportMeldingen, cookieStore] = await Promise.all([
    prisma.importMelding.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.voorgesteldRecept.count({ where: { status: "WACHT" } }),
    prisma.importMelding.count(),
    cookies(),
  ]);
  const isBeheerder = cookieStore.get(MODUS_COOKIE)?.value === MODUS_BEHEERDER;

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Naar het kookboek
          </Link>
          <h1 className="font-serif text-2xl text-neutral-900 mt-1">
            Mislukte URL-imports
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            URL&apos;s die bezoekers probeerden te importeren maar waar het automatisch ophalen mislukte.
          </p>
        </div>
        <AdminNav
          isBeheerder={isBeheerder}
          aantalVoorgesteld={aantalVoorgesteld}
          aantalImportMeldingen={aantalImportMeldingen}
        />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {meldingen.length === 0 ? (
          <p className="text-neutral-500 text-center py-20">
            Geen mislukte imports.
          </p>
        ) : (
          <ImportMeldingenLijst meldingen={meldingen} />
        )}
      </main>
    </div>
  );
}
