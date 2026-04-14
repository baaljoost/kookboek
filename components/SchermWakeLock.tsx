"use client";

import { useState, useEffect, useRef } from "react";

type WakeLockSentinel = any;

export default function SchermWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Check if Wake Lock API is supported
    if ("wakeLock" in navigator) {
      setIsSupported(true);
    }

    // Release wake lock on page unload
    const handleUnload = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  const toggleWakeLock = async () => {
    if (!isSupported) {
      setError("Wake Lock API niet ondersteund");
      return;
    }

    try {
      if (isActive && wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        setError(null);
      } else {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setIsActive(true);
        setError(null);

        // Re-acquire if page becomes visible after being hidden
        const handleVisibilityChange = () => {
          if (document.hidden && wakeLockRef.current) {
            wakeLockRef.current.release();
          } else if (!document.hidden && isActive) {
            navigator.wakeLock.request("screen").then((lock) => {
              wakeLockRef.current = lock;
            });
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout bij toggling");
      setIsActive(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="mb-6">
      <button
        onClick={toggleWakeLock}
        className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? "bg-olive-100 text-olive-900 border border-olive-300"
            : "bg-neutral-100 text-neutral-700 border border-neutral-200 hover:border-neutral-300"
        }`}
      >
        {isActive ? "🔒 Scherm blijft aan" : "📱 Scherm aan houden"}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
