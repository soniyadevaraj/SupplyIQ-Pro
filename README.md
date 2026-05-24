# SupplyIQ Pro — FMCG Supply Chain Intelligence Dashboard

A dark-themed, interactive supply chain dashboard for FMCG retail operations — built with vanilla HTML, CSS, and JavaScript, powered by Chart.js and Claude AI.

![Dashboard preview](https://img.shields.io/badge/version-2.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-orange)

---

## Features

- **Overview dashboard** — KPI cards, stock-by-category bar chart, risk radar, 12-week trend line, days-of-stock histogram, and a 7-week stockout heatmap
- **Inventory roster** — full 40-SKU table with search, sort, CSV export, and click-through modals showing stock status, financials, and reorder recommendations
- **Stockout risk** — AI-scored risk prediction per SKU, risk distribution histogram, top-10 at-risk list
- **Supplier performance** — lead time comparison, reliability scores, per-supplier SKU and value breakdown
- **ABC analysis** — A/B/C classification cards, value vs SKU count bar chart, bubble chart (value × daily demand)
- **Demand forecast** — 12-week actuals + 4-week AI projection, stacked category demand, mini sparkbars per SKU
- **Restock planner** — prioritized reorder list with urgency tags, suggested quantities, and one-click order queuing
- **AI Analyst** — chat with your supply chain data, run stockout predictions, and generate restock plans — all powered by Claude (Anthropic API)
- **Live updates** — stock levels simulate consumption every 8 seconds with toast alerts for newly critical SKUs

---

## File Structure

```
supplyiq-pro/
├── index.html      # Markup and page structure
├── styles.css      # All CSS (variables, layout, components, animations)
├── app.js          # All JavaScript (data, charts, AI, interactivity)
└── README.md       # This file
```

---

## Getting Started

### Option 1 — Open directly in a browser

No build step needed. Just clone or download and open `index.html`:

```bash
git clone https://github.com/your-username/supplyiq-pro.git
cd supplyiq-pro
open index.html        # macOS
# or
start index.html       # Windows
```

### Option 2 — Serve locally (recommended to avoid CORS issues with fonts)

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

---

## Enabling the AI Analyst

The AI features (chat, stockout prediction, restock plan) require an Anthropic API key.

1. Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys** → create a new key
2. Open the dashboard and navigate to **AI Analyst** in the sidebar
3. Paste your key into the setup box and click **Activate AI Agent**

Your key is stored in `localStorage` and never sent anywhere except directly to the Anthropic API.

> **Note:** Direct browser access to the Anthropic API requires the `anthropic-dangerous-direct-browser-access` header, which is already set in `app.js`. This is fine for personal/demo use. For production, proxy API calls through a backend server to keep your key secure.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI    | Vanilla HTML5 + CSS3 (custom properties, grid, flexbox) |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Fonts | JetBrains Mono, Syne, Inter (Google Fonts) |
| AI    | [Claude Sonnet](https://www.anthropic.com/) via Anthropic API |
| Data  | Seeded pseudo-random generator (no backend required) |

---

## Customisation

### Swap in real data

Replace the `makeData()` function in `app.js` with a `fetch()` call to your own API or a static JSON file. The rest of the dashboard will update automatically.

### Add more SKUs or categories

Edit the `CATS` object in `app.js` — each key is a category, each value is an array of product names.

### Change colours

All colours are CSS custom properties in `:root` inside `styles.css`. Edit once, applied everywhere.

### Adjust the live-update interval

Change the `8000` (milliseconds) in the `setInterval` call at the bottom of `app.js`.

---

## Deployment

Because there is no build step, you can deploy anywhere that serves static files:

- **GitHub Pages** — push to a `gh-pages` branch or enable Pages from the repo settings
- **Netlify / Vercel** — drag-and-drop the folder or connect your GitHub repo
- **Any static host** — upload the three files as-is

---

## License

MIT — free to use, modify, and distribute.
