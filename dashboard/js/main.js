// main.js — Entry point. Initializes modules in correct order and wires event listeners.
// Contains NO business logic. Orchestration only.

(async () => {
  'use strict';

  // ──────────────────────────────────────────────────────────────────
  // Private state
  // ──────────────────────────────────────────────────────────────────

  let _jsonConfig = null;

  // ──────────────────────────────────────────────────────────────────
  // Debounce utility for manual date input typing
  // ──────────────────────────────────────────────────────────────────

  const _debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  // ──────────────────────────────────────────────────────────────────
  // Dashboard update: called whenever date range changes
  // ──────────────────────────────────────────────────────────────────

  const _updateDashboard = (from, to) => {
    if (!_jsonConfig || !from || !to) return;

    const filteredOrders = DataModule.getFilteredOrders(from, to);
    const kpiData        = DataModule.computeComparisonPeriod(from, to);
    const settings       = UIModule.getSettings();

    UIModule.renderKPICards(kpiData.current, kpiData.changes, _jsonConfig, settings);
    UIModule.renderPromoAnalysis(filteredOrders, _jsonConfig);
    UIModule.renderTopClients(filteredOrders, _jsonConfig);

    ChartsModule.updateAllCharts(filteredOrders, _jsonConfig, from, to);

    // Re-render Lucide icons after dynamic DOM updates
    lucide.createIcons();
  };

  // ──────────────────────────────────────────────────────────────────
  // Wire event listeners
  // ──────────────────────────────────────────────────────────────────

  const _wireEventListeners = () => {
    const dateFromInput = document.getElementById('date-from');
    const dateToInput   = document.getElementById('date-to');

    // Debounced handler for manual date typing
    const debouncedUpdate = _debounce(() => {
      const { from, to } = UIModule.getDateRange();
      if (from && to && from <= to) {
        UIModule.clearActivePreset();
        _updateDashboard(from, to);
      }
    }, 300);

    dateFromInput?.addEventListener('change', debouncedUpdate);
    dateToInput?.addEventListener('change', debouncedUpdate);

    // Quick preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        const range  = DataModule.getPresetRange(preset);
        UIModule.setDateRange(range.from, range.to);
        UIModule.setActivePreset(preset);
        _updateDashboard(range.from, range.to);
      });
    });

    // Settings callbacks: re-render KPI cards on theme/coloring change
    UIModule.initSettings(
      // onThemeChange
      () => {
        const { from, to } = UIModule.getDateRange();
        const filteredOrders = DataModule.getFilteredOrders(from, to);
        const kpiData        = DataModule.computeComparisonPeriod(from, to);
        UIModule.renderKPICards(kpiData.current, kpiData.changes, _jsonConfig, UIModule.getSettings());
        ChartsModule.refreshChartColors();
        lucide.createIcons();
      },
      // onSmartKpiColoringChange
      () => {
        const { from, to } = UIModule.getDateRange();
        const kpiData      = DataModule.computeComparisonPeriod(from, to);
        UIModule.renderKPICards(kpiData.current, kpiData.changes, _jsonConfig, UIModule.getSettings());
        lucide.createIcons();
      }
    );

    // Refresh button
    UIModule.initRefreshButton(() => {
      // Callback after successful webhook trigger — auto re-fetch after 60s cooldown
      // (The button cooldown handles the timing; user can manually reload)
    });

    // CSV Export
    UIModule.initCsvExport(
      () => DataModule.getFilteredOrders(
        UIModule.getDateRange().from,
        UIModule.getDateRange().to
      ),
      UIModule.getDateRange
    );

    // Retry button (error state) — use replaceWith to avoid duplicate listeners
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      const freshRetry = retryBtn.cloneNode(true);
      retryBtn.replaceWith(freshRetry);
      freshRetry.addEventListener('click', _init);
    }

    // "View All Time" button (empty state)
    const viewAllBtn = document.getElementById('view-all-btn');
    if (viewAllBtn) {
      const freshViewAll = viewAllBtn.cloneNode(true);
      viewAllBtn.replaceWith(freshViewAll);
      freshViewAll.addEventListener('click', () => {
        const range = DataModule.getPresetRange('all-time');
        UIModule.setDateRange(range.from, range.to);
        UIModule.setActivePreset('all-time');
        _init();
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────────────────────────

  let _initialized = false;

  const _init = async () => {
    // Apply saved theme immediately to prevent flash
    const savedSettings = UIModule.getSettings();
    UIModule.applyTheme(savedSettings.theme);

    UIModule.showLoadingState();

    try {
      await DataModule.fetchData();
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      UIModule.showErrorState();
      lucide.createIcons();
      // Wire retry using clone to prevent duplicate listeners on repeated retries
      const retryBtn = document.getElementById('retry-btn');
      if (retryBtn) {
        const fresh = retryBtn.cloneNode(true);
        retryBtn.replaceWith(fresh);
        fresh.addEventListener('click', _init);
      }
      return;
    }

    _jsonConfig = DataModule.getJsonConfig();
    const metadata = DataModule.getMetadata();
    const allOrders = DataModule.getAllOrders();

    if (!allOrders.length) {
      UIModule.showEmptyState();
      lucide.createIcons();
      // Empty dataset — there's nothing to show; inform user
      const viewBtn = document.getElementById('view-all-btn');
      if (viewBtn) {
        const fresh = viewBtn.cloneNode(true);
        viewBtn.replaceWith(fresh);
        fresh.addEventListener('click', () => {
          UIModule.showToast('No orders found in the dataset.', 'info');
        });
      }
      return;
    }

    // Render header with business name and metadata
    UIModule.renderHeader(_jsonConfig, metadata);

    // Check for stale data and maybe show warning banner
    UIModule.checkStaleBanner(metadata, _jsonConfig);

    // Destroy any previously created charts before re-initializing
    ChartsModule.destroyAllCharts();

    // Create dimension chart DOM containers before initializing charts
    UIModule.createDimensionChartContainers(_jsonConfig.dimensions);

    // Set default date range: "This Month"
    const defaultRange = DataModule.getPresetRange('this-month');
    UIModule.setDateRange(defaultRange.from, defaultRange.to);

    // Filter orders and compute KPIs for default range
    const filteredOrders = DataModule.getFilteredOrders(defaultRange.from, defaultRange.to);
    const kpiData        = DataModule.computeComparisonPeriod(defaultRange.from, defaultRange.to);
    const settings       = UIModule.getSettings();

    // Show dashboard (removes loading state)
    UIModule.showDashboard();

    // Render UI components
    UIModule.renderKPICards(kpiData.current, kpiData.changes, _jsonConfig, settings);
    UIModule.renderPromoAnalysis(filteredOrders, _jsonConfig);
    UIModule.renderTopClients(filteredOrders, _jsonConfig);

    // Initialize all Chart.js charts
    ChartsModule.initAllCharts(filteredOrders, _jsonConfig, defaultRange.from, defaultRange.to);

    // Mark "This Month" preset as active
    UIModule.setActivePreset('this-month');

    // Wire all event listeners (only once per full initialization)
    if (!_initialized) {
      _wireEventListeners();
      _initialized = true;
    }

    // Replace all <i data-lucide="..."> with actual SVG icons
    lucide.createIcons();
  };

  // ──────────────────────────────────────────────────────────────────
  // Boot on DOMContentLoaded
  // ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
