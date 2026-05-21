export type TreemapLayoutNode<T> = {
  data: T;
  weight: number;
};

export type TreemapRect<T> = {
  data: T;
  x: number;
  y: number;
  w: number;
  h: number;
};

function splitByWeight<T>(nodes: TreemapLayoutNode<T>[]): [TreemapLayoutNode<T>[], TreemapLayoutNode<T>[]] {
  const total = nodes.reduce((s, n) => s + n.weight, 0);
  const target = total / 2;
  const a: TreemapLayoutNode<T>[] = [];
  const b: TreemapLayoutNode<T>[] = [];
  let run = 0;
  for (const n of nodes) {
    if (run < target || a.length === 0) {
      a.push(n);
      run += n.weight;
    } else {
      b.push(n);
    }
  }
  if (b.length === 0 && a.length > 1) {
    b.push(a.pop() as TreemapLayoutNode<T>);
  }
  return [a, b];
}

/** Squarified-style recursive partition (same approach as mosaicbot_marketmaps). */
export function buildTreemapRects<T>(
  nodes: TreemapLayoutNode<T>[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapRect<T>[] {
  if (nodes.length === 0 || w <= 0 || h <= 0) return [];
  if (nodes.length === 1) {
    return [{ data: nodes[0].data, x, y, w, h }];
  }
  const [a, b] = splitByWeight(nodes);
  const sumA = a.reduce((s, n) => s + n.weight, 0);
  const sumB = b.reduce((s, n) => s + n.weight, 0);
  const total = Math.max(sumA + sumB, 1e-9);
  const vertical = w >= h;
  if (vertical) {
    const wA = w * (sumA / total);
    return [
      ...buildTreemapRects(a, x, y, wA, h),
      ...buildTreemapRects(b, x + wA, y, Math.max(0, w - wA), h),
    ];
  }
  const hA = h * (sumA / total);
  return [
    ...buildTreemapRects(a, x, y, w, hA),
    ...buildTreemapRects(b, x, y + hA, w, Math.max(0, h - hA)),
  ];
}

export function returnTileBackground(v: number | null | undefined): string | undefined {
  if (v == null || !Number.isFinite(v)) return undefined;
  const n = Number(v);
  const mag = Math.min(1, Math.abs(n) / 6);
  const alpha = 0.12 + 0.38 * mag;
  if (n > 0) {
    return `linear-gradient(180deg, rgba(0,200,90,${alpha}) 0%, rgba(0,120,60,${alpha * 0.55}) 100%)`;
  }
  if (n < 0) {
    return `linear-gradient(180deg, rgba(220,60,60,${alpha}) 0%, rgba(120,30,30,${alpha * 0.55}) 100%)`;
  }
  return undefined;
}

export function formatReturnPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}
