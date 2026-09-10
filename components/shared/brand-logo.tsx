import Image from "next/image";

import {
  APP_BRAND_MARK,
  BRAND_ICON_PATH,
  BRAND_LOGO_PATH,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg";

interface BrandLogoProps {
  /** @deprecated Prefer `size="sm"` */
  compact?: boolean;
  iconOnly?: boolean;
  size?: BrandLogoSize;
  className?: string;
  onDark?: boolean;
}

const WORDMARK_SIZE: Record<
  BrandLogoSize,
  { width: number; height: number; className: string }
> = {
  sm: {
    width: 146,
    height: 38,
    className: "max-h-[38px] max-w-[146px]",
  },
  md: {
    width: 140,
    height: 36,
    className: "max-h-9 max-w-[140px]",
  },
  lg: {
    width: 156,
    height: 44,
    className: "max-h-11 max-w-[156px]",
  },
};

/** Official OVATO.ai wordmark — tagline is baked into the logo asset. */
export function BrandLogo({
  compact = false,
  iconOnly = false,
  size,
  className,
  onDark = false,
}: BrandLogoProps) {
  const resolvedSize: BrandLogoSize = size ?? (compact ? "sm" : "md");
  const wordmark = WORDMARK_SIZE[resolvedSize];

  if (iconOnly) {
    return (
      <Image
        src={BRAND_ICON_PATH}
        alt={`${APP_BRAND_MARK} logo`}
        width={44}
        height={44}
        className={cn("h-11 w-11 shrink-0 rounded-[6px] object-contain", className)}
        priority
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center",
        onDark && "rounded-lg bg-white px-2 py-1 shadow-sm",
        className,
      )}
    >
      <Image
        src={BRAND_LOGO_PATH}
        alt={APP_BRAND_MARK}
        width={wordmark.width}
        height={wordmark.height}
        className={cn(
          "h-auto w-auto object-contain object-left",
          wordmark.className,
        )}
        priority
      />
    </div>
  );
}
