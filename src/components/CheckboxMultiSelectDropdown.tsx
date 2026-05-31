"use client";

import { useEffect, useId, useRef, useState } from "react";

import styles from "./CheckboxMultiSelectDropdown.module.css";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
  /** Inline label + trigger on one row (compare hero filters). */
  layout?: "stacked" | "inline";
  /** Narrow trigger for tight toolbars (overlay sector picker). */
  compact?: boolean;
};

function summaryLabel(selected: string[], options: string[], allLabel: string): string {
  if (options.length === 0) return allLabel;
  if (selected.length === 0) return "None selected";
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
  layout = "stacked",
  compact = false,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.triggerText}>{summaryLabel(selected, options, emptyLabel)}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className={styles.panel} role="listbox" aria-multiselectable="true">
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
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
