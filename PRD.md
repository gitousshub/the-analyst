# Product Requirements Document — The Analyst Dashboard

> **Version**: 1.0  
> **Date**: 2026-05-26  
> **Status**: Draft — Awaiting Approval  
> **Author**: AI Assistant  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Experience & Functionality](#2-user-experience--functionality)
3. [Technical Specifications](#3-technical-specifications)
4. [UI/UX Specifications](#4-uiux-specifications)
5. [Reusability Model](#5-reusability-model)
6. [Risks & Mitigations](#6-risks--mitigations)

---

## 1. Executive Summary

### 1.1 Problem Statement

Small-to-medium businesses (first client: **Le Peignoir**, a Moroccan luxury embroidered bathrobe brand) track all orders in Google Sheets. The raw spreadsheet rows make it impossible to understand business performance at a glance — which product sells most, which city generates the most revenue, what the delivery rate is, or whether the business is growing or declining week over week. There is no reporting layer on top of their data.

### 1.2 Proposed Solution

A **standalone, config-driven web dashboard** that reads a pre-processed JSON file from Google Drive and renders KPI cards, interactive charts, date range filtering, and data export capabilities. The dashboard is a static web project (HTML, CSS, JavaScript) with zero build process, zero framework dependencies, and zero server-side logic. A separate n8n workflow (documented in `N8N_WORKFLOW_GUIDE.md`) handles data processing and JSON generation — the dashboard is purely a visualization layer.

The entire system is designed as a **reusable template**: for each new client, only one file changes (`config.js`). Everything else — the rendering logic, chart generation, filtering, UI — is universal.

### 1.3 Success Criteria

| # | Metric | Target |
|---|--------|--------|
| 1 | Time to first meaningful insight | < 3 seconds from page load to fully rendered KPIs and charts |
| 2 | Date range filter response time | < 100ms to recompute all KPIs and re-render all charts |
| 3 | Mobile usability | 100% functional on 375px viewport; all charts readable, all controls tappable |
| 4 | Client onboarding time | < 30 minutes to deploy the dashboard for a new client (change config.js, host files) |
| 5 | Accessibility | WCAG 2.1 AA compliance — minimum 4.5:1 contrast ratio on all text |
| 6 | Data accuracy | All KPI computations match manual spreadsheet calculations within 0.01% rounding |
| 7 | Browser support | Works on Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| 8 | Zero downtime dependency | Dashboard functions entirely offline once JSON is fetched — no ongoing API dependency |

---

## 2. User Experience & Functionality

### 2.1 User Personas

#### Primary: Business Owner (Le Peignoir's Owner)

| Attribute | Detail |
|-----------|--------|
| **Name** | Fatima (representative persona) |
| **Role** | Owner / decision-maker of a small e-commerce brand |
| **Technical Level** | Low — comfortable with Google Sheets but has no data analysis skills |
| **Device** | Primarily mobile (iPhone / Android), occasionally laptop |
| **Language** | French (primary), Arabic |
| **Goals** | Understand daily/weekly sales performance, identify top products, monitor delivery success, track revenue |
| **Pain Points** | Cannot extract insights from raw spreadsheet rows; has no time to build formulas; needs visual, instant answers |

#### Secondary: Operations Manager

| Attribute | Detail |
|-----------|--------|
| **Name** | Karim (representative persona) |
| **Role** | Manages fulfillment and delivery coordination |
| **Technical Level** | Medium |
| **Device** | Desktop (primary), mobile (secondary) |
| **Goals** | Monitor delivery rates by city, identify problem areas, track pending orders |
| **Pain Points** | Cannot quickly see which cities have high cancellation rates; manually counts statuses |

### 2.2 User Stories & Acceptance Criteria

#### US-01: View Business Overview

> **As a** business owner, **I want to** see my key business metrics at a glance **so that** I can understand my business performance without digging into raw data.

**Acceptance Criteria:**
- [ ] 8 KPI cards are displayed: Total Orders, Total Revenue (Delivered), AOV (Delivered), Delivered Rate %, Cancelled Rate %, Pending Count, No Response Count, Repeat Customer Rate %
- [ ] All KPI values are computed from the currently filtered date range
- [ ] Total Revenue is calculated ONLY from delivered orders (Cash on Delivery model)
- [ ] AOV = Total Delivered Revenue ÷ Total Delivered Orders
- [ ] Repeat Customer Rate = (Clients with >1 order ÷ Total unique clients) × 100, grouped by `client_phone`
- [ ] Each KPI card shows a comparison indicator ("↑ X%" or "↓ X%") vs the previous period
- [ ] Previous period = same-length window immediately before the selected date range

---

#### US-02: Filter by Date Range

> **As a** business owner, **I want to** filter all data by a specific date range **so that** I can analyze any time period I'm interested in.

**Acceptance Criteria:**
- [ ] Two date inputs are displayed: "From" and "To"
- [ ] Quick preset buttons are available: "This Week", "This Month", "Last 30 Days", "This Year", "All Time"
- [ ] Default on page load: "This Month"
- [ ] Changing either date instantly re-filters all orders and updates ALL KPI cards and ALL charts
- [ ] No API calls are made on date change — everything is client-side
- [ ] "This Week" = Monday to Sunday of current ISO week
- [ ] "This Month" = 1st to last day of current month
- [ ] "All Time" = earliest date to latest date found in the orders array
- [ ] "Last 30 Days" = today minus 30 days to today
- [ ] "This Year" = January 1st to today

---

#### US-03: View Time Series Trends

> **As a** business owner, **I want to** see how my orders and revenue trend over time **so that** I can identify growth or decline patterns.

**Acceptance Criteria:**
- [ ] A line chart is displayed with two lines: order count and delivered revenue
- [ ] X-axis shows time periods
- [ ] Dual Y-axes: left axis for order count, right axis for revenue
- [ ] If selected date range ≤ 60 days → group by week
- [ ] If selected date range > 60 days → group by month
- [ ] Chart updates when date range changes
- [ ] Tooltips show exact values on hover/tap
- [ ] Legend is visible and clearly labels both lines
- [ ] Revenue line only includes delivered orders

---

#### US-04: View Status Breakdown

> **As a** business owner, **I want to** see the proportion of delivered, cancelled, pending, and no-response orders **so that** I can monitor my delivery pipeline health.

**Acceptance Criteria:**
- [ ] A donut chart shows the proportion of each status category
- [ ] Status categories are read from `config.statuses` — never hardcoded
- [ ] Percentages are displayed on/near each segment
- [ ] Tooltips show exact count and percentage on hover/tap
- [ ] Chart uses accessible colors (not just red/green)
- [ ] Chart updates when date range changes

---

#### US-05: View Dimension Analysis

> **As a** business owner, **I want to** see breakdowns by product dimensions (pack, city, color, fabric, etc.) **so that** I can understand which products and markets perform best.

**Acceptance Criteria:**
- [ ] One chart is dynamically created for EACH dimension in `config.dimensions`
- [ ] The dashboard does NOT hardcode any dimension names — it reads them from config
- [ ] Dimensions with `chart_type: "bar"` render as horizontal bar charts, ranked most to least
- [ ] Dimensions with `chart_type: "pie"` render as pie charts
- [ ] If a pie chart has > 5 categories, it automatically switches to a bar chart
- [ ] Each chart shows both order count and revenue contribution
- [ ] All dimension charts update when date range changes
- [ ] Chart title uses the dimension's `label` from config

---

#### US-06: View Peak Days

> **As a** business owner, **I want to** know which days of the week get the most orders **so that** I can time my marketing and staffing.

**Acceptance Criteria:**
- [ ] A bar chart shows order count by day of week (Monday through Sunday)
- [ ] Bars are labeled with day names
- [ ] Tooltips show exact counts
- [ ] Chart updates when date range changes
- [ ] The highest-volume day is visually emphasized

---

#### US-07: View Delivery Rate by City

> **As an** operations manager, **I want to** see the delivery success rate per city **so that** I can identify problematic delivery regions.

**Acceptance Criteria:**
- [ ] A horizontal bar chart shows delivery rate (%) per city
- [ ] Cross-references `status` and `ville` dimension
- [ ] Cities with delivery rate < 50% are visually highlighted (e.g., different color)
- [ ] Bars are sorted from highest to lowest delivery rate
- [ ] Tooltips show exact delivered count / total count / percentage
- [ ] Only cities with ≥ 5 orders are shown (to avoid statistical noise)
- [ ] Chart updates when date range changes

---

#### US-08: View Promo Code Analysis

> **As a** business owner, **I want to** understand how my promotional campaigns perform **so that** I can decide which promos to continue or stop.

**Acceptance Criteria:**
- [ ] Section shows: orders with promo vs orders without promo (counts and percentages)
- [ ] Delivery rate comparison: promo orders vs non-promo orders
- [ ] Total discount amount given on delivered orders
- [ ] Top promo codes ranked by usage count (bar chart or table)
- [ ] Promo = any order where `promo_code` is non-empty
- [ ] All values update when date range changes

---

#### US-09: View Top Clients

> **As a** business owner, **I want to** see my top customers **so that** I can identify VIPs and nurture those relationships.

**Acceptance Criteria:**
- [ ] A ranked list or table of top 10 clients by delivered revenue
- [ ] Shows: rank, client name, total orders, total delivered revenue
- [ ] Grouped by `client_phone` (same phone = same client even if name varies slightly)
- [ ] Updates when date range changes
- [ ] No duplicate entries for the same client

---

#### US-10: Manually Refresh Data

> **As a** business owner, **I want to** trigger a data refresh from the dashboard **so that** I can get updated numbers without waiting for the scheduled refresh.

**Acceptance Criteria:**
- [ ] A "Refresh Data" button is visible in the dashboard
- [ ] Clicking it sends an HTTP POST to the webhook URL defined in `config.js`
- [ ] While processing, the button shows a loading/spinner state
- [ ] After clicking, the button is disabled for 60 seconds with a visible countdown
- [ ] After 60 seconds, the button re-enables automatically
- [ ] This is NOT a browser page reload — it triggers the n8n workflow
- [ ] On success response, show a brief success message
- [ ] On failure, show an error message

---

#### US-11: Export Data as CSV

> **As a** business owner, **I want to** download the currently filtered data as a CSV **so that** I can share it or do further analysis in Excel.

**Acceptance Criteria:**
- [ ] A "Download CSV" button is visible in the dashboard
- [ ] Clicking it downloads the currently FILTERED orders (not all orders) as a `.csv` file
- [ ] The CSV includes ALL fields from the order objects
- [ ] CSV filename includes the date range, e.g., `report_2026-05-01_to_2026-05-26.csv`
- [ ] Proper CSV encoding: commas in values are handled, UTF-8 for French/Arabic characters
- [ ] Pure client-side operation — no server calls
- [ ] BOM (Byte Order Mark) is included for Excel compatibility with UTF-8

---

#### US-12: Toggle Dark/Light Mode

> **As a** user, **I want to** switch between dark and light themes **so that** I can use the dashboard comfortably in any lighting condition.

**Acceptance Criteria:**
- [ ] A toggle is available in the Settings page
- [ ] Default follows the system preference (`prefers-color-scheme`)
- [ ] User's choice is persisted in `localStorage`
- [ ] Theme change is smooth (CSS transition, not a flash)
- [ ] All elements including charts adapt to the selected theme
- [ ] Persists across page refreshes and browser restarts

---

#### US-13: Toggle Smart KPI Coloring

> **As a** business owner, **I want to** enable or disable health-based KPI coloring **so that** I can choose whether I see visual alerts on my metrics.

**Acceptance Criteria:**
- [ ] A toggle is available in the Settings page
- [ ] Default: ON
- [ ] When ON: Delivery rate KPI card is colored green (>70%), yellow (50-70%), or red (<50%). Cancellation rate KPI card is colored green (<15%), yellow (15-30%), or red (>30%). All other KPIs use neutral styling.
- [ ] When OFF: All KPI cards use neutral styling regardless of values
- [ ] Setting is persisted in `localStorage`
- [ ] Persists across page refreshes and browser restarts
- [ ] Changes take effect immediately without page reload

---

#### US-14: See Data Quality Issues

> **As a** business owner, **I want to** know if there are problems with my raw data **so that** I can fix them in my Google Sheet.

**Acceptance Criteria:**
- [ ] A badge in the header shows "X rows skipped" if `metadata.invalid_rows_count > 0`
- [ ] Clicking the badge expands/reveals a section listing each invalid row
- [ ] Each entry shows: row number, reason (e.g., "Missing date"), and order reference
- [ ] Data comes from `metadata.invalid_rows_details` in the JSON
- [ ] If no invalid rows, the badge is hidden

---

#### US-15: See Stale Data Warning

> **As a** business owner, **I want to** be warned if the data is outdated **so that** I know to trigger a manual refresh.

**Acceptance Criteria:**
- [ ] A warning banner appears if `metadata.last_successful_run` is older than `config.schedule_interval_hours × 1.5` (50% grace period)
- [ ] Banner shows human-readable time since last update (e.g., "Last updated 10 days ago")
- [ ] Banner includes a "Refresh Now" call-to-action that triggers the webhook
- [ ] Banner is dismissible
- [ ] Banner uses warning-level styling (yellow/amber)

---

### 2.3 Non-Goals

The following are explicitly **out of scope** for this project:

| # | Non-Goal | Rationale |
|---|----------|-----------|
| 1 | User authentication / login | The URL is the access control — no auth layer needed |
| 2 | Multi-user role management | Single-user dashboard per client |
| 3 | Real-time live data | Data updates via scheduled/manual n8n runs, not WebSockets |
| 4 | Data editing from the dashboard | The Google Sheet is the source of truth; dashboard is read-only |
| 5 | AI-generated narrative | Removed from requirements — no Claude API integration |
| 6 | Email/PDF report generation | Client views the dashboard directly; no export beyond CSV |
| 7 | Multi-language i18n | Dashboard text is in English/French as needed; no dynamic language switching |
| 8 | Historical report comparison | The dashboard shows current JSON only; historical snapshots are stored on Drive but not surfaced in the UI |
| 9 | Custom chart builder | Dashboard renders predetermined chart types based on config — no drag-and-drop chart creation |
| 10 | Backend / API server | Everything runs client-side — no server-side application |

---

## 3. Technical Specifications

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
│                                                             │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐               │
│  │ HTML     │    │ CSS      │    │ JS       │               │
│  │ index.   │◄───│ styles.  │    │ config.  │──── Webhook   │
│  │ html     │    │ css      │    │ data.    │     URL &     │
│  │          │    │          │    │ charts.  │     Drive URL  │
│  │          │    │          │    │ ui.      │               │
│  │          │    │          │    │ main.    │               │
│  └─────────┘    └──────────┘    └────┬─────┘               │
│                                      │                      │
└──────────────────────────────────────┼──────────────────────┘
                                       │
                    ┌──────────────────┐│┌──────────────────┐
                    │                  │││                  │
                    │  Google Drive    │◄┘│  n8n Webhook    │
                    │  (JSON file)     │   │  (POST /refresh)│
                    │  READ ONLY       │   │                  │
                    └──────────────────┘   └──────────────────┘
```

**Data Flow:**
1. Dashboard loads → fetches JSON from Google Drive public URL
2. JSON is parsed → `config` section configures the dashboard dynamically
3. `orders` array is held in memory for client-side filtering
4. User selects date range → JS filters orders array → recomputes all KPIs and charts
5. User clicks Refresh → JS sends POST to n8n webhook → n8n re-processes sheet → overwrites JSON on Drive
6. User reloads page → fetches updated JSON

### 3.2 File Structure

```
/dashboard
  index.html              ← Page structure only. No inline styles. No inline scripts.
  /css
    styles.css            ← ALL styling: layout, colors, responsive, components, themes
  /js
    config.js             ← Client-specific: webhook URL + Google Drive JSON URL (ONLY file that changes per client)
    data.js               ← Fetch JSON from Drive, parse, filter logic, date range utils, comparison period computation
    charts.js             ← All Chart.js chart creation, configuration, update, and destroy logic
    ui.js                 ← KPI card rendering, settings panel, refresh button, CSV export, data quality badge, stale warning
    main.js               ← Entry point: initializes modules in correct order, wires event listeners
  /assets
    logo.png              ← Client logo (optional)
```

#### File Responsibilities (Strict Separation)

| File | Responsibility | Imports From | Exposes To |
|------|---------------|--------------|------------|
| `config.js` | Stores webhook URL and Google Drive JSON URL | Nothing | `data.js`, `ui.js` |
| `data.js` | Fetches JSON, stores raw data, provides filtering API, computes comparison periods | `config.js` | `charts.js`, `ui.js`, `main.js` |
| `charts.js` | Creates, updates, and destroys Chart.js instances; reads config.dimensions for dynamic charts | `data.js` | `main.js` |
| `ui.js` | Renders KPI cards, settings panel, refresh button, CSV export, data quality, stale warning | `config.js`, `data.js` | `main.js` |
| `main.js` | Initializes everything on DOMContentLoaded, wires event listeners, orchestrates updates | `data.js`, `charts.js`, `ui.js` | Nothing (top-level) |

### 3.3 JSON Data Contract

The dashboard reads a single JSON file from Google Drive. The schema is as follows:

```json
{
  "config": {
    "business_name": "string — Display name of the business",
    "currency": "string — Currency symbol/code (e.g., 'MAD', '$', '€')",
    "dimensions": [
      {
        "key": "string — Internal field name in orders array (e.g., 'pack', 'ville')",
        "label": "string — Human-readable display label (e.g., 'Pack', 'Ville')",
        "chart_type": "string — 'bar' or 'pie'"
      }
    ],
    "statuses": {
      "delivered": ["string — Array of status values that mean 'delivered' (e.g., ['Livré'])"],
      "cancelled": ["string — Array of status values that mean 'cancelled' (e.g., ['Annulé'])"],
      "no_response": ["string — Array of status values that mean 'no response' (e.g., ['Pas de réponse'])"],
      "pending": ["string — Array of status values that mean 'pending' (e.g., ['En attente', 'En cours de livraison'])"]
    },
    "schedule_interval_hours": "number — Expected interval between data refreshes in hours (e.g., 168 for weekly)"
  },
  "metadata": {
    "generated_at": "string — ISO 8601 timestamp of when this JSON was generated",
    "last_successful_run": "string — ISO 8601 timestamp of last successful workflow run",
    "rows_processed": "number — Count of valid orders processed",
    "invalid_rows_count": "number — Count of rows skipped due to data issues",
    "invalid_rows_details": [
      {
        "row": "number — Row number in the original Google Sheet",
        "reason": "string — Why this row was skipped (e.g., 'Missing date', 'Malformed price')",
        "reference": "string — Order reference if available, empty string if not"
      }
    ]
  },
  "orders": [
    {
      "date": "string — ISO date string (YYYY-MM-DD)",
      "reference": "string — Order reference/ID",
      "prix_final": "number — Final price paid for this item",
      "status": "string — Raw status value as it appears in the sheet",
      "promo_code": "string — Promo code used, empty string if none",
      "discount": "number — Discount amount applied, 0 if none",
      "original_price": "number — Price before discount",
      "client_name": "string — Client's full name",
      "client_phone": "string — Client's phone number (used as unique client identifier)",
      "...dimension_keys": "string — One field per dimension defined in config.dimensions (e.g., pack, ville, couleur)"
    }
  ]
}
```

**Example for Le Peignoir:**

```json
{
  "config": {
    "business_name": "Le Peignoir",
    "currency": "MAD",
    "dimensions": [
      { "key": "pack", "label": "Pack", "chart_type": "bar" },
      { "key": "ville", "label": "Ville", "chart_type": "bar" },
      { "key": "couleur", "label": "Couleur", "chart_type": "pie" },
      { "key": "motif", "label": "Motif", "chart_type": "pie" },
      { "key": "tissu", "label": "Tissu", "chart_type": "pie" },
      { "key": "taille", "label": "Taille", "chart_type": "bar" },
      { "key": "genre", "label": "Genre", "chart_type": "pie" }
    ],
    "statuses": {
      "delivered": ["Livré"],
      "cancelled": ["Annulé"],
      "no_response": ["Pas de réponse"],
      "pending": ["En attente", "En cours de livraison"]
    },
    "schedule_interval_hours": 168
  },
  "metadata": {
    "generated_at": "2026-05-26T06:00:00Z",
    "last_successful_run": "2026-05-26T06:00:00Z",
    "rows_processed": 3200,
    "invalid_rows_count": 12,
    "invalid_rows_details": [
      { "row": 45, "reason": "Missing date", "reference": "CMD-045" },
      { "row": 102, "reason": "Malformed price", "reference": "CMD-102" }
    ]
  },
  "orders": [
    {
      "date": "2026-05-20",
      "reference": "CMD-001",
      "prix_final": 450,
      "status": "Livré",
      "promo_code": "SUMMER10",
      "discount": 50,
      "original_price": 500,
      "client_name": "Ahmed Benali",
      "client_phone": "0612345678",
      "pack": "Pack Couple",
      "ville": "Casablanca",
      "couleur": "Blanc",
      "motif": "Couronne",
      "tissu": "Velours",
      "taille": "L",
      "genre": "Homme"
    }
  ]
}
```

### 3.4 Integration Points

#### Google Drive (JSON Read)

| Property | Value |
|----------|-------|
| **Direction** | Dashboard → Google Drive (read-only) |
| **Method** | HTTP GET to public share URL |
| **URL format** | `https://drive.google.com/uc?export=download&id={FILE_ID}` |
| **Authentication** | None — file is publicly shared via link |
| **Frequency** | Once per page load, plus on manual refresh |
| **Error handling** | Show error state if fetch fails; retry button available |

#### n8n Webhook (Manual Refresh)

| Property | Value |
|----------|-------|
| **Direction** | Dashboard → n8n (trigger only) |
| **Method** | HTTP POST |
| **URL** | Defined in `config.js`, e.g., `https://n8n.client-domain.com/webhook/refresh-report` |
| **Body** | Empty or `{}` |
| **Authentication** | None (webhook URL acts as a secret) |
| **Response** | n8n responds immediately with `200 OK` — does NOT wait for processing |
| **Dashboard behavior** | Show "Processing…" state for 60 seconds, then re-fetch JSON |

### 3.5 Client-Side Filtering Logic

All filtering happens in `data.js`. The flow is:

```
1. User selects date range (from, to)
2. data.js filters orders array: order.date >= from AND order.date <= to
3. data.js classifies each filtered order's status using config.statuses:
   - For each status category (delivered, cancelled, no_response, pending):
     - Check if order.status is in the category's values array
4. data.js computes KPI values from filtered + classified orders
5. data.js computes comparison period:
   - Period length = to - from (in days)
   - Previous period: from - periodLength to from - 1 day
   - Filter orders for previous period, compute same KPIs
   - Calculate % change for each KPI
6. charts.js receives filtered data and re-renders all charts
7. ui.js receives KPI values + comparisons and re-renders KPI cards
```

**Status Classification Algorithm:**

```javascript
function classifyStatus(statusValue, statusConfig) {
  for (const [category, values] of Object.entries(statusConfig)) {
    if (values.some(v => v.toLowerCase().trim() === statusValue.toLowerCase().trim())) {
      return category; // 'delivered', 'cancelled', 'no_response', 'pending'
    }
  }
  return 'unknown'; // Status value not found in any category
}
```

### 3.6 Chart Rendering Logic

All chart logic lives in `charts.js`. Key behaviors:

| Chart | Source Data | Chart.js Type | Special Logic |
|-------|-----------|---------------|---------------|
| Time Series | Filtered orders grouped by week/month | `line` | Dual Y-axes; auto-switch weekly/monthly at 60-day threshold |
| Status Breakdown | Filtered orders classified by status | `doughnut` | Segments from config.statuses keys |
| Dimension Charts | One per config.dimensions entry | `bar` (horizontal) or `pie` | Dynamic creation; pie auto-switches to bar if >5 categories |
| Peak Days | Filtered orders grouped by day-of-week | `bar` | Fixed 7 bars Mon-Sun |
| Delivery by City | Cross-reference status × ville | `bar` (horizontal) | Only cities with ≥5 orders; sorted by rate |
| Promo Analysis | Split by promo_code presence | `bar` + KPI summary | Compare delivery rates promo vs non-promo |
| Top Clients | Grouped by client_phone | Table or `bar` (horizontal) | Top 10 by delivered revenue |

**Chart Update Strategy:**

When the date range changes, charts are NOT destroyed and recreated. Instead:
1. Existing Chart.js instances are updated via `chart.data = newData; chart.update();`
2. This preserves smooth Chart.js animations
3. Charts are only destroyed/recreated when the page first loads or when config changes (which never happens at runtime)

### 3.7 Settings Persistence

Settings are stored in `localStorage` using a namespaced key:

```javascript
const SETTINGS_KEY = 'analyst_dashboard_settings';

// Default settings
const defaults = {
  theme: 'system',        // 'light', 'dark', or 'system'
  smartKpiColoring: true   // true or false
};

// Read
function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

// Write
function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
```

**Theme Resolution Logic:**

```
if settings.theme === 'system':
  if window.matchMedia('(prefers-color-scheme: dark)').matches → apply dark
  else → apply light
  Also listen for system theme changes via matchMedia listener
if settings.theme === 'dark' → apply dark
if settings.theme === 'light' → apply light
```

---

## 4. UI/UX Specifications

### 4.1 Design System

#### Color Tokens

All colors are defined as CSS custom properties on `:root` and `[data-theme="dark"]`.

**Light Theme:**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#f8fafc` | Page background |
| `--bg-secondary` | `#ffffff` | Card/surface background |
| `--bg-tertiary` | `#f1f5f9` | Subtle background, hover states |
| `--text-primary` | `#0f172a` | Headings, KPI values |
| `--text-secondary` | `#475569` | Body text, labels |
| `--text-tertiary` | `#94a3b8` | Placeholder, muted text |
| `--border` | `#e2e8f0` | Card borders, dividers |
| `--primary` | `#6366f1` | Primary actions, active states |
| `--primary-hover` | `#4f46e5` | Primary button hover |
| `--success` | `#22c55e` | Positive indicators, delivered |
| `--success-bg` | `#f0fdf4` | Success background tint |
| `--warning` | `#eab308` | Warning indicators, caution |
| `--warning-bg` | `#fefce8` | Warning background tint |
| `--danger` | `#ef4444` | Negative indicators, cancelled |
| `--danger-bg` | `#fef2f2` | Danger background tint |
| `--info` | `#3b82f6` | Informational elements |
| `--chart-1` | `#6366f1` | Chart color 1 (indigo) |
| `--chart-2` | `#8b5cf6` | Chart color 2 (violet) |
| `--chart-3` | `#06b6d4` | Chart color 3 (cyan) |
| `--chart-4` | `#f59e0b` | Chart color 4 (amber) |
| `--chart-5` | `#10b981` | Chart color 5 (emerald) |
| `--chart-6` | `#f43f5e` | Chart color 6 (rose) |
| `--chart-7` | `#64748b` | Chart color 7 (slate) |
| `--chart-8` | `#d946ef` | Chart color 8 (fuchsia) |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle shadow |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Card shadow |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Elevated shadow |

**Dark Theme** (`[data-theme="dark"]`):

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0f172a` | Page background |
| `--bg-secondary` | `#1e293b` | Card/surface background |
| `--bg-tertiary` | `#334155` | Subtle background, hover states |
| `--text-primary` | `#f1f5f9` | Headings, KPI values |
| `--text-secondary` | `#cbd5e1` | Body text, labels |
| `--text-tertiary` | `#64748b` | Placeholder, muted text |
| `--border` | `#334155` | Card borders, dividers |
| `--primary` | `#818cf8` | Primary actions (lighter for dark bg) |
| `--primary-hover` | `#a5b4fc` | Primary button hover |
| `--success` | `#4ade80` | Desaturated green for dark mode |
| `--success-bg` | `rgba(34,197,94,0.1)` | Success background tint |
| `--warning` | `#fbbf24` | Desaturated yellow |
| `--warning-bg` | `rgba(234,179,8,0.1)` | Warning background tint |
| `--danger` | `#f87171` | Desaturated red |
| `--danger-bg` | `rgba(239,68,68,0.1)` | Danger background tint |

#### Typography

| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| Page title / business name | Inter | 700 | 24px | 1.3 |
| Section headings (h2) | Inter | 600 | 20px | 1.4 |
| Chart titles (h3) | Inter | 600 | 16px | 1.4 |
| KPI values | Inter | 700 | 28px | 1.2 |
| KPI labels | Inter | 500 | 13px | 1.4 |
| KPI comparison | Inter | 500 | 12px | 1.4 |
| Body text | Inter | 400 | 14px | 1.6 |
| Small text / captions | Inter | 400 | 12px | 1.5 |
| Numbers, prices, percentages | Inter (tabular figures) | 600 | Inherit | Inherit |
| Button text | Inter | 500 | 14px | 1 |

**Font Loading:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Tabular Figures:**
```css
.numeric {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

#### Spacing Scale (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight inner padding |
| `--space-2` | `8px` | Default inner padding, icon gaps |
| `--space-3` | `12px` | Compact element spacing |
| `--space-4` | `16px` | Standard padding, element gaps |
| `--space-5` | `20px` | Medium spacing |
| `--space-6` | `24px` | Section inner padding |
| `--space-8` | `32px` | Card padding |
| `--space-10` | `40px` | Section spacing |
| `--space-12` | `48px` | Large section gaps |
| `--space-16` | `64px` | Page section separators |

#### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Buttons, inputs, badges |
| `--radius-md` | `10px` | Cards, panels |
| `--radius-lg` | `16px` | Modals, settings panel |
| `--radius-full` | `9999px` | Pill buttons, toggles |

### 4.2 Component Specifications

#### 4.2.1 Header

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]  Le Peignoir                    Last updated: 2h ago  ⚙ │
│  ─────────────────────────────────────────────────────────────── │
│  ⚠ 12 rows skipped due to data issues  [View Details ▼]         │
└──────────────────────────────────────────────────────────────────┘
```

- Logo: 32×32px, from `/assets/logo.png`, hidden if file doesn't exist
- Business name: from `config.business_name`, styled as h1
- Last updated: relative time from `metadata.generated_at` (e.g., "2 hours ago", "3 days ago")
- Settings gear icon: opens settings panel/page
- Data quality badge: only visible if `invalid_rows_count > 0`; expandable section

#### 4.2.2 Stale Data Warning Banner

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠ Data may be outdated — last updated 10 days ago.             │
│    [Refresh Now]                                          [✕]   │
└──────────────────────────────────────────────────────────────────┘
```

- Appears if `last_successful_run` is older than `schedule_interval_hours × 1.5`
- Background: `--warning-bg`
- Border-left: 4px solid `--warning`
- Dismissible with × button
- "Refresh Now" triggers the webhook

#### 4.2.3 KPI Cards Grid

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Total    │  │ Revenue  │  │   AOV    │  │ Delivered│
│ Orders   │  │ (Deliv.) │  │ (Deliv.) │  │  Rate    │
│          │  │          │  │          │  │          │
│   847    │  │ 425,000  │  │   680    │  │  72.4%   │
│   MAD    │  │   MAD    │  │   MAD    │  │          │
│  ↑ 12%   │  │  ↑ 8.5%  │  │  ↓ 2.1% │  │  ↑ 5.3% │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Cancelled │  │ Pending  │  │   No     │  │ Repeat   │
│  Rate    │  │  Count   │  │ Response │  │ Customer │
│          │  │          │  │  Count   │  │  Rate    │
│  14.2%   │  │   67     │  │   32     │  │  23.5%   │
│          │  │          │  │          │  │          │
│  ↓ 3.1%  │  │  ↑ 15   │  │  ↓ 8    │  │  ↑ 4.2% │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

**Card Structure:**
- Background: `--bg-secondary`
- Border: 1px solid `--border`
- Border-radius: `--radius-md`
- Padding: `--space-6`
- Shadow: `--shadow-md`
- Hover: slight elevation increase (shadow-lg), translateY(-2px), transition 200ms

**Card Content:**
- Icon: SVG icon from Lucide, 20×20px, color `--text-tertiary`
- Label: KPI name, font 13px/500, color `--text-secondary`
- Value: KPI number, font 28px/700, color `--text-primary`, tabular figures
- Comparison: "↑ 12%" or "↓ 5%", font 12px/500. Green for positive changes on positive metrics, red for negative changes. Arrow uses actual Unicode characters (↑ ↓).

**Smart KPI Coloring (when enabled):**
- Applied as a subtle left border (4px) and background tint
- Delivered Rate: `> 70%` → green left-border + `--success-bg`, `50-70%` → yellow + `--warning-bg`, `< 50%` → red + `--danger-bg`
- Cancelled Rate: `< 15%` → green, `15-30%` → yellow, `> 30%` → red
- All other KPI cards: no color treatment (neutral)

**Responsive Grid:**
- Desktop (≥ 1024px): 4 columns
- Tablet (≥ 768px): 2 columns
- Mobile (< 768px): 1 column
- Gap: `--space-4`

#### 4.2.4 Date Range Picker

```
┌──────────────────────────────────────────────────────────────────┐
│  From: [2026-05-01]    To: [2026-05-26]                         │
│                                                                  │
│  [This Week] [This Month] [Last 30 Days] [This Year] [All Time] │
└──────────────────────────────────────────────────────────────────┘
```

- Date inputs: native `<input type="date">` for browser-native date picker
- Preset buttons: pill-shaped (`--radius-full`), border 1px solid `--border`, active state with `--primary` background
- Active preset button is visually highlighted
- On mobile: presets wrap to multiple rows; date inputs stack vertically

#### 4.2.5 Chart Cards

Each chart is wrapped in a card container:

```
┌──────────────────────────────────────────┐
│  Section Title (h3)                      │
│  ──────────────────────────────────────  │
│                                          │
│          [Chart.js Canvas]               │
│                                          │
│  Legend: ● Series A  ● Series B          │
└──────────────────────────────────────────┘
```

- Same card styling as KPI cards
- Chart canvas fills card width with 16:9 aspect ratio on desktop, 4:3 on mobile
- Chart.js global configuration:
  - Font family: `'Inter', sans-serif`
  - Grid color: `rgba(148, 163, 184, 0.1)` (very subtle)
  - Tooltip: rounded corners, padding 12px, font 13px
  - Legend: bottom position, point style, padding 16px
  - Animation: duration 400ms, easing `easeOutQuart`

#### 4.2.6 Settings Panel

Accessible via gear icon in header. Can be implemented as:
- A slide-in panel from the right (preferred for mobile)
- Or a separate page/section

```
┌──────────────────────────────────┐
│  ⚙ Settings                 [✕] │
│  ───────────────────────────── │
│                                  │
│  Appearance                      │
│  ┌────────────────────────────┐  │
│  │ Theme          [🌙 Dark ▾] │  │
│  │ Smart KPI Colors  [●━━━━] │  │
│  └────────────────────────────┘  │
│                                  │
│  Theme options:                  │
│  ○ System (auto)                 │
│  ○ Light                         │
│  ○ Dark                          │
│                                  │
└──────────────────────────────────┘
```

- Width: 320px on desktop, full-width on mobile
- Background: `--bg-secondary`
- Overlay: semi-transparent scrim behind panel
- Animation: slide in from right, 250ms ease-out
- Toggle switch: 44px wide, 24px tall, animated thumb

#### 4.2.7 Refresh Button & CSV Export

```
┌────────────────────────────────────────────────────────┐
│  [🔄 Refresh Data]          [📥 Download CSV]          │
│   Processing... (45s)                                  │
└────────────────────────────────────────────────────────┘
```

- Refresh button: primary color, shows spinner when processing, countdown text during cooldown
- CSV button: secondary/outline style
- Both buttons: height 44px (touch-friendly), padding 16px horizontal
- On mobile: buttons stack vertically, full-width

### 4.3 Responsive Breakpoints

| Breakpoint | Name | Layout Changes |
|------------|------|----------------|
| < 768px | Mobile | Single column layout, KPI cards stack, charts full-width, settings full-screen, date inputs stack vertically, nav compact |
| 768px–1023px | Tablet | 2-column KPI grid, charts still full-width, settings slide-in panel |
| 1024px–1439px | Desktop | 4-column KPI grid, charts in 2-column grid, settings slide-in panel |
| ≥ 1440px | Large Desktop | Same as desktop, max-width container (1400px) centered |

**Container:**
```css
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 768px) {
  .container { padding: 0 var(--space-6); }
}

@media (min-width: 1024px) {
  .container { padding: 0 var(--space-8); }
}
```

### 4.4 Animation Specifications

| Element | Trigger | Property | Duration | Easing | Reduced Motion |
|---------|---------|----------|----------|--------|----------------|
| KPI card hover | mouseenter | transform, box-shadow | 200ms | ease-out | No transform, instant shadow |
| Theme change | toggle | background-color, color | 300ms | ease | Instant (0ms) |
| Settings panel | open/close | transform (translateX) | 250ms | ease-out / ease-in | Instant |
| Chart updates | data change | Chart.js built-in | 400ms | easeOutQuart | Duration 0ms |
| Stale warning | page load | opacity, transform | 300ms | ease-out | Instant |
| Button press | click | transform (scale 0.97) | 100ms | ease | None |
| Skeleton shimmer | loading | background-position | 1500ms | linear, infinite | Static gray |
| Data quality expand | click | max-height | 200ms | ease-out | Instant |

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4.5 Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | All text meets 4.5:1 against its background (WCAG AA) |
| Focus states | 2px solid outline using `--primary`, 2px offset on all interactive elements |
| Keyboard nav | Tab order matches visual order; all controls keyboard-accessible |
| Screen reader | Charts have `aria-label` describing key insight; KPI cards have `aria-live="polite"` for updates |
| Icon buttons | All icon-only buttons have `aria-label` (e.g., gear icon → `aria-label="Open settings"`) |
| Color-not-only | Smart KPI coloring uses color + border + background tint (not color alone) |
| Date inputs | Associated `<label>` elements with `for` attribute |
| Chart alternatives | Each chart section includes a visually-hidden text summary of the key data point |
| Skip link | "Skip to main content" link at top of page for keyboard users |
| Language | `<html lang="en">` attribute set |

### 4.6 State Specifications

#### Loading State

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]  ████████████                            ████           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ ████████ │  │ ████████ │  │ ████████ │  │ ████████ │        │
│  │ ████     │  │ ████     │  │ ████     │  │ ████     │        │
│  │ ██████   │  │ ██████   │  │ ██████   │  │ ██████   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    ████████████                           │   │
│  │                    (shimmer animation)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

- Skeleton screens with shimmer animation for all content areas
- Shimmer: linear gradient moving left-to-right
- Card shapes match actual KPI card dimensions
- Chart areas show skeleton rectangles matching chart proportions

#### Error State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                     ⚠ Unable to Load Data                       │
│                                                                  │
│     We couldn't fetch the report data. This could be due to     │
│     a network issue or the data source being unavailable.        │
│                                                                  │
│                      [Try Again]                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Centered in viewport
- Icon: warning SVG, 48×48px
- Title: 20px/600
- Message: 14px/400, `--text-secondary`, max-width 400px
- Retry button: primary style

#### Empty State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                     📊 No Data Available                         │
│                                                                  │
│     There are no orders in the selected date range.              │
│     Try selecting a different date range or click                │
│     "All Time" to see all available data.                        │
│                                                                  │
│                    [View All Time]                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Similar layout to error state
- Icon: chart SVG, 48×48px
- "View All Time" button sets date range to All Time preset

---

## 5. Reusability Model

### 5.1 What Changes Per Client

**Only one file: `config.js`**

```javascript
// config.js — THE ONLY FILE THAT CHANGES PER CLIENT
const DASHBOARD_CONFIG = {
  WEBHOOK_URL: 'https://n8n.lepeignoir.com/webhook/refresh-report',
  DATA_URL: 'https://drive.google.com/uc?export=download&id=1ABCxyz...'
};
```

That's it. Two URLs. Everything else — the business name, currency, dimensions, status mappings — comes from the JSON file itself (which is generated by the n8n workflow based on that client's configuration).

### 5.2 What Never Changes

| File | Reason |
|------|--------|
| `index.html` | Universal page structure |
| `styles.css` | Universal styling, theme support, responsive layout |
| `data.js` | Universal data fetching, filtering, computation logic |
| `charts.js` | Universal chart rendering using config-driven dimensions |
| `ui.js` | Universal KPI rendering, settings, export |
| `main.js` | Universal initialization |

### 5.3 Onboarding Checklist for New Client

1. ☐ Set up n8n workflow for client (see `N8N_WORKFLOW_GUIDE.md`)
2. ☐ Run n8n workflow once to generate initial JSON
3. ☐ Get the Google Drive public URL for the JSON file
4. ☐ Get the n8n webhook URL
5. ☐ Copy the `/dashboard` folder
6. ☐ Edit `config.js`: replace `WEBHOOK_URL` and `DATA_URL`
7. ☐ (Optional) Replace `/assets/logo.png` with client's logo
8. ☐ Host the dashboard files (any static hosting: Netlify, Vercel, GitHub Pages, client's VPS, etc.)
9. ☐ Share the URL with the client
10. ☐ Verify: open dashboard, confirm data loads, confirm refresh button works

---

## 6. Risks & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | Google Drive URL stops working (quota exceeded, file deleted) | Low | Critical — dashboard shows nothing | Error state with clear message; client can re-share the file; n8n heartbeat detects issues |
| 2 | JSON file is malformed / corrupted | Low | High — dashboard crashes or shows wrong data | Defensive JSON parsing with try/catch; validate schema before rendering; show error state |
| 3 | Browser doesn't support `<input type="date">` | Very Low | Medium — date picking is harder | Fallback to text input with YYYY-MM-DD format; all modern browsers support it |
| 4 | Chart.js CDN is unavailable | Very Low | High — no charts render | Use `integrity` hash and `crossorigin` on script tag; consider self-hosting Chart.js as fallback |
| 5 | Orders array grows very large (5000+ rows) | Low | Medium — slower filtering, larger JSON fetch | At 5000 rows, JSON ≈ 2-3MB, filtering ≈ 10ms — well within acceptable range. No action needed below 10K. |
| 6 | Client hammers the refresh button | Medium | Low — n8n gets unnecessary load | 60-second cooldown on button. Server-side rate limiting recommended in n8n. |
| 7 | Multiple browser tabs open simultaneously | Low | None — each tab fetches independently, settings sync via localStorage event | No action needed |
| 8 | Client's VPS goes down (n8n unavailable) | Low | Medium — refresh button fails, but dashboard still works with last JSON | Dashboard shows data from last successful JSON; refresh shows error message; stale warning appears after interval |
| 9 | Special characters in data (Arabic, French diacritics) | Medium | Low — CSV encoding issues | Use UTF-8 BOM in CSV export; JSON is inherently UTF-8 |
| 10 | Client accidentally modifies non-config files | Low | High — dashboard breaks | Clear documentation that only `config.js` should be modified; all other files are read-only |

---

*End of PRD*
