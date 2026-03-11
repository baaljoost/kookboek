import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import Link from "next/link";
import VerwijderOpmerkingKnop from "@/components/VerwijderOpmerkingKnop";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminOpmerkingenPage() {
  const [opmerkingen, aantalVoorgesteld, aantalImportMeldingen, cookieStore] = await Promise.all([
    prisma.opmerking.findMany({
      orderBy: { createdAt: "desc" },
      include: { recept: { select: { titel: true, slug: true } } },
    }),
    prisma.voorgesteldRecept.count({ where: { status: "WACHT" } }),
    prisma.importMelding.count(),
    cookies(),
  ]);
  const isBeheerder = cookieStore.get(MODUS_COOKIE)?.value === MODUS_BEHEERDER;

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors">
              ← Naar het kookboek
            </Link>
            <h1 className="font-serif text-2xl text-neutral-900 mt-1">
              Opmerkingen
            </h1>
          </div>
          <span className="text-sm text-neutral-400">{opmerkingen.length} totaal</span>
        </div>
        <AdminNav isBeheerder={isBeheerder} aantalVoorgesteld={aantalVoorgesteld} aantalImportMeldingen={aantalImportMeldingen} />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {opmerkingen.length === 0 ? (
          <p className="text-neutral-500 text-center py-20">Nog geen opmerkingen.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {opmerkingen.map((o) => (
              <div key={o.id} className="py-5 flex gap-4">
                <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 font-medium text-sm shrink-0">
                  {o.naam[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap mb-1">
                    <span className="font-medium text-neutral-900 text-sm">{o.naam}</span>
                    {o.sterren && (
                      <span className="text-amber-400 text-xs">{"★".repeat(o.sterren)}</span>
                    )}
                    <span className="text-neutral-400 text-xs">
                      {o.createdAt.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Link
                      href={`/recepten/${o.recept.slug}`}
                      className="text-xs text-olive-700 hover:underline"
                      target="_blank"
                    >
                      {o.recept.titel}
                    </Link>
                  </div>
                  <p className="text-neutral-700 text-sm leading-relaxed">{o.bericht}</p>
                  {o.fotoUrl && (
                    <div className="mt-2 w-24 h-24 overflow-hidden bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.fotoUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <VerwijderOpmerkingKnop slug={o.recept.slug} opmerkingId={o.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
