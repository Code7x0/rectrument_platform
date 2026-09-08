import Image from "next/image";

import { APP_NAME_SHORT, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
  onDark?: boolean;
}

export function BrandLogo({
  compact = false,
  showTagline = true,
  className,
  onDark = false,
}: BrandLogoProps) {
  const size = compact ? 32 : 38;

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Image
        src="/brand/ovato-logo.png"
        alt={`${APP_NAME_SHORT} logo`}
        width={size}
        height={size}
        className="shrink-0 rounded-[9px]"
        priority
      />
      <div className="min-w-0">
        <div
          className={cn(
            "truncate font-bold tracking-[0.2px]",
            onDark ? "text-[#F6F4FF]" : "text-foreground",
            compact ? "text-[15px]" : "text-[17px]",
          )}
        >
          {APP_NAME_SHORT}
          <span className="text-[#2FE0C4]">.ai</span>
        </div>
        {showTagline ? (
          <div
            className={cn(
              "truncate text-[10px] sm:text-[11px]",
              onDark ? "text-[#A7A2D6]" : "text-muted-foreground",
            )}
          >
            {APP_TAGLINE}
          </div>
        ) : null}
      </div>
    </div>
  );
}
