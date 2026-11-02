import { readFile } from "node:fs/promises";
import path from "node:path";

import styles from "./DocsFactorMarketChart.module.css";

type ChartPayload = {
  title: string;
  theme_name: string;
  start: string;
  end: string;
  series: {
    dates: string[];
    theme: number[];
    spy: number[];
    /** AIQ long leg (preferred teaching series). */
    aiq?: number[];
    /** Legacy market residual series. */
    residual?: number[];
  };
  summary: {
    theme_pct: number;
    spy_pct: number;
    aiq_pct?: number;
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

  const { theme, spy } = data.series;
  const factorSeries = data.series.aiq?.length ? data.series.aiq : data.series.residual;
  const factorPct =
    data.summary.aiq_pct ?? data.summary.residual_pct ?? null;
  const factorLabel = data.series.aiq?.length ? "AIQ" : "After market";
  if (!factorSeries?.length || factorPct == null) return null;

  const width = 640;
  const height = 220;
  const padX = 12;
  const padY = 16;
  const all = [...theme, ...spy, ...factorSeries];
  const yMin = Math.min(...all) - 1;
  const yMax = Math.max(...all) + 1;

  const themePts = polyline(theme, width, height, padX, padY, yMin, yMax);
  const spyPts = polyline(spy, width, height, padX, padY, yMin, yMax);
  const factorPts = polyline(factorSeries, width, height, padX, padY, yMin, yMax);

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
        aria-label={`${data.theme_name} versus SPY and ${factorLabel}, ${data.start} to ${data.end}`}
      >
        <line
          className={styles.baseline}
          x1={padX}
          x2={width - padX}
          y1={y100}
          y2={y100}
        />
        <polyline className={styles.lineSpy} points={spyPts} fill="none" />
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
          {factorLabel} {fmtPct(factorPct)}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchSpy}`} />
          SPY {fmtPct(data.summary.spy_pct)}
        </li>
      </ul>
      <p className={styles.caption}>{data.caption}</p>
      <p className={styles.method}>{data.method_note}</p>
    </figure>
  );
}
