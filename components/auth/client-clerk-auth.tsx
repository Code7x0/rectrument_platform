"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps } from "react";

/**
 * UserButton portals into the document body. Mount only after hydration so
 * React 19 deletion effects do not hit a null parent (blank white page).
 */
const UserButtonLazy = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false },
);

export function ClientUserButton(
  props: ComponentProps<typeof UserButtonLazy>,
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-block h-9 w-9 shrink-0 rounded-full bg-muted"
        aria-hidden
      />
    );
  }

  return <UserButtonLazy {...props} />;
}
