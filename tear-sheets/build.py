#!/usr/bin/env python3
"""
Build a stockthemes Snapshot tear sheet for one theme slug.

Usage:
  python tear-sheets/build.py --slug business-services-26-ai-governance-trust-compliance
  python tear-sheets/build.py --slug <slug> --out tear-sheets/out/my.html
  python tear-sheets/build.py --slug <slug> --offline   # use cached _data only

Opens best via Next proxy (live returns):
  http://localhost:3000/tear-sheets/<out-file>
"""

from __future__ import annotations

import argparse
import html
import json
import math
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "_data"
CDN = "https://storage.stockthemes.ai"
UA = {"User-Agent": "stockthemes-tear-sheet-builder/1.0"}

PERF_ORDER = [
    ("1D", "1D"),
    ("10D", "10D"),
    ("IranWar", "Iran War"),
    ("YTD", "YTD"),
    ("Period", "1Y"),
    ("2Y", "2Y"),
]

HOLD_CAP = 16


def fmt_live_asof(iso: str | None) -> str:
    if not iso:
        return "…"
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except ValueError:
        return str(iso)
    local = d.astimezone(ZoneInfo("America/New_York"))
    # 12-hour ET, no leading zero on hour
    h = local.strftime("%I").lstrip("0") or "12"
    return f"{local.strftime('%Y-%m-%d')} {h}:{local.strftime('%M %p')} ET"

KEYWORD_CAPS = {"policy": 6, "product": 6, "event": 4, "intent": 5}


# ---------------------------------------------------------------------------
# Fetch / IO
# ---------------------------------------------------------------------------


def cache_candidates(path: str) -> list[Path]:
    """Primary cache path plus legacy aliases used by earlier hand caches."""
    primary = path.strip("/").replace("/", "__")
    alts: list[str] = [primary]
    if primary.startswith("stockcontext__themes__"):
        alts.append("sc__" + primary[len("stockcontext__") :])
    # unique preserve order
    seen: set[str] = set()
    out: list[Path] = []
    for name in alts:
        if name in seen:
            continue
        seen.add(name)
        out.append(DATA / name)
    return out


def fetch_json(path: str, *, offline: bool) -> dict[str, Any]:
    DATA.mkdir(parents=True, exist_ok=True)
    candidates = cache_candidates(path)
    dest = candidates[0]
    if offline:
        for c in candidates:
            if c.exists():
                return json.loads(c.read_text())
        raise FileNotFoundError(f"offline missing cache: {dest}")
    url = f"{CDN}/{path.lstrip('/')}"
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            raw = r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"GET {url} -> {e.code}") from e
    dest.write_bytes(raw)
    return json.loads(raw)


def load_bundle(slug: str, *, offline: bool) -> dict[str, Any]:
    paths = {
        "theme": f"themes/{slug}.json",
        "price_returns": f"themes/{slug}.price_returns.v0.json",
        "chart": f"themes/{slug}.chart.v0.json",
        "factor_profile": f"themes/{slug}.factor_profile.v0.json",
        "factor_attribution": f"themes/{slug}.factor_attribution.v0.json",
        "quality_risk": f"themes/{slug}.quality_risk.v0.json",
        "revenue": f"themes/{slug}.revenue.v0.json",
        "notes": f"themes/{slug}.notes.v0.json",
        "spy": "spy_snapshot.v0.json",
        "sc_meta": f"stockcontext/themes/{slug}/meta.v0.json",
        "sc_overview": f"stockcontext/themes/{slug}/tables/overview.v0.json",
    }
    out: dict[str, Any] = {"slug": slug}
    missing: list[str] = []
    for key, path in paths.items():
        try:
            out[key] = fetch_json(path, offline=offline)
        except Exception as e:
            if key in {"sc_meta", "sc_overview", "factor_attribution", "notes"}:
                out[key] = None
                missing.append(f"{key}: {e}")
            else:
                raise
    if missing:
        print("warn optional missing:", "; ".join(missing), file=sys.stderr)
    return out


# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------


def esc(s: Any) -> str:
    return html.escape("" if s is None else str(s), quote=True)


def pct(v: Any, digits: int = 1) -> str:
    if v is None:
        return "—"
    try:
        n = float(v)
    except (TypeError, ValueError):
        return "—"
    if not math.isfinite(n):
        return "—"
    return f"{n:+.{digits}f}%"


def pct_cls(v: Any) -> str:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return "flat"
    if not math.isfinite(n) or abs(n) < 0.05:
        return "flat"
    return "up" if n > 0 else "down"


def num(v: Any, digits: int = 1) -> str:
    if v is None:
        return "—"
    try:
        n = float(v)
    except (TypeError, ValueError):
        return "—"
    if not math.isfinite(n):
        return "—"
    if abs(n - round(n)) < 1e-9 and digits <= 1:
        return str(int(round(n)))
    return f"{n:.{digits}f}"


def group_title(group_slug: str | None) -> str:
    if not group_slug:
        return "Theme"
    return group_slug.replace("-", " ").replace("_", " ").title()


def display_ticker(ticker: str) -> str:
    t = ticker or ""
    for suf in (".LSE", ".SW", ".PA", ".DE", ".TO", ".HK", ".AX"):
        if t.endswith(suf):
            return t[: -len(suf)]
    return t


def short_factor_label(label: str) -> str:
    s = (label or "").strip()
    s = re.sub(r"\s+Exposure$", "", s)
    s = re.sub(r"\s+Narrative$", "", s)
    replacements = {
        "Market Beta": "Market Beta",
        "AI / Innovation Narrative": "AI / Innovation",
        "AI / Innovation": "AI / Innovation",
        "Retail Speculation": "Retail Speculation",
        "Momentum": "Momentum",
        "Small-Cap": "Small-Cap",
        "Crypto Sensitivity": "Crypto Sensitivity",
    }
    return replacements.get(s, s)


