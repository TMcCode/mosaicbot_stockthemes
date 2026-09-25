/** Client-only: compose a shareable chart PNG (plot + chrome + export legend). */

export type ChartExportLegendItem = {
  color: string;
  label: string;
};

export type ComposeChartPngOptions = {
  plotCanvas: HTMLCanvasElement;
  background: string;
  textPrimary: string;
  textSecondary: string;
  titleAccent: string;
  titleRest: string;
  titleAccentColor: string;
  footnote?: string | null;
  logoUrl?: string | null;
  legendItems?: ChartExportLegendItem[];
  filename: string;
};

/** Export card width (height packs to content — no empty square). */
const CARD_W = 1200;

function slugifyFilenamePart(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function chartExportFilename(opts: {
  slug: string;
  period: string;
  view: "performance" | "composition";
}): string {
  const slug = slugifyFilenamePart(opts.slug) || "chart";
  const period = slugifyFilenamePart(opts.period) || "1y";
  return `stockthemes-${slug}-${period}-${opts.view}.png`;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

/**
 * Packed social card: title → full-width plot → optional 3-col legend → footer.
 * Height follows content so the logo sits tight under the chart.
 */
export async function composeAndDownloadChartPng(opts: ComposeChartPngOptions): Promise<void> {
  const plot = opts.plotCanvas;
  const plotW = Math.max(1, plot.width);
  const plotH = Math.max(1, plot.height);

  const pad = 28;
  const gap = 12;
  const gapFooter = 10;
  const titleSize = 58;
  const titleRestSize = 36;
  const footnoteSize = 20;
  const logoH = 20;
  const footerH = 28;
  const maxTitleW = CARD_W - pad * 2;

  const legendItems = opts.legendItems?.filter((i) => i.label.trim()) ?? [];
  const colCount =
    legendItems.length <= 1 ? 1 : legendItems.length === 2 ? 2 : 3;
  const legendRows = legendItems.length ? Math.ceil(legendItems.length / colCount) : 0;
  const legendSize = 26;
  const legendGapY = 10;
  const swatch = 12;
  const legendBandH =
    legendRows > 0 ? legendRows * (legendSize + legendGapY) - legendGapY : 0;

  // Title wrap measure
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return;
  const accent = opts.titleAccent.trim();
  const rest = opts.titleRest.trim();
  probe.font = `700 ${titleSize}px var(--font-geist-sans), system-ui, sans-serif`;
  let accentDraw = accent;
  while (accentDraw.length > 4 && probe.measureText(accentDraw).width > maxTitleW) {
    accentDraw = `${accentDraw.slice(0, -2)}…`;
  }
  const accentW = accentDraw ? probe.measureText(accentDraw).width : 0;
  probe.font = `600 ${titleRestSize}px var(--font-geist-sans), system-ui, sans-serif`;
  const restFitsInline =
    Boolean(rest) && accentW + 10 + probe.measureText(rest).width <= maxTitleW;
  const titleBlockH = !rest || restFitsInline ? titleSize + 6 : titleSize + 10 + titleRestSize;

  const plotTop = pad + titleBlockH + gap;
  const plotAvailW = CARD_W - pad * 2;
  // Full-width plot; keep native aspect (export capture is ~4:3)
  const fit = plotAvailW / plotW;
  const drawW = plotAvailW;
  const drawH = Math.round(plotH * fit);
  const plotX = pad;

  const legendTop = plotTop + drawH + (legendRows > 0 ? gap : 0);
  const contentBottom = legendRows > 0 ? legendTop + legendBandH : plotTop + drawH;
  const footerY = contentBottom + gapFooter;
  const cardH = footerY + footerH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = cardH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, CARD_W, cardH);

  // Title
  let y = pad + titleSize;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${titleSize}px var(--font-geist-sans), system-ui, sans-serif`;
  ctx.fillStyle = opts.titleAccentColor;
  let x = pad;
  if (accentDraw) {
    ctx.fillText(accentDraw, x, y);
    x += accentW + 10;
  }
  if (rest) {
    ctx.font = `600 ${titleRestSize}px var(--font-geist-sans), system-ui, sans-serif`;
    ctx.fillStyle = opts.textSecondary;
    if (restFitsInline) {
      ctx.fillText(rest, x, y);
    } else {
      ctx.fillText(rest, pad, y + 10 + titleRestSize);
    }
  }

  ctx.drawImage(plot, plotX, plotTop, drawW, drawH);

  if (legendItems.length) {
    const usableW = CARD_W - pad * 2;
    const colW = usableW / colCount;
    ctx.font = `600 ${legendSize}px var(--font-geist-sans), system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    legendItems.forEach((item, i) => {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const lx = pad + col * colW;
      const ly = legendTop + row * (legendSize + legendGapY) + legendSize / 2;
      ctx.fillStyle = item.color;
      fillRoundRect(ctx, lx, ly - swatch / 2, swatch, swatch, 3);
      ctx.fillStyle = opts.textPrimary;
      const labelX = lx + swatch + 10;
      const maxLabelW = colW - swatch - 18;
      let label = item.label;
      while (label.length > 4 && ctx.measureText(label).width > maxLabelW) {
        label = `${label.slice(0, -2)}…`;
      }
      ctx.fillText(label, labelX, ly);
    });
  }

  // Footer tight under plot / legend
  let footerX = pad;
  if (opts.logoUrl) {
    const logo = await loadImage(opts.logoUrl);
    if (logo) {
      const logoW = Math.round((logo.naturalWidth / Math.max(logo.naturalHeight, 1)) * logoH);
      ctx.drawImage(logo, footerX, footerY, logoW, logoH);
      footerX += logoW + 8;
    }
  }
  ctx.font = `700 ${footnoteSize}px var(--font-geist-sans), system-ui, sans-serif`;
  ctx.fillStyle = opts.textSecondary;
  ctx.textBaseline = "top";
  ctx.fillText("stockthemes.ai", footerX, footerY + 1);
  footerX += ctx.measureText("stockthemes.ai").width + 12;
  const note = opts.footnote?.trim();
  if (note) {
    ctx.font = `400 ${footnoteSize}px var(--font-geist-sans), system-ui, sans-serif`;
    ctx.globalAlpha = 0.85;
    const maxNoteW = CARD_W - footerX - pad;
    let drawn = note;
    while (drawn.length > 4 && ctx.measureText(drawn).width > maxNoteW) {
      drawn = `${drawn.slice(0, -2)}…`;
    }
    ctx.fillText(drawn, footerX, footerY + 1);
    ctx.globalAlpha = 1;
  }

  downloadCanvasPng(canvas, opts.filename);
}
