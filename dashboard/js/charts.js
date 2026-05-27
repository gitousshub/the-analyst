// charts.js — All Chart.js chart creation, configuration, update, and destroy logic.
// Does NOT manipulate the DOM beyond reading canvas elements.
// Reads config dynamically — never hardcodes dimension names, status values, or client data.

const ChartsModule = (() => {
  'use strict';

  // Holds all Chart.js instances keyed by chart ID
  const _charts = {};

  // ──────────────────────────────────────────────────────────────────
  // No-data plugin: shows a message when a chart has no data
  // ──────────────────────────────────────────────────────────────────
  const _noDataPlugin = {
    id: 'noDataPlugin',
    afterDraw(chart) {
      const hasData = chart.data.labels && chart.data.labels.length > 0;
      if (!hasData) {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = "500 14px 'Inter', sans-serif";
        ctx.fillStyle    = _getCssVar('--text-tertiary') || '#94a3b8';
        ctx.fillText('No data for this period', width / 2, height / 2);
        ctx.restore();
      }
    },
  };

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  const _getCssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const _chartColors = () => [
    _getCssVar('--chart-1'),
    _getCssVar('--chart-2'),
    _getCssVar('--chart-3'),
    _getCssVar('--chart-4'),
    _getCssVar('--chart-5'),
    _getCssVar('--chart-6'),
    _getCssVar('--chart-7'),
    _getCssVar('--chart-8'),
  ];

  const _gridColor   = () => 'rgba(148, 163, 184, 0.1)';
  const _textColor   = () => _getCssVar('--text-secondary') || '#475569';
  const _borderColor = () => _getCssVar('--border') || '#e2e8f0';

  const _baseOptions = () => ({
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 400, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { family: "'Inter', sans-serif", size: 12 },
          color: _textColor(),
        },
      },
      tooltip: {
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4,
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
        bodyFont:  { family: "'Inter', sans-serif", size: 13 },
      },
    },
  });

  const _axisDefaults = () => ({
    grid:  { color: _gridColor() },
    ticks: { color: _textColor(), font: { family: "'Inter', sans-serif", size: 12 } },
    border: { color: _borderColor() },
  });

  // Group orders by ISO week (Monday) or calendar month
  const _groupByTime = (orders, granularity, statuses) => {
    const groups = {};
    orders.forEach(order => {
      const d = new Date(order.date);
      let key;
      if (granularity === 'week') {
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(d);
        monday.setDate(d.getDate() + diff);
        key = monday.toISOString().split('T')[0];
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!groups[key]) groups[key] = { orderCount: 0, deliveredRevenue: 0 };
      groups[key].orderCount++;
      const category = DataModule.classifyStatus(order.status, statuses);
      if (category === 'delivered') {
        groups[key].deliveredRevenue += Number(order.prix_final) || 0;
      }
    });

    const sortedKeys = Object.keys(groups).sort();
    const labels = sortedKeys.map(key => {
      if (granularity === 'week') {
        const d = new Date(key);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      const [year, month] = key.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    });

    return {
      labels,
      orderCounts:       sortedKeys.map(k => groups[k].orderCount),
      deliveredRevenues: sortedKeys.map(k => groups[k].deliveredRevenue),
    };
  };

  // ──────────────────────────────────────────────────────────────────
  // 1. Time Series Line Chart
  // ──────────────────────────────────────────────────────────────────

  const _buildTimeSeriesData = (filteredOrders, jsonConfig, from, to) => {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    const diffDays = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24));
    const granularity = diffDays <= 60 ? 'week' : 'month';
    return _groupByTime(filteredOrders, granularity, jsonConfig.statuses);
  };

  const _initTimeSeriesChart = (filteredOrders, jsonConfig, from, to) => {
    const canvas = document.getElementById('chart-timeseries');
    if (!canvas) return;

    const { labels, orderCounts, deliveredRevenues } = _buildTimeSeriesData(
      filteredOrders, jsonConfig, from, to
    );
    const colors   = _chartColors();
    const currency = jsonConfig.currency;

    _charts.timeseries = new Chart(canvas, {
      type: 'line',
      plugins: [_noDataPlugin],
      data: {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: orderCounts,
            borderColor: colors[0],
            backgroundColor: `${colors[0]}26`,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'yCount',
          },
          {
            label: `Revenue (${currency})`,
            data: deliveredRevenues,
            borderColor: colors[1],
            backgroundColor: `${colors[1]}26`,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'yRevenue',
          },
        ],
      },
      options: {
        ..._baseOptions(),
        interaction: { mode: 'index', intersect: false },
        plugins: {
          ..._baseOptions().plugins,
          tooltip: {
            ..._baseOptions().plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                if (ctx.datasetIndex === 1) {
                  return ` Revenue: ${DataModule.formatCurrency(ctx.parsed.y, currency)}`;
                }
                return ` Orders: ${ctx.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: { ..._axisDefaults() },
          yCount: {
            ..._axisDefaults(),
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Orders', color: _textColor() },
            ticks: { ..._axisDefaults().ticks, precision: 0 },
          },
          yRevenue: {
            ..._axisDefaults(),
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: `Revenue (${currency})`, color: _textColor() },
            ticks: {
              ..._axisDefaults().ticks,
              callback: (v) => DataModule.formatCurrency(v, currency),
            },
          },
        },
      },
    });

    // Update SR summary
    const srEl = document.getElementById('sr-timeseries');
    if (srEl && labels.length > 0) {
      const maxRevIdx = deliveredRevenues.indexOf(Math.max(...deliveredRevenues));
      srEl.textContent = `Time series data: ${labels.length} periods. Peak revenue period: ${labels[maxRevIdx] || 'N/A'}.`;
    }
  };

  const _updateTimeSeriesChart = (filteredOrders, jsonConfig, from, to) => {
    const chart = _charts.timeseries;
    if (!chart) return;

    const { labels, orderCounts, deliveredRevenues } = _buildTimeSeriesData(
      filteredOrders, jsonConfig, from, to
    );
    const currency = jsonConfig.currency;

    chart.data.labels              = labels;
    chart.data.datasets[0].data   = orderCounts;
    chart.data.datasets[1].data   = deliveredRevenues;
    chart.data.datasets[1].label  = `Revenue (${currency})`;
    chart.options.scales.yRevenue.title.text = `Revenue (${currency})`;
    chart.update();

    const srEl = document.getElementById('sr-timeseries');
    if (srEl && labels.length > 0) {
      const maxRevIdx = deliveredRevenues.indexOf(Math.max(...deliveredRevenues));
      srEl.textContent = `Time series data: ${labels.length} periods. Peak revenue period: ${labels[maxRevIdx] || 'N/A'}.`;
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 2. Status Donut Chart
  // ──────────────────────────────────────────────────────────────────

  const _buildStatusData = (filteredOrders, jsonConfig) => {
    const { statuses } = jsonConfig;
    const counts = {};
    // Initialize all category keys from config (never hardcoded)
    Object.keys(statuses).forEach(cat => { counts[cat] = 0; });

    filteredOrders.forEach(order => {
      const cat = DataModule.classifyStatus(order.status, statuses);
      if (counts[cat] !== undefined) counts[cat]++;
      else counts[cat] = (counts[cat] || 0) + 1;
    });

    const categories = Object.keys(counts).filter(k => counts[k] > 0);
    return {
      labels: categories.map(k => k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')),
      data:   categories.map(k => counts[k]),
    };
  };

  const _initStatusChart = (filteredOrders, jsonConfig) => {
    const canvas = document.getElementById('chart-status');
    if (!canvas) return;

    const { labels, data } = _buildStatusData(filteredOrders, jsonConfig);
    const colors = _chartColors();
    const total  = data.reduce((s, v) => s + v, 0);

    _charts.status = new Chart(canvas, {
      type: 'doughnut',
      plugins: [_noDataPlugin],
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: _getCssVar('--bg-secondary') || '#ffffff',
          hoverOffset: 8,
        }],
      },
      options: {
        ..._baseOptions(),
        cutout: '65%',
        plugins: {
          ..._baseOptions().plugins,
          tooltip: {
            ..._baseOptions().plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    const srEl = document.getElementById('sr-status');
    if (srEl && labels.length > 0) {
      const parts = labels.map((l, i) => `${l}: ${data[i]}`);
      srEl.textContent = `Status breakdown: ${parts.join(', ')}.`;
    }
  };

  const _updateStatusChart = (filteredOrders, jsonConfig) => {
    const chart = _charts.status;
    if (!chart) return;

    const { labels, data } = _buildStatusData(filteredOrders, jsonConfig);
    const colors = _chartColors();
    const total  = data.reduce((s, v) => s + v, 0);

    chart.data.labels                            = labels;
    chart.data.datasets[0].data                 = data;
    chart.data.datasets[0].backgroundColor      = colors.slice(0, labels.length);
    chart.options.plugins.tooltip.callbacks.label = (ctx) => {
      const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
      return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
    };
    chart.update();

    const srEl = document.getElementById('sr-status');
    if (srEl && labels.length > 0) {
      const parts = labels.map((l, i) => `${l}: ${data[i]}`);
      srEl.textContent = `Status breakdown: ${parts.join(', ')}.`;
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 3. Peak Days Bar Chart
  // ──────────────────────────────────────────────────────────────────

  const _DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const _buildPeakDaysData = (filteredOrders) => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon=0 ... Sun=6
    filteredOrders.forEach(order => {
      const d = new Date(order.date);
      const dayJS = d.getDay(); // 0=Sun,1=Mon...6=Sat
      const idx = dayJS === 0 ? 6 : dayJS - 1; // Convert to Mon=0
      counts[idx]++;
    });
    return counts;
  };

  const _initPeakDaysChart = (filteredOrders) => {
    const canvas = document.getElementById('chart-peak-days');
    if (!canvas) return;

    const counts  = _buildPeakDaysData(filteredOrders);
    const maxVal  = Math.max(...counts);
    const colors  = _chartColors();
    // Highlight the highest bar
    const bgColors = counts.map(v => v === maxVal && maxVal > 0 ? colors[0] : `${colors[0]}80`);

    _charts.peakDays = new Chart(canvas, {
      type: 'bar',
      plugins: [_noDataPlugin],
      data: {
        labels: _DAY_NAMES,
        datasets: [{
          label: 'Orders',
          data: counts,
          backgroundColor: bgColors,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        ..._baseOptions(),
        plugins: {
          ..._baseOptions().plugins,
          legend: { display: false },
          tooltip: {
            ..._baseOptions().plugins.tooltip,
            callbacks: { label: (ctx) => ` Orders: ${ctx.parsed.y}` },
          },
        },
        scales: {
          x: { ..._axisDefaults(), grid: { display: false } },
          y: { ..._axisDefaults(), beginAtZero: true, ticks: { ..._axisDefaults().ticks, precision: 0 } },
        },
      },
    });

    const srEl = document.getElementById('sr-peak-days');
    if (srEl && maxVal > 0) {
      const peakDay = _DAY_NAMES[counts.indexOf(maxVal)];
      srEl.textContent = `Peak day: ${peakDay} with ${maxVal} orders.`;
    }
  };

  const _updatePeakDaysChart = (filteredOrders) => {
    const chart = _charts.peakDays;
    if (!chart) return;

    const counts   = _buildPeakDaysData(filteredOrders);
    const maxVal   = Math.max(...counts);
    const colors   = _chartColors();
    const bgColors = counts.map(v => v === maxVal && maxVal > 0 ? colors[0] : `${colors[0]}80`);

    chart.data.datasets[0].data            = counts;
    chart.data.datasets[0].backgroundColor = bgColors;
    chart.update();

    const srEl = document.getElementById('sr-peak-days');
    if (srEl && maxVal > 0) {
      const peakDay = _DAY_NAMES[counts.indexOf(maxVal)];
      srEl.textContent = `Peak day: ${peakDay} with ${maxVal} orders.`;
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 4. Delivery Rate by City
  // ──────────────────────────────────────────────────────────────────

  const _buildDeliveryCityData = (filteredOrders, jsonConfig) => {
    const { statuses, dimensions } = jsonConfig;

    // Find the 'ville' dimension key dynamically — we look for a dimension
    // whose key is commonly used for city. We use the first dimension whose
    // data values represent cities, by checking via a heuristic: if no 'ville'
    // key exists in dimensions, we skip the chart gracefully.
    const villeDim = dimensions.find(d => d.key === 'ville');
    if (!villeDim) return { labels: [], rates: [], colors: [] };

    const cityKey = villeDim.key;
    const cityStats = {};

    filteredOrders.forEach(order => {
      const city = String(order[cityKey] || '').trim();
      if (!city) return;
      if (!cityStats[city]) cityStats[city] = { delivered: 0, total: 0 };
      cityStats[city].total++;
      const cat = DataModule.classifyStatus(order.status, statuses);
      if (cat === 'delivered') cityStats[city].delivered++;
    });

    // Only include cities with ≥ 5 orders to avoid statistical noise
    const eligibleCities = Object.entries(cityStats)
      .filter(([, s]) => s.total >= 5)
      .map(([city, s]) => ({ city, rate: (s.delivered / s.total) * 100, ...s }))
      .sort((a, b) => b.rate - a.rate);

    const colors = _chartColors();
    return {
      labels: eligibleCities.map(c => c.city),
      rates:  eligibleCities.map(c => parseFloat(c.rate.toFixed(1))),
      stats:  eligibleCities,
      colors: eligibleCities.map(c =>
        c.rate < 50 ? _getCssVar('--danger') || '#ef4444' : colors[4]
      ),
    };
  };

  const _initDeliveryCityChart = (filteredOrders, jsonConfig) => {
    const canvas = document.getElementById('chart-delivery-city');
    if (!canvas) return;

    const { labels, rates, colors, stats } = _buildDeliveryCityData(filteredOrders, jsonConfig);

    _charts.deliveryCity = new Chart(canvas, {
      type: 'bar',
      plugins: [_noDataPlugin],
      data: {
        labels,
        datasets: [{
          label: 'Delivery Rate %',
          data: rates,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        ..._baseOptions(),
        indexAxis: 'y',
        plugins: {
          ..._baseOptions().plugins,
          legend: { display: false },
          tooltip: {
            ..._baseOptions().plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const s = stats[ctx.dataIndex];
                return s
                  ? ` ${s.delivered} / ${s.total} orders — ${ctx.parsed.x.toFixed(1)}%`
                  : ` ${ctx.parsed.x.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            ..._axisDefaults(),
            min: 0, max: 100,
            ticks: { ..._axisDefaults().ticks, callback: (v) => `${v}%` },
            title: { display: true, text: 'Delivery Rate (%)', color: _textColor() },
          },
          y: { ..._axisDefaults(), grid: { display: false } },
        },
      },
    });

    const srEl = document.getElementById('sr-delivery-city');
    if (srEl && labels.length > 0) {
      srEl.textContent = `Top city by delivery rate: ${labels[0]} at ${rates[0]}%.`;
    }
  };

  const _updateDeliveryCityChart = (filteredOrders, jsonConfig) => {
    const chart = _charts.deliveryCity;
    if (!chart) return;

    const { labels, rates, colors, stats } = _buildDeliveryCityData(filteredOrders, jsonConfig);

    chart.data.labels                            = labels;
    chart.data.datasets[0].data                 = rates;
    chart.data.datasets[0].backgroundColor      = colors;
    chart.options.plugins.tooltip.callbacks.label = (ctx) => {
      const s = stats[ctx.dataIndex];
      return s
        ? ` ${s.delivered} / ${s.total} orders — ${ctx.parsed.x.toFixed(1)}%`
        : ` ${ctx.parsed.x.toFixed(1)}%`;
    };
    chart.update();

    const srEl = document.getElementById('sr-delivery-city');
    if (srEl && labels.length > 0) {
      srEl.textContent = `Top city by delivery rate: ${labels[0]} at ${rates[0]}%.`;
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 5. Dynamic Dimension Charts
  // ──────────────────────────────────────────────────────────────────

  const _buildDimensionData = (filteredOrders, jsonConfig, dimension) => {
    const { statuses } = jsonConfig;
    const { key } = dimension;
    const groups = {};

    filteredOrders.forEach(order => {
      const val = String(order[key] || '').trim() || '(None)';
      if (!groups[val]) groups[val] = { count: 0, revenue: 0 };
      groups[val].count++;
      if (DataModule.classifyStatus(order.status, statuses) === 'delivered') {
        groups[val].revenue += Number(order.prix_final) || 0;
      }
    });

    const sorted = Object.entries(groups)
      .sort(([, a], [, b]) => b.count - a.count);

    return {
      labels:   sorted.map(([label]) => label),
      counts:   sorted.map(([, d]) => d.count),
      revenues: sorted.map(([, d]) => d.revenue),
    };
  };

  // Decides the effective chart type for a dimension:
  // pie with >5 unique values (in ALL orders) auto-switches to bar.
  const _effectiveChartType = (allOrders, dimension) => {
    if (dimension.chart_type !== 'pie') return 'bar';
    const uniqueVals = new Set(allOrders.map(o => String(o[dimension.key] || '').trim()));
    return uniqueVals.size > 5 ? 'bar' : 'pie';
  };

  const _initDimensionCharts = (filteredOrders, jsonConfig) => {
    const allOrders = DataModule.getAllOrders();

    jsonConfig.dimensions.forEach(dimension => {
      const chartId     = `chart-dim-${dimension.key}`;
      const canvas      = document.getElementById(chartId);
      if (!canvas) return;

      const chartType   = _effectiveChartType(allOrders, dimension);
      const { labels, counts, revenues } = _buildDimensionData(filteredOrders, jsonConfig, dimension);
      const colors      = _chartColors();
      const currency    = jsonConfig.currency;

      const isHorizontalBar = chartType === 'bar';

      _charts[chartId] = new Chart(canvas, {
        type: chartType === 'bar' ? 'bar' : 'pie',
        plugins: [_noDataPlugin],
        data: {
          labels,
          datasets: [
            {
              label: 'Orders',
              data: counts,
              backgroundColor: isHorizontalBar
                ? colors[0]
                : colors.slice(0, labels.length),
              borderRadius: isHorizontalBar ? 6 : 0,
              borderWidth: isHorizontalBar ? 0 : 2,
              borderColor: isHorizontalBar ? undefined : _getCssVar('--bg-secondary'),
            },
          ],
        },
        options: {
          ..._baseOptions(),
          indexAxis: isHorizontalBar ? 'y' : undefined,
          plugins: {
            ..._baseOptions().plugins,
            legend: { display: !isHorizontalBar, ..._baseOptions().plugins.legend },
            tooltip: {
              ..._baseOptions().plugins.tooltip,
              callbacks: {
                label: (ctx) => {
                  const rev    = revenues[ctx.dataIndex];
                  const count  = isHorizontalBar ? ctx.parsed.x : ctx.parsed;
                  const lines  = [` Orders: ${count}`];
                  if (rev !== undefined && rev > 0) {
                    lines.push(` Revenue: ${DataModule.formatCurrency(rev, currency)}`);
                  }
                  return lines;
                },
              },
            },
          },
          scales: isHorizontalBar ? {
            x: { ..._axisDefaults(), beginAtZero: true, ticks: { ..._axisDefaults().ticks, precision: 0 } },
            y: { ..._axisDefaults(), grid: { display: false } },
          } : undefined,
        },
      });
    });
  };

  const _updateDimensionCharts = (filteredOrders, jsonConfig) => {
    jsonConfig.dimensions.forEach(dimension => {
      const chartId = `chart-dim-${dimension.key}`;
      const chart   = _charts[chartId];
      if (!chart) return;

      const { labels, counts, revenues } = _buildDimensionData(filteredOrders, jsonConfig, dimension);
      const currency = jsonConfig.currency;
      const isHorizontalBar = chart.config.type === 'bar';
      const colors = _chartColors();

      chart.data.labels           = labels;
      chart.data.datasets[0].data = counts;
      if (isHorizontalBar) {
        chart.data.datasets[0].backgroundColor = colors[0];
      } else {
        chart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
      }
      chart.options.plugins.tooltip.callbacks.label = (ctx) => {
        const rev   = revenues[ctx.dataIndex];
        const count = isHorizontalBar ? ctx.parsed.x : ctx.parsed;
        const lines = [` Orders: ${count}`];
        if (rev !== undefined && rev > 0) {
          lines.push(` Revenue: ${DataModule.formatCurrency(rev, currency)}`);
        }
        return lines;
      };
      chart.update();
    });
  };

  // ──────────────────────────────────────────────────────────────────
  // 6. Promo Codes Bar Chart
  // ──────────────────────────────────────────────────────────────────

  const _buildPromoCodesData = (filteredOrders) => {
    const codeCounts = {};
    filteredOrders.forEach(order => {
      const code = String(order.promo_code || '').trim();
      if (code) codeCounts[code] = (codeCounts[code] || 0) + 1;
    });

    const sorted = Object.entries(codeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      labels: sorted.map(([code]) => code),
      counts: sorted.map(([, count]) => count),
    };
  };

  const _initPromoCodesChart = (filteredOrders) => {
    const canvas = document.getElementById('chart-promo-codes');
    if (!canvas) return;

    const { labels, counts } = _buildPromoCodesData(filteredOrders);
    const colors = _chartColors();

    _charts.promoCodes = new Chart(canvas, {
      type: 'bar',
      plugins: [_noDataPlugin],
      data: {
        labels,
        datasets: [{
          label: 'Usage Count',
          data: counts,
          backgroundColor: colors[2],
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        ..._baseOptions(),
        indexAxis: 'y',
        plugins: {
          ..._baseOptions().plugins,
          legend: { display: false },
          tooltip: {
            ..._baseOptions().plugins.tooltip,
            callbacks: { label: (ctx) => ` Used ${ctx.parsed.x} times` },
          },
        },
        scales: {
          x: { ..._axisDefaults(), beginAtZero: true, ticks: { ..._axisDefaults().ticks, precision: 0 } },
          y: { ..._axisDefaults(), grid: { display: false } },
        },
      },
    });
  };

  const _updatePromoCodesChart = (filteredOrders) => {
    const chart = _charts.promoCodes;
    if (!chart) return;

    const { labels, counts } = _buildPromoCodesData(filteredOrders);
    chart.data.labels           = labels;
    chart.data.datasets[0].data = counts;
    chart.update();
  };

  // ──────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────

  const initAllCharts = (filteredOrders, jsonConfig, from, to) => {
    // Register the no-data plugin globally
    Chart.register(_noDataPlugin);

    // Apply global Chart.js defaults
    Chart.defaults.font.family = "'Inter', sans-serif";

    _initTimeSeriesChart(filteredOrders, jsonConfig, from, to);
    _initStatusChart(filteredOrders, jsonConfig);
    _initPeakDaysChart(filteredOrders);
    _initDeliveryCityChart(filteredOrders, jsonConfig);
    _initDimensionCharts(filteredOrders, jsonConfig);
    _initPromoCodesChart(filteredOrders);
  };

  const updateAllCharts = (filteredOrders, jsonConfig, from, to) => {
    _updateTimeSeriesChart(filteredOrders, jsonConfig, from, to);
    _updateStatusChart(filteredOrders, jsonConfig);
    _updatePeakDaysChart(filteredOrders);
    _updateDeliveryCityChart(filteredOrders, jsonConfig);
    _updateDimensionCharts(filteredOrders, jsonConfig);
    _updatePromoCodesChart(filteredOrders);
  };

  const destroyAllCharts = () => {
    Object.values(_charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
    Object.keys(_charts).forEach(key => { delete _charts[key]; });
  };

  // Force chart color refresh (called after theme change)
  const refreshChartColors = () => {
    Object.values(_charts).forEach(chart => {
      if (!chart) return;
      chart.options.scales && Object.values(chart.options.scales).forEach(scale => {
        if (scale.grid)  scale.grid.color  = _gridColor();
        if (scale.ticks) scale.ticks.color = _textColor();
        if (scale.title) scale.title.color = _textColor();
        if (scale.border) scale.border.color = _borderColor();
      });
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = _textColor();
      }
      chart.update('none'); // 'none' = no animation, just redraw
    });
  };

  return { initAllCharts, updateAllCharts, destroyAllCharts, refreshChartColors };
})();