def maybe_json(v: Any) -> Any:
    if isinstance(v, (dict, list)):
        return v
    if isinstance(v, str) and v.strip().startswith(("{", "[")):
        try:
            return json.loads(v)
        except json.JSONDecodeError:
            return v
    return v


def bullets(text: Any) -> list[str]:
    if text is None:
        return []
    if isinstance(text, list):
        return [str(x).strip(" •\t") for x in text if str(x).strip()]
    s = str(text)
    out = []
    for line in s.splitlines():
        line = line.strip()
        if not line:
            continue
        line = re.sub(r"^[•\-\*]\s*", "", line).strip()
        if line:
            out.append(line)
    return out


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------


def parse_dataset_block(raw: str) -> dict[str, str] | None:
    if not raw or not str(raw).strip():
        return None
    lines = [ln.rstrip() for ln in str(raw).splitlines() if ln.strip()]
    if not lines:
        return None
    title = re.sub(r"^\d+\.\s*", "", lines[0]).strip()
    # shorten common long titles
    title = re.sub(r"\s*\(Global\)\s*$", "", title)
    title = title.replace("AI/ML Job Postings Index", "AI/ML job postings")
    title = title.replace("EU AI Act Implementation Tracker", "EU AI Act tracker")
    title = title.replace("Enterprise AI Software Adoption Rates", "Enterprise AI adoption")
    title = title.replace("AI-Related Cybersecurity Incident Reports", "AI cyber incidents")
    title = title.replace("AI Governance / Trust / Compliance M&A and Funding Activity", "Governance M&A / funding")

    typ = ""
    prov = ""
    cadence = ""
    why = ""
    for ln in lines[1:]:
        t = ln.strip()
        if t.lower().startswith("type:"):
            rest = t.split(":", 1)[1].strip()
            if "·" in rest or "Provider:" in rest:
                # Type: X · Provider: Y
                m = re.match(r"(.+?)\s*[·|]\s*Provider:\s*(.+)$", rest, re.I)
                if m:
                    typ = m.group(1).strip()
                    prov = m.group(2).strip().replace(" / ", " · ")
                else:
                    typ = rest
            else:
                typ = rest
        elif t.lower().startswith("provider:"):
            prov = t.split(":", 1)[1].strip().replace(" / ", " · ")
        elif t.lower().startswith("cadence:"):
            cadence = t.split(":", 1)[1].strip()
        elif t.lower().startswith("why it matters:"):
            why = t.split(":", 1)[1].strip()
        elif why and not t.lower().startswith("suggested") and not t.lower().startswith("confidence"):
            why = (why + " " + t).strip()
    # truncate type/prov for sheet
    if len(prov) > 72:
        prov = prov[:69].rstrip() + "…"
    if len(cadence) > 40:
        cadence = cadence[:37].rstrip() + "…"
    return {"name": title, "type": typ, "prov": prov, "cadence": cadence, "why": why}


def overview_row(bundle: dict[str, Any]) -> dict[str, Any]:
    ov = bundle.get("sc_overview") or {}
    rows = ov.get("rows") or []
    return rows[0] if rows else {}


def assess_writeup(bundle: dict[str, Any]) -> dict[str, Any]:
    """Checklist for full v6 writeup panels (thesis / datasets / keywords / watch)."""
    theme = bundle.get("theme") or {}
    thesis_block = theme.get("theme_thesis") or {}
    thesis = str(thesis_block.get("thesis") or "").strip()
    bull = [b for b in (thesis_block.get("bull_case") or []) if str(b).strip()]
    bear = [b for b in (thesis_block.get("bear_case") or []) if str(b).strip()]
    row = overview_row(bundle)
    datasets = [parse_dataset_block(row.get(f"TopDataset{i}") or "") for i in range(1, 6)]
    datasets = [d for d in datasets if d]
    keywords = build_keywords(row)
    watch = build_watch(row)
    missing: list[str] = []
    if not thesis:
        missing.append("thesis")
    if not bull:
        missing.append("bull_case")
    if not bear:
        missing.append("bear_case")
    if not datasets:
        missing.append("datasets")
    if not keywords:
        missing.append("keywords")
    if not watch:
        missing.append("where_to_watch")
    return {
        "complete": not missing,
        "missing": missing,
        "counts": {
            "datasets": len(datasets),
            "keywords": len(keywords),
            "watch": len(watch),
            "bull": len(bull),
            "bear": len(bear),
        },
        "theme_name": theme.get("name") or bundle.get("slug"),
    }


