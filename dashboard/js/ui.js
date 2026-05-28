// ui.js — KPI cards, settings panel, refresh button, CSV export,
// data quality badge, stale warning banner, toast notifications.
// Contains ZERO Chart.js code. All DOM rendering logic lives here.

const UIModule = (() => {
  'use strict';

  // ──────────────────────────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────────────────────────

  const SETTINGS_KEY = 'analyst_dashboard_settings';
  const DEFAULT_SETTINGS = { theme: 'system', smartKpiColoring: true };

  // ──────────────────────────────────────────────────────────────────
  // Settings Persistence
  // ──────────────────────────────────────────────────────────────────

  const getSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  };

  const saveSettings = (settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to persist settings:', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Theme Management
  // ──────────────────────────────────────────────────────────────────

  let _systemThemeListener = null;

  const applyTheme = (themeValue) => {
    const html = document.documentElement;

    // Remove previous system listener if switching away from 'system'
    if (_systemThemeListener) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener(
        'change', _systemThemeListener
      );
      _systemThemeListener = null;
    }

    if (themeValue === 'system') {
      const applySystem = () => {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', isDark ? 'dark' : 'light');
      };
      applySystem();
      _systemThemeListener = applySystem;
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', _systemThemeListener);
    } else {
      html.setAttribute('data-theme', themeValue);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Settings Panel
  // ──────────────────────────────────────────────────────────────────

  const _openSettingsPanel = () => {
    const panel   = document.getElementById('settings-panel');
    const overlay = document.getElementById('settings-overlay');
    const btn     = document.getElementById('settings-btn');

    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    panel.removeAttribute('aria-hidden');
    overlay.removeAttribute('aria-hidden');
    btn.setAttribute('aria-expanded', 'true');

    // Focus the close button when panel opens
    const closeBtn = document.getElementById('settings-close-btn');
    if (closeBtn) closeBtn.focus();
  };

  const _closeSettingsPanel = () => {
    const panel   = document.getElementById('settings-panel');
    const overlay = document.getElementById('settings-overlay');
    const btn     = document.getElementById('settings-btn');

    panel.classList.add('hidden');
    overlay.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  };

  // Focus trap for settings panel
  const _handleSettingsFocusTrap = (e) => {
    const panel = document.getElementById('settings-panel');
    if (panel.classList.contains('hidden')) return;

    const focusable = panel.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') _closeSettingsPanel();
  };

  const initSettings = (onThemeChange, onSmartKpiChange) => {
    const settings = getSettings();

    // Prevent flash of wrong theme on page load
    document.documentElement.setAttribute('data-no-transition', '');
    applyTheme(settings.theme);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.removeAttribute('data-no-transition');
    }));

    // Sync radio buttons
    const radios = document.querySelectorAll('.theme-radio');
    radios.forEach(radio => {
      radio.checked = radio.value === settings.theme;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        const newSettings = { ...getSettings(), theme: radio.value };
        saveSettings(newSettings);
        applyTheme(radio.value);
        if (onThemeChange) onThemeChange(radio.value);
      });
    });

    // Sync smart KPI toggle
    const toggle = document.getElementById('smart-kpi-toggle');
    if (toggle) {
      toggle.checked = settings.smartKpiColoring;
      toggle.setAttribute('aria-checked', String(settings.smartKpiColoring));
      toggle.addEventListener('change', () => {
        const newSettings = { ...getSettings(), smartKpiColoring: toggle.checked };
        saveSettings(newSettings);
        toggle.setAttribute('aria-checked', String(toggle.checked));
        if (onSmartKpiChange) onSmartKpiChange(toggle.checked);
      });
    }

    // Wire open/close buttons
    document.getElementById('settings-btn')
      ?.addEventListener('click', _openSettingsPanel);
    document.getElementById('settings-close-btn')
      ?.addEventListener('click', _closeSettingsPanel);
    document.getElementById('settings-overlay')
      ?.addEventListener('click', _closeSettingsPanel);

    // Keyboard: Escape + focus trap
    document.addEventListener('keydown', _handleSettingsFocusTrap);
  };

  // ──────────────────────────────────────────────────────────────────
  // State Screens
  // ──────────────────────────────────────────────────────────────────

  const showLoadingState = () => {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  };

  const showErrorState = () => {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    if (window.lucide) lucide.createIcons();
  };

  const showEmptyState = () => {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    if (window.lucide) lucide.createIcons();
  };

  const showDashboard = () => {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
  };

  // ──────────────────────────────────────────────────────────────────
  // Header
  // ──────────────────────────────────────────────────────────────────

  const _formatRelativeTime = (isoString) => {
    if (!isoString) return 'Unknown';
    const date      = new Date(isoString);
    const now       = new Date();
    const diffMs    = now - date;
    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);

    if (diffMins < 1)  return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7)  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  };

  const renderHeader = (jsonConfig, metadata) => {
    // Business name from config — NEVER hardcoded
    const businessNameEl = document.getElementById('business-name');
    if (businessNameEl) businessNameEl.textContent = jsonConfig.business_name || 'Dashboard';

    // Logo: show if it exists, hide on error
    const logoImg = document.getElementById('logo-img');
    if (logoImg) {
      logoImg.classList.remove('hidden');
      logoImg.onerror = () => logoImg.classList.add('hidden');
      logoImg.alt     = `${jsonConfig.business_name || 'Business'} logo`;
    }

    // Last updated timestamp
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl && metadata?.generated_at) {
      lastUpdatedEl.textContent = `Updated ${_formatRelativeTime(metadata.generated_at)}`;
    }

    // Data quality badge
    const badge = document.getElementById('data-quality-badge');
    const count = document.getElementById('data-quality-count');
    if (badge && metadata?.invalid_rows_count > 0) {
      badge.classList.remove('hidden');
      if (count) count.textContent = metadata.invalid_rows_count;

      // Populate data quality table
      const tbody = document.getElementById('data-quality-tbody');
      if (tbody && Array.isArray(metadata.invalid_rows_details)) {
        tbody.innerHTML = metadata.invalid_rows_details
          .map(row => `<tr>
            <td class="dq-cell">${row.row || '—'}</td>
            <td class="dq-cell">${row.reference || '—'}</td>
            <td class="dq-cell">${row.reason || '—'}</td>
          </tr>`)
          .join('');
      }

      // Toggle expand/collapse
      badge.addEventListener('click', () => {
        const details  = document.getElementById('data-quality-details');
        const expanded = badge.getAttribute('aria-expanded') === 'true';
        badge.setAttribute('aria-expanded', String(!expanded));
        details.classList.toggle('hidden', expanded);
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Stale Data Warning Banner
  // ──────────────────────────────────────────────────────────────────

  const checkStaleBanner = (metadata, jsonConfig) => {
    if (!metadata?.last_successful_run || !jsonConfig?.schedule_interval_hours) return;

    const lastRun        = new Date(metadata.last_successful_run);
    const now            = new Date();
    const diffHours      = (now - lastRun) / 3600000;
    const thresholdHours = jsonConfig.schedule_interval_hours * 1.5;

    if (diffHours <= thresholdHours) return;

    const banner = document.getElementById('stale-banner');
    const text   = document.getElementById('stale-banner-text');
    if (!banner) return;

    if (text) {
      text.textContent = `Data may be outdated — last updated ${_formatRelativeTime(metadata.last_successful_run)}.`;
    }
    banner.classList.remove('hidden');

    document.getElementById('stale-dismiss-btn')?.addEventListener('click', () => {
      banner.classList.add('hidden');
    });
  };

  // ──────────────────────────────────────────────────────────────────
  // Date Range Picker
  // ──────────────────────────────────────────────────────────────────

  const setDateRange = (from, to) => {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    if (fromInput) fromInput.value = from;
    if (toInput)   toInput.value   = to;
  };

  const getDateRange = () => ({
    from: document.getElementById('date-from')?.value || '',
    to:   document.getElementById('date-to')?.value   || '',
  });

  const setActivePreset = (preset) => {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('preset-btn--active', btn.dataset.preset === preset);
      btn.setAttribute('aria-pressed', String(btn.dataset.preset === preset));
    });
  };

  const clearActivePreset = () => {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.remove('preset-btn--active');
      btn.setAttribute('aria-pressed', 'false');
    });
  };

  // ──────────────────────────────────────────────────────────────────
  // KPI Cards
  // ──────────────────────────────────────────────────────────────────

  // KPI card definitions — label, icon, value getter, format function, comparison type
  const _buildKpiCards = (kpis, changes, jsonConfig, settings) => {
    const { currency } = jsonConfig;
    const smartColor   = settings.smartKpiColoring;

    const fmtNum = (v) => DataModule.formatNumber(isFinite(v) ? v : 0);
    const fmtCur = (v) => DataModule.formatCurrency(isFinite(v) ? v : 0, currency);
    const fmtPct = (v) => DataModule.formatPercent(isFinite(v) ? v : 0, 1);

    const cards = [
      {
        id:    'total-orders',
        icon:  'shopping-cart',
        label: 'Total Orders',
        value: fmtNum(kpis.totalOrders),
        change: changes?.totalOrders,
        changeSuffix: '%',
        colorClass: null,
      },
      {
        id:    'total-revenue',
        icon:  'banknote',
        label: `Revenue (Delivered)`,
        value: fmtCur(kpis.totalRevenue),
        change: changes?.totalRevenue,
        changeSuffix: '%',
        colorClass: null,
      },
      {
        id:    'aov',
        icon:  'trending-up',
        label: 'AOV (Delivered)',
        value: fmtCur(kpis.aov),
        change: changes?.aov,
        changeSuffix: '%',
        colorClass: null,
      },
      {
        id:    'delivered-rate',
        icon:  'check-circle',
        label: 'Delivered Rate',
        value: fmtPct(kpis.deliveredRate),
        change: changes?.deliveredRate,
        changeSuffix: ' pts',
        isRate: true,
        colorClass: smartColor ? _getDeliveredRateColor(kpis.deliveredRate) : null,
      },
      {
        id:    'cancelled-rate',
        icon:  'x-circle',
        label: 'Cancelled Rate',
        value: fmtPct(kpis.cancelledRate),
        change: changes?.cancelledRate,
        changeSuffix: ' pts',
        isRate: true,
        positiveIsGood: false,
        colorClass: smartColor ? _getCancelledRateColor(kpis.cancelledRate) : null,
      },
      {
        id:    'pending-count',
        icon:  'clock',
        label: 'Pending',
        value: fmtNum(kpis.pendingCount),
        change: changes?.pendingCount,
        changeSuffix: '',
        isAbsolute: true,
      },
      {
        id:    'no-response-count',
        icon:  'phone-missed',
        label: 'No Response',
        value: fmtNum(kpis.noResponseCount),
        change: changes?.noResponseCount,
        changeSuffix: '',
        isAbsolute: true,
        positiveIsGood: false,
      },
      {
        id:    'repeat-rate',
        icon:  'users',
        label: 'Repeat Customer Rate',
        value: fmtPct(kpis.repeatRate),
        change: changes?.repeatRate,
        changeSuffix: ' pts',
        isRate: true,
        colorClass: null,
      },
    ];

    return cards;
  };

  const _getDeliveredRateColor = (rate) => {
    if (rate > 70)  return 'kpi-card--success';
    if (rate >= 50) return 'kpi-card--warning';
    return 'kpi-card--danger';
  };

  const _getCancelledRateColor = (rate) => {
    if (rate < 15)  return 'kpi-card--success';
    if (rate <= 30) return 'kpi-card--warning';
    return 'kpi-card--danger';
  };

  // Formats the comparison indicator: arrow + value + suffix
  const _buildChangeEl = (change, changeSuffix, isAbsolute, positiveIsGood = true) => {
    if (change === null || change === undefined || !isFinite(change)) {
      return '<span class="kpi-change kpi-change--neutral">—</span>';
    }

    const isPositive  = change > 0;
    const isNegative  = change < 0;
    const isGood      = positiveIsGood ? isPositive : isNegative;
    const isBad       = positiveIsGood ? isNegative : isPositive;
    const arrow       = isPositive ? '↑' : isNegative ? '↓' : '→';
    const colorClass  = isGood ? 'kpi-change--up' : isBad ? 'kpi-change--down' : 'kpi-change--neutral';

    const absChange = Math.abs(change);
    const formatted = isAbsolute
      ? `${arrow} ${absChange}`
      : `${arrow} ${absChange.toFixed(1)}${changeSuffix}`;

    return `<span class="kpi-change ${colorClass}" aria-label="${isPositive ? 'Increased' : 'Decreased'} by ${absChange.toFixed(1)}${changeSuffix}">${formatted}</span>`;
  };

  const renderKPICards = (kpis, changes, jsonConfig, settings) => {
    const grid = document.getElementById('kpi-grid');
    if (!grid) return;

    const cards = _buildKpiCards(kpis, changes, jsonConfig, settings);

    // Check if cards already exist (update in-place to preserve focus/layout)
    const existing = grid.querySelector('.kpi-card');
    if (existing) {
      cards.forEach(card => {
        const valueEl  = document.getElementById(`kpi-${card.id}-value`);
        const changeEl = document.getElementById(`kpi-${card.id}-change`);
        const cardEl   = document.getElementById(`kpi-card-${card.id}`);
        if (valueEl)  valueEl.textContent = card.value;
        if (changeEl) changeEl.innerHTML  = _buildChangeEl(
          card.change, card.changeSuffix, card.isAbsolute, card.positiveIsGood
        );
        if (cardEl) {
          cardEl.className = `kpi-card${card.colorClass ? ` ${card.colorClass}` : ''}`;
        }
      });
      return;
    }

    // Initial render
    grid.innerHTML = cards.map(card => `
      <article
        id="kpi-card-${card.id}"
        class="kpi-card${card.colorClass ? ` ${card.colorClass}` : ''}"
        aria-labelledby="kpi-label-${card.id}"
      >
        <div class="kpi-card__header">
          <span class="kpi-card__label" id="kpi-label-${card.id}">${card.label}</span>
          <i data-lucide="${card.icon}" class="kpi-card__icon" aria-hidden="true"></i>
        </div>
        <div class="kpi-card__value numeric" id="kpi-${card.id}-value">${card.value}</div>
        <div id="kpi-${card.id}-change">
          ${_buildChangeEl(card.change, card.changeSuffix, card.isAbsolute, card.positiveIsGood)}
        </div>
      </article>
    `).join('');
  };

  // ──────────────────────────────────────────────────────────────────
  // Dimension Chart Containers
  // (Canvas elements created here; Chart.js instances created in charts.js)
  // ──────────────────────────────────────────────────────────────────

  const createDimensionChartContainers = (dimensions) => {
    const container = document.getElementById('dimension-charts-container');
    if (!container || !Array.isArray(dimensions)) return;

    container.innerHTML = dimensions.map(dim => `
      <div class="chart-card" id="dim-card-${dim.key}">
        <h2 class="chart-card__title">${dim.label}</h2>
        <div class="chart-container">
          <canvas
            id="chart-dim-${dim.key}"
            role="img"
            aria-label="Chart showing order breakdown by ${dim.label}"
          ></canvas>
        </div>
      </div>
    `).join('');
  };

  // ──────────────────────────────────────────────────────────────────
  // Promo Analysis
  // ──────────────────────────────────────────────────────────────────

  const renderPromoAnalysis = (filteredOrders, jsonConfig) => {
    const container = document.getElementById('promo-stats');
    if (!container) return;

    const { statuses, currency } = jsonConfig;
    const totalOrders  = filteredOrders.length;

    const promoOrders  = filteredOrders.filter(o => {
      const code = String(o.promo_code || '').trim();
      return code !== '' && code !== '-';
    });
    const noPromoOrders = filteredOrders.filter(o => {
      const code = String(o.promo_code || '').trim();
      return code === '' || code === '-';
    });

    const promoPct     = totalOrders > 0 ? (promoOrders.length / totalOrders * 100).toFixed(1) : '0.0';
    const noPromoPct   = totalOrders > 0 ? (noPromoOrders.length / totalOrders * 100).toFixed(1) : '0.0';

    const countDelivered = (orders) =>
      orders.filter(o => DataModule.classifyStatus(o.status, statuses) === 'delivered').length;

    const promoDelivered   = countDelivered(promoOrders);
    const noPromoDelivered = countDelivered(noPromoOrders);

    const promoDelivRate   = promoOrders.length > 0
      ? (promoDelivered / promoOrders.length * 100).toFixed(1) : '—';
    const noPromoDelivRate = noPromoOrders.length > 0
      ? (noPromoDelivered / noPromoOrders.length * 100).toFixed(1) : '—';

    const totalDiscount = promoOrders
      .filter(o => DataModule.classifyStatus(o.status, statuses) === 'delivered')
      .reduce((sum, o) => {
        const discount = String(o.discount || '').trim();
        return sum + (discount && discount !== '-' ? Number(discount) || 0 : 0);
      }, 0);

    container.innerHTML = `
      <div class="promo-stats-grid">
        <div class="promo-stat-card">
          <div class="promo-stat__label">With Promo</div>
          <div class="promo-stat__value numeric">${promoOrders.length}</div>
          <div class="promo-stat__sub">${promoPct}% of orders</div>
        </div>
        <div class="promo-stat-card">
          <div class="promo-stat__label">Without Promo</div>
          <div class="promo-stat__value numeric">${noPromoOrders.length}</div>
          <div class="promo-stat__sub">${noPromoPct}% of orders</div>
        </div>
        <div class="promo-stat-card">
          <div class="promo-stat__label">Promo Delivery Rate</div>
          <div class="promo-stat__value numeric">${promoDelivRate}${promoDelivRate !== '—' ? '%' : ''}</div>
          <div class="promo-stat__sub">${promoDelivRate !== '—' ? `vs ${noPromoDelivRate}${noPromoDelivRate !== '—' ? '%' : ''} without promo` : 'No promo orders in this period'}</div>
        </div>
        <div class="promo-stat-card">
          <div class="promo-stat__label">Total Discount Given</div>
          <div class="promo-stat__value numeric">${DataModule.formatCurrency(totalDiscount, currency)}</div>
          <div class="promo-stat__sub">On delivered orders</div>
        </div>
      </div>
      <p class="promo-chart-label">Top Promo Codes by Usage</p>
    `;
  };

  // ──────────────────────────────────────────────────────────────────
  // Top Clients Table
  // ──────────────────────────────────────────────────────────────────

  const renderTopClients = (filteredOrders, jsonConfig) => {
    const container = document.getElementById('top-clients');
    if (!container) return;

    const { statuses, currency } = jsonConfig;

    // Group by client_phone
    const clientMap = {};
    filteredOrders.forEach(order => {
      const phone = String(order.client_phone || '').trim();
      if (!phone) return;
      if (!clientMap[phone]) {
        clientMap[phone] = { name: order.client_name || '—', orders: 0, revenue: 0 };
      }
      clientMap[phone].orders++;
      if (DataModule.classifyStatus(order.status, statuses) === 'delivered') {
        clientMap[phone].revenue += Number(order.prix_final) || 0;
      }
    });

    const topClients = Object.values(clientMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    if (!topClients.length) {
      container.innerHTML = '<p class="empty-section-msg">No client data for this period.</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col" class="table-th">Rank</th>
              <th scope="col" class="table-th">Client</th>
              <th scope="col" class="table-th table-th--right">Orders</th>
              <th scope="col" class="table-th table-th--right">Revenue (Delivered)</th>
            </tr>
          </thead>
          <tbody>
            ${topClients.map((client, idx) => `
              <tr class="table-row">
                <td class="table-td table-rank">${idx + 1}</td>
                <td class="table-td">${client.name}</td>
                <td class="table-td table-td--right numeric">${DataModule.formatNumber(client.orders)}</td>
                <td class="table-td table-td--right numeric">${DataModule.formatCurrency(client.revenue, currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // ──────────────────────────────────────────────────────────────────
  // Refresh Button (webhook trigger with 60s cooldown)
  // ──────────────────────────────────────────────────────────────────

  const initRefreshButton = (onSuccess) => {
    const btn      = document.getElementById('refresh-btn');
    const stalBtn  = document.getElementById('stale-refresh-btn');
    if (!btn) return;

    const triggerRefresh = async () => {
      if (btn.disabled) return;
      _startRefreshCooldown(btn, onSuccess);
    };

    btn.addEventListener('click', triggerRefresh);
    if (stalBtn) stalBtn.addEventListener('click', triggerRefresh);
  };

  const _startRefreshCooldown = async (btn, onSuccess) => {
    const textEl = document.getElementById('refresh-btn-text');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');

    // Show loading state
    if (textEl) textEl.textContent = 'Processing…';

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      showToast('Refresh triggered successfully. Data will update shortly.', 'success');
      if (onSuccess) onSuccess();
    } catch {
      showToast('Failed to trigger refresh. Please try again later.', 'error');
    }

    // 60-second cooldown countdown
    let remaining = 60;
    const updateCountdown = () => {
      if (textEl) textEl.textContent = `Retry in ${remaining}s`;
    };
    updateCountdown();

    const interval = setInterval(() => {
      remaining--;
      updateCountdown();
      if (remaining <= 0) {
        clearInterval(interval);
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        if (textEl) textEl.textContent = 'Refresh Data';
      }
    }, 1000);
  };

  // ──────────────────────────────────────────────────────────────────
  // CSV Export
  // ──────────────────────────────────────────────────────────────────

  const initCsvExport = (getFilteredOrdersFn, getDateRangeFn) => {
    const btn = document.getElementById('export-csv-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const orders    = getFilteredOrdersFn();
      const { from, to } = getDateRangeFn();
      _downloadCSV(orders, from, to);
    });
  };

  const _escapeCSVField = (value) => {
    const str = String(value === null || value === undefined ? '' : value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const _downloadCSV = (orders, from, to) => {
    if (!orders.length) {
      showToast('No data to export for the selected period.', 'error');
      return;
    }

    // Build headers from first order's keys (includes all dynamic dimension fields)
    const headers = Object.keys(orders[0]).filter(k => !k.startsWith('_'));
    const rows    = [
      headers.map(_escapeCSVField).join(','),
      ...orders.map(order =>
        headers.map(h => _escapeCSVField(order[h])).join(',')
      ),
    ];

    const csvContent = rows.join('\r\n');
    // UTF-8 BOM for Excel compatibility with French/Arabic characters
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);

    const link      = document.createElement('a');
    link.href       = url;
    link.download   = `report_${from}_to_${to}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────────────────────────────────────────
  // Toast Notifications
  // ──────────────────────────────────────────────────────────────────

  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast   = document.createElement('div');
    const iconMap = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <i data-lucide="${iconMap[type] || 'info'}" class="toast__icon" aria-hidden="true"></i>
      <span class="toast__message">${message}</span>
      <button class="btn btn--icon toast__close" aria-label="Dismiss notification">
        <i data-lucide="x"></i>
      </button>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    // Auto-dismiss after 4 seconds
    const dismiss = () => {
      toast.classList.add('toast--exiting');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };
    const timer = setTimeout(dismiss, 4000);

    toast.querySelector('.toast__close')?.addEventListener('click', () => {
      clearTimeout(timer);
      dismiss();
    });

    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
  };

  // ──────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────
  return {
    getSettings,
    saveSettings,
    applyTheme,
    initSettings,
    showLoadingState,
    showErrorState,
    showEmptyState,
    showDashboard,
    renderHeader,
    checkStaleBanner,
    setDateRange,
    getDateRange,
    setActivePreset,
    clearActivePreset,
    renderKPICards,
    createDimensionChartContainers,
    renderPromoAnalysis,
    renderTopClients,
    initRefreshButton,
    initCsvExport,
    showToast,
  };
})();
