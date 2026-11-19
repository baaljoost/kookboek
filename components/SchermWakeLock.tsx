"use client";

import { useState, useEffect, useRef } from "react";
import SchakelKnop, { SchermIcoon } from "./SchakelKnop";

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

  // De ruimte eromheen regelt de pagina, zodat de knop direct boven
  // "Op weekmenu" kan staan.
  return (
    <>
      <SchakelKnop
        aan={isActive}
        labelUit="Scherm aan houden"
        labelAan="Scherm blijft aan"
        icoonUit={<SchermIcoon />}
        onClick={toggleWakeLock}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </>
  );
}
