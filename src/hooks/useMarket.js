import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSpot, fetchFunding, fetchVolumeBaseline } from '../lib/binance.js'

// Polls each Binance feed on its own sane interval and tracks real
// loading / error / last-updated state. No data is fabricated on failure;
// the previous good snapshot is kept and the error is surfaced to the UI.
export function useMarket() {
  const [spot, setSpot] = useState(null)
  const [funding, setFunding] = useState(null)
  const [baseline, setBaseline] = useState({})

  const [spotErr, setSpotErr] = useState(null)
  const [fundingErr, setFundingErr] = useState(null)

  const [spotAt, setSpotAt] = useState(null)
  const [fundingAt, setFundingAt] = useState(null)

  const mounted = useRef(true)
  // Set true on (re)mount as well — under StrictMode the first effect's
  // cleanup flips this to false, and without resetting it every async
  // setState would bail and the page would hang on the loading state.
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const loadSpot = useCallback(async () => {
    try {
      const d = await fetchSpot()
      if (!mounted.current) return
      setSpot(d); setSpotAt(Date.now()); setSpotErr(null)
    } catch (e) {
      if (!mounted.current) return
      setSpotErr(e.message || 'error')
    }
  }, [])

  const loadFunding = useCallback(async () => {
    try {
      const d = await fetchFunding()
      if (!mounted.current) return
      setFunding(d); setFundingAt(Date.now()); setFundingErr(null)
    } catch (e) {
      if (!mounted.current) return
      setFundingErr(e.message || 'error')
    }
  }, [])

  const loadBaseline = useCallback(async () => {
    const d = await fetchVolumeBaseline()
    if (!mounted.current) return
    if (Object.keys(d).length) setBaseline(d)
  }, [])

  useEffect(() => {
    loadSpot(); loadFunding(); loadBaseline()
    const s = setInterval(loadSpot, 10_000)        // spot every ~10s
    const f = setInterval(loadFunding, 30_000)     // funding every ~30s
    const b = setInterval(loadBaseline, 300_000)   // volume baseline every 5m
    return () => { clearInterval(s); clearInterval(f); clearInterval(b) }
  }, [loadSpot, loadFunding, loadBaseline])

  const refresh = useCallback(() => { loadSpot(); loadFunding() }, [loadSpot, loadFunding])

  return {
    spot, funding, baseline,
    spotErr, fundingErr,
    spotAt, fundingAt,
    loading: spot == null && funding == null,
    refresh,
  }
}
