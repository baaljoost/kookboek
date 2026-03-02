"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wachtwoord }),
    });

    if (res.ok) {
      router.push("/admin/recepten");
      router.refresh();
    } else {
      const data = await res.json();
      setFout(data.error ?? "Inloggen mislukt");
      setBezig(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl text-neutral-900 mb-8 text-center">
          Het Kookboek van Joost
        </h1>
        <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-neutral-200 p-8 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-2">
              Wachtwoord
            </label>
            <input
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="input w-full"
              autoFocus
              required
            />
          </div>
          {fout && <p className="text-red-600 text-sm">{fout}</p>}
          <button
            type="submit"
            disabled={bezig || !wachtwoord}
            className="btn-primary w-full disabled:opacity-50"
          >
            {bezig ? "Inloggen…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
