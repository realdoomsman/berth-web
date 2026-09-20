import { useEffect, useMemo, useRef } from "react";
import { ColorType, CrosshairMode, LineStyle, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { Candle, CandleRes } from "../api/types.js";
import { formatPrice } from "../lib/format.js";
import { IconExternal } from "./icons.js";

const RESOLUTIONS: CandleRes[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

/**
 * A chart with nothing to draw must not reserve a 400px hole in the page, so
 * the empty and loading states collapse to this. It is tall enough to hold a
 * sentence of explanation and short enough that the panel below it stays above
 * the fold.
 */
const COMPACT_HEIGHT = 120;

/** lightweight-charts talks to a canvas, so it needs resolved colours, not `var()`. */
const readTokens = () => {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string): string => css.getPropertyValue(name).trim() || fallback;
  return {
    up: read("--role-money-in", "#2ff37f"),
    down: read("--role-money-out", "#ff4d63"),
    line: read("--color-line", "#1b202a"),
    line2: read("--color-line-2", "#2a313e"),
    fg2: read("--color-fg-2", "#98a2b3"),
    fg3: read("--color-fg-3", "#7c8798"),
    bg2: read("--color-bg-2", "#11141b"),
    bg3: read("--color-bg-3", "#1b1f27"),
    mono: read("--font-mono", "ui-monospace, monospace"),
  };
};

/** Volume bars sit under the candles, so they are the candle colour at low alpha. */
const translucent = (color: string, alpha: number): string =>
  /^#[0-9a-f]{6}$/i.test(color)
    ? `${color}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0")}`
    : color;

interface Props {
  candles: Candle[];
  className?: string;
  /** render the built-in resolution switcher when both are supplied */
  res?: CandleRes;
  onResChange?: (res: CandleRes) => void;
  loading?: boolean;
  /** spot price, used for the header when the candle window is empty */
  priceUsd?: number;
  /** plot height in px once there is data; empty and loading collapse regardless */
  height?: number;
  /** ticker, so the no-data copy can name the coin */
  ticker?: string;
  /** pump.fun (or pool) link offered from the no-data state */
  tradeUrl?: string | null;
}

/**
 * Candlestick + volume panel. Owns its own header (price, change, resolution)
 * and its own three states: data, loading, and nothing-to-draw. Data is
 * expected in ascending time order, in seconds or milliseconds.
 */
export const Chart = ({
  candles,
  className = "",
  res,
  onResChange,
  loading = false,
  priceUsd,
  height = 360,
  ticker,
  tradeUrl,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const hasData = candles.length > 0 && !loading;

  /** Normalised once: ms or s epochs → ascending, deduped seconds. */
  const series = useMemo(() => {
    const sorted = [...candles].sort((a, b) => a.t - b.t);
    const bars: Array<{ time: UTCTimestamp; open: number; high: number; low: number; close: number }> = [];
    const vols: Array<{ time: UTCTimestamp; value: number; up: boolean }> = [];
    let prev = -1;
    for (const c of sorted) {
      const t = Math.floor(c.t > 1e12 ? c.t / 1000 : c.t) as UTCTimestamp;
      if (t === prev) continue;
      prev = t;
      bars.push({ time: t, open: c.o, high: c.h, low: c.l, close: c.c });
      vols.push({ time: t, value: c.v, up: c.c >= c.o });
    }
    return { bars, vols };
  }, [candles]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasData) return;
    const t = readTokens();
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      autoSize: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: t.fg2,
        fontFamily: t.mono,
        fontSize: 11,
        attributionLogo: false,
      },
      /* Horizontal hairlines only. Vertical grid on a time axis doubles the
         lattice for no extra reading, and the candles already mark time. */
      grid: { vertLines: { visible: false }, horzLines: { color: t.line } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.26 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 2 },
      /* Hard 1px crosshair, not a dashed one: this is a terminal readout. */
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: t.fg3, width: 1, style: LineStyle.Solid, labelBackgroundColor: t.bg3 },
        horzLine: { color: t.fg3, width: 1, style: LineStyle.Solid, labelBackgroundColor: t.bg3 },
      },
      handleScale: { axisPressedMouseMove: { time: true, price: false } },
      localization: { priceFormatter: formatPrice },
    });
    /* Square bodies with a hard 1px border of their own colour, and wicks at
       full strength — a translucent wick is a soft edge on a pixel grid. */
    const candle = chart.addCandlestickSeries({
      upColor: t.up,
      downColor: t.down,
      borderVisible: true,
      borderUpColor: t.up,
      borderDownColor: t.down,
      wickUpColor: t.up,
      wickDownColor: t.down,
      /* The last-price marker ships dashed by default; a hard 1px rule matches
         the crosshair and keeps every line in the panel the same kind of line. */
      priceLineStyle: LineStyle.Solid,
      priceLineWidth: 1,
      priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
    });
    const vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: t.line2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height: h } = entry.contentRect;
      /* `resize` is the documented path; applyOptions({width,height}) silently
         no-ops once the chart is live, which left the canvas stuck at its
         mount width. */
      if (width > 0 && h > 0) chart.resize(Math.floor(width), Math.floor(h), true);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, [hasData]);

  useEffect(() => {
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!candle || !vol) return;
    const t = readTokens();
    candle.setData(series.bars);
    vol.setData(series.vols.map((v) => ({ time: v.time, value: v.value, color: translucent(v.up ? t.up : t.down, 0.22) })));
    if (series.bars.length) chartRef.current?.timeScale().fitContent();
  }, [series]);

  const first = candles[0];
  const last = candles[candles.length - 1];
  const price = last?.c ?? priceUsd ?? null;
  const base = first?.o ?? null;
  const abs = price !== null && base !== null ? price - base : null;
  const pct = abs !== null && base !== null && base > 0 ? (abs / base) * 100 : null;
  const tone = abs === null || abs === 0 ? "text-fg-2" : abs > 0 ? "text-rev" : "text-burn";

  return (
    <section className={`panel flex min-w-0 flex-col overflow-hidden ${className}`} aria-label="Price chart">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-3.5 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="label shrink-0">price</span>
          <span className="figure figure-md">{price === null ? "—" : formatPrice(price)}</span>
          {abs !== null && pct !== null && (
            <span className={`num shrink-0 text-xs font-semibold ${tone}`}>
              {abs > 0 ? "+" : abs < 0 ? "−" : ""}
              {formatPrice(Math.abs(abs))}
              <span className="ml-1.5 opacity-80">
                ({abs > 0 ? "+" : abs < 0 ? "−" : ""}
                {Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(2)}%)
              </span>
            </span>
          )}
        </div>
        {res && onResChange && (
          <div className="-my-2.5 ml-auto flex shrink-0 items-center gap-3.5" role="group" aria-label="Chart resolution">
            {RESOLUTIONS.map((r) => (
              <button
                key={r}
                type="button"
                data-active={r === res}
                aria-pressed={r === res}
                className="tab num text-xs font-normal focus-visible:outline-offset-4"
                onClick={() => onResChange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </header>

      {loading && (
        <div className="flex items-end gap-1.5 p-3.5" style={{ height: COMPACT_HEIGHT }} aria-busy>
          {[38, 62, 74, 30, 66, 46, 84, 55, 70, 41, 58, 78].map((h, i) => (
            <div key={i} className="skeleton w-full" style={{ height: `${h}%` }} />
          ))}
        </div>
      )}

      {!loading && !hasData && (
        <div className="px-3.5 py-3.5" style={{ minHeight: COMPACT_HEIGHT }}>
          <div className="label">no data</div>
          <div className="small mt-2 font-semibold text-fg">No price history yet</div>
          <p className="small mt-1 max-w-md leading-relaxed text-fg-2">
            Candles appear once {ticker ? `$${ticker}` : "the coin"} trades on the bonding curve. Revenue, buybacks and burns are
            tracked on-chain independently.
          </p>
          {tradeUrl && (
            <a
              href={tradeUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="num mt-2 inline-flex items-center gap-1 text-xs text-info hover:underline"
            >
              open on pump.fun
              <IconExternal size={11} />
            </a>
          )}
        </div>
      )}

      {hasData && (
        <div className="relative min-h-0 w-full" style={{ height }}>
          <div ref={ref} className="absolute inset-0" />
        </div>
      )}
    </section>
  );
};
