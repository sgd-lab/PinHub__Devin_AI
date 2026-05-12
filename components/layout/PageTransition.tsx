"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Wraps every routed view in a short fade+slide so navigation never feels
 * like a hard cut. The wrapper is keyed by `pathname`, so React replaces
 * the subtree on every route change, which is what triggers the
 * AnimatePresence exit → enter cycle.
 *
 * Reduced-motion users get an instant cross-fade (we shrink the timings
 * and the offset rather than removing the wrapper entirely, so layout
 * stays stable and there's no flash).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const reduce = useReducedMotion();

  const duration = reduce ? 0 : 0.22;
  const offset = reduce ? 0 : 6;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: offset }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -offset }}
        transition={{ duration, ease: "easeOut" }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
