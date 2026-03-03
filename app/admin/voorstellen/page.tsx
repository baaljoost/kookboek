import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import Link from "next/link";
import VoorstelActies from "@/components/admin/VoorstelActies";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminVoorstellenPage() {
  const [voorstellen, cookieStore] = await Promise.all([
    prisma.recept.findMany({
      where: { goedgekeurd: false },
      include: {
        fotos: { orderBy: { volgorde: "asc" }, take: 1 },
        ingredienten: { orderBy: { volgorde: "asc" } },
        stappen: { orderBy: { volgorde: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    cookies(),
  ]);
  const isBeheerder = cookieStore.get(MODUS_COOKIE)?.value === MODUS_BEHEERDER;
  const aantalVoorgesteld = voorstellen.length;

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <Link href="/" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors">
            ← Naar het kookboek
          </Link>
          <h1 className="font-serif text-2xl text-neutral-900 mt-1">
            Voorgestelde recepten
          </h1>
        </div>
        <AdminNav isBeheerder={isBeheerder} aantalVoorgesteld={aantalVoorgesteld} />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {voorstellen.length === 0 ? (
          <p className="text-neutral-400 text-sm">Geen nieuwe voorstellen.</p>
        ) : (
          <div className="space-y-6">
            {voorstellen.map((recept) => (
              <div
                key={recept.id}
                className="bg-white border border-neutral-200 p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  {recept.fotos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recept.fotos[0].url}
                      alt={recept.titel}
                      className="w-20 h-20 object-cover shrink-0 bg-neutral-100"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-serif text-lg text-neutral-900">
                      {recept.titel}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Voorgesteld door{" "}
                      <span className="font-medium text-neutral-600">
                        {recept.voorstelNaam ?? recept.ingebrachtDoor}
                      </span>{" "}
                      op{" "}
                      {recept.createdAt.toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {recept.voorstelBericht && (
                      <p className="text-sm text-neutral-500 mt-2 italic">
                        &ldquo;{recept.voorstelBericht}&rdquo;
                      </p>
                    )}
                  </div>
                  <VoorstelActies id={recept.id} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  {recept.ingredienten.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2">
                        Ingredienten ({recept.ingredienten.length})
                      </p>
                      <ul className="space-y-0.5 text-neutral-700">
                        {recept.ingredienten.slice(0, 8).map((ing) => (
                          <li key={ing.id}>
                            {ing.hoeveelheid} {ing.eenheid} {ing.naam}
                          </li>
                        ))}
                        {recept.ingredienten.length > 8 && (
                          <li className="text-neutral-400">
                            + {recept.ingredienten.length - 8} meer...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {recept.stappen.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2">
                        Bereiding ({recept.stappen.length} stappen)
                      </p>
                      <ol className="space-y-1 text-neutral-700 list-decimal list-inside">
                        {recept.stappen.slice(0, 3).map((stap) => (
                          <li key={stap.id} className="line-clamp-2">
                            {stap.tekst}
                          </li>
                        ))}
                        {recept.stappen.length > 3 && (
                          <li className="text-neutral-400 list-none">
                            + {recept.stappen.length - 3} meer stappen...
                          </li>
                        )}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
