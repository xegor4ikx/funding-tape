// Display formatters. These shape live numbers — they never originate values.

export function fmtPrice(n) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 0.01) return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  return n.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

export function fmtPct(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return '—'
  const s = n.toFixed(digits)
  return `${n > 0 ? '+' : ''}${s}%`
}

export function fmtCompactUsd(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function fmtClock(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function fmtDateline(ts = Date.now()) {
  return new Date(ts)
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
}

// Countdown like "3h 12m" until next 8h funding settlement.
export function fmtCountdown(ms) {
  if (ms == null || ms <= 0) return '—'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  const s = total % 60
  return `${m}m ${s}s`
}
