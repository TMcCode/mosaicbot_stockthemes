"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import styles from "./CheckboxMultiSelectDropdown.module.css";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
  /** When nothing is checked, show emptyLabel instead of "None selected" (filter = all). */
  emptyMeansAll?: boolean;
  /** Inline label + trigger on one row (compare hero filters). */
  layout?: "stacked" | "inline";
  /** Narrow trigger for tight toolbars (overlay sector picker). */
  compact?: boolean;
};

function summaryLabel(
  selected: string[],
  options: string[],
  allLabel: string,
  emptyMeansAll: boolean,
): string {
  if (options.length === 0) return allLabel;
  if (selected.length === 0) return emptyMeansAll ? allLabel : "None selected";
  if (selected.length >= options.length) return allLabel;
  if (selected.length === 1) return selected[0];
  return `${selected.length} selected`;
}

export function CheckboxMultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  emptyLabel = "All",
  emptyMeansAll = false,
  layout = "stacked",
  compact = false,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const minWidth = compact ? 240 : rect.width;
      setPanelStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, minWidth),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, compact]);

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

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  };

  const panelClass = [styles.panel, compact ? styles.panelCompact : ""].filter(Boolean).join(" ");

  const panel = open ? (
    <div
      ref={panelRef}
      className={panelClass}
      style={panelStyle}
      role="listbox"
      aria-multiselectable="true"
    >
      {options.length === 0 ? (
        <p className={styles.empty}>No options</p>
      ) : (
        <>
          <div className={styles.bulkActions}>
            <button
              type="button"
              className={styles.bulkBtn}
              disabled={selected.length >= options.length}
              onClick={() => onChange([...options])}
            >
              Select all
            </button>
            <button
              type="button"
              className={styles.bulkBtn}
              disabled={selected.length === 0}
              onClick={() => onChange([])}
            >
              Unselect all
            </button>
          </div>
          <ul className={styles.list}>
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <li key={opt}>
                  <label className={styles.option}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                    <span>{opt}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  ) : null;

  return (
    <div
      className={
        layout === "inline"
          ? [
              styles.wrap,
              styles.wrapInline,
              compact ? styles.wrapInlineCompact : "",
            ]
              .filter(Boolean)
              .join(" ")
          : styles.wrap
      }
      ref={wrapRef}
    >
      <span
        className={layout === "inline" ? `${styles.label} ${styles.labelInline}` : styles.label}
        id={`${listId}-label`}
      >
        {label}
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
        <span className={styles.triggerText}>
          {summaryLabel(selected, options, emptyLabel, emptyMeansAll)}
        </span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {mounted && panel
        ? createPortal(
            panel,
            // Stay under theme surface so --card-surface / --text-* resolve (body has dark fallbacks only).
            (wrapRef.current?.closest(".st-surface") as HTMLElement | null) ??
              (wrapRef.current?.closest(".st-theme") as HTMLElement | null) ??
              document.body,
          )
        : null}
    </div>
  );
}
