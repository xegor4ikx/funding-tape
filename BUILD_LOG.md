# Build-in-public log — The Funding Tape

A running log of decisions, prompts, and the exact data endpoints, for posting the real process.

## 1. Verify the data is real and reachable before designing
Before any code, curled the two core endpoints from this network to confirm they work and are
CORS-friendly (Binance returns `Access-Control-Allow-Origin: *`):
- `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT` → live spot ticker ✓
- `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT` → live `lastFundingRate`, `markPrice`, `indexPrice` ✓

Decision: build on real fields only. `lastFundingRate` is per-8h, so annualize ×3×365.

## 2. Design pass (anti-pattern self-critique done first)
Rejected the default "crypto = neon on black" look. Picked **financial-print / editorial**:
warm paper `#F4F1EA`, warm near-black ink, hairline rules, serif masthead (Newsreader) + tabular
mono numbers (IBM Plex Mono), only green/oxblood inks. One aesthetic risk, committed to fully.
- Signature element: a **diverging funding tape** around a center zero rule.
- Hero signal (chose option 1): **funding-rate divergence** = where the crowd is over-leveraged.

## 3. Data layer (`src/lib/binance.js`)
- `fetchSpot()` — one request for the whole symbol list via `?symbols=[...]`.
- `fetchFunding()` — `premiumIndex` board, filtered to our pairs; derives annualized funding + basis.
- `fetchVolumeBaseline()` — daily klines, median of prior 30 candles, for the "unusual volume" tell.
- Failures throw typed codes (`network:` / `ratelimit:` / `httpNNN:`) → humanized in the UI.

## 4. Polling (`src/hooks/useMarket.js`)
Spot 10s, funding 30s, volume baseline 5m. Last good snapshot retained on error; never fabricated.

## 5. Components
- `FundingTape.jsx` — hero diverging bar chart + plain-English explainer + 8h settlement countdown.
- `Listings.jsx` — broadsheet table: price, 24h, turnover vs 30d median, perp basis.
- `App.jsx` — masthead, live status line, error banner, loading state, honest footer.

## 6. Verify + revise
Started the dev server, confirmed live data rendering in the browser, screenshotted at 1440 + 375,
critiqued against the anti-pattern list, did one revision pass.

- **Bug found & fixed:** page hung on the loading state with status "LIVE" but no data and no error.
  Cause: a `mounted` ref whose only effect-cleanup set it `false`; under React StrictMode's
  mount→unmount→remount the ref was never reset to `true`, so every async `setState` bailed.
  Fix: set `mounted.current = true` in the effect body on (re)mount.
- **Revision 1:** the section heading duplicated the masthead ("The Funding Tape" twice) → renamed
  the hero section to "Funding Divergence" so the masthead and section read as distinct.
- **Revision 2:** an exactly-0.0% funding row was tinted green (directional) → near-flat readings
  (|annualized| ≤ 0.5%) now render in neutral ink with a Minus glyph, so color only ever signals
  a real lean.

Anti-pattern audit: no dark mode, no neon, no gradient/glow/blur, real Lucide SVG icons, and the
hero is a ranked divergence graphic — not a big-number ticker. All clear.
