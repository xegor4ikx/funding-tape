// Vercel serverless function — a small server-side proxy to Binance's public REST.
//
// Why this exists: Binance's USD-M futures host (fapi.binance.com) refuses
// requests from US IP addresses. When the page fetched it straight from the
// visitor's browser, US visitors got "unreachable" and the funding section was
// blank. Routing those calls through this function — which runs in a non-US
// Vercel region (see vercel.json) — makes the data load for every visitor,
// wherever they are.
//
// This is NOT a generic open proxy: only the three exact upstream shapes the
// app needs are allowed. Anything else returns 400.

const SPOT_BASE = 'https://data-api.binance.vision'
const FUT_BASE = 'https://fapi.binance.com'

function buildUpstream(query) {
  const { type, symbols, pair } = query

  if (type === 'spot') {
    if (!symbols) throw new Error('missing symbols')
    return `${SPOT_BASE}/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`
  }

  if (type === 'funding') {
    return `${FUT_BASE}/fapi/v1/premiumIndex`
  }

  if (type === 'klines') {
    // Defensive: only allow a plain symbol token, no path/query injection.
    if (!pair || !/^[A-Z0-9]{2,20}$/.test(pair)) throw new Error('bad pair')
    return `${SPOT_BASE}/api/v3/klines?symbol=${pair}&interval=1d&limit=31`
  }

  throw new Error('unknown type')
}

export default async function handler(req, res) {
  let url
  try {
    url = buildUpstream(req.query)
  } catch (e) {
    res.status(400).json({ error: e.message })
    return
  }

  try {
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } })
    const body = await upstream.text()
    // Light edge caching: stay polite to Binance and speed up repeat hits,
    // without ever serving stale-looking data for long (funding moves slowly).
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=20')
    res.setHeader('Content-Type', 'application/json')
    res.status(upstream.status).send(body)
  } catch (e) {
    // Surface a clean 502 so the existing UI error state can react.
    res.status(502).json({ error: 'upstream_unreachable' })
  }
}
