"use client";

import { useEffect, useRef } from "react";

export default function PrintTitleGuard() {
  const originalTitleRef = useRef("");

  useEffect(() => {
    const handleBeforePrint = () => {
      originalTitleRef.current = document.title;
      document.title = "";
    };

    const handleAfterPrint = () => {
      document.title = originalTitleRef.current;
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);

      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  return null;
}
