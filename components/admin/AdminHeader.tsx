"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  isBeheerder: boolean;
}

export default function AdminHeader({ isBeheerder }: Props) {
  const router = useRouter();
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
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {/* Modus toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400 whitespace-nowrap">Recepten toevoegen</span>
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

      {/* Uitloggen */}
      <button
        type="button"
        onClick={uitloggen}
        className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
      >
        Uitloggen
      </button>
    </div>
  );
}
