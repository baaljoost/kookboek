"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  isBeheerder: boolean;
  aantalVoorgesteld: number;
}

export default function AdminNav({ isBeheerder, aantalVoorgesteld }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [toggling, setToggling] = useState(false);

  async function toggleModus() {
    setToggling(true);
    await fetch("/api/admin/modus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aan: !isBeheerder }),
    });
    router.refresh();
    setToggling(false);
  }

  async function uitloggen() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const navLink = (href: string, label: React.ReactNode) => {
    const actief = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`text-sm px-3 py-1.5 transition-colors ${
          actief
            ? "text-neutral-900 font-medium"
            : "text-neutral-500 hover:text-neutral-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-neutral-200">
      <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
        {/* Links */}
        <div className="flex items-center gap-1">
          {navLink("/admin/recepten", "Recepten")}
          {navLink(
            "/admin/voorstellen",
            <span className="flex items-center gap-1.5">
              Voorstellen
              {aantalVoorgesteld > 0 && (
                <span className="bg-terracotta-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-sans font-normal">
                  {aantalVoorgesteld}
                </span>
              )}
            </span>
          )}
          {navLink("/admin/opmerkingen", "Opmerkingen")}
        </div>

        {/* Rechts: toggle + uitloggen */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 whitespace-nowrap">
              Recepten toevoegen
            </span>
            <button
              type="button"
              onClick={toggleModus}
              disabled={toggling}
              aria-pressed={isBeheerder}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                isBeheerder ? "bg-olive-700" : "bg-neutral-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  isBeheerder ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={uitloggen}
            className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </nav>
  );
}
