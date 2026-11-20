import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { controleerCode } from "@/lib/deelLink";
import { laadLijst } from "@/lib/lijstData";
import { laadMandje, laadZoekRecepten } from "@/lib/weekMandje";
import BeheerKnop from "@/components/BeheerKnop";
import { isIngelogd } from "@/lib/auth";
import LijstWeergave from "@/components/LijstWeergave";
import LijstTabs, { type LijstTab } from "@/components/LijstTabs";
import WeekMandje from "@/components/WeekMandje";

export const dynamic = "force-dynamic";

// Algemene titel, zonder inhoud: de link wordt in chatapps getoond.
export const metadata: Metadata = {
  title: "Weekmenu en boodschappen",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "Weekmenu en boodschappen", type: "website" },
};

// Weekmenu en boodschappenlijst voor wie de geheime link heeft, in twee
// tabbladen (?tab=weekmenu of ?tab=boodschappen; standaard boodschappen, zodat
// bestaande links hetzelfde blijven). Wie de link heeft kan alles aanpassen:
// recepten toevoegen en weghalen, porties, vinkjes, eigen regels, nieuwe week.
export default async function DeelLijstPagina({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { code } = await params;
  if (!(await controleerCode(code))) notFound();
  const { tab: tabWaarde } = await searchParams;
  const tab: LijstTab = tabWaarde === "weekmenu" ? "weekmenu" : "boodschappen";
  const ingelogd = await isIngelogd();

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-2 flex items-center gap-4">
          <p className="flex-1 min-w-0 py-3 text-xs uppercase tracking-widest text-neutral-400">Het Kookboek van Joost</p>
          <BeheerKnop ingelogd={ingelogd} terug={`/lijst/${code}?tab=${tab}`} />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <LijstTabs code={code} actief={tab} />
        {tab === "weekmenu" ? (
          <>
            <h1 className="font-serif text-3xl text-neutral-900 mb-6">Weekmenu</h1>
            <WeekMandje
              initieel={await laadMandje()}
              alle={await laadZoekRecepten()}
              apiBasis={`/api/lijst/${code}/week`}
              deelCode={code}
            />
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl text-neutral-900 mb-2">Boodschappenlijst</h1>
            <LijstWeergave
              initieel={await laadLijst()}
              apiBasis={`/api/lijst/${code}`}
              magEigenRegelsVerwijderen={false}
              deelCode={code}
            />
          </>
        )}
      </main>
    </div>
  );
}
