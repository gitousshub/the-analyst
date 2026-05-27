// data.js — Fetches JSON from Google Drive, stores raw data, provides
// filtering API, date range utilities, status classification, and KPI computation.
// This file NEVER references client-specific values — all config comes from the JSON.

const DataModule = (() => {
  'use strict';

  let _rawData = null;

  // ──────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────

  const _toISODate = (date) => date.toISOString().split('T')[0];

  const _sanitizeNumber = (value) => {
    const n = Number(value);
    return isFinite(n) ? n : 0;
  };

  // ──────────────────────────────────────────────────────────────────
  // Fetch
  // ──────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Fetch failed with HTTP ${response.status}`);
    }
    const json = await response.json();
    _rawData = json;
    return json;
  };

  // ──────────────────────────────────────────────────────────────────
  // Accessors
  // ──────────────────────────────────────────────────────────────────

  const getJsonConfig = () => (_rawData ? _rawData.config : null);
  const getMetadata   = () => (_rawData ? _rawData.metadata : null);
  const getAllOrders  = () => (_rawData && Array.isArray(_rawData.orders) ? _rawData.orders : []);

  // ──────────────────────────────────────────────────────────────────
  // Status Classification
  // ──────────────────────────────────────────────────────────────────

  // Classifies a raw status string into a category key defined in config.statuses.
  // Case-insensitive. Returns 'unknown' if no match found.
  const classifyStatus = (statusValue, statusConfig) => {
    const normalized = String(statusValue).toLowerCase().trim();
    for (const [category, values] of Object.entries(statusConfig)) {
      if (values.some(v => String(v).toLowerCase().trim() === normalized)) {
        return category;
      }
    }
    return 'unknown';
  };

  // ──────────────────────────────────────────────────────────────────
  // Filtering
  // ──────────────────────────────────────────────────────────────────

  const getFilteredOrders = (from, to) => {
    return getAllOrders().filter(order => order.date >= from && order.date <= to);
  };

  // ──────────────────────────────────────────────────────────────────
  // Date Range Utilities (presets)
  // ──────────────────────────────────────────────────────────────────

  const computeAllTimeRange = () => {
    const orders = getAllOrders();
    if (!orders.length) {
      const today = _toISODate(new Date());
      return { from: today, to: today };
    }
    const dates = orders.map(o => o.date).sort();
    return { from: dates[0], to: dates[dates.length - 1] };
  };

  const _getThisWeek = () => {
    const now = new Date();
    const today = _toISODate(now);
    const day = now.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = _toISODate(sunday);
    return { from: _toISODate(monday), to: sundayStr > today ? today : sundayStr };
  };

  const _getThisMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: _toISODate(from), to: _toISODate(now) };
  };

  const _getLast30Days = () => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    return { from: _toISODate(from), to: _toISODate(now) };
  };

  const _getThisYear = () => {
    const now = new Date();
    return { from: `${now.getFullYear()}-01-01`, to: _toISODate(now) };
  };

  const getPresetRange = (preset) => {
    switch (preset) {
      case 'this-week':  return _getThisWeek();
      case 'this-month': return _getThisMonth();
      case 'last-30':    return _getLast30Days();
      case 'this-year':  return _getThisYear();
      case 'all-time':   return computeAllTimeRange();
      default:           return _getThisMonth();
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // KPI Computation
  // ──────────────────────────────────────────────────────────────────

  // Computes all KPI values from a given array of orders.
  // This is the single source of truth for all metric calculations.
  const computeKPIs = (orders, jsonConfig) => {
    const { statuses } = jsonConfig;

    const classified = orders.map(order => ({
      ...order,
      _category: classifyStatus(order.status, statuses),
    }));

    const totalOrders    = classified.length;
    const delivered      = classified.filter(o => o._category === 'delivered');
    const cancelled      = classified.filter(o => o._category === 'cancelled');
    const pending        = classified.filter(o => o._category === 'pending');
    const noResponse     = classified.filter(o => o._category === 'no_response');

    // Revenue only from delivered orders (Cash on Delivery model)
    const totalRevenue   = delivered.reduce((sum, o) => sum + _sanitizeNumber(o.prix_final), 0);
    const deliveredCount = delivered.length;

    // AOV: delivered revenue ÷ delivered orders only
    const aov            = deliveredCount > 0 ? totalRevenue / deliveredCount : 0;

    const deliveredRate  = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
    const cancelledRate  = totalOrders > 0 ? (cancelled.length / totalOrders) * 100 : 0;

    // Repeat customer rate: clients with more than one order, grouped by phone
    const phoneMap = {};
    classified.forEach(o => {
      const phone = String(o.client_phone || '').trim();
      if (phone) phoneMap[phone] = (phoneMap[phone] || 0) + 1;
    });
    const uniqueClients  = Object.keys(phoneMap).length;
    const repeatClients  = Object.values(phoneMap).filter(c => c > 1).length;
    const repeatRate     = uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0;

    return {
      totalOrders,
      totalRevenue,
      aov,
      deliveredRate,
      cancelledRate,
      pendingCount:    pending.length,
      noResponseCount: noResponse.length,
      repeatRate,
      deliveredCount,
      cancelledCount:  cancelled.length,
    };
  };

  // ──────────────────────────────────────────────────────────────────
  // Comparison Period Computation
  // ──────────────────────────────────────────────────────────────────

  // Returns { current, previous, changes } for a given date range.
  // Previous period = same-length window immediately before the selected range.
  const computeComparisonPeriod = (fromDate, toDate) => {
    const jsonConfig = getJsonConfig();
    if (!jsonConfig) return null;

    const currentOrders = getFilteredOrders(fromDate, toDate);
    const currentKPIs   = computeKPIs(currentOrders, jsonConfig);

    // Compute previous period dates
    const from         = new Date(fromDate);
    const to           = new Date(toDate);
    const periodDays   = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;

    const prevTo       = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom     = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - (periodDays - 1));

    const prevOrders   = getFilteredOrders(_toISODate(prevFrom), _toISODate(prevTo));
    const prevKPIs     = prevOrders.length > 0 ? computeKPIs(prevOrders, jsonConfig) : null;

    // Calculate changes: percentage change for counts/revenue, absolute point change for rates
    let changes = null;
    if (prevKPIs) {
      const pctChange = (curr, prev) => prev !== 0 ? ((curr - prev) / prev) * 100 : null;
      const ptChange  = (curr, prev) => curr - prev; // absolute points for rates

      changes = {
        totalOrders:    pctChange(currentKPIs.totalOrders,    prevKPIs.totalOrders),
        totalRevenue:   pctChange(currentKPIs.totalRevenue,   prevKPIs.totalRevenue),
        aov:            pctChange(currentKPIs.aov,            prevKPIs.aov),
        deliveredRate:  ptChange(currentKPIs.deliveredRate,   prevKPIs.deliveredRate),
        cancelledRate:  ptChange(currentKPIs.cancelledRate,   prevKPIs.cancelledRate),
        pendingCount:   currentKPIs.pendingCount   - prevKPIs.pendingCount,
        noResponseCount:currentKPIs.noResponseCount - prevKPIs.noResponseCount,
        repeatRate:     ptChange(currentKPIs.repeatRate,      prevKPIs.repeatRate),
      };
    }

    return { current: currentKPIs, previous: prevKPIs, changes };
  };

  // ──────────────────────────────────────────────────────────────────
  // Formatting Utilities (exposed for use in charts.js and ui.js)
  // ──────────────────────────────────────────────────────────────────

  const formatCurrency = (value, currency) => {
    const n = isFinite(value) ? value : 0;
    return `${n.toLocaleString('fr-MA', { maximumFractionDigits: 0 })} ${currency}`;
  };

  const formatNumber = (value) => {
    const n = isFinite(value) ? value : 0;
    return n.toLocaleString('fr-MA');
  };

  const formatPercent = (value, decimals = 1) => {
    const n = isFinite(value) ? value : 0;
    return `${n.toFixed(decimals)}%`;
  };

  // ──────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────
  return {
    fetchData,
    getJsonConfig,
    getMetadata,
    getAllOrders,
    getFilteredOrders,
    classifyStatus,
    computeKPIs,
    computeComparisonPeriod,
    computeAllTimeRange,
    getPresetRange,
    formatCurrency,
    formatNumber,
    formatPercent,
  };
})();
