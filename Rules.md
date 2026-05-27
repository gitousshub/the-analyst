# Rules.md — Absolute Rules for Building The Analyst Dashboard

> **Purpose**: This document defines every rule the AI assistant MUST follow when building the dashboard. These rules are non-negotiable. Violating any rule is a failure.

---

## Table of Contents

1. [Architecture Rules](#1-architecture-rules)
2. [Data Rules](#2-data-rules)
3. [UI/UX Rules](#3-uiux-rules)
4. [Settings Rules](#4-settings-rules)
5. [Refresh Button Rules](#5-refresh-button-rules)
6. [CSV Export Rules](#6-csv-export-rules)
7. [Date Range Rules](#7-date-range-rules)
8. [Chart Rules](#8-chart-rules)
9. [Reusability Rules](#9-reusability-rules)
10. [Error Handling Rules](#10-error-handling-rules)
11. [Performance Rules](#11-performance-rules)
12. [Code Quality Rules](#12-code-quality-rules)
13. [Things You Must NEVER Do](#13-things-you-must-never-do)

---

## 1. Architecture Rules

- [ ] You MUST use **pure HTML, CSS, and JavaScript**. No frameworks. No React, Vue, Svelte, Angular, or any other framework.
- [ ] You MUST NOT use npm, yarn, pnpm, or any package manager.
- [ ] You MUST NOT use any build tool (webpack, vite, rollup, parcel, esbuild, etc.).
- [ ] You MUST load **Chart.js via CDN** using a `<script>` tag in `index.html`.
- [ ] You MUST load **icons via Lucide CDN** or similar SVG icon library via a `<script>` tag. You MUST NEVER use emoji as icons (🎨 🚀 ⚙️ are BANNED).
- [ ] You MUST load **Google Fonts (Inter)** via a `<link>` tag in `index.html`.
- [ ] You MUST NOT write any inline `<style>` tags in HTML. ALL CSS goes in `/css/styles.css`.
- [ ] You MUST NOT write any inline `<script>` tags in HTML (except the CDN script tags for Chart.js, Lucide, and Google Fonts). ALL JavaScript goes in the `/js/` files.
- [ ] You MUST follow this EXACT file structure:

```
/dashboard
  index.html              ← Structure only
  /css
    styles.css            ← ALL styling
  /js
    config.js             ← Webhook URL + Drive URL ONLY
    data.js               ← Fetch, parse, filter, compute
    charts.js             ← All Chart.js logic
    ui.js                 ← KPI cards, settings, refresh, CSV export
    main.js               ← Entry point, initialization
  /assets
    logo.png              ← Optional client logo
```

- [ ] Each JS file MUST have **one clear responsibility**. NEVER mix concerns:

| File | ONLY Does This |
|------|---------------|
| `config.js` | Stores `WEBHOOK_URL` and `DATA_URL`. Nothing else. |
| `data.js` | Fetches JSON from Drive, stores data, filters orders by date, classifies statuses, computes KPIs, computes comparison periods |
| `charts.js` | Creates Chart.js instances, updates chart data, destroys charts. No DOM manipulation outside chart canvases. |
| `ui.js` | Renders KPI cards, settings panel, refresh button behavior, CSV export, data quality badge, stale warning banner. No Chart.js code. |
| `main.js` | Calls initialization functions from other modules in the correct order. Wires event listeners. No business logic. |

- [ ] Script loading order in HTML MUST be: `config.js` → `data.js` → `charts.js` → `ui.js` → `main.js`

---

## 2. Data Rules

### Fetching
- [ ] The JSON MUST be fetched from the URL in `config.js` (`DATA_URL`).
- [ ] You MUST use `fetch()` with proper error handling (`try/catch` or `.catch()`).
- [ ] You MUST show a loading state (skeleton screens) while fetching.
- [ ] You MUST show an error state if the fetch fails.
- [ ] You MUST show an empty state if the JSON loads but `orders` array is empty.

### Config-Driven Logic
- [ ] You MUST read `config.dimensions` to dynamically create charts. You MUST NEVER hardcode dimension names like `"pack"`, `"ville"`, `"couleur"`, `"motif"`, etc. anywhere in the dashboard code.
- [ ] You MUST read `config.statuses` to classify order statuses. You MUST NEVER hardcode status values like `"Livré"`, `"Annulé"`, `"Pas de réponse"`, `"En attente"`, etc.
- [ ] You MUST read `config.currency` for all currency displays. NEVER hardcode `"MAD"` or any currency.
- [ ] You MUST read `config.business_name` for the header. NEVER hardcode `"Le Peignoir"`.

### Revenue & AOV Calculations (CRITICAL)
- [ ] **Revenue** = Sum of `prix_final` for **DELIVERED orders ONLY**. This is a Cash on Delivery (COD) business. If the order is not delivered, the money was NOT collected.
- [ ] **AOV (Average Order Value)** = Total Delivered Revenue ÷ Total Delivered Orders. NOT total revenue ÷ total orders. ONLY delivered orders count.
- [ ] You MUST NEVER calculate revenue from non-delivered orders.
- [ ] You MUST NEVER calculate AOV using all orders.

### Status Classification
- [ ] To classify an order's status, you MUST loop through `config.statuses` and check if the order's `status` field value is contained in any category's values array.
- [ ] Comparison MUST be case-insensitive and trimmed.
- [ ] If a status value doesn't match any category, classify it as `"unknown"`.

```javascript
// CORRECT way to classify status
function classifyStatus(statusValue, statusConfig) {
  const normalized = statusValue.toLowerCase().trim();
  for (const [category, values] of Object.entries(statusConfig)) {
    if (values.some(v => v.toLowerCase().trim() === normalized)) {
      return category;
    }
  }
  return 'unknown';
}
```

### Repeat Customer Rate
- [ ] Group orders by `client_phone` (this is the unique client identifier).
- [ ] Count unique phones with > 1 order in the filtered period.
- [ ] Rate = (clients with > 1 order ÷ total unique clients) × 100.

### Comparison Period
- [ ] The previous period is the **same-length window** immediately before the selected date range.
- [ ] If selected range is May 1–15 (15 days), previous period is April 16–30 (15 days).
- [ ] If previous period has zero orders, show "N/A" or "—" instead of a percentage change.
- [ ] Percentage change = ((current - previous) / previous) × 100.
- [ ] For rates (delivery rate, etc.): show absolute point change, not percentage of percentage.

### Order Fields
- [ ] Each order object has these fields: `date`, `reference`, `prix_final`, `status`, `promo_code`, `discount`, `original_price`, `client_name`, `client_phone`, plus one field per dimension key from `config.dimensions`.
- [ ] `date` is an ISO string (YYYY-MM-DD).
- [ ] `prix_final` is a number.
- [ ] `discount` is a number (0 if no discount).
- [ ] `promo_code` is a string (empty string if no promo).

---

## 3. UI/UX Rules

### Design System
- [ ] ALWAYS use the color tokens defined in the PRD. NEVER use raw hex values in components.
- [ ] ALWAYS use the spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64). No arbitrary values.
- [ ] ALWAYS use CSS custom properties (`var(--token-name)`) for colors, spacing, shadows, radii.
- [ ] Dark mode is the DEFAULT visual emphasis — design for dark mode first, then ensure light mode works.

### Typography
- [ ] Font family: `'Inter', system-ui, -apple-system, sans-serif`.
- [ ] Base font size: `16px` on `<html>`.
- [ ] ALL numbers, prices, and percentages MUST use tabular figures:
```css
.numeric {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```
- [ ] Line height: 1.5–1.6 for body text, 1.2–1.3 for headings.

### Icons
- [ ] You MUST use SVG icons (Lucide, Heroicons, or similar).
- [ ] You MUST NEVER use emoji as icons. Not for navigation, not for decoration, not for anything.
- [ ] Icons MUST be consistent in style — all from the same icon library.
- [ ] Icon-only buttons MUST have `aria-label`.

### Responsiveness
- [ ] Mobile-first approach: write base styles for mobile, use `min-width` media queries for larger screens.
- [ ] Breakpoints: `768px`, `1024px`, `1440px`.
- [ ] Minimum supported width: `375px`.
- [ ] KPI card grid: 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop).
- [ ] Charts: full-width on mobile, 2-column grid on desktop where appropriate.
- [ ] All touch targets MUST be at least `44px × 44px`.
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` MUST be in `<head>`.
- [ ] NEVER disable zoom.
- [ ] No horizontal scroll on any viewport width.

### Contrast & Accessibility
- [ ] All text MUST meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text).
- [ ] All interactive elements MUST have visible focus states (2px outline, `--primary` color).
- [ ] Tab order MUST match visual order.
- [ ] NEVER convey meaning by color alone — always pair with text, icons, or border patterns.
- [ ] Respect `prefers-reduced-motion`: disable or minimize all animations.
- [ ] Respect `prefers-color-scheme` for default theme selection.
- [ ] Provide `aria-label` on all icon-only buttons and non-text interactive elements.
- [ ] Include a skip-to-main-content link as the first focusable element.

### Animations
- [ ] Micro-interactions: `150–300ms` duration.
- [ ] Use `ease-out` for elements entering, `ease-in` for elements leaving.
- [ ] ONLY animate `transform` and `opacity`. NEVER animate `width`, `height`, `top`, `left`, `margin`, `padding`.
- [ ] Maximum 1–2 animated elements per view at any time.
- [ ] All animations MUST be disabled when `prefers-reduced-motion: reduce` is active.

### States
- [ ] You MUST implement ALL four states: **Loading**, **Error**, **Empty**, **Data Loaded**.
- [ ] Loading: skeleton shimmer screens (NOT just a spinner).
- [ ] Error: centered message with icon, description, and retry button.
- [ ] Empty: centered message with icon, description, and "View All Time" button.
- [ ] NEVER show a blank page, a broken layout, or raw error messages.

### Hover & Interaction
- [ ] `cursor: pointer` on ALL clickable elements.
- [ ] Hover effects on cards: subtle elevation change (translateY + shadow transition).
- [ ] Button press: subtle scale (0.97) for feedback.
- [ ] Disabled buttons: reduced opacity (0.5), `cursor: not-allowed`, no click handler.

---

## 4. Settings Rules

- [ ] Settings MUST be accessible via a gear icon button in the header.
- [ ] The gear icon MUST have `aria-label="Open settings"`.
- [ ] Settings MUST be displayed as a slide-in panel from the right side.
- [ ] Two settings MUST exist:

### Dark/Light Mode Toggle
- [ ] Options: System (auto), Light, Dark.
- [ ] Default: System — follows `prefers-color-scheme` media query.
- [ ] When "System" is selected, the dashboard MUST listen for system theme changes and react in real-time.
- [ ] Theme is applied by setting `data-theme="dark"` or `data-theme="light"` on the `<html>` element.
- [ ] Theme change MUST be smooth (300ms CSS transition on background and color).

### Smart KPI Coloring Toggle
- [ ] Toggle switch (on/off).
- [ ] Default: ON.
- [ ] When ON:
  - Delivery Rate KPI: `> 70%` → green tint + left border, `50–70%` → yellow, `< 50%` → red
  - Cancellation Rate KPI: `< 15%` → green, `15–30%` → yellow, `> 30%` → red
  - ALL other KPI cards → neutral (no coloring)
- [ ] When OFF: ALL KPI cards use neutral styling.
- [ ] Changes MUST take effect immediately without page reload.

### Persistence
- [ ] ALL settings MUST be saved to `localStorage` under the key `analyst_dashboard_settings`.
- [ ] On page load, settings MUST be read from `localStorage`.
- [ ] If `localStorage` is empty or corrupted, ALWAYS fall back to defaults (`theme: 'system'`, `smartKpiColoring: true`).
- [ ] Settings MUST survive page refreshes and browser restarts.

---

## 5. Refresh Button Rules

- [ ] The refresh button MUST be clearly visible in the dashboard (bottom section or header area).
- [ ] Clicking it MUST send an HTTP POST request to `WEBHOOK_URL` from `config.js`.
- [ ] The POST body MUST be empty or `{}`.
- [ ] While the request is in progress, the button MUST show a loading/spinner state.
- [ ] After clicking, the button MUST be **disabled for 60 seconds**.
- [ ] During the 60-second cooldown:
  - Show a visible countdown (e.g., "Retry in 45s") OR a progress bar.
  - The button MUST remain disabled and visually indicate the cooldown.
- [ ] After 60 seconds, the button MUST re-enable automatically.
- [ ] This button MUST NOT trigger a browser page reload. It ONLY calls the webhook.
- [ ] On successful webhook response: show brief success toast/message.
- [ ] On failed webhook response: show error toast/message with "Try again later".

---

## 6. CSV Export Rules

- [ ] The CSV export button MUST download the **currently filtered orders**, NOT all orders.
- [ ] The export is a **pure client-side operation** — you MUST NOT make any server calls.
- [ ] The CSV MUST include ALL fields from each order object (date, reference, prix_final, status, promo_code, discount, original_price, client_name, client_phone, and all dimension fields).
- [ ] The filename MUST include the date range: `report_YYYY-MM-DD_to_YYYY-MM-DD.csv`.
- [ ] You MUST handle commas inside field values by wrapping those fields in double quotes.
- [ ] You MUST handle double quotes inside values by escaping them (`""`).
- [ ] You MUST use UTF-8 encoding with BOM (`\uFEFF` as the first character) for Excel compatibility with French/Arabic characters.
- [ ] The download MUST use the Blob + `URL.createObjectURL` + anchor click pattern:

```javascript
const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click();
URL.revokeObjectURL(url);
```

---

## 7. Date Range Rules

- [ ] Two `<input type="date">` elements: "From" and "To".
- [ ] Each input MUST have an associated `<label>`.
- [ ] Quick preset buttons: **This Week**, **This Month**, **Last 30 Days**, **This Year**, **All Time**.
- [ ] Default on page load: **This Month** (1st of current month to today).
- [ ] Changing either date input MUST instantly update ALL KPIs and ALL charts. No delay, no loading.
- [ ] You MUST NOT make any API calls when dates change — everything is client-side filtering.
- [ ] Preset definitions:
  - **This Week**: Monday of current ISO week to Sunday (or today if the week isn't complete)
  - **This Month**: 1st of current month to last day of current month (or today)
  - **Last 30 Days**: Today minus 30 days, to today
  - **This Year**: January 1st of current year, to today
  - **All Time**: Minimum date found in orders array to maximum date found in orders array
- [ ] The active preset button MUST be visually highlighted.
- [ ] On mobile, preset buttons MUST wrap to multiple rows gracefully.

---

## 8. Chart Rules

### General
- [ ] ALL charts MUST use **Chart.js** loaded via CDN.
- [ ] ALL charts MUST have visible legends.
- [ ] ALL charts MUST have tooltips on hover/tap showing exact values.
- [ ] ALL charts MUST have proper axis labels where applicable.
- [ ] Grid lines MUST be very subtle (low opacity, e.g., `rgba(148, 163, 184, 0.1)`).
- [ ] ALL charts MUST update when the date range changes.
- [ ] ALL charts MUST show an empty state message (not a blank chart) when there's no data.
- [ ] ALL charts MUST be responsive — resize properly on different screen sizes.
- [ ] Chart colors MUST use the defined chart color palette (`--chart-1` through `--chart-8`).
- [ ] Chart font MUST be `'Inter', sans-serif`.

### Time Series Line Chart
- [ ] Two lines: **order count** and **delivered revenue**.
- [ ] Dual Y-axes: left for count, right for revenue.
- [ ] Granularity: ≤ 60 days selected → group by **week**, > 60 days → group by **month**.
- [ ] Revenue line includes delivered orders ONLY.

### Status Donut Chart
- [ ] Doughnut chart showing proportion of each status category.
- [ ] Status categories MUST come from `config.statuses` — NEVER hardcoded.
- [ ] Show percentages in tooltips and/or labels.

### Dynamic Dimension Charts
- [ ] Create **one chart per dimension** from `config.dimensions`.
- [ ] `chart_type: "bar"` → horizontal bar chart, ranked from most to least.
- [ ] `chart_type: "pie"` → pie chart.
- [ ] If a pie chart would have **> 5 categories**, you MUST automatically switch it to a bar chart.
- [ ] Chart title MUST use the dimension's `label` from config.

### Peak Days Chart
- [ ] Bar chart with 7 bars: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
- [ ] Shows order count per day of week.
- [ ] The highest bar SHOULD be visually differentiated (e.g., different shade or highlighted).

### Delivery Rate by City
- [ ] Horizontal bar chart showing delivery rate (%) per city.
- [ ] Cross-references order `status` with `ville` dimension.
- [ ] ONLY include cities with **≥ 5 orders** (avoid statistical noise from 1-2 order cities).
- [ ] Sort from highest to lowest delivery rate.
- [ ] Visually highlight cities with rate < 50% (e.g., different color).

### Promo Code Analysis
- [ ] Show: orders with promo vs without promo (count and percentage).
- [ ] Show: delivery rate for promo orders vs non-promo orders.
- [ ] Show: total discount given on delivered orders.
- [ ] Show: top promo codes by usage count (bar chart or table).
- [ ] An order "has promo" if `promo_code` is a non-empty string.

### Top Clients
- [ ] Show top 10 clients ranked by **delivered revenue**.
- [ ] Display: rank, client name, total orders, total delivered revenue.
- [ ] Group by `client_phone` — same phone = same client.
- [ ] Can be rendered as a table or horizontal bar chart.

### Chart Update Strategy
- [ ] NEVER destroy and recreate charts on date range change. Instead, update existing Chart.js instances:
```javascript
chart.data.labels = newLabels;
chart.data.datasets[0].data = newData;
chart.update();
```
- [ ] ONLY destroy/recreate charts on initial page load.

---

## 9. Reusability Rules

- [ ] The **ONLY file** that changes between clients is `config.js`.
- [ ] `config.js` contains exactly two values: `WEBHOOK_URL` and `DATA_URL`.
- [ ] The dashboard code MUST NEVER reference `"Le Peignoir"`, `"MAD"`, `"Pack"`, `"Ville"`, `"Livré"`, `"Annulé"`, or ANY client-specific string directly.
- [ ] ALL business-specific values MUST come from the JSON:
  - Business name → `config.business_name`
  - Currency → `config.currency`
  - Dimension names/labels/chart types → `config.dimensions`
  - Status mappings → `config.statuses`
  - Schedule interval → `config.schedule_interval_hours`
- [ ] If you find yourself typing any Le Peignoir-specific string in `data.js`, `charts.js`, `ui.js`, or `main.js`, you are WRONG. Stop and read from the config instead.

---

## 10. Error Handling Rules

- [ ] If JSON fetch fails → show a styled error state with a clear message and a retry button. NEVER show a blank page.
- [ ] If JSON loads but `orders` is empty → show a styled empty state. NEVER show empty charts.
- [ ] If JSON loads but `orders` has items and the filtered range has zero items → show an empty state per chart and zero values in KPIs.
- [ ] If data is stale (`last_successful_run` older than `schedule_interval_hours × 1.5`) → show a dismissible warning banner.
- [ ] If `metadata.invalid_rows_count > 0` → show a data quality badge in the header.
- [ ] NEVER show raw JavaScript errors, stack traces, or `undefined` to the user.
- [ ] NEVER show `NaN`, `Infinity`, or `null` in KPI values — always default to `0` or `"—"`.
- [ ] Wrap all JSON parsing in try/catch. If parsing fails, show error state.
- [ ] Wrap all fetch calls in try/catch. If network fails, show error state.

---

## 11. Performance Rules

- [ ] Maximum expected dataset: **~5,000 orders**. At this scale, the JSON is ~2-3MB and filtering takes <10ms. No optimization needed beyond simple array iteration.
- [ ] No pagination is needed. Load all orders into memory.
- [ ] ALL filtering MUST be a simple `O(n)` array scan using `.filter()`.
- [ ] NEVER re-render charts unnecessarily. Only update when the data actually changes.
- [ ] Debounce rapid date input changes if the user types dates manually (300ms debounce).
- [ ] Images and fonts MUST be loaded optimally:
  - `<link rel="preconnect">` for Google Fonts
  - `font-display: swap` for font loading
  - Logo image: reasonable size, not a 5MB PNG

---

## 12. Code Quality Rules

- [ ] ALL functions MUST have descriptive names that explain what they do (e.g., `computeDeliveredRevenue`, `classifyOrderStatus`, `renderKPICards`).
- [ ] NO global variables. Use a module pattern (IIFE or object namespace) to encapsulate each file's logic.
- [ ] Naming conventions:
  - JavaScript: `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for constants
  - CSS: `kebab-case` for class names, `--kebab-case` for custom properties
  - HTML: `kebab-case` for IDs and data attributes
- [ ] NO dead code — remove any unused functions, variables, or styles.
- [ ] NO `console.log()` in production code. Use `console.error()` ONLY for actual errors.
- [ ] Comments should explain **WHY**, not **WHAT**. If the code is clear, no comment is needed.
- [ ] DRY (Don't Repeat Yourself): extract shared logic into helper functions.
- [ ] Each JS file MUST expose only the functions/objects that other files need. Keep internal helpers private.
- [ ] Use `const` by default. Use `let` only when reassignment is needed. NEVER use `var`.
- [ ] Use template literals for string interpolation, not concatenation.
- [ ] Use strict equality (`===`) always. NEVER use `==`.
- [ ] All HTML elements used by JavaScript MUST have a unique, descriptive `id` attribute.

---

## 13. Things You Must NEVER Do

> These are **absolute prohibitions**. If you violate any of these, the output is REJECTED.

| # | NEVER Do This | Why |
|---|--------------|-----|
| 1 | Use a framework (React, Vue, Svelte, Angular, etc.) | Spec requires vanilla HTML/CSS/JS |
| 2 | Use npm, yarn, or any package manager | No build process allowed |
| 3 | Use a build tool (webpack, vite, rollup, etc.) | Static files only |
| 4 | Hardcode client-specific values outside `config.js` | Breaks reusability |
| 5 | Hardcode dimension names in dashboard logic | Dimensions are dynamic from config |
| 6 | Hardcode status values in dashboard logic | Statuses are dynamic from config |
| 7 | Use emoji as icons (🎨 🚀 ⚙️ 📊 etc.) | Unprofessional; use SVG icons |
| 8 | Write inline styles in HTML | All CSS in `styles.css` |
| 9 | Write inline scripts in HTML (except CDN tags) | All JS in `/js/` files |
| 10 | Make the refresh button reload the browser page | It calls the webhook, not `location.reload()` |
| 11 | Calculate revenue from non-delivered orders | COD model — only delivered = revenue |
| 12 | Calculate AOV from all orders | Only delivered orders count for AOV |
| 13 | Send the full orders array to any external API | Only the webhook POST is allowed (empty body) |
| 14 | Assume the number or names of dimensions | Read from `config.dimensions` |
| 15 | Assume status values | Read from `config.statuses` |
| 16 | Break the mobile layout | Must work at 375px minimum |
| 17 | Skip loading, error, or empty states | All four states are required |
| 18 | Use placeholder images or `TODO` markers | Everything must be fully implemented |
| 19 | Show `NaN`, `Infinity`, `null`, or `undefined` to users | Always sanitize display values |
| 20 | Show raw error messages or stack traces | User-facing messages must be human-readable |
| 21 | Use `var` for variable declarations | Use `const` or `let` only |
| 22 | Use `==` for comparisons | Use strict equality `===` only |
| 23 | Leave `console.log()` in production | Remove or use `console.error()` for real errors |
| 24 | Create additional HTML pages beyond `index.html` | Single-page dashboard only |
| 25 | Mix responsibilities between JS files | Each file has ONE job |
| 26 | Animate layout properties (width, height, top, left) | Only animate `transform` and `opacity` |
| 27 | Ignore `prefers-reduced-motion` | Must respect user's motion preference |
| 28 | Ignore `prefers-color-scheme` | Must use as default theme source |
| 29 | Use pie charts with > 5 categories | Auto-switch to bar chart |
| 30 | Skip Chart.js legends, tooltips, or axis labels | All are required |

---

## Quick Validation Checklist

Before considering the dashboard complete, verify EVERY item:

### Architecture
- [ ] File structure matches spec exactly (6 files + assets folder)
- [ ] No npm, no build tools, no frameworks
- [ ] Chart.js loaded via CDN
- [ ] Icons are SVG (Lucide or similar), not emoji
- [ ] Google Fonts loaded via link tag
- [ ] No inline styles or scripts

### Data
- [ ] JSON fetched from `config.js` URL
- [ ] All filtering is client-side
- [ ] Revenue = delivered orders only
- [ ] AOV = delivered revenue ÷ delivered orders
- [ ] Status classification reads from `config.statuses`
- [ ] Dimensions read from `config.dimensions`
- [ ] No client-specific strings hardcoded

### KPI Cards
- [ ] 8 KPI cards render correctly
- [ ] Comparison vs previous period shown
- [ ] Smart KPI coloring works when enabled
- [ ] Smart KPI coloring disabled when setting is off
- [ ] Grid is responsive (4 → 2 → 1 columns)

### Charts
- [ ] Time series chart with dual axes
- [ ] Status donut chart
- [ ] One chart per dimension (dynamically created)
- [ ] Peak days chart
- [ ] Delivery rate by city chart
- [ ] Promo analysis section
- [ ] Top clients section
- [ ] All charts update on date change
- [ ] All charts have legends, tooltips, labels
- [ ] Pie charts with >5 categories switch to bar

### Controls
- [ ] Date range picker with 5 presets
- [ ] Default range: This Month
- [ ] Refresh button with 60s cooldown
- [ ] CSV export with UTF-8 BOM

### Settings
- [ ] Settings panel opens/closes
- [ ] Dark/Light/System theme toggle
- [ ] Smart KPI Coloring toggle
- [ ] Settings persist in localStorage

### States
- [ ] Loading skeleton screens
- [ ] Error state with retry button
- [ ] Empty state with message
- [ ] Stale data warning banner
- [ ] Data quality badge

### Accessibility
- [ ] All text passes 4.5:1 contrast
- [ ] Focus states visible
- [ ] Keyboard navigable
- [ ] aria-labels on icon buttons
- [ ] Reduced motion respected
- [ ] Skip-to-content link

### Mobile
- [ ] Works at 375px width
- [ ] No horizontal scroll
- [ ] Touch targets ≥ 44px
- [ ] Charts readable on small screens
- [ ] KPI cards stack properly

---

*End of Rules*
