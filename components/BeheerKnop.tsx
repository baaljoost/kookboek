import Link from "next/link";
import { loginLink } from "@/lib/terugAdres";

// Klein koksmutsje rechtsboven in de witte kop. Uitgelogd naar de login (en
// daarna terug naar `terug`), ingelogd naar het beheer. Icoon: Lucide "chef-hat".
// Het tikvlak is 44x44px, de min-negatieve marge houdt het icoon zelf op de
// rand van de kop. Krimpt nooit, zodat de titel ernaast het gat vult.
export default function BeheerKnop({
  ingelogd,
  terug,
  className = "",
}: {
  ingelogd: boolean;
  terug: string;
  className?: string;
}) {
  const label = ingelogd ? "Beheer" : "Inloggen";
  return (
    <Link
      href={ingelogd ? "/admin" : loginLink(terug)}
      aria-label={label}
      title={label}
      className={`shrink-0 w-11 h-11 -mr-3 flex items-center justify-center transition-colors ${
        ingelogd ? "text-olive-700 hover:text-olive-800" : "text-neutral-300 hover:text-neutral-500"
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
        aria-hidden="true"
      >
        <path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" />
        <path d="M6 17h12" />
      </svg>
    </Link>
  );
}
