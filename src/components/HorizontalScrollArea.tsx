"use client";

import { useRef } from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<"div">, "children" | "className">;

/**
 * Enables drag-to-scroll for horizontally overflowing content, including desktop
 * device emulation where touch gestures are not always forwarded.
 */
export function HorizontalScrollArea({ className, children, ...rest }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const DRAG_MULTIPLIER = 1.35;

  return (
    <div
      ref={hostRef}
      className={className}
      {...rest}
      onPointerDown={(evt) => {
        const host = hostRef.current;
        if (!host) return;
        draggingRef.current = true;
        pointerIdRef.current = evt.pointerId;
        startXRef.current = evt.clientX;
        startScrollLeftRef.current = host.scrollLeft;
        host.setPointerCapture(evt.pointerId);
      }}
      onPointerMove={(evt) => {
        const host = hostRef.current;
        if (!host || !draggingRef.current) return;
        const deltaX = evt.clientX - startXRef.current;
        host.scrollLeft = startScrollLeftRef.current - deltaX * DRAG_MULTIPLIER;
        evt.preventDefault();
      }}
      onPointerUp={() => {
        const host = hostRef.current;
        if (!host) return;
        draggingRef.current = false;
        if (pointerIdRef.current != null) {
          try {
            host.releasePointerCapture(pointerIdRef.current);
          } catch {}
        }
        pointerIdRef.current = null;
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
        pointerIdRef.current = null;
      }}
      onWheel={(evt) => {
        const host = hostRef.current;
        if (!host) return;
        const canScrollX = host.scrollWidth > host.clientWidth + 1;
        if (!canScrollX) return;
        const primaryDelta =
          Math.abs(evt.deltaX) > Math.abs(evt.deltaY) ? evt.deltaX : evt.deltaY;
        if (primaryDelta === 0) return;
        host.scrollLeft += primaryDelta;
        evt.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
