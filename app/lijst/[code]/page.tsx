import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { controleerCode } from "@/lib/deelLink";
import { laadLijst } from "@/lib/lijstData";
import BeheerKnop from "@/components/BeheerKnop";
import { isIngelogd } from "@/lib/auth";
import LijstWeergave from "@/components/LijstWeergave";

export const dynamic = "force-dynamic";

// Algemene titel, zonder lijstinhoud: de link wordt in chatapps getoond.
export const metadata: Metadata = {
  title: "Boodschappenlijst",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "Boodschappenlijst", type: "website" },
};

// De lijst voor wie de geheime link heeft: bekijken, afvinken en eigen regels
// toevoegen. Geen weekmenu, geen "Deze week", niets wijzigen aan het mandje.
export default async function DeelLijstPagina({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(await controleerCode(code))) notFound();
  const [stand, ingelogd] = await Promise.all([laadLijst(), isIngelogd()]);

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-2 flex items-center gap-4">
          <p className="flex-1 min-w-0 py-3 text-xs uppercase tracking-widest text-neutral-400">Het Kookboek van Joost</p>
          <BeheerKnop ingelogd={ingelogd} terug={`/lijst/${code}`} />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">Boodschappenlijst</h1>
        <LijstWeergave initieel={stand} apiBasis={`/api/lijst/${code}`} magEigenRegelsVerwijderen={false} deelCode={code} />
      </main>
    </div>
  );
}
