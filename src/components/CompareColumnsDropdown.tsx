"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  defaultCompareColumnPrefs,
  moveCompareColumnOrder,
  reconcileCompareColumnPrefs,
  toggleCompareColumnVisible,
  type CompareColumnPrefs,
} from "@/lib/compareColumnPrefs";
import { compareColumnHeader } from "@/lib/trendingCompareMetrics";

import styles from "./CompareColumnsDropdown.module.css";

type Props = {
  available: string[];
  prefs: CompareColumnPrefs | null;
  onChange: (next: CompareColumnPrefs) => void;
  onReset: () => void;
};

function triggerSummary(prefs: CompareColumnPrefs | null, available: string[]): string {
  if (!available.length) return "Columns";
  if (!prefs) return "All columns";
  const reconciled = reconcileCompareColumnPrefs(available, prefs);
  if (reconciled.visible.length >= available.length) return "All columns";
  if (reconciled.visible.length === 1) {
    return compareColumnHeader(reconciled.visible[0] ?? "");
  }
  return `${reconciled.visible.length} columns`;
}

export function CompareColumnsDropdown({ available, prefs, onChange, onReset }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const reconciled = useMemo(
    () => reconcileCompareColumnPrefs(available, prefs),
    [available, prefs],
  );
  const isDefault = prefs == null;

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPanelStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 260),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ensurePrefs = (): CompareColumnPrefs =>
    prefs ? reconcileCompareColumnPrefs(available, prefs) : defaultCompareColumnPrefs(available);

  const onToggle = (key: string) => {
    onChange(toggleCompareColumnVisible(ensurePrefs(), key));
  };

  const onDragStart = (index: number) => (e: DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const onDragOver = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const onDrop = (toIndex: number) => (e: DragEvent) => {
    e.preventDefault();
    const from =
      dragIndex ??
      (() => {
        const raw = e.dataTransfer.getData("text/plain");
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })();
    setDragIndex(null);
    setDragOverIndex(null);
    if (from == null) return;
    onChange(moveCompareColumnOrder(ensurePrefs(), from, toIndex));
  };

  const onDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const panel = open ? (
    <div ref={panelRef} className={styles.panel} style={panelStyle} role="listbox" aria-multiselectable="true">
      <p className={styles.hint}>Drag to reorder · uncheck to hide</p>
      {reconciled.order.length === 0 ? (
        <p className={styles.empty}>No columns</p>
      ) : (
        <ul className={styles.list}>
          {reconciled.order.map((key, index) => {
            const checked = reconciled.visible.includes(key);
            return (
              <li
                key={key}
                className={[
                  styles.option,
                  dragIndex === index ? styles.optionDragging : "",
                  dragOverIndex === index ? styles.optionDragOver : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable
                onDragStart={onDragStart(index)}
                onDragOver={onDragOver(index)}
                onDrop={onDrop(index)}
                onDragEnd={onDragEnd}
              >
                <span className={styles.grip} aria-hidden>
                  ⋮⋮
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(key)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Show ${compareColumnHeader(key)}`}
                />
                <span className={styles.optionLabel}>{compareColumnHeader(key)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.resetBtn}
          disabled={isDefault}
          onClick={() => {
            onReset();
          }}
        >
          Reset to default
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <span className={styles.label} id={`${listId}-label`}>
        Columns
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.triggerText}>{triggerSummary(prefs, available)}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {mounted && panel
        ? createPortal(
            panel,
            (wrapRef.current?.closest(".st-surface") as HTMLElement | null) ??
              (wrapRef.current?.closest(".st-theme") as HTMLElement | null) ??
              document.body,
          )
        : null}
    </div>
  );
}
