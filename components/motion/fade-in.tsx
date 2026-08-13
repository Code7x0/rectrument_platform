"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

import { fadeUp, springs, useMotionSafe } from "@/components/motion/presets";
import { cn } from "@/lib/utils";

interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Skip transform for dense dashboards — opacity only. */
  opacityOnly?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  className,
  opacityOnly = false,
  ...props
}: FadeInProps) {
  const animate = useMotionSafe();
  if (!animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={opacityOnly ? { opacity: 0 } : fadeUp.hidden}
      animate={opacityOnly ? { opacity: 1 } : fadeUp.show}
      transition={{ ...springs.soft, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
