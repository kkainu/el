# Project guidance

## Overview

This is a static Finnish electricity price dashboard. `docs/index.html` contains all markup, styles, and vanilla JavaScript. There is no package manager or build step.

- `docs/` is the static site directory.
- `tests/prices.test.cjs` contains dependency-free price and date regression tests. Run them from the project root with `node --test`.

## Working on the app

- Keep changes focused and preserve the single-file structure unless the task calls for restructuring.
- Edit the app in `docs/index.html`; avoid creating a second copy at the project root.
- Use native browser APIs and existing CSS variables. Avoid adding dependencies or a build tool for routine changes.
- Preserve the responsive layout, keyboard-operable chart and hour buttons, visible focus indicators, accessible labels, and live status messages.
- Keep user-facing text in English and prices labeled in c/kWh.

## Price and time handling

- Use `Europe/Helsinki` explicitly for calendar dates and display times, regardless of the device timezone.
- Keep intervals identified by timestamps so repeated local hours remain distinct during daylight-saving transitions. Support 23-, 24-, and 25-hour days.
- The current API request uses `https://api.spot-hinta.fi/TodayAndDayForward?region=FI&priceResolution=15` to fetch today and tomorrow together when available. `PriceWithTax` is converted from euros/kWh to cents/kWh by multiplying by 100; do not apply VAT again.
- The day selector controls the chart, daily statistics, and cheapest hours. The current spot price card always describes today's active interval. Missing or incomplete tomorrow data must not hide valid prices for today.
- The current price uses the active 15-minute interval. Hourly prices average four consecutive intervals; the 12 cheapest hours are ranked by price, with earlier timestamps breaking ties.
- Validate a complete local day's data before ranking. Preserve negative-price support and avoid displaying stale cached prices as today's data.
- Preserve graceful handling of network failures, unavailable local storage, and incomplete data. Respect the existing minimum 61-second gap between API requests and the 15-second request timeout.
- Keep active interval updates local: the UI updates every 30 seconds, with network refreshes when data is missing, at day rollover, when prices are at least an hour old, or on manual Refresh. Revalidate cached rows against the current Helsinki date before displaying them.
- Keep the distinction between VAT-inclusive spot prices and additional grid fees or retailer margins clear.

## Validation

- For app changes, serve the static site from the project root with `python3 -m http.server 8000 --directory docs`, and open `http://localhost:8000` in a browser.
- Check desktop and narrow mobile layouts, chart selection, cheapest-hour buttons, the price table, Refresh, and browser console errors as relevant to the change.
- For price or time logic changes, exercise representative data for normal days, both daylight-saving transitions, negative prices, incomplete responses, and stale caches. Prefer local fixtures over repeated live API requests.
- The regression tests load `docs/index.html` relative to the test file, extract the inline script before the `// UI` marker, and run it in Node's VM without a browser or live API. Preserve this test boundary, or update the loader if the app location or script structure changes.
- For documentation-only changes, review the text against the current source; no app test run is required.
- Report the checks actually performed and any verification limitations.
