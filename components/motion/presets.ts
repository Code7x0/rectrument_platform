"use client";

import { useReducedMotion } from "framer-motion";

/** Shared spring presets — snappy, interruptible, Apple-like. */
export const springs = {
  press: { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.6 },
  soft: { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.8 },
  snappy: { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return !reduce;
}
