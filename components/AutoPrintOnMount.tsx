"use client";

import { useEffect } from "react";

export default function AutoPrintOnMount() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
