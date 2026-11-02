import { readFile } from "node:fs/promises";
import path from "node:path";

import styles from "./DocsFactorMarketChart.module.css";

type ChartPayload = {
  title: string;
  theme_name: string;
  start: string;
  end: string;
  expect_label?: string;
  signal_label?: string;
  signal_score?: number;
  signal_rank?: number;
  series: {
    dates: string[];
    theme: number[];
    financials: number[];
    technology: number[];
  };
  summary: {
    theme_pct: number;
    financials_pct: number;
    technology_pct: number;
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
    const abs = path.join(process.cwd(), "public", "docs", "closest-sector-example.v0.json");
    const raw = await readFile(abs, "utf8");
    return JSON.parse(raw) as ChartPayload;
  } catch {
    return null;
  }
}

/** Static SVG teaching chart — baked JSON, no client JS. */
export async function DocsClosestSectorChart() {
  const data = await loadChart();
  if (!data?.series?.dates?.length) return null;

  const { theme, financials, technology } = data.series;
  if (!theme.length || !financials.length || !technology.length) return null;

  const width = 640;
  const height = 220;
  const padX = 12;
  const padY = 16;
  const all = [...theme, ...financials, ...technology];
  const yMin = Math.min(...all) - 1;
  const yMax = Math.max(...all) + 1;

  const themePts = polyline(theme, width, height, padX, padY, yMin, yMax);
  const finPts = polyline(financials, width, height, padX, padY, yMin, yMax);
  const techPts = polyline(technology, width, height, padX, padY, yMin, yMax);

  const span = yMax - yMin || 1;
  const y100 = padY + (1 - (100 - yMin) / span) * (height - padY * 2);

  const signalBits = [
    data.signal_label || "Financials",
    data.signal_score != null ? `score ${data.signal_score}` : null,
    data.signal_rank != null ? `#${data.signal_rank}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.title}>{data.title}</figcaption>
      <p className={styles.meta}>
        {data.theme_name} · {fmtDate(data.start)} – {fmtDate(data.end)} · rebased to 100
        {data.expect_label ? ` · expect ${data.expect_label}` : ""}
        {signalBits ? ` · signal ${signalBits}` : ""}
      </p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${data.theme_name} versus Financials and Technology, ${data.start} to ${data.end}`}
      >
        <line
          className={styles.baseline}
          x1={padX}
          x2={width - padX}
          y1={y100}
          y2={y100}
        />
        <polyline className={styles.lineSpy} points={techPts} fill="none" />
        <polyline className={styles.lineResid} points={finPts} fill="none" />
        <polyline className={styles.lineTheme} points={themePts} fill="none" />
      </svg>
      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${styles.swatchTheme}`} />
          Theme {fmtPct(data.summary.theme_pct)}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchResid}`} />
          Financials {fmtPct(data.summary.financials_pct)}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchSpy}`} />
          Technology {fmtPct(data.summary.technology_pct)}
        </li>
      </ul>
      <p className={styles.caption}>{data.caption}</p>
      <p className={styles.method}>{data.method_note}</p>
    </figure>
  );
}
