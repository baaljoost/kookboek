import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VoorstelActies from "@/components/admin/VoorstelActies";

export const dynamic = "force-dynamic";

interface ReceptData {
  titel?: string;
  categorie?: string;
  porties?: number;
  bereidingstijd?: number;
  ingredienten?: { naam: string; hoeveelheid?: string; eenheid?: string }[];
  stappen?: { tekst: string }[];
}

export default async function AdminVoorstellenPage() {
  const voorstellen = await prisma.voorgesteldRecept.findMany({
    orderBy: { createdAt: "desc" },
  });

  const wachtend = voorstellen.filter((v) => v.status === "WACHT");
  const afgehandeld = voorstellen.filter((v) => v.status !== "WACHT");

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <Link
              href="/admin/recepten"
              className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
            >
              ← Recepten beheren
            </Link>
            <h1 className="font-serif text-2xl text-neutral-900 mt-1">
              Voorgestelde recepten
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Wachtende voorstellen */}
        <section>
          <h2 className="font-serif text-xl text-neutral-900 mb-4">
            Wachtend op beoordeling
            {wachtend.length > 0 && (
              <span className="ml-2 text-sm font-sans bg-terracotta-500 text-white rounded-full px-2 py-0.5">
                {wachtend.length}
              </span>
            )}
          </h2>

          {wachtend.length === 0 ? (
            <p className="text-neutral-400 text-sm">Geen nieuwe voorstellen.</p>
          ) : (
            <div className="space-y-6">
              {wachtend.map((voorstel) => {
                const data = voorstel.receptData as ReceptData;
                return (
                  <div
                    key={voorstel.id}
                    className="bg-white border border-neutral-200 p-6"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="font-serif text-lg text-neutral-900">
                          {data.titel ?? "Zonder titel"}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Voorgesteld door{" "}
                          <span className="font-medium text-neutral-600">
                            {voorstel.naam}
                          </span>{" "}
                          op{" "}
                          {voorstel.createdAt.toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        {voorstel.bericht && (
                          <p className="text-sm text-neutral-500 mt-2 italic">
                            &ldquo;{voorstel.bericht}&rdquo;
                          </p>
                        )}
                      </div>
                      <VoorstelActies id={voorstel.id} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      {data.ingredienten && data.ingredienten.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2">
                            Ingrediënten ({data.ingredienten.length})
                          </p>
                          <ul className="space-y-0.5 text-neutral-700">
                            {data.ingredienten.slice(0, 8).map((ing, i) => (
                              <li key={i}>
                                {ing.hoeveelheid} {ing.eenheid} {ing.naam}
                              </li>
                            ))}
                            {data.ingredienten.length > 8 && (
                              <li className="text-neutral-400">
                                + {data.ingredienten.length - 8} meer…
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {data.stappen && data.stappen.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2">
                            Bereiding ({data.stappen.length} stappen)
                          </p>
                          <ol className="space-y-1 text-neutral-700 list-decimal list-inside">
                            {data.stappen.slice(0, 3).map((stap, i) => (
                              <li key={i} className="line-clamp-2">
                                {stap.tekst}
                              </li>
                            ))}
                            {data.stappen.length > 3 && (
                              <li className="text-neutral-400 list-none">
                                + {data.stappen.length - 3} meer stappen…
                              </li>
                            )}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Afgehandelde voorstellen */}
        {afgehandeld.length > 0 && (
          <section>
            <h2 className="font-serif text-xl text-neutral-900 mb-4">
              Eerder afgehandeld
            </h2>
            <div className="divide-y divide-neutral-100">
              {afgehandeld.map((voorstel) => {
                const data = voorstel.receptData as ReceptData;
                return (
                  <div
                    key={voorstel.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm text-neutral-700">
                        {data.titel ?? "Zonder titel"}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Door {voorstel.naam}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 ${
                        voorstel.status === "GOEDGEKEURD"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {voorstel.status === "GOEDGEKEURD"
                        ? "Goedgekeurd"
                        : "Afgewezen"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
