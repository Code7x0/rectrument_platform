import Image from "next/image";

import {
  APP_BRAND_MARK,
  BRAND_ICON_PATH,
  BRAND_LOGO_PATH,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
  onDark?: boolean;
}

/** Official OVATO.ai wordmark — tagline is baked into the logo asset. */
export function BrandLogo({
  compact = false,
  iconOnly = false,
  className,
  onDark = false,
}: BrandLogoProps) {
  if (iconOnly) {
    return (
      <Image
        src={BRAND_ICON_PATH}
        alt={`${APP_BRAND_MARK} logo`}
        width={40}
        height={40}
        className={cn("shrink-0 rounded-[8px] object-contain", className)}
        priority
      />
    );
  }

  const width = compact ? 156 : 200;
  const height = compact ? 52 : 66;

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center",
        onDark && "rounded-xl bg-white px-2.5 py-1.5 shadow-sm",
        className,
      )}
    >
      <Image
        src={BRAND_LOGO_PATH}
        alt={APP_BRAND_MARK}
        width={width}
        height={height}
        className="h-auto w-auto max-h-[66px] max-w-[200px] object-contain object-left"
        priority
      />
    </div>
  );
}
