// ── Charts Module ──────────────────────────────────
const Charts = (() => {
  const instances = {};

  const destroy = (id) => {
    if (instances[id]) { instances[id].destroy(); delete instances[id]; }
  };

  const isDark = () => document.documentElement.hasAttribute('data-dark');
  const textColor = () => isDark() ? '#94A3B8' : '#64748B';
  const gridColor = () => isDark() ? '#1E293B' : '#F1F5F9';
  const surfaceColor = () => isDark() ? '#1E293B' : '#fff';

  const BASE_OPTS = () => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    animation: { duration: 600, easing: 'easeOutQuart' },
  });

  // Category colors palette
  const CAT_COLORS = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899','#6366F1','#94A3B8','#0EA5E9','#14B8A6'];

  const donut = (canvasId, data) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    const colors = data.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]);

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: surfaceColor(), hoverOffset: 6 }] },
      options: {
        ...BASE_OPTS(),
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${Engine.fmt(ctx.raw)}`
            }
          }
        }
      }
    });
    return instances[canvasId];
  };

  const bar = (canvasId, labels, datasets) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          ...ds,
          backgroundColor: ds.color || CAT_COLORS[i],
          borderRadius: 8,
          borderSkipped: false,
        }))
      },
      options: {
        ...BASE_OPTS(),
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor(), font: { size: 11 } } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 }, callback: v => Engine.fmtShort(v) } }
        }
      }
    });
  };

  const line = (canvasId, labels, data) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37,99,235,.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#2563EB',
          pointBorderColor: surfaceColor(),
          pointBorderWidth: 2,
        }]
      },
      options: {
        ...BASE_OPTS(),
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor(), font: { size: 11 } } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 }, callback: v => Engine.fmtShort(v) } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${Engine.fmt(c.raw)}` } }
        }
      }
    });
  };

  const dow = (canvasId, labels, data) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const max = Math.max(...data);
    const bgColors = data.map(v => v === max ? '#2563EB' : 'rgba(37,99,235,.15)');
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        ...BASE_OPTS(),
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor(), font: { size: 11 } } },
          y: { grid: { display: false }, display: false }
        },
        plugins: { tooltip: { callbacks: { label: (c) => ` ${Engine.fmt(c.raw)}` } } }
      }
    });
  };

  const refreshAll = () => {
    // Re-render all active charts with new theme
    Object.keys(instances).forEach(id => {
      const ch = instances[id];
      if (ch) ch.update();
    });
  };

  return { donut, bar, line, dow, destroy, refreshAll };
})();
