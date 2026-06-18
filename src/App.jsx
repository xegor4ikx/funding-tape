import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, Radio } from 'lucide-react'
import { useMarket } from './hooks/useMarket.js'
import { fmtClock, fmtDateline } from './lib/format.js'
import FundingTape from './components/FundingTape.jsx'
import Listings from './components/Listings.jsx'

// Turn an internal error code (e.g. "network:spot") into copy written in
// the interface's own voice — never a fake chart or zeroed-out numbers.
function humanizeError(code) {
  if (!code) return null
  if (code.startsWith('network')) return 'Binance unreachable from this network — retrying'
  if (code.startsWith('ratelimit')) return 'Rate-limited by Binance — backing off, retrying shortly'
  if (code.startsWith('http')) return `Binance returned an error (${code.split(':')[0]}) — retrying`
  return 'Feed interrupted — retrying'
}

export default function App() {
  const m = useMarket()
  const [now, setNow] = useState(Date.now())

  // 1s clock for the dateline + funding countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const spotMsg = humanizeError(m.spotErr)
  const fundingMsg = humanizeError(m.fundingErr)

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-broadsheet px-4 sm:px-6 lg:px-8">
        <Masthead now={now} />

        <StatusLine
          spotAt={m.spotAt}
          fundingAt={m.fundingAt}
          onRefresh={m.refresh}
          degraded={Boolean(spotMsg || fundingMsg)}
        />

        {(spotMsg || fundingMsg) && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 border border-neg/40 bg-negSoft/50 px-3 py-2"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-neg" aria-hidden="true" />
            <div className="font-mono text-2xs leading-relaxed text-ink">
              {spotMsg && <div>{spotMsg}</div>}
              {fundingMsg && <div>{fundingMsg}</div>}
            </div>
          </div>
        )}

        <main className="mt-8 space-y-10 pb-4">
          {m.loading ? (
            <LoadingState />
          ) : (
            <>
              <FundingTape funding={m.funding} now={now} />
              <Listings spot={m.spot} funding={m.funding} baseline={m.baseline} />
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  )
}

function Masthead({ now }) {
  return (
    <header className="pt-8 sm:pt-12">
      <div className="flex items-center justify-between rule-b pb-2 font-mono text-2xs uppercase tracking-wider text-inkSoft">
        <span>{fmtDateline(now)}</span>
        <span className="hidden sm:inline">Vol.&nbsp;1 · Binance Spot &amp; Perp</span>
      </div>
      <h1 className="mt-4 font-serif text-4xl font-600 leading-[1.05] tracking-masthead sm:text-6xl">
        The Funding Tape
      </h1>
      <p className="mt-3 max-w-2xl font-serif text-base italic text-inkSoft sm:text-lg">
        Where the perp crowd is over-leveraged — read off live, before it unwinds.
      </p>
    </header>
  )
}

function StatusLine({ spotAt, fundingAt, onRefresh, degraded }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rule-t rule-b py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-2xs uppercase tracking-wider text-inkSoft">
        <span className="inline-flex items-center gap-1.5">
          <Radio
            size={12}
            className={degraded ? 'text-neg' : 'text-pos'}
            aria-hidden="true"
          />
          {degraded ? 'Reconnecting' : 'Live'}
        </span>
        <span className="tnum">SPOT {spotAt ? fmtClock(spotAt) : '—'}</span>
        <span className="tnum">FUNDING {fundingAt ? fmtClock(fundingAt) : '—'}</span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex cursor-pointer items-center gap-1.5 border border-rule px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-ink transition-colors duration-200 hover:bg-panel focus-visible:bg-panel"
      >
        <RefreshCw size={12} aria-hidden="true" />
        Refresh
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="rule-t py-16 text-center">
      <p className="font-mono text-2xs uppercase tracking-widest text-inkSoft">
        Reading the tape from Binance…
      </p>
      <div className="mx-auto mt-6 max-w-md space-y-3" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-12 bg-panel" />
            <div className="h-3 flex-1 bg-panel" style={{ opacity: 1 - i * 0.15 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="rule-t mt-6 py-6 font-mono text-2xs leading-relaxed text-inkFaint">
      <p>
        Data: <span className="text-inkSoft">Binance public REST</span> — spot 24h ticker &amp;
        daily klines (data-api.binance.vision), perpetual funding &amp; mark/index price
        (fapi.binance.com). Every figure is a live fetch; nothing on this page is simulated.
      </p>
      <p className="mt-2 text-ink">
        Not financial advice. Funding and basis describe positioning, not direction.
      </p>
    </footer>
  )
}
