import { useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { COINS } from '../lib/binance.js'
import { fmtPct, fmtCountdown } from '../lib/format.js'

// The hero: a diverging "tape" of annualized funding across the board.
// Positive (right, green) = longs are paying shorts → crowd leans long.
// Negative (left, oxblood) = shorts are paying longs → crowd leans short.
// The further from the center zero rule, the more crowded that side is.
export default function FundingTape({ funding, history, now }) {
  const rows = useMemo(() => {
    if (!funding) return []
    return COINS.map((c) => ({ ...c, f: funding[c.pair], h: history?.[c.pair] }))
      .filter((r) => r.f)
      .sort((a, b) => b.f.annualizedPct - a.f.annualizedPct)
  }, [funding, history])

  const maxAbs = useMemo(
    () => Math.max(0.01, ...rows.map((r) => Math.abs(r.f.annualizedPct))),
    [rows],
  )

  if (!funding) return null

  const nextFunding = rows.length ? rows[0].f.nextFundingTime : null
  const countdown = nextFunding ? fmtCountdown(nextFunding - now) : '—'

  return (
    <section aria-labelledby="tape-title" className="rule-t pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="tape-title" className="font-serif text-2xl sm:text-3xl font-600 tracking-masthead">
          Funding Divergence
        </h2>
        <p className="font-mono text-2xs text-inkSoft tnum">
          NEXT 8H SETTLEMENT IN <span className="text-ink">{countdown}</span>
        </p>
      </div>

      <p className="mt-2 max-w-2xl font-serif text-[15px] leading-relaxed text-inkSoft">
        Funding is the fee perpetual traders pay each 8&nbsp;hours to hold a position.{' '}
        <span className="text-ink">Heavily positive</span> means the crowd is long and paying to
        stay long; <span className="text-ink">heavily negative</span> means it's short and paying.
        Extreme readings mark crowded trades — the kind that unwind fast. The{' '}
        <span className="text-ink">7-day</span> line traces each coin's last week of settlements,
        so you can tell a one-off spike from a standing lean.
      </p>

      {/* Scale header */}
      <div className="mt-6 grid grid-cols-[1fr] gap-px">
        <div className="hidden sm:grid grid-cols-[150px_1fr_72px_120px] items-end gap-4 pb-2 rule-b font-mono text-2xs uppercase tracking-wider text-inkFaint">
          <span>Asset</span>
          <div className="flex items-center justify-between">
            <span>← shorts pay (bearish crowd)</span>
            <span>longs pay (bullish crowd) →</span>
          </div>
          <span className="text-center">7-Day</span>
          <span className="text-right">Annualized</span>
        </div>

        <ol className="divide-y divide-ruleSoft">
          {rows.map((r) => (
            <TapeRow key={r.pair} row={r} maxAbs={maxAbs} />
          ))}
        </ol>
      </div>
    </section>
  )
}

// Compare the live reading to the coin's own 7-day average — the honest
// "is this actually extreme?" tell. Null when there's no usable history or the
// recent baseline is basically flat (a ratio against ~zero is meaningless).
function vsAvgTag(v, hist) {
  if (!hist || !hist.annualized || hist.annualized.length < 2) return null
  const avgMag = Math.abs(hist.avgAnnualizedPct)
  const curMag = Math.abs(v)
  if (avgMag < 0.3 && curMag < 0.3) return null
  if (curMag > avgMag * 1.15) return 'above 7d avg'
  if (curMag < avgMag * 0.85) return 'below 7d avg'
  return 'near 7d avg'
}

function TapeRow({ row, maxAbs }) {
  const v = row.f.annualizedPct
  const pos = v >= 0
  const widthPct = (Math.abs(v) / maxAbs) * 100 // 0..100 of each half
  const neutral = Math.abs(v) <= 0.5 // basically flat — don't color a non-signal
  const Icon = neutral ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight
  const valColor = neutral ? 'text-inkSoft' : pos ? 'text-pos' : 'text-neg'
  const tag = vsAvgTag(v, row.h)

  return (
    <li className="group grid grid-cols-[88px_1fr_84px] sm:grid-cols-[150px_1fr_72px_120px] items-center gap-3 sm:gap-4 py-2.5">
      {/* Asset */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-600 text-ink">{row.sym}</span>
          <span className="hidden sm:inline truncate font-serif text-sm text-inkSoft">{row.name}</span>
        </div>
        <span className="font-mono text-2xs text-inkFaint tnum">
          8h {fmtPct(row.f.rate * 100, 4)}
        </span>
      </div>

      {/* Diverging bar around the center zero rule */}
      <div className="relative h-7">
        {/* center zero rule */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-rule" aria-hidden="true" />
        <div className="absolute inset-0 grid grid-cols-2">
          {/* left half (negative) — bar grows leftward from center */}
          <div className="relative flex items-center justify-end pr-px">
            {!pos && (
              <div
                className="h-4 bg-neg/85 transition-[width] duration-300 ease-out"
                style={{ width: `${widthPct}%` }}
              />
            )}
          </div>
          {/* right half (positive) — bar grows rightward from center */}
          <div className="relative flex items-center pl-px">
            {pos && (
              <div
                className="h-4 bg-pos/85 transition-[width] duration-300 ease-out"
                style={{ width: `${widthPct}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 7-day funding sparkline (desktop only — like the coin name & basis) */}
      <div className="hidden sm:flex items-center justify-center">
        <Sparkline series={row.h?.annualized} sym={row.sym} />
      </div>

      {/* Annualized value + how it sits vs this coin's own 7-day average */}
      <div className="flex flex-col items-end gap-0.5 text-right">
        <div className="flex items-center gap-1">
          <Icon size={13} className={valColor} aria-hidden="true" />
          <span className={`font-mono text-sm font-600 tnum ${valColor}`}>
            {fmtPct(v, 1)}
          </span>
        </div>
        {tag && (
          <span className="font-mono text-2xs text-inkFaint">{tag}</span>
        )}
      </div>
    </li>
  )
}

// Hand-rolled SVG sparkline — no charting library, to match the no-dependency
// editorial style. Plots the annualized funding series (oldest→newest) with a
// hairline zero baseline; the line takes the green/oxblood ink of its latest
// reading. Static by design, so prefers-reduced-motion needs nothing extra.
function Sparkline({ series, sym }) {
  const W = 60
  const H = 18
  const PAD = 1.5

  if (!series || series.length < 2) {
    // Honest empty state: reserve the lane, draw nothing invented.
    return <div className="h-[18px] w-[60px]" aria-hidden="true" />
  }

  const min = Math.min(...series, 0)
  const max = Math.max(...series, 0)
  const range = max - min || 1
  const x = (i) => PAD + (i / (series.length - 1)) * (W - 2 * PAD)
  const y = (val) => PAD + (1 - (val - min) / range) * (H - 2 * PAD)
  const d = series.map((val, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(' ')
  const last = series[series.length - 1]
  const ink = last >= 0 ? 'text-pos' : 'text-neg'
  const zeroY = y(0).toFixed(1)

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
      role="img"
      aria-label={`${sym} funding, last 7 days`}
    >
      <line x1="0" y1={zeroY} x2={W} y2={zeroY} className="text-rule" stroke="currentColor" strokeWidth="0.5" />
      <path d={d} fill="none" className={ink} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(series.length - 1).toFixed(1)} cy={y(last).toFixed(1)} r="1.4" className={ink} fill="currentColor" />
    </svg>
  )
}