def apply_writeup_patch(
    bundle: dict[str, Any],
    *,
    overview_row_data: dict[str, Any] | None = None,
    thesis: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Inject freshly generated writeup into a CDN bundle (local LLM fill path)."""
    if overview_row_data:
        ov = dict(bundle.get("sc_overview") or {})
        ov["rows"] = [overview_row_data]
        bundle["sc_overview"] = ov
    if thesis:
        theme = dict(bundle.get("theme") or {})
        theme["theme_thesis"] = thesis
        bundle["theme"] = theme
    return bundle


def build_keywords(row: dict[str, Any]) -> list[str]:
    sk = maybe_json(row.get("SearchKeywordsNow")) or {}
    policy = list(sk.get("policy_terms") or []) or bullets(row.get("SearchKeywordsPolicyRegulatory"))
    product = list(sk.get("product_terms") or []) or bullets(row.get("SearchKeywordsBrandProduct"))
    events = list(sk.get("event_phrases") or []) or bullets(row.get("SearchKeywordsEventPhrases"))
    gt = maybe_json(row.get("GoogleTrendKeywordsNow")) or {}
    intent = list(gt.get("product_intent_terms") or []) + list(gt.get("macro_policy_terms") or [])
    if not intent:
        intent = bullets(row.get("GoogleTrendProductCategoryIntent"))
    picks: list[str] = []
    for bucket, cap in (
        (policy, KEYWORD_CAPS["policy"]),
        (product, KEYWORD_CAPS["product"]),
        (events, KEYWORD_CAPS["event"]),
        (intent, KEYWORD_CAPS["intent"]),
    ):
        for t in bucket[:cap]:
            t = str(t).strip()
            if t and t not in picks:
                picks.append(t)
    return picks


def build_watch(row: dict[str, Any]) -> list[str]:
    forums = maybe_json(row.get("ForumWatchlist")) or []
    pubs = maybe_json(row.get("IndustryPublications")) or []
    out: list[str] = []
    if isinstance(forums, list):
        for f in forums:
            if isinstance(f, dict):
                src = (f.get("source") or "").strip()
                if src:
                    out.append(src)
    if isinstance(pubs, list):
        for p in pubs[:6]:
            if isinstance(p, dict):
                name = (p.get("name") or "").strip()
                if name and name not in out:
                    out.append(name)
            elif isinstance(p, str) and p.strip():
                out.append(p.strip())
    return out[:12]


def build_chart_svg(bundle: dict[str, Any]) -> str:
    chart = bundle["chart"]
    spy = bundle["spy"]
    pr = bundle["price_returns"]
    theme_perf = chart.get("performance") or {}
    spy_perf = spy.get("performance") or {}
    t_dates = list(theme_perf.get("dates") or [])
    t_vals = [float(x) for x in (theme_perf.get("values") or [])]
    s_dates = list(spy_perf.get("dates") or [])
    s_vals = [float(x) for x in (spy_perf.get("values") or [])]
    if len(t_dates) < 10 or len(t_vals) != len(t_dates):
        return '<svg class="chart" viewBox="0 0 560 100" xmlns="http://www.w3.org/2000/svg"></svg>'

    # Align on theme dates; map SPY by date
    spy_map = {d: v for d, v in zip(s_dates, s_vals)}
    # 1Y window by calendar
    end = t_dates[-1]
    try:
        end_dt = datetime.strptime(end[:10], "%Y-%m-%d")
        start_dt = end_dt.replace(year=end_dt.year - 1)
        start = start_dt.strftime("%Y-%m-%d")
    except ValueError:
        start = t_dates[max(0, len(t_dates) - 252)]

    pairs = []
    for d, v in zip(t_dates, t_vals):
        if d < start:
            continue
        if d in spy_map:
            pairs.append((d, v, spy_map[d]))
        else:
            # forward-fill last spy
            pairs.append((d, v, pairs[-1][2] if pairs else v))

    if len(pairs) < 5:
        pairs = [(d, v, spy_map.get(d, v)) for d, v in zip(t_dates[-252:], t_vals[-252:])]

    # Live 1D splice on last point (theme + spy)
    tm = ((pr.get("compare_returns") or {}).get("metrics") or {})
    sm = spy.get("metrics") or {}
    live_1d = tm.get("1D")
    spy_1d = sm.get("1D")
    if live_1d is not None and len(pairs) >= 2:
        # use prior session as base if last date is "today" in series
        prev_t = pairs[-2][1]
        pairs[-1] = (pairs[-1][0], prev_t * (1 + float(live_1d) / 100.0), pairs[-1][2])
    if spy_1d is not None and len(pairs) >= 2:
        prev_s = pairs[-2][2]
        pairs[-1] = (pairs[-1][0], pairs[-1][1], prev_s * (1 + float(spy_1d) / 100.0))

    # subsample ~90 points
    n = len(pairs)
    target = 91
    if n > target:
        step = (n - 1) / (target - 1)
        idxs = [int(round(i * step)) for i in range(target)]
        idxs[-1] = n - 1
        pairs = [pairs[i] for i in idxs]

    ys = [p[1] for p in pairs] + [p[2] for p in pairs]
    ymin, ymax = min(ys), max(ys)
    pad = (ymax - ymin) * 0.08 or 1.0
    ymin -= pad
    ymax += pad

    w, h, left, right, top, bot = 560, 100, 2.0, 558.0, 3.0, 87.0

    def xy(i: int, val: float) -> tuple[float, float]:
        x = left + (right - left) * (i / (len(pairs) - 1))
        t = (val - ymin) / (ymax - ymin) if ymax != ymin else 0.5
        y = bot - (bot - top) * t
        return x, y

    theme_pts = [xy(i, p[1]) for i, p in enumerate(pairs)]
    spy_pts = [xy(i, p[2]) for i, p in enumerate(pairs)]

    def path(pts: list[tuple[float, float]]) -> str:
        return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)

    area = (
        f"M{theme_pts[0][0]:.1f},{bot:.1f} L"
        + " L".join(f"{x:.1f},{y:.1f}" for x, y in theme_pts)
        + f" L{theme_pts[-1][0]:.1f},{bot:.1f} Z"
    )
    d0, d1 = pairs[0][0][:10], pairs[-1][0][:10]
    return f'''<svg class="chart" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#26fcd6" stop-opacity="0.28"/><stop offset="100%" stop-color="#26fcd6" stop-opacity="0"/></linearGradient></defs>
            <path d="{area}" fill="url(#g)"/>
            <path d="{path(spy_pts)}" fill="none" stroke="rgba(234,242,240,0.35)" stroke-width="1.4"/>
            <path d="{path(theme_pts)}" fill="none" stroke="#26fcd6" stroke-width="2.1" stroke-linejoin="round"/>
            <text x="2" y="99" fill="#8a9a94" font-size="8" font-family="IBM Plex Sans, sans-serif">{esc(d0)}</text>
            <text x="558" y="99" fill="#8a9a94" font-size="8" font-family="IBM Plex Sans, sans-serif" text-anchor="end">{esc(d1)}</text>
          </svg>'''


def factor_read(bundle: dict[str, Any]) -> list[tuple[str, str]]:
    fp = bundle["factor_profile"]
    qr = bundle["quality_risk"]
    fa = bundle.get("factor_attribution") or {}
    pos = fp.get("factors_positive") or []
    neg = fp.get("factors_negative") or []
    r2 = fp.get("model_r2")
    conf = fp.get("confidence")
    beta = ((qr.get("summary") or {}).get("risk") or {}).get("beta")
    sector = fp.get("dominant_sector") or {}

    pos_labels = [short_factor_label(p.get("label", "")) for p in pos[:3]]
    neg_labels = [short_factor_label(n.get("label", "")) for n in neg[:3]]
    distinctive = [x for x in pos_labels if "Market Beta" not in x]
    lead = distinctive[0] if distinctive else (pos_labels[0] if pos_labels else "—")
    also = distinctive[1:]
    also_bit = f" (also {esc(', '.join(also))})" if also else ""
    lag = ", ".join(f"<b>{esc(x)}</b>" for x in neg_labels) if neg_labels else "—"

    if any("AI" in x for x in distinctive) and any(
        k in x for x in neg_labels for k in ("Crypto", "Momentum", "Small-Cap")
    ):
        tail = " — AI-narrative tilt without trend/crypto beta."
    else:
        tail = "."
    read = f"Distinctive tilt to <b>{esc(lead)}</b>{also_bit}. Lags {lag}{tail}"

    model = (
        f"Explains <b>{esc(num((r2 or 0) * 100, 0))}%</b> of moves (R²) · conf "
        f"<b>{esc(num((conf or 0) * 100, 0))}%</b> · beta <b>{esc(num(beta, 1))}</b>"
    )
    sid = str(sector.get("id") or "").replace("SECTOR_", "")
    if sector.get("label") and sid:
        sector_line = (
            f"Strongest sector factor: <b>{esc(sector.get('label'))} ({esc(sid)})</b>"
            f" · #{esc(sector.get('rank'))}/{esc(sector.get('total'))}"
        )
    else:
        sector_line = f"Strongest sector factor: <b>{esc(sector.get('label') or '—')}</b>"

    coh = ((fa.get("cohesion") or {}).get("1Y") or {}) if isinstance(fa.get("cohesion"), dict) else {}
    med = coh.get("median_correlation")
    gr = coh.get("global_rank")
    gt = coh.get("global_theme_count")
    cohesion = (
        f"1Y name corr <b>{esc(num(med, 2))}</b>"
        + (f" · #{esc(gr)}/{esc(gt)} themes" if gr is not None else "")
    )

    return [
        ("Model fit", model),
        ("Sector", sector_line),
        ("Read", read),
        ("Cohesion", cohesion),
    ]


# ---------------------------------------------------------------------------
# HTML assembly
# ---------------------------------------------------------------------------


STYLES = r"""
  :root {
    --fg:#e8f0ed; --muted:#8a9a94; --line:rgba(38,252,214,.12);
    --mint:#26fcd6; --mint-dim:rgba(38,252,214,.12);
    --up:#3dde9a; --down:#ff6b7a;
    --sheet-w:1720px; --sheet-h:900px; --hold-cols:2;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body { background:#0b0b0b; color:var(--fg); font-family:"IBM Plex Sans",system-ui,sans-serif; }
  body { min-height:100vh; display:grid; place-items:center; padding:0; margin:0; background:#070a0c; }
  .sheet {
    width:var(--sheet-w); height:var(--sheet-h); overflow:hidden;
    padding:10px 8px 8px; display:grid; grid-template-rows:auto auto minmax(0,1fr) auto; gap:6px;
    background: radial-gradient(860px 340px at 8% -12%, rgba(42,207,200,.14), transparent 55%),
      radial-gradient(700px 300px at 100% 0%, rgba(106,125,255,.10), transparent 50%), #070a0c;
    border:1px solid var(--line);
  }
  .top { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:10px; }
  .brand { display:flex; align-items:center; gap:8px; }
  .brand img { width:26px; height:26px; }
  .brand-name { font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--mint); }
  .brand-sub { font-size:10px; color:var(--muted); }
  h1 { font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:26px; line-height:1.05; letter-spacing:-.02em; }
  .subhead { font-size:10px; color:var(--muted); margin-top:2px; }
  .pills { display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end; }
  .pill { border:1px solid var(--line); background:rgba(255,255,255,.03); padding:3px 7px; font-size:10px; color:var(--muted); white-space:nowrap; }
  .pill strong { color:var(--fg); }
  .pill.live { border-color:rgba(61,222,154,.35); color:#9dceb8; }
  .pill.live strong { color:var(--up); }
  .perf { display:grid; grid-template-columns:repeat(6,1fr); gap:4px; }
  .perf-card { background:var(--mint-dim); border:1px solid var(--line); padding:3px 7px 4px; line-height:1.15; }
  .perf-card .lbl { font-size:8px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  .perf-card .val { font-family:"Space Grotesk",sans-serif; font-size:16px; font-weight:600; line-height:1.1; margin-top:1px; }
  .perf-card .sub { font-size:8px; color:var(--muted); margin-top:1px; }
  .up { color:var(--up); } .down { color:var(--down); } .flat { color:var(--fg); }
  .body { display:grid; grid-template-columns:0.95fr 0.72fr 1.33fr; gap:5px; min-height:0; overflow:hidden; }
  .body.skinny { grid-template-columns:1.05fr 0.85fr 1.2fr; }
  .col { display:flex; flex-direction:column; gap:5px; min-height:0; height:100%; }
  .panel { background:rgba(10,14,18,.78); border:1px solid var(--line); padding:6px 7px; min-height:0; }
  .panel.grow { flex:1 1 auto; display:flex; flex-direction:column; overflow:hidden; min-height:148px; }
  .panel-fixed { flex:0 0 auto; overflow:hidden; }
  .panel h2 { font-family:"Space Grotesk",sans-serif; font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--mint); margin-bottom:6px; }
  .thesis { font-size:12px; line-height:1.32; color:#d5e2dc; white-space:normal; overflow:visible; }
  .cases { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:5px; }
  .case { font-size:10px; line-height:1.3; color:#d5e2dc; border-left:2px solid var(--line); padding-left:7px; white-space:normal; overflow:visible; }
  .case.bull { border-color:rgba(61,222,154,.55); } .case.bear { border-color:rgba(255,107,122,.55); }
  .case strong { display:block; color:var(--fg); font-size:9px; letter-spacing:.05em; text-transform:uppercase; margin-bottom:2px; }
  .ds-list { display:flex; flex-direction:column; gap:3px; }
  .ds { border-top:1px solid var(--line); padding-top:4px; } .ds:first-child { border-top:0; padding-top:0; }
  .ds-top { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
  .ds-name { font-size:11px; font-weight:600; } .ds-type { font-size:9px; color:var(--muted); white-space:nowrap; }
  .ds-why { font-size:9.5px; line-height:1.22; color:#c5d4ce; margin-top:1px; }
  .ds-meta { font-size:8.5px; line-height:1.2; color:#9eb0a8; margin-top:1px; }
  .ds-meta .ds-k { color:var(--mint); font-weight:600; letter-spacing:.04em; text-transform:uppercase; font-size:7.5px; margin-right:2px; }
  .ds-meta .ds-sep { margin:0 5px; color:var(--muted); }
  .watch { margin-top:6px; padding-top:6px; border-top:1px solid var(--line); }
  .watch h3 { font-size:9px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:5px; }
  .watch .cats { margin-top:0; }
  .stats { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
  .rev-stats.rev-3 { grid-template-columns: 1fr 1fr 1fr; gap:4px; margin-bottom:4px; }
  .rev-stats.rev-3:last-of-type { margin-bottom:0; }
  .stat { border:1px solid var(--line); background:rgba(255,255,255,.02); padding:4px 6px; }
  .sl { font-size:7.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); line-height:1.15; }
  .sv { font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:14px; }
  .cats { display:flex; flex-wrap:wrap; gap:5px 6px; margin-top:5px; align-content:flex-start; }
  .panel-fixed > .cats { margin-top:0; }
  .cat { display:inline-flex; align-items:center; font-size:8.5px; line-height:1.2; color:#b7c9c1; border:1px solid var(--line); padding:3px 6px; background:rgba(38,252,214,.04); white-space:nowrap; }
  .chart-head { display:flex; justify-content:space-between; align-items:baseline; }
  .legend { display:flex; gap:8px; font-size:9px; color:var(--muted); }
  .legend i { display:inline-block; width:11px; height:2px; vertical-align:middle; margin-right:3px; }
  .legend .t i { background:var(--mint); } .legend .s i { background:rgba(234,242,240,.35); }
  svg.chart { width:100%; height:auto; min-height:148px; display:block; margin-top:2px; flex:1 1 auto; }
  .panel.grow.keywords { min-height:0; overflow:hidden; }
  .keywords .cats { margin-top:0; gap:4px 5px; align-content:flex-start; }
  .fac.pos, .fac.neg { padding:3px 5px; margin-bottom:2px; }
  .fac-read { margin-top:5px; display:flex; flex-direction:column; gap:3px; }
  .fac-read-line { display:grid; grid-template-columns:58px 1fr; column-gap:6px; align-items:start; font-size:9px; line-height:1.28; color:#b7c9c1; }
  .fac-read-line b { color:var(--fg); font-weight:600; }
  .fac-k { color:var(--mint); font-size:8px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; padding-top:1px; }
  .fac-v { min-width:0; }
  .facs { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
  .fac-col h3 { font-size:8.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:3px; }
  .fac { display:flex; justify-content:space-between; gap:4px; padding:4px 6px; margin-bottom:3px; border:1px solid var(--line); font-size:10px; background:rgba(255,255,255,.02); }
  .fac.pos { border-left:2px solid var(--up); } .fac.neg { border-left:2px solid var(--down); }
  .rk { color:var(--muted); font-size:9px; white-space:nowrap; }
  .holds-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; flex-shrink:0; }
  .holds-head h2 { margin:0; } .holds-head span { font-size:9px; color:var(--muted); }
  .holds {
    display:grid; grid-template-columns:repeat(var(--hold-cols), 1fr);
    column-gap:10px; row-gap:0; flex:1; align-content:start; min-height:0; overflow:visible;
  }
  .h { display:flex; gap:7px; align-items:flex-start; border-top:1px solid var(--line); padding:5px 0 4px; }
  .h img { width:20px; height:20px; border-radius:3px; background:#fff; object-fit:contain; flex-shrink:0; margin-top:2px; }
  .h-main { min-width:0; flex:1; }
  .h-top { display:flex; align-items:baseline; gap:6px; }
  .sym { font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:15px; letter-spacing:-0.01em; }
  .tier { font-size:8px; color:var(--mint); border:1px solid rgba(38,252,214,.35); padding:0 3px; position:relative; top:-1px; }
  .wgt { margin-left:auto; font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:12px; }
  .ytd { font-size:11px; min-width:44px; text-align:right; font-weight:500; }
  .note { margin-top:3px; font-size:11px; line-height:1.35; color:#9aada5; white-space:normal; overflow:visible; }
  .foot { display:flex; justify-content:space-between; gap:10px; padding-top:5px; border-top:1px solid var(--line); font-size:9px; color:var(--muted); background:#070a0c; position:relative; z-index:2; flex-shrink:0; }
  @media print {
    @page { size:1720px 900px; margin:0; }
    html, body { width:1720px; height:900px; background:#000; }
    body { padding:0; display:block; } .sheet { border:none; }
  }
""".strip()


def live_script(slug: str) -> str:
    return f"""
<script>
(function () {{
  var SLUG = {json.dumps(slug)};
  var POLL_MS = 60000;
  var METRICS = ["1D", "10D", "IranWar", "YTD", "Period", "2Y"];

  function bases() {{
    var out = [];
    var loc = window.location;
    if (loc.protocol === "http:" || loc.protocol === "https:") {{
      if (/^(localhost|127\\.0\\.0\\.1)$/.test(loc.hostname)) {{
        out.push(loc.origin + "/stockthemes-data");
      }}
    }}
    out.push("http://localhost:3000/stockthemes-data");
    out.push("http://127.0.0.1:3000/stockthemes-data");
    out.push("https://storage.stockthemes.ai");
    return out.filter(function (b, i, a) {{ return a.indexOf(b) === i; }});
  }}

  function fmtPct(v) {{
    if (v == null || !isFinite(Number(v))) return "—";
    var n = Number(v);
    return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
  }}
  function cls(v) {{
    var n = Number(v);
    if (!isFinite(n) || Math.abs(n) < 0.05) return "flat";
    return n > 0 ? "up" : "down";
  }}
  function fmtEt(iso) {{
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var parts = new Intl.DateTimeFormat("en-US", {{
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "numeric", minute: "2-digit", hour12: true
    }}).formatToParts(d);
    var pick = function (t) {{
      return (parts.find(function (p) {{ return p.type === t; }}) || {{}}).value || "";
    }};
    return pick("year") + "-" + pick("month") + "-" + pick("day") + " " +
      pick("hour") + ":" + pick("minute") + " " + pick("dayPeriod") + " ET";
  }}

  async function getJson(url) {{
    var res = await fetch(url, {{ cache: "no-store" }});
    if (!res.ok) throw new Error(url + " " + res.status);
    return res.json();
  }}

  async function loadPair() {{
    var lastErr;
    var list = bases();
    for (var i = 0; i < list.length; i++) {{
      var base = list[i].replace(/\\/$/, "");
      try {{
        var theme = await getJson(base + "/themes/" + SLUG + ".price_returns.v0.json");
        var spy = await getJson(base + "/spy_snapshot.v0.json");
        return {{ theme: theme, spy: spy, base: base }};
      }} catch (e) {{ lastErr = e; }}
    }}
    throw lastErr || new Error("live fetch failed");
  }}

  function apply(payload) {{
    var tm = (payload.theme.compare_returns && payload.theme.compare_returns.metrics) || {{}};
    var sm = payload.spy.metrics || {{}};
    var asOf = payload.theme.ticker_performance_as_of || payload.theme.as_of || payload.spy.as_of;
    var el = document.getElementById("live-asof");
    if (el && asOf) el.textContent = fmtEt(asOf);

    METRICS.forEach(function (key) {{
      var card = document.querySelector('.perf-card[data-m="' + key + '"]');
      if (!card) return;
      var val = card.querySelector(".val");
      var sub = card.querySelector(".sub");
      if (val && tm[key] != null) {{
        val.textContent = fmtPct(tm[key]);
        val.className = "val " + cls(tm[key]);
      }}
      if (sub && sm[key] != null) sub.textContent = "SPY " + fmtPct(sm[key]);
    }});
  }}

  async function tick() {{
    var pill = document.querySelector(".pill.live");
    try {{
      var payload = await loadPair();
      apply(payload);
      if (pill) pill.title = "Live · " + payload.base + " · refreshes every 60s";
    }} catch (e) {{
      if (pill) {{
        pill.title = "Live refresh blocked — open via http://localhost:3000/tear-sheets/… (npm run dev)";
      }}
      console.warn("[tear-sheet live]", e);
    }}
  }}

  tick();
  setInterval(tick, POLL_MS);
}})();
</script>
""".strip()


def render(
    bundle: dict[str, Any],
    *,
    holdings: int | None = None,
    skinny: bool = False,
) -> str:
    hold_cap = int(holdings) if holdings is not None else HOLD_CAP
    hold_cap = max(1, min(hold_cap, 40))
    slug = bundle["slug"]
    theme = bundle["theme"]
    pr = bundle["price_returns"]
    spy = bundle["spy"]
    fp = bundle["factor_profile"]
    qr = bundle["quality_risk"]
    rev = bundle["revenue"]
    notes = {c["ticker"]: c.get("ticker_note") for c in ((bundle.get("notes") or {}).get("constituents") or [])}
    row = overview_row(bundle)

    name = theme.get("name") or slug
    group = group_title(theme.get("group_slug"))
    rank = theme.get("rank_10d") or {}
    n_names = theme.get("ticker_count") or len(theme.get("constituents") or [])
    thesis = (theme.get("theme_thesis") or {}).get("thesis") or ""
    bull = ((theme.get("theme_thesis") or {}).get("bull_case") or ["—"])[0]
    bear = ((theme.get("theme_thesis") or {}).get("bear_case") or ["—"])[0]

    tm = ((pr.get("compare_returns") or {}).get("metrics") or {})
    sm = spy.get("metrics") or {}

    perf_html = "".join(
        f'<div class="perf-card" data-m="{esc(key)}"><div class="lbl">{esc(lbl)}</div>'
        f'<div class="val {pct_cls(tm.get(key))}">{esc(pct(tm.get(key)))}</div>'
        f'<div class="sub">SPY {esc(pct(sm.get(key)))}</div></div>'
        for key, lbl in PERF_ORDER
    )

    # datasets / watch / keywords (full writeup only)
    ds_blocks = []
    watch_html = ""
    kw_html = ""
    if not skinny:
        for i in range(1, 6):
            parsed = parse_dataset_block(row.get(f"TopDataset{i}") or "")
            if not parsed:
                continue
            ds_blocks.append(
                "<div class=\"ds\">"
                f"<div class=\"ds-top\"><span class=\"ds-name\">{esc(parsed['name'])}</span>"
                f"<span class=\"ds-type\">{esc(parsed['type'])}</span></div>"
                f"<div class=\"ds-meta\"><span class=\"ds-k\">Prov</span> {esc(parsed['prov'])}"
                f"<span class=\"ds-sep\">·</span><span class=\"ds-k\">Cadence</span> {esc(parsed['cadence'])}</div>"
                f"<div class=\"ds-why\">{esc(parsed['why'])}</div></div>"
            )
        watch = build_watch(row)
        watch_html = "".join(f'<span class="cat">{esc(w)}</span>' for w in watch)
        keywords = build_keywords(row)
        kw_html = "".join(f'<span class="cat">{esc(k)}</span>' for k in keywords)

    # revenue
    s = rev.get("summary") or {}
    labels = (qr.get("column_labels") or {}).get("fiscal_ebitda") or {}
    revs = rev.get("summary_revisions") or {}
    delta = revs.get("growth_delta_bps")
    delta_s = f"{int(delta):+d} bps" if delta is not None else "—"

    def rstat(label: str, val: str) -> str:
        return f'<div class="stat"><div class="sl">{esc(label)}</div><div class="sv">{esc(val)}</div></div>'

    rev_html = (
        '<div class="stats rev-stats rev-3">'
        + rstat("LQ Act Rev Growth", pct(s.get("lq_rev_act_pct")))
        + rstat("CQ Est Rev Growth", pct(s.get("cq_rev_est_pct")))
        + rstat("NQ Est Rev Growth", pct(s.get("nq_rev_est_pct")))
        + "</div>"
        + '<div class="stats rev-stats rev-3">'
        + rstat(f"{labels.get('ly', 'LY')} Act Rev Growth", pct(s.get("ly_rev_act_pct")))
        + rstat(f"{labels.get('cy', 'CY')} Est Rev Growth", pct(s.get("cy_rev_est_pct")))
        + rstat(f"{labels.get('ny', 'NY')} Est Rev Growth", pct(s.get("ny_rev_est_pct")))
        + "</div>"
        + '<div class="stats rev-stats rev-3">'
        + rstat("Trail 3Y CAGR", pct(s.get("trail_3y_cagr_pct")))
        + rstat("Fwd 3Y CAGR", pct(s.get("fwd_3y_cagr_pct")))
        + rstat("PS NTM", num(s.get("ps_ratio_ntm"), 1))
        + rstat("PSG fwd", num(s.get("psg_fwd"), 1))
        + rstat("Rev Δ lock-q", delta_s)
        + rstat("EV/Sales NTM", num(s.get("ev_sales_ntm"), 1))
        + "</div>"
    )

    # quality
    qsum = qr.get("summary") or {}
    qttm = (qsum.get("quarterly") or {}).get("ttm") or {}
    fisc = qsum.get("fiscal_ebitda") or {}
    risk = qsum.get("risk") or {}
    coh = (((bundle.get("factor_attribution") or {}).get("cohesion") or {}).get("1Y") or {})
    constituents = sorted(
        theme.get("constituents") or [],
        key=lambda c: float(c.get("weight") or 0),
        reverse=True,
    )
    top5 = sum(float(c.get("weight") or 0) for c in constituents[:5])
    quality_stats = [
        ("Gross TTM", pct(qttm.get("gross_pct"))),
        ("EBITDA TTM", pct(qttm.get("ebitda_pct"))),
        (f"{labels.get('cy', 'CY')} EBITDA", pct((fisc.get("cy") or {}).get("ebitda_pct"))),
        (f"{labels.get('ny', 'NY')}e", pct((fisc.get("ny") or {}).get("ebitda_pct"))),
        ("1Y name corr", num(coh.get("median_correlation"), 2)),
        ("Debt/EBITDA", num(risk.get("debt_to_ebitda"), 1)),
        ("Altman Z", num(risk.get("altman_z_score"), 1)),
        ("Top 5 wgt", f"{top5:.0f}%"),
    ]
    quality_html = "".join(
        f'<div class="stat"><div class="sl">{esc(a)}</div><div class="sv">{esc(b)}</div></div>'
        for a, b in quality_stats
    )

    # factors
    pos = fp.get("factors_positive") or []
    neg = fp.get("factors_negative") or []

    def fac_row(item: dict[str, Any], kind: str) -> str:
        return (
            f'<div class="fac {kind}"><span>{esc(short_factor_label(item.get("label", "")))}</span>'
            f'<span class="rk">#{esc(item.get("rank"))}/{esc(item.get("total"))}</span></div>'
        )

    fac_pos = "".join(fac_row(x, "pos") for x in pos[:3])
    fac_neg = "".join(fac_row(x, "neg") for x in neg[:3])
    read_lines = "".join(
        f'<div class="fac-read-line"><span class="fac-k">{esc(k)}</span><span class="fac-v">{v}</span></div>'
        for k, v in factor_read(bundle)
    )

    # holdings
    ytd_by = {
        c.get("ticker"): ((c.get("price_returns") or {}).get("metrics") or {}).get("YTD")
        for c in (pr.get("constituents") or [])
    }
    holds = []
    for c in constituents[:hold_cap]:
        t = c.get("ticker") or ""
        logo = c.get("logo_url") or f"{CDN}/logos/v0/{t}.png"
        ytd = ytd_by.get(t)
        note = notes.get(t) or ""
        holds.append(
            f'<div class="h"><img src="{esc(logo)}" alt="" onerror="this.style.opacity=0"/>'
            f'<div class="h-main"><div class="h-top"><span class="sym">{esc(display_ticker(t))}</span>'
            f'<span class="wgt">{esc(num(c.get("weight"), 1))}%</span>'
            f'<span class="ytd {pct_cls(ytd)}">{esc(pct(ytd))}</span></div>'
            f'<div class="note">{esc(note)}</div></div></div>'
        )

    live_asof_label = fmt_live_asof(
        pr.get("ticker_performance_as_of") or pr.get("as_of") or spy.get("as_of")
    )
    uni = f"#{rank.get('universe_rank')}/{rank.get('universe_total')}" if rank.get("universe_rank") is not None else "—"
    grp = f"#{rank.get('group_rank')}/{rank.get('group_total')}" if rank.get("group_rank") is not None else "—"

    body_cls = "body skinny" if skinny else "body"
    left_extra = ""
    if not skinny:
        left_extra = (
            '<div class="panel panel-fixed"><h2>Datasets to track</h2>'
            f'<div class="ds-list">{"".join(ds_blocks)}</div>'
            f'<div class="watch"><h3>Where to watch</h3><div class="cats">{watch_html}</div></div></div>'
        )
    mid_keywords = ""
    if not skinny:
        mid_keywords = (
            f'<div class="panel grow keywords"><h2>Theme Keywords</h2>'
            f'<div class="cats">{kw_html}</div></div>'
        )
    brand_sub = "Snapshots · skinny" if skinny else "Snapshots"
    hold_n = min(hold_cap, len(constituents))

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/>
<title>Snapshot — {esc(name)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"/>
<style>
{STYLES}
</style>
</head>
<body>
  <div class="sheet" id="sheet">
    <div class="top">
      <div class="brand"><img src="logo-icon.svg" alt=""/><div><div class="brand-name">stockthemes.ai</div><div class="brand-sub">{esc(brand_sub)}</div></div></div>
      <div><h1>{esc(name)}</h1><div class="subhead">{esc(group)} · Manual theme weights · Indexed vs SPY</div></div>
      <div class="pills">
        <div class="pill live">Live returns <strong id="live-asof">{esc(live_asof_label)}</strong></div>
        <div class="pill"><strong>{esc(n_names)}</strong> names</div>
        <div class="pill">10D <strong>{esc(uni)}</strong></div>
        <div class="pill">Group <strong>{esc(grp)}</strong></div>
      </div>
    </div>
    <div class="perf">{perf_html}</div>
    <div class="{body_cls}">
      <div class="col">
        <div class="panel grow" title="1Y chart: EOD path with today spliced from live theme 1D (same source as 1D card).">
          <div class="chart-head"><h2 style="margin:0">1Y performance</h2><div class="legend"><span class="t" title="EOD through last close + live 1D on today"><i></i>Theme</span><span class="s" title="EOD through last close + live 1D on today"><i></i>SPY</span></div></div>
          {build_chart_svg(bundle)}
        </div>
        <div class="panel panel-fixed"><h2>Thesis</h2><p class="thesis">{esc(thesis)}</p>
          <div class="cases"><div class="case bull"><strong>Bull</strong>{esc(bull)}</div><div class="case bear"><strong>Bear</strong>{esc(bear)}</div></div></div>
        {left_extra}
      </div>
      <div class="col">
        <div class="panel panel-fixed"><h2>Theme Revenue</h2>{rev_html}</div>
        <div class="panel panel-fixed"><h2>Theme Quality &amp; Setup</h2><div class="stats">{quality_html}</div></div>
        <div class="panel panel-fixed"><h2>Theme Factor Tilt</h2>
          <div class="facs"><div class="fac-col"><h3>Highest Co-Move</h3>{fac_pos}</div><div class="fac-col"><h3>Lowest Co-Move</h3>{fac_neg}</div></div>
          <div class="fac-read">{read_lines}</div></div>
        {mid_keywords}
      </div>
      <div class="col">
        <div class="panel grow">
          <div class="holds-head"><h2>Who’s in &amp; why</h2><span>Wgt · YTD · top {hold_n} · {esc(n_names)} names</span></div>
          <div class="holds">{''.join(holds)}</div>
        </div>
      </div>
    </div>
    <div class="foot"><div>Informational only — not investment advice. Live returns · manual theme weights.</div><div style="white-space:nowrap">stockthemes.ai/themes/{esc(slug)}</div></div>
  </div>
{live_script(slug)}
</body>
</html>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description="Build a stockthemes Snapshot tear sheet")
    ap.add_argument("--slug", required=True, help="Theme slug")
    ap.add_argument(
        "--out",
        help="Output HTML path (default: tear-sheets/out/<slug>.html)",
    )
    ap.add_argument(
        "--offline",
        action="store_true",
        help="Use cached _data only (no CDN fetch)",
    )
    ap.add_argument(
        "--also-v6",
        action="store_true",
        help="Also write ai-governance-v6.html when slug is the AI Governance theme",
    )
    ap.add_argument(
        "--holdings",
        type=int,
        default=HOLD_CAP,
        help=f"Max holdings rows (default {HOLD_CAP})",
    )
    ap.add_argument(
        "--skinny",
        action="store_true",
        help="Omit datasets / keywords / where-to-watch panels",
    )
    ap.add_argument(
        "--auto-skinny",
        action="store_true",
        help="Use skinny template when writeup checklist is incomplete",
    )
    args = ap.parse_args()
    slug = args.slug.strip().strip("/")
    print(f"fetching {slug} …", flush=True)
    bundle = load_bundle(slug, offline=args.offline)
    writeup = assess_writeup(bundle)
    skinny = bool(args.skinny)
    if args.auto_skinny and not writeup["complete"]:
        skinny = True
        print(
            f"auto-skinny: missing {', '.join(writeup['missing'])}",
            file=sys.stderr,
        )
    elif not writeup["complete"]:
        print(
            f"writeup incomplete: missing {', '.join(writeup['missing'])}",
            file=sys.stderr,
        )
    html_out = render(bundle, holdings=args.holdings, skinny=skinny)
    out = Path(args.out) if args.out else ROOT / "out" / f"{slug}.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html_out)
    mode = "skinny" if skinny else "full"
    print(f"wrote {out} ({len(html_out):,} bytes) [{mode}, holdings={args.holdings}]")

    if args.also_v6 and slug == "business-services-26-ai-governance-trust-compliance":
        for alias in ("ai-governance-v6.html", "ai-governance-trust-compliance.html"):
            alias_path = ROOT / alias
            alias_path.write_text(html_out)
            print(f"wrote {alias_path}")

    try:
        rel = out.relative_to(ROOT)
    except ValueError:
        rel = out.name
    print(f"open: http://localhost:3000/tear-sheets/{rel}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
