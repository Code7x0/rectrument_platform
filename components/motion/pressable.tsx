"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { springs, useMotionSafe } from "@/components/motion/presets";
import { cn } from "@/lib/utils";

interface PressableProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "button";
}

/** Hover + press feedback for cards / custom clickable surfaces. */
export function Pressable({
  children,
  className,
  as = "div",
}: PressableProps) {
  const animate = useMotionSafe();
  const Comp = as === "button" ? motion.button : motion.div;

  if (!animate) {
    const Static = as === "button" ? "button" : "div";
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Comp
      className={cn("will-change-transform", className)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={springs.press}
    >
      {children}
    </Comp>
  );
}
