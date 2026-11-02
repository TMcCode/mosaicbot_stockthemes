import { readFile } from "node:fs/promises";
import path from "node:path";

import styles from "./DocsFactorMarketChart.module.css";

type ChartPayload = {
  title: string;
  theme_name: string;
  start: string;
  end: string;
  factor_ticker?: string;
  factor_label?: string;
  series: {
    dates: string[];
    theme: number[];
    spy?: number[];
    aiq?: number[];
    mtum?: number[];
    /** Theme minus factor daily (after the factor). */
    residual?: number[];
  };
  summary: {
    theme_pct: number;
    spy_pct?: number;
    aiq_pct?: number;
    mtum_pct?: number;
    residual_pct?: number;
  };
  caption: string;
  method_note: string;
};

function fmtPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function polyline(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  yMin: number,
  yMax: number,
): string {
  const n = values.length;
  if (n < 2) return "";
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const span = yMax - yMin || 1;
  return values
    .map((v, i) => {
      const x = padX + (i / (n - 1)) * innerW;
      const y = padY + (1 - (v - yMin) / span) * innerH;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function resolveFactor(data: ChartPayload): {
  series: number[];
  pct: number;
  label: string;
  afterLabel: string;
} | null {
  const ticker = (data.factor_ticker || "").toUpperCase();
  if (data.series.mtum?.length && (ticker === "MTUM" || data.summary.mtum_pct != null)) {
    const pct = data.summary.mtum_pct;
    if (pct == null) return null;
    return {
      series: data.series.mtum,
      pct,
      label: data.factor_ticker || "MTUM",
      afterLabel: "After momentum",
    };
  }
  if (data.series.aiq?.length) {
    const pct = data.summary.aiq_pct;
    if (pct == null) return null;
    return {
      series: data.series.aiq,
      pct,
      label: data.factor_ticker || "AIQ",
      afterLabel: "After AI factor",
    };
  }
  if (data.series.spy?.length && data.summary.spy_pct != null) {
    return {
      series: data.series.spy,
      pct: data.summary.spy_pct,
      label: "SPY",
      afterLabel: "After market",
    };
  }
  return null;
}

async function loadChart(): Promise<ChartPayload | null> {
  try {
    const abs = path.join(process.cwd(), "public", "docs", "factor-market-vs-theme.v0.json");
    const raw = await readFile(abs, "utf8");
    return JSON.parse(raw) as ChartPayload;
  } catch {
    return null;
  }
}

/** Static SVG teaching chart — no client JS / chart library. */
export async function DocsFactorMarketChart() {
  const data = await loadChart();
  if (!data?.series?.dates?.length) return null;

  const { theme } = data.series;
  const factor = resolveFactor(data);
  const afterFactor = data.series.residual;
  const afterPct = data.summary.residual_pct ?? null;
  if (!factor || !afterFactor?.length || afterPct == null) {
    return null;
  }

  const width = 640;
  const height = 220;
  const padX = 12;
  const padY = 16;
  const all = [...theme, ...factor.series, ...afterFactor];
  const yMin = Math.min(...all) - 1;
  const yMax = Math.max(...all) + 1;

  const themePts = polyline(theme, width, height, padX, padY, yMin, yMax);
  const factorPts = polyline(factor.series, width, height, padX, padY, yMin, yMax);
  const afterPts = polyline(afterFactor, width, height, padX, padY, yMin, yMax);

  const span = yMax - yMin || 1;
  const y100 = padY + (1 - (100 - yMin) / span) * (height - padY * 2);

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.title}>{data.title}</figcaption>
      <p className={styles.meta}>
        {data.theme_name} · {fmtDate(data.start)} – {fmtDate(data.end)} · rebased to 100
      </p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${data.theme_name} versus ${factor.label} and residual after that factor, ${data.start} to ${data.end}`}
      >
        <line
          className={styles.baseline}
          x1={padX}
          x2={width - padX}
          y1={y100}
          y2={y100}
        />
        <polyline className={styles.lineSpy} points={afterPts} fill="none" />
        <polyline className={styles.lineResid} points={factorPts} fill="none" />
        <polyline className={styles.lineTheme} points={themePts} fill="none" />
      </svg>
      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${styles.swatchTheme}`} />
          Theme {fmtPct(data.summary.theme_pct)}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchResid}`} />
          {factor.label} {fmtPct(factor.pct)}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchSpy}`} />
          {factor.afterLabel} {fmtPct(afterPct)}
        </li>
      </ul>
      <p className={styles.caption}>{data.caption}</p>
      <p className={styles.method}>{data.method_note}</p>
    </figure>
  );
}
