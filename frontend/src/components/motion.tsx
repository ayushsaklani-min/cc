// Motion primitives. All of them render their content immediately and fully
// when the user prefers reduced motion; none carries meaning on its own.
"use client";

import { animate, motion, useInView, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

type Direction = "up" | "left" | "right" | "scale" | "none";

const OFFSET: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up: { y: 28 },
  left: { x: -36 },
  right: { x: 36 },
  scale: { scale: 0.94 },
  none: {},
};

/** Fades and slides its child in the first time it scrolls into view. */
export function Reveal({
  children,
  from = "up",
  delay = 0,
  className,
  ...rest
}: { children: ReactNode; from?: Direction; delay?: number } & Omit<HTMLMotionProps<"div">, "children">) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...OFFSET[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Parent for a staggered entrance; children are StaggerItem. */
export function Stagger({
  children,
  className,
  gap = 0.09,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  as?: "div" | "ol" | "ul" | "dl";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;
  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  from = "up",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  from?: Direction;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;
  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, ...OFFSET[from] },
        shown: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.75, ease: EASE } },
      }}
    >
      {children}
    </Tag>
  );
}

/** Counts from zero to a fixed value when scrolled into view. The value is always the real one. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, { duration: 1.4, ease: EASE, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      <span aria-hidden>{reduce ? value : shown}</span>
    </span>
  );
}

/** Tracks the pointer so the `.spotlight` border can follow it. */
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div onPointerMove={move} className={`spotlight ${className}`}>
      {children}
    </div>
  );
}
