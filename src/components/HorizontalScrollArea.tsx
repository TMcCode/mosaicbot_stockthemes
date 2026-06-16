"use client";

import { useRef } from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<"div">, "children" | "className">;

const DRAG_THRESHOLD_PX = 5;
const DRAG_MULTIPLIER = 1.35;

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

  const resetDrag = () => {
    const host = hostRef.current;
    const pointerId = pointerIdRef.current;
    draggingRef.current = false;
    pointerIdRef.current = null;
    if (host && pointerId != null) {
      try {
        host.releasePointerCapture(pointerId);
      } catch {
        /* capture already released */
      }
    }
  };

  return (
    <div
      ref={hostRef}
      className={className}
      {...rest}
      onPointerDown={(evt) => {
        if (evt.button !== 0) return;
        const host = hostRef.current;
        if (!host) return;
        pointerIdRef.current = evt.pointerId;
        startXRef.current = evt.clientX;
        startScrollLeftRef.current = host.scrollLeft;
        draggingRef.current = false;
      }}
      onPointerMove={(evt) => {
        const host = hostRef.current;
        if (!host || pointerIdRef.current !== evt.pointerId) return;
        const deltaX = evt.clientX - startXRef.current;
        if (!draggingRef.current) {
          if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
          draggingRef.current = true;
          try {
            host.setPointerCapture(evt.pointerId);
          } catch {
            /* ignore */
          }
        }
        host.scrollLeft = startScrollLeftRef.current - deltaX * DRAG_MULTIPLIER;
        evt.preventDefault();
      }}
      onPointerUp={() => {
        resetDrag();
      }}
      onPointerCancel={() => {
        resetDrag();
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
