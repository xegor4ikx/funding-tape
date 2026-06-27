# The Funding Tape

A live crypto **positioning** terminal — a single-page React + Vite + Tailwind app for
traders who are tired of price-ticker hype. It surfaces one edge a normal price app hides:
**where the perpetual-futures crowd is over-leveraged**, read off live and ranked.

Every number on screen is a live fetch from Binance public REST. There are **no simulated,
placeholder, or hardcoded values** anywhere — a failed request renders an honest error state,
never fake data.

## The signal (the hero)

**Funding-rate divergence across the board.** Funding is the fee perpetual traders pay each
8 hours to hold a position. Heavily positive funding = the crowd is long and paying to stay
long; heavily negative = it's short and paying. Extreme readings mark *crowded* trades — the
kind that unwind fast. The tape ranks the universe around a center zero rule so you can see at
a glance which side is leaning hardest.

Secondary support: a broadsheet **listings** table — spot price, 24h move, **24h turnover vs
the asset's own 30-day median** (the "unusual volume / attention" tell), and the **spot–perp
basis** (the perp's premium over spot).

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (default http://localhost:5180). Works out of the box — no
API key, no env vars, no backend.

```bash
npm run build   # production build
npm run preview # serve the build
```

## Data sources & endpoints (all public, keyless, CORS-friendly)

| Data | Endpoint |
| --- | --- |
| Spot price / 24h change / volume / high / low | `GET https://data-api.binance.vision/api/v3/ticker/24hr?symbols=[...]` |
| 30-day volume baseline | `GET https://data-api.binance.vision/api/v3/klines?symbol={PAIR}&interval=1d&limit=31` |
| Perp funding rate + mark/index price (for basis) | `GET https://fapi.binance.com/fapi/v1/premiumIndex` |
| 7-day funding history (for the sparkline) | `GET https://fapi.binance.com/fapi/v1/fundingRate?symbol={PAIR}&limit=21` |

- **Spot** polls every ~10s. **Funding** polls every ~30s. The **volume baseline** and
  **funding history** refresh every 5 minutes (they only move on daily close / the 8h settlement).
- HTTP `418`/`429` (rate limits) and network/CORS failures are caught and shown in the
  interface's own voice; the last good snapshot is retained until the next success.

### Derived figures (and how)

- **Annualized funding** = `lastFundingRate × 3 × 365 × 100` (3 settlements/day).
- **Spot–perp basis** = `(markPrice − indexPrice) / indexPrice × 100`.
- **Vol vs 30d** = `quoteVolume(24h) / median(prior 30 daily quoteVolumes)`. `≥ 1.5×` is flagged.
- **7-day sparkline / "vs 7d avg"** — each row's funding settlements over the last week
  (annualized), with the current reading tagged above / near / below that coin's own 7-day mean.

## Design

Financial-print / editorial — warm paper ground, hairline rules, a serif masthead (Newsreader)
with tabular monospace numbers (IBM Plex Mono). The only inks are newspaper green (positive) and
oxblood (negative). No dark mode, no neon, no gradients/glow, real Lucide SVG icons. Responsive
375 → 768 → 1440, visible keyboard focus, `prefers-reduced-motion` respected, restrained
150–300ms transitions.

## Honesty

Footer names the data source and states **Not financial advice**. Loading, empty, and error
states are real. Nothing is invented.
