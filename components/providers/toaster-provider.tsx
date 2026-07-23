"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * Sonner portals into document.body. Defer until after hydration to avoid
 * React 19 removeChild crashes that blank the page during route transitions.
 */
export function ToasterProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Toaster richColors position="top-right" />;
}
