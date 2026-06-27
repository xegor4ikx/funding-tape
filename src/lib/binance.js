// All data here is fetched live from Binance public REST endpoints.
// There are NO fallback/placeholder numbers anywhere — a failed fetch throws,
// and the UI renders a real error state instead of inventing data.

// The universe we track. Symbols are Binance USDT pairs that exist on BOTH
// spot and USD-M perpetual futures (so spot price + funding line up).
export const COINS = [
  { sym: 'BTC', pair: 'BTCUSDT', name: 'Bitcoin' },
  { sym: 'ETH', pair: 'ETHUSDT', name: 'Ethereum' },
  { sym: 'SOL', pair: 'SOLUSDT', name: 'Solana' },
  { sym: 'BNB', pair: 'BNBUSDT', name: 'BNB' },
  { sym: 'XRP', pair: 'XRPUSDT', name: 'XRP' },
  { sym: 'DOGE', pair: 'DOGEUSDT', name: 'Dogecoin' },
  { sym: 'ADA', pair: 'ADAUSDT', name: 'Cardano' },
  { sym: 'AVAX', pair: 'AVAXUSDT', name: 'Avalanche' },
  { sym: 'LINK', pair: 'LINKUSDT', name: 'Chainlink' },
  { sym: 'TRX', pair: 'TRXUSDT', name: 'TRON' },
  { sym: 'LTC', pair: 'LTCUSDT', name: 'Litecoin' },
  { sym: 'DOT', pair: 'DOTUSDT', name: 'Polkadot' },
]

const PAIRS = COINS.map((c) => c.pair)
const PAIR_SET = new Set(PAIRS)

// Spot market data (price / 24h change / volume / high / low).
const SPOT_BASE = 'https://data-api.binance.vision'
// USD-M perpetual futures (funding rate, mark price, index price).
const FUT_BASE = 'https://fapi.binance.com'

// In production we route every call through our own /api/binance serverless
// proxy. Reason: Binance's futures host blocks US IPs, so a direct browser
// fetch leaves US visitors with an empty funding board. The proxy runs in a
// non-US region and fixes it for everyone. In local dev there's no serverless
// runtime, so we hit Binance directly (works fine from a non-US machine).
const USE_PROXY = import.meta.env.PROD
const PROXY = '/api/binance'

// URL builders — the ONLY thing that changes between dev (direct) and prod (proxy).
function spotUrl() {
  const symbolsJson = JSON.stringify(PAIRS)
  return USE_PROXY
    ? `${PROXY}?type=spot&symbols=${encodeURIComponent(symbolsJson)}`
    : `${SPOT_BASE}/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`
}

function fundingUrl() {
  return USE_PROXY
    ? `${PROXY}?type=funding`
    : `${FUT_BASE}/fapi/v1/premiumIndex`
}

function klinesUrl(pair) {
  return USE_PROXY
    ? `${PROXY}?type=klines&pair=${pair}`
    : `${SPOT_BASE}/api/v3/klines?symbol=${pair}&interval=1d&limit=31`
}

function fundingHistoryUrl(pair) {
  return USE_PROXY
    ? `${PROXY}?type=fundinghistory&pair=${pair}`
    : `${FUT_BASE}/fapi/v1/fundingRate?symbol=${pair}&limit=21`
}

async function getJson(url, label) {
  let res
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch (e) {
    // Network / CORS / offline — surfaced verbatim to the error state.
    throw new Error(`network:${label}`)
  }
  if (res.status === 418 || res.status === 429) throw new Error(`ratelimit:${label}`)
  if (!res.ok) throw new Error(`http${res.status}:${label}`)
  return res.json()
}

// ---- Spot: 24h ticker for our exact symbol list (one request) ----
export async function fetchSpot() {
  const data = await getJson(spotUrl(), 'spot')
  const out = {}
  for (const t of data) {
    out[t.symbol] = {
      last: Number(t.lastPrice),
      changePct: Number(t.priceChangePercent),
      high: Number(t.highPrice),
      low: Number(t.lowPrice),
      quoteVolume: Number(t.quoteVolume), // 24h volume in USDT
    }
  }
  return out
}

// ---- Futures: funding rate + mark/index for the basis (one request) ----
// premiumIndex with no symbol returns the full board; we filter to our set.
export async function fetchFunding() {
  const data = await getJson(fundingUrl(), 'funding')
  const out = {}
  for (const f of data) {
    if (!PAIR_SET.has(f.symbol)) continue
    const rate = Number(f.lastFundingRate) // per 8h funding interval
    const mark = Number(f.markPrice)
    const index = Number(f.indexPrice)
    out[f.symbol] = {
      rate, // fractional, e.g. 0.0001 = 0.01%
      // Annualized: 3 funding payments/day * 365 days.
      annualizedPct: rate * 3 * 365 * 100,
      mark,
      index,
      // Spot–perp basis: how far the perp trades above/below the index.
      basisPct: index ? ((mark - index) / index) * 100 : 0,
      nextFundingTime: Number(f.nextFundingTime),
    }
  }
  return out
}

// ---- Baseline volume from daily klines, for the "unusual volume" tell ----
// 24h quote-volume vs the median of the prior 30 daily candles. Ratio > 1
// means today's attention/turnover is above its recent normal.
export async function fetchVolumeBaseline() {
  const out = {}
  // Sequential-ish but parallel with a small cap to stay polite to the API.
  await Promise.all(
    COINS.map(async (c) => {
      try {
        const rows = await getJson(klinesUrl(c.pair), 'klines')
        // Each row: [openTime, open, high, low, close, volume, closeTime, quoteVolume, ...]
        const prior = rows.slice(0, -1).map((r) => Number(r[7])) // exclude today
        if (!prior.length) return
        const sorted = [...prior].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        out[c.pair] = { medianQuoteVol: median }
      } catch {
        // A single coin's baseline missing is non-fatal; the cell just omits the ratio.
      }
    }),
  )
  return out
}

// ---- Funding history: last ~7 days of settlements, for the inline sparkline ----
// Binance settles funding 3x/day, so limit=21 ≈ 7 days. We store the annualized
// series (oldest→newest) plus its own 7-day average — the reference that tells
// you whether the current reading is actually extreme for this coin.
export async function fetchFundingHistory() {
  const out = {}
  await Promise.all(
    COINS.map(async (c) => {
      try {
        const rows = await getJson(fundingHistoryUrl(c.pair), 'fundinghistory')
        if (!Array.isArray(rows) || rows.length < 2) return
        // Each row: { symbol, fundingRate, fundingTime }. Sort oldest→newest.
        const sorted = [...rows].sort((a, b) => Number(a.fundingTime) - Number(b.fundingTime))
        // Annualize each settlement the same way as the live board: rate*3*365.
        const annualized = sorted.map((r) => Number(r.fundingRate) * 3 * 365 * 100)
        const avgAnnualizedPct = annualized.reduce((s, v) => s + v, 0) / annualized.length
        out[c.pair] = { annualized, avgAnnualizedPct }
      } catch {
        // A single coin's history missing is non-fatal; that row just omits the sparkline.
      }
    }),
  )
  return out
}
