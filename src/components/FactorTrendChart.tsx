"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  LineStyle,
  createChart,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";

import { publicAssetPath } from "@/lib/siteUrl";

import styles from "@/components/FactorsPageClient.module.css";

export type FactorChartSeries = {
  id: string;
  label: string;
  dates: string[];
  values: number[];
  color: string;
  dashed?: boolean;
};

function toDay(date: string): string {
  if (date.length >= 10 && date[4] === "-" && date[7] === "-") return date.slice(0, 10);
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return date;
  return new Date(parsed).toISOString().slice(0, 10);
}

function toPoints(dates: string[], values: number[]) {
  const count = Math.min(dates.length, values.length);
  const points: { time: string; value: number }[] = [];
  for (let index = 0; index < count; index++) {
    const value = Number(values[index]);
    if (!Number.isFinite(value)) continue;
    const day = toDay(String(dates[index]));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    points.push({ time: day, value });
  }
  points.sort((a, b) => a.time.localeCompare(b.time));
  return points;
}

function formatTooltipDate(time: MouseEventParams["time"] | undefined): string {
  if (!time) return "";
  if (typeof time === "string") return time;
  if (typeof time === "number") {
    const date = new Date(time * 1000);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  if (typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    const year = Number(time.year);
    const month = Number(time.month);
    const day = Number(time.day);
    if (![year, month, day].every(Number.isFinite)) return "";
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return "";
}

function lineDataValue(data: unknown): number | null {
  if (data && typeof data === "object" && "value" in data) {
    const value = Number((data as { value: unknown }).value);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function FactorTrendChart({
  series,
  ariaLabel,
}: {
  series: FactorChartSeries[];
  ariaLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || !series.length) return;

    const chart = createChart(element, {
      autoSize: false,
      width: Math.max(element.clientWidth, 200),
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#0f1115" },
        textColor: "#a6abb9",
        fontSize: 12,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
      handleScroll: false,
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const lineMeta = new Map<ISeriesApi<"Line">, { id: string; label: string }>();
    for (const item of series) {
      const line = chart.addLineSeries({
        color: item.color,
        lineWidth: item.id === "factor" ? 3 : 2,
        lineStyle: item.dashed ? LineStyle.Dotted : LineStyle.Solid,
        title: "",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: item.id === "factor",
      });
      line.setData(toPoints(item.dates, item.values));
      lineMeta.set(line, { id: item.id, label: item.label });
    }
    chart.timeScale().fitContent();

    const onCrosshairMove = (param: MouseEventParams) => {
      const tooltip = tipRef.current;
      if (!tooltip || !param.point || !param.seriesData?.size) {
        if (tooltip) tooltip.style.display = "none";
        return;
      }

      let picked: ISeriesApi<"Line"> | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const [rawLine, rawData] of param.seriesData) {
        const line = rawLine as ISeriesApi<"Line">;
        if (!lineMeta.has(line)) continue;
        const value = lineDataValue(rawData);
        if (value == null) continue;
        const y = line.priceToCoordinate(value);
        if (y == null) continue;
        const distance = Math.abs(y - param.point.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          picked = line;
        }
      }
      const value = picked ? lineDataValue(param.seriesData.get(picked)) : null;
      const meta = picked ? lineMeta.get(picked) : undefined;
      if (!meta || value == null) {
        tooltip.style.display = "none";
        return;
      }
      const date = formatTooltipDate(param.time);
      tooltip.textContent = `${date ? `${date} · ` : ""}${meta.label} — ${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
      tooltip.style.display = "block";
      tooltip.style.left = `${Math.round(param.point.x + 10)}px`;
      tooltip.style.top = `${Math.round(param.point.y + 10)}px`;
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!wrapRef.current) return;
            chart.applyOptions({ width: Math.max(wrapRef.current.clientWidth, 200) });
            chart.timeScale().fitContent();
          })
        : null;
    observer?.observe(element);

    return () => {
      observer?.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      try {
        chart.remove();
      } catch {}
    };
  }, [series]);

  return (
    <div className={styles.factorChartCanvasWrap}>
      <div ref={wrapRef} className={styles.factorChartCanvas} role="img" aria-label={ariaLabel} />
      <div className={styles.factorChartBrand} aria-hidden="true">
        {/* Static-export brand watermark; intrinsic optimization is unnecessary inside the canvas. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicAssetPath("/brand/logo-full-dark-tight.png")}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <div ref={tipRef} className={styles.factorChartTooltip} />
    </div>
  );
}
