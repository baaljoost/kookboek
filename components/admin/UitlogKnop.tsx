"use client";

import { useRouter } from "next/navigation";

export default function UitlogKnop() {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin");
  }

  return (
    <button onClick={uitloggen} className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
      Uitloggen
    </button>
  );
}
