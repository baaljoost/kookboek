import Link from "next/link";
import VoorstelFormulier from "@/components/VoorstelFormulier";
import BeheerKnop from "@/components/BeheerKnop";
import { isIngelogd } from "@/lib/auth";

export default async function VoorstellenPage() {
  const ingelogd = await isIngelogd();
  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href="/"
              className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
            >
              ← Naar het kookboek
            </Link>
            <h1 className="font-serif text-2xl text-neutral-900 mt-1">
              Recept voorstellen
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Vul het recept zo volledig mogelijk in. Het wordt beoordeeld voordat het wordt toegevoegd.
            </p>
          </div>
          <BeheerKnop ingelogd={ingelogd} terug="/recepten/voorstellen" className="-mt-2.5" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <VoorstelFormulier />
      </main>
    </div>
  );
}
