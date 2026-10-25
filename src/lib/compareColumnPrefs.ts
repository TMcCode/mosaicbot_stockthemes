/** Session-only compare column visibility + order (not persisted across visits). */

export type CompareColumnPrefs = {
  /** Permutation of available keys (visible and hidden). */
  order: string[];
  /** Subset of order that is shown; at least one. */
  visible: string[];
};

export function defaultCompareColumnPrefs(available: string[]): CompareColumnPrefs {
  const cols = available.filter(Boolean);
  return { order: [...cols], visible: [...cols] };
}

/**
 * Keep prefs aligned with the live catalog.
 * New keys (e.g. Premarket when session starts) append hidden — do not auto-show
 * once the user has customized.
 */
export function reconcileCompareColumnPrefs(
  available: string[],
  prefs: CompareColumnPrefs | null,
): CompareColumnPrefs {
  const cols = available.filter(Boolean);
  if (!cols.length) return { order: [], visible: [] };
  if (!prefs) return defaultCompareColumnPrefs(cols);

  const avail = new Set(cols);
  const order = prefs.order.filter((k) => avail.has(k));
  for (const k of cols) {
    if (!order.includes(k)) order.push(k);
  }
  let visible = prefs.visible.filter((k) => avail.has(k));
  if (visible.length === 0) visible = [...cols];
  return { order, visible };
}

/** Table columns: prefs order ∩ visible. */
export function resolveCompareDisplayColumns(
  available: string[],
  prefs: CompareColumnPrefs | null,
): string[] {
  const reconciled = reconcileCompareColumnPrefs(available, prefs);
  const vis = new Set(reconciled.visible);
  const out = reconciled.order.filter((k) => vis.has(k));
  return out.length > 0 ? out : reconciled.order;
}

export function toggleCompareColumnVisible(
  prefs: CompareColumnPrefs,
  key: string,
): CompareColumnPrefs {
  const on = prefs.visible.includes(key);
  if (on) {
    if (prefs.visible.length <= 1) return prefs;
    return { ...prefs, visible: prefs.visible.filter((k) => k !== key) };
  }
  return { ...prefs, visible: [...prefs.visible, key] };
}

export function moveCompareColumnOrder(
  prefs: CompareColumnPrefs,
  fromIndex: number,
  toIndex: number,
): CompareColumnPrefs {
  if (fromIndex === toIndex) return prefs;
  if (fromIndex < 0 || toIndex < 0) return prefs;
  if (fromIndex >= prefs.order.length || toIndex >= prefs.order.length) return prefs;
  const order = [...prefs.order];
  const [item] = order.splice(fromIndex, 1);
  if (item == null) return prefs;
  order.splice(toIndex, 0, item);
  return { ...prefs, order };
}
