// ── Dashboard Component ────────────────────────────
const Dashboard = (() => {
  let currentMonth = null;
  let dashboardTab = 'credit'; // 'credit' = cartão de crédito, 'account' = conta/transações

  const init = (container) => {
    const txs = Storage.getTransactions();
    const months = Engine.getAvailableMonths(txs);

    if (!months.length) {
      renderEmpty(container);
      return;
    }

    if (!currentMonth || !months.includes(currentMonth)) {
      currentMonth = months[0];
    }

    render(container, txs, months);
  };

  const renderEmpty = (container) => {
    container.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Dashboard</div></div>
      </div>
      <div class="empty-state fade-in">
        <div class="empty-icon">📊</div>
        <div class="empty-title">Nenhum dado ainda</div>
        <div class="empty-sub">Importe seu CSV do Nubank para começar a visualizar seus gastos.</div>
        <button class="btn btn-primary btn-sm" onclick="App.navigate('import')" style="margin-top:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Importar CSV
        </button>
      </div>`;
  };

  const renderEmptyForTab = (container) => {
    const tabName = dashboardTab === 'credit' ? 'Cartão de Crédito' : 'Conta/Transações';
    container.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Dashboard</div></div>
      </div>
      <div class="empty-state fade-in">
        <div class="empty-icon">📊</div>
        <div class="empty-title">Nenhum dado de ${tabName}</div>
        <div class="empty-sub">Importe um CSV de ${tabName.toLowerCase()} para visualizar os dados.</div>
        <button class="btn btn-primary btn-sm" onclick="App.navigate('import')" style="margin-top:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Importar CSV
        </button>
      </div>`;
  };

  const render = (container, txs, months) => {
    // Filter transactions by source based on dashboard tab
    const filteredTxs = dashboardTab === 'credit' 
      ? txs.filter(t => t.source === 'credit' || !t.source)
      : txs.filter(t => t.source === 'account');
    
    const filteredMonths = Engine.getAvailableMonths(filteredTxs);
    
    // Auto-switch tab if no data in current tab but data exists in other tab
    if (!filteredMonths.length) {
      const otherTabTxs = dashboardTab === 'credit' 
        ? txs.filter(t => t.source === 'account')
        : txs.filter(t => t.source === 'credit' || !t.source);
      const otherTabMonths = Engine.getAvailableMonths(otherTabTxs);
      
      if (otherTabMonths.length) {
        dashboardTab = dashboardTab === 'credit' ? 'account' : 'credit';
        render(container, txs, months);
        return;
      }
      
      renderEmptyForTab(container);
      return;
    }

    if (!currentMonth || !filteredMonths.includes(currentMonth)) {
      currentMonth = filteredMonths[0];
    }

    const stats = Engine.computeStats(filteredTxs, currentMonth);
    const prevMonthKey = filteredMonths[filteredMonths.indexOf(currentMonth) + 1];
    const prevStats = prevMonthKey ? Engine.computeStats(filteredTxs, prevMonthKey) : null;
    const comparison = prevStats ? Engine.computeMonthComparison(filteredTxs, currentMonth, prevMonthKey) : null;
    const insights = Engine.generateInsights(stats, prevStats, Engine.getMonthLabel(currentMonth));
    const evolution = Engine.getMonthlyEvolution(filteredTxs);
    const cashFlow = Engine.computeAccountCashFlow(txs, currentMonth);
    const currentBalance = Engine.computeAccountBalance(txs);

    const diffBadge = comparison
      ? `<span class="hero-badge">${comparison.diff > 0 ? '↑' : '↓'} ${Math.abs(comparison.diff).toFixed(0)}% vs mês anterior</span>`
      : '';

    container.innerHTML = `
      <div style="padding-bottom: 24px">
        <!-- Dashboard tab selector -->
        <div class="dashboard-tabs-container">
          <div style="display:flex;gap:8px;background:var(--surface2);padding:4px;border-radius:12px">
            <button class="dashboard-tab-btn ${dashboardTab === 'credit' ? 'active' : ''}" onclick="Dashboard._setTab('credit')">
              💳 Cartão de Crédito
            </button>
            <button class="dashboard-tab-btn ${dashboardTab === 'account' ? 'active' : ''}" onclick="Dashboard._setTab('account')">
              📄 Conta/Transações
            </button>
          </div>
        </div>

        <!-- Month picker -->
        <div class="month-picker">
          <button class="month-btn" id="prevMonthBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="month-label">${Engine.getMonthLabel(currentMonth)}</div>
          <button class="month-btn" id="nextMonthBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <!-- Hero card -->
        <div class="hero-card fade-in">
          <div class="hero-month">${dashboardTab === 'account' ? 'Saldo atual da conta' : `Total gasto em ${Engine.getMonthLabel(currentMonth)}`}</div>
          <div class="hero-amount">${dashboardTab === 'account' ? Engine.fmt(currentBalance) : Engine.fmt(stats.total)}</div>
          <div class="hero-sub">${dashboardTab === 'account' ? `${stats.count} transações no período` : `${stats.count} transações · ${Engine.fmtShort(stats.avgDay)}/dia`}</div>
          ${dashboardTab === 'credit' ? diffBadge : ''}
        </div>

        <!-- Metrics -->
        <div class="metrics-strip stagger">
          ${renderMetric('Maior compra', Engine.fmt(stats.largest), '💳', '#EFF6FF', stats.topCat ? stats.topCat[0] : '')}
          ${renderMetric('Top categoria', stats.topCat ? stats.topCat[0] : '–', '📊', '#F5F3FF', stats.topCat ? Engine.fmt(stats.topCat[1]) : '')}
          ${renderMetric('Nº de compras', stats.count, '🧾', '#ECFDF5', '')}
          ${renderMetric('Média por dia', Engine.fmtShort(stats.avgDay), '📅', '#FFFBEB', '')}
        </div>

        <!-- Account Cash Flow (only if has account transactions) -->
        ${cashFlow.totalIn > 0 || cashFlow.totalOut > 0 ? `
        <div class="section-head" style="margin-top:16px">
          <div class="section-title">Fluxo da Conta</div>
        </div>
        <div class="card card-pad" style="background:linear-gradient(135deg,#0891B2 0%,#06B6D4 100%);color:#fff">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div>
              <div style="font-size:11px;opacity:0.8;margin-bottom:4px">Entradas</div>
              <div style="font-size:18px;font-weight:700">${Engine.fmt(cashFlow.totalIn)}</div>
              <div style="font-size:11px;opacity:0.7">Pix: ${Engine.fmtShort(cashFlow.pixReceived)} · Transf: ${Engine.fmtShort(cashFlow.transferReceived)}</div>
            </div>
            <div>
              <div style="font-size:11px;opacity:0.8;margin-bottom:4px">Saídas</div>
              <div style="font-size:18px;font-weight:700">${Engine.fmt(cashFlow.totalOut)}</div>
              <div style="font-size:11px;opacity:0.7">Pix: ${Engine.fmtShort(cashFlow.pixSent)} · Transf: ${Engine.fmtShort(cashFlow.transferSent)}</div>
            </div>
          </div>
          <div style="padding-top:12px;border-top:1px solid rgba(255,255,255,0.2);display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:11px;opacity:0.8">Saldo do mês</div>
              <div style="font-size:20px;font-weight:700">${cashFlow.netBalance >= 0 ? '+' : ''}${Engine.fmt(cashFlow.netBalance)}</div>
            </div>
            ${cashFlow.investmentIn > 0 || cashFlow.investmentOut > 0 ? `
            <div style="text-align:right">
              <div style="font-size:11px;opacity:0.8">Investimentos</div>
              <div style="font-size:14px;font-weight:600">
                ${Engine.fmt(Math.abs(cashFlow.investmentNet))}
                <span style="font-size:11px;font-weight:400;opacity:0.7">(${cashFlow.investmentNet > 0 ? 'lucro' : 'aplicado'})</span>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Insights -->
        <div class="section-head">
          <div class="section-title">Insights</div>
        </div>
        <div class="insights-wrap" id="insightsWrap">
          ${insights.map(i => `
            <div class="insight-card fade-in">
              <div class="insight-emoji">${i.emoji}</div>
              <div class="insight-text">${i.text}</div>
            </div>
          `).join('')}
        </div>

        <!-- Category donut -->
        <div class="section-head">
          <div class="section-title">Por categoria</div>
        </div>
        <div class="chart-wrap" style="display:flex;gap:16px;align-items:center">
          <div style="flex-shrink:0;width:130px;height:130px;position:relative">
            <canvas id="donutChart" style="max-height:130px"></canvas>
          </div>
          <div style="flex:1;min-width:0">
            ${renderCatLegend(stats.byCat, stats.total)}
          </div>
        </div>

        <!-- Category bars -->
        <div class="section-head" style="margin-top:4px">
          <div class="section-title">Detalhes</div>
        </div>
        <div class="chart-wrap">
          <div class="cat-bars">
            ${renderCatBars(stats.byCat, stats.total)}
          </div>
        </div>

        <!-- Monthly evolution -->
        ${evolution.length > 1 ? `
        <div class="section-head" style="margin-top:4px">
          <div class="section-title">Evolução mensal</div>
        </div>
        <div class="chart-wrap">
          <canvas id="lineChart"></canvas>
        </div>` : ''}

        <!-- Top merchants -->
        ${stats.topMerchants.length ? `
        <div class="section-head" style="margin-top:4px">
          <div class="section-title">Top estabelecimentos</div>
        </div>
        <div class="chart-wrap">
          <div class="merchant-list">
            ${stats.topMerchants.map(([name, amt], i) => {
              const cat = Categories.getCategoryColor(Categories.suggest(name));
              return `
              <div class="merchant-item">
                <span class="merchant-rank">${i+1}</span>
                <div class="merchant-avatar" style="background:${cat.bg}">${cat.emoji}</div>
                <div class="merchant-info">
                  <div class="merchant-name">${name}</div>
                  <div class="merchant-count">${((amt/stats.total)*100).toFixed(0)}% do total</div>
                </div>
                <div class="merchant-amt">${Engine.fmtShort(amt)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- Heatmap -->
        <div class="section-head" style="margin-top:4px">
          <div class="section-title">Calendário de gastos</div>
        </div>
        <div class="chart-wrap">
          ${renderHeatmap(stats.byDay, currentMonth)}
        </div>

        <!-- Recent transactions -->
        <div class="section-head" style="margin-top:4px">
          <div class="section-title">Recentes</div>
          <button class="section-link" onclick="App.navigate('transactions')">Ver todos</button>
        </div>
        <div class="tx-list stagger">
          ${stats.expenses.slice(0,5).map(t => Transactions.renderTxItem(t)).join('')}
        </div>
      </div>
    `;

    // Bind month nav
    document.getElementById('prevMonthBtn').onclick = () => {
      const idx = filteredMonths.indexOf(currentMonth);
      if (idx < filteredMonths.length - 1) { currentMonth = filteredMonths[idx+1]; render(container, txs, months); }
    };
    document.getElementById('nextMonthBtn').onclick = () => {
      const idx = filteredMonths.indexOf(currentMonth);
      if (idx > 0) { currentMonth = filteredMonths[idx-1]; render(container, txs, months); }
    };

    // Render charts
    setTimeout(() => {
      const catData = Object.entries(stats.byCat)
        .sort((a,b) => b[1]-a[1]).slice(0,8)
        .map(([label, value]) => ({ label, value }));
      if (catData.length) Charts.donut('donutChart', catData);

      if (evolution.length > 1) {
        Charts.line('lineChart', evolution.map(e => e.month), evolution.map(e => e.total));
      }
    }, 50);
  };

  const renderMetric = (label, value, emoji, bg, sub) => `
    <div class="metric-card">
      <div class="mc-icon" style="background:${bg}">${emoji}</div>
      <div class="mc-label">${label}</div>
      <div class="mc-value">${value}</div>
      ${sub ? `<div class="mc-sub">${sub}</div>` : ''}
    </div>`;

  const CAT_COLORS = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899','#6366F1','#94A3B8'];

  const renderCatLegend = (byCat, total) => {
    const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0,5);
    return sorted.map(([name, val], i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:10px;height:10px;border-radius:3px;background:${CAT_COLORS[i]};flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text2)">${name}</div>
        <div style="font-size:12px;font-weight:700">${((val/total)*100).toFixed(0)}%</div>
      </div>`).join('');
  };

  const renderCatBars = (byCat, total) => {
    const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
    return sorted.map(([name, val], i) => {
      const pct = total > 0 ? ((val/total)*100).toFixed(0) : 0;
      const cat = Categories.getCategoryColor(name);
      return `
        <div class="cat-bar-item">
          <div class="cat-bar-head">
            <div class="cat-bar-name">${cat.emoji} ${name}</div>
            <div class="cat-bar-amt">${Engine.fmtShort(val)}</div>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${pct}%;background:${cat.color}"></div>
          </div>
        </div>`;
    }).join('');
  };

  const renderHeatmap = (byDay, monthKey) => {
    const [y, m] = monthKey.split('-');
    const year = parseInt(y), month = parseInt(m) - 1;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const values = Object.values(byDay);
    const maxVal = values.length ? Math.max(...values) : 1;

    const dayNames = ['D','S','T','Q','Q','S','S'];
    let cells = `<div class="heatmap-label">${dayNames.map(d => `<span>${d}</span>`).join('')}</div>`;
    cells += '<div class="heatmap-grid">';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) cells += '<div class="heatmap-day"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(parseInt(m)).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const val = byDay[dateStr] || 0;
      const intensity = val > 0 ? 0.2 + (val / maxVal) * 0.8 : 0;
      const bg = val > 0 ? `rgba(37,99,235,${intensity.toFixed(2)})` : 'var(--surface2)';
      const color = intensity > 0.5 ? '#fff' : 'var(--text3)';
      const tip = val > 0 ? `${d}/${m}: ${Engine.fmt(val)}` : '';
      cells += `<div class="heatmap-day" style="background:${bg};color:${color}" ${tip ? `data-tip="${tip}"` : ''}>${d}</div>`;
    }
    cells += '</div>';
    return cells;
  };

  const _setTab = (tab) => {
    dashboardTab = tab;
    currentMonth = null; // Reset month when switching tabs
    const container = document.getElementById('view-dashboard');
    init(container);
  };

  return { init, _setTab };
})();
