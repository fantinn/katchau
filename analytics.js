// ── Analytics Component ────────────────────────────
const Analytics = (() => {
  let tab = 'trends';

  const init = (container) => {
    render(container);
  };

  const render = (container) => {
    const txs = Storage.getTransactions();
    const evolution = Engine.getMonthlyEvolution(txs);
    const months = Engine.getAvailableMonths(txs);

    container.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Análise</div></div>
      </div>
      <div class="analytics-tabs">
        <div class="analytics-tab ${tab==='trends'?'active':''}" onclick="Analytics._setTab('trends')">Evolução</div>
        <div class="analytics-tab ${tab==='cats'?'active':''}" onclick="Analytics._setTab('cats')">Categorias</div>
        <div class="analytics-tab ${tab==='dow'?'active':''}" onclick="Analytics._setTab('dow')">Dias</div>
      </div>
      <div id="analyticsContent">
        ${!txs.length ? '<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-title">Sem dados</div><div class="empty-sub">Importe um CSV para ver análises.</div></div>' : renderTab(txs, evolution, months)}
      </div>
    `;

    if (txs.length) setTimeout(() => drawCharts(txs, evolution, months), 50);
  };

  const renderTab = (txs, evolution, months) => {
    if (tab === 'trends') return `
      <div class="section-head"><div class="section-title">Gastos mensais</div></div>
      <div class="chart-wrap"><canvas id="aLineChart"></canvas></div>
      <div class="section-head" style="margin-top:4px"><div class="section-title">Comparativo</div></div>
      <div class="chart-wrap">
        ${evolution.map((e, i) => {
          const prev = evolution[i - 1];
          const diff = prev ? ((e.total - prev.total) / prev.total * 100).toFixed(0) : null;
          return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-light)">
            <div style="width:60px;font-size:12px;color:var(--text2)">${e.month}</div>
            <div style="flex:1;height:6px;background:var(--surface2);border-radius:99px;overflow:hidden">
              <div style="height:100%;background:var(--blue);width:${evolution.length ? (e.total/Math.max(...evolution.map(x=>x.total))*100).toFixed(0) : 0}%;border-radius:99px"></div>
            </div>
            <div style="width:70px;text-align:right;font-size:13px;font-weight:700">${Engine.fmtShort(e.total)}</div>
            ${diff !== null ? `<span class="compare-badge ${diff>0?'up':diff<0?'down':'neutral'}">${diff>0?'+':''}${diff}%</span>` : '<span style="width:40px"></span>'}
          </div>`;
        }).reverse().join('')}
      </div>`;

    if (tab === 'cats') {
      const allStats = months.slice(0,3).map(m => Engine.computeStats(txs, m));
      const merged = {};
      allStats.forEach(s => Object.entries(s.byCat).forEach(([k,v]) => { merged[k] = (merged[k]||0)+v; }));
      const sorted = Object.entries(merged).sort((a,b)=>b[1]-a[1]);
      const total = sorted.reduce((s,[,v])=>s+v,0);
      return `
        <div class="section-head"><div class="section-title">Últimos 3 meses</div></div>
        <div class="chart-wrap"><canvas id="aCatChart" style="max-height:260px"></canvas></div>
        <div class="chart-wrap" style="margin-top:12px">
          <div class="cat-bars">
            ${sorted.map(([name,val]) => {
              const c = Categories.getCategoryColor(name);
              const pct = total > 0 ? ((val/total)*100).toFixed(0) : 0;
              return `<div class="cat-bar-item">
                <div class="cat-bar-head"><div class="cat-bar-name">${c.emoji} ${name}</div><div class="cat-bar-amt">${Engine.fmtShort(val)}</div></div>
                <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    if (tab === 'dow') {
      const stats = months.length ? Engine.computeStats(txs, months[0]) : null;
      if (!stats) return '';
      return `
        <div class="section-head"><div class="section-title">Gastos por dia da semana</div></div>
        <div class="chart-wrap"><canvas id="aDowChart"></canvas></div>
        <div class="chart-wrap" style="margin-top:12px">
          ${stats.dowLabels.map((d,i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-light)">
              <div style="width:32px;font-size:12px;color:var(--text2)">${d}</div>
              <div style="flex:1;height:6px;background:var(--surface2);border-radius:99px;overflow:hidden">
                <div style="height:100%;background:${i===stats.topDow?'var(--blue)':'rgba(37,99,235,.3)'};width:${stats.byDow[i]?((stats.byDow[i]/Math.max(...stats.byDow))*100).toFixed(0):0}%;border-radius:99px"></div>
              </div>
              <div style="width:70px;text-align:right;font-size:13px;font-weight:700">${Engine.fmtShort(stats.byDow[i])}</div>
            </div>`).join('')}
        </div>`;
    }
    return '';
  };

  const drawCharts = (txs, evolution, months) => {
    if (tab === 'trends' && evolution.length > 1) {
      Charts.line('aLineChart', evolution.map(e=>e.month), evolution.map(e=>e.total));
    }
    if (tab === 'cats') {
      const allStats = months.slice(0,3).map(m => Engine.computeStats(txs, m));
      const merged = {};
      allStats.forEach(s => Object.entries(s.byCat).forEach(([k,v]) => { merged[k]=(merged[k]||0)+v; }));
      const sorted = Object.entries(merged).sort((a,b)=>b[1]-a[1]).slice(0,8);
      if (sorted.length) Charts.donut('aCatChart', sorted.map(([label,value])=>({label,value})));
    }
    if (tab === 'dow' && months.length) {
      const stats = Engine.computeStats(txs, months[0]);
      Charts.dow('aDowChart', stats.dowLabels, stats.byDow);
    }
  };

  const _setTab = (t) => { tab = t; const c = document.getElementById('view-analytics'); render(c); };

  return { init, _setTab };
})();
