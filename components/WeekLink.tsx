import Link from "next/link";
import { isIngelogd } from "@/lib/auth";
import { aantalInMandje } from "@/lib/weekMandje";

// "Deze week · 3" rechts in de kop. Alleen voor wie is ingelogd; uitgelogd
// rendert dit niets en er gaat geen databasequery af.
export default async function WeekLink({ className = "" }: { className?: string }) {
  if (!(await isIngelogd())) return null;
  const aantal = await aantalInMandje();
  return (
    <Link
      href="/week"
      className={`text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors whitespace-nowrap shrink-0 ${className}`}
    >
      Deze week · {aantal}
    </Link>
  );
}
