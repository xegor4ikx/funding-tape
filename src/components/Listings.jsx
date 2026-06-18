import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { COINS } from '../lib/binance.js'
import { fmtPrice, fmtPct, fmtCompactUsd } from '../lib/format.js'

// Secondary support: a broadsheet "listings" table. Spot price + 24h move,
// 24h turnover vs its own 30-day median (the "unusual volume" tell), and the
// spot–perp basis. Everything here is live; a missing field renders as "—".
export default function Listings({ spot, funding, baseline }) {
  const rows = useMemo(() => {
    return COINS.map((c) => {
      const s = spot?.[c.pair]
      const f = funding?.[c.pair]
      const base = baseline?.[c.pair]
      const volRatio = s && base?.medianQuoteVol ? s.quoteVolume / base.medianQuoteVol : null
      return { ...c, s, f, volRatio }
    })
      .filter((r) => r.s)
      .sort((a, b) => (b.s.quoteVolume || 0) - (a.s.quoteVolume || 0))
  }, [spot, funding, baseline])

  if (!spot) return null

  return (
    <section aria-labelledby="listings-title" className="rule-t pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="listings-title" className="font-serif text-xl sm:text-2xl font-600 tracking-masthead">
          The Listings
        </h2>
        <p className="font-mono text-2xs text-inkFaint uppercase tracking-wider">
          Spot · 24h · turnover vs 30-day median · perp basis
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="rule-b font-mono text-2xs uppercase tracking-wider text-inkFaint">
              <th className="py-2 pr-3 text-left font-500">Asset</th>
              <th className="py-2 px-3 text-right font-500">Last</th>
              <th className="py-2 px-3 text-right font-500">24h</th>
              <th className="py-2 px-3 text-right font-500 hidden sm:table-cell">24h Vol</th>
              <th className="py-2 px-3 text-right font-500">Vol vs&nbsp;30d</th>
              <th className="py-2 pl-3 text-right font-500 hidden md:table-cell">Basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ruleSoft">
            {rows.map((r) => {
              const up = r.s.changePct >= 0
              const hot = r.volRatio != null && r.volRatio >= 1.5
              return (
                <tr key={r.pair} className="font-mono text-sm">
                  <td className="py-2.5 pr-3">
                    <span className="font-600 text-ink">{r.sym}</span>
                    <span className="ml-2 hidden font-serif text-xs text-inkFaint sm:inline">{r.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right tnum text-ink">{fmtPrice(r.s.last)}</td>
                  <td className={`py-2.5 px-3 text-right tnum ${up ? 'text-pos' : 'text-neg'}`}>
                    {fmtPct(r.s.changePct)}
                  </td>
                  <td className="py-2.5 px-3 text-right tnum text-inkSoft hidden sm:table-cell">
                    {fmtCompactUsd(r.s.quoteVolume)}
                  </td>
                  <td className="py-2.5 px-3 text-right tnum">
                    {r.volRatio == null ? (
                      <span className="text-inkFaint">—</span>
                    ) : (
                      <span className={`inline-flex items-center justify-end gap-1 ${hot ? 'text-neg font-600' : 'text-inkSoft'}`}>
                        {hot && <Flame size={12} aria-hidden="true" />}
                        {r.volRatio.toFixed(2)}×
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right tnum text-inkSoft hidden md:table-cell">
                    {r.f ? (
                      <span className={r.f.basisPct >= 0 ? 'text-pos' : 'text-neg'}>
                        {fmtPct(r.f.basisPct, 3)}
                      </span>
                    ) : (
                      <span className="text-inkFaint">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-serif text-xs leading-relaxed text-inkFaint">
        <span className="text-inkSoft">Vol vs&nbsp;30d</span> compares today's turnover to this
        asset's own 30-day median — above <span className="text-ink">1.5×</span> flags where
        attention is moving now. <span className="text-inkSoft">Basis</span> is the perp's premium
        over spot.
      </p>
    </section>
  )
}
