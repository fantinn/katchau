// ── Dashboard View ─────────────────────────────────────
const Dashboard = (() => {
  let currentMonth = null;

  const fmt = (n) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  const getCurrentMonth = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthLabel = (key) => {
    const [y, m] = key.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  const init = (container) => {
    if (!currentMonth) currentMonth = getCurrentMonth();
    render(container);
  };

  const render = (container) => {
    const summary = Storage.getSummary(currentMonth);
    const monthLabel = getMonthLabel(currentMonth);

    container.innerHTML = `
      <div class="dashboard-header">
        <h1 class="dashboard-title">Resumo</h1>
        <div class="month-selector">
          <button class="month-btn" onclick="Dashboard.changeMonth(-1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="month-label">${monthLabel}</span>
          <button class="month-btn" onclick="Dashboard.changeMonth(1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div class="balance-card">
        <div class="balance-label">Saldo do mês</div>
        <div class="balance-value ${summary.balance >= 0 ? 'positive' : 'negative'}">${fmt(summary.balance)}</div>
        <div class="balance-details">
          <div class="balance-detail">
            <span class="detail-label">Ganhos</span>
            <span class="detail-value income">${fmt(summary.totalIncome)}</span>
          </div>
          <div class="balance-detail">
            <span class="detail-label">Gastos</span>
            <span class="detail-value expense">${fmt(summary.totalExpenses)}</span>
          </div>
        </div>
      </div>

      <div class="cards-grid">
        <div class="info-card">
          <div class="info-icon">📋</div>
          <div class="info-content">
            <div class="info-label">Contas pendentes</div>
            <div class="info-value">${fmt(summary.pendingBills)}</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon">💳</div>
          <div class="info-content">
            <div class="info-label">Fatura cartão</div>
            <div class="info-value">${fmt(summary.cardTotal)}</div>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <button class="action-btn income" onclick="App.navigate('income')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Adicionar ganho</span>
        </button>
        <button class="action-btn expense" onclick="App.navigate('expenses')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <span>Adicionar gasto</span>
        </button>
      </div>

      <div class="recent-section">
        <h2 class="section-title">Últimos 7 dias</h2>
        <div class="recent-list">
          ${renderRecentDays()}
        </div>
      </div>
    `;
  };

  const renderRecentDays = () => {
    const daily = Storage.getDaily();
    const expenses = Storage.getExpenses();
    
    // Get last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push(dateStr);
    }

    return days.map(date => {
      const dayIncome = daily.filter(d => d.date === date).reduce((sum, d) => sum + d.amount, 0);
      const dayExpenses = expenses.filter(e => e.date === date).reduce((sum, e) => sum + e.amount, 0);
      const dayBalance = dayIncome - dayExpenses;

      const [y, m, d] = date.split('-');
      const dateLabel = `${d}/${m}`;
      const dayName = new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' });

      return `
        <div class="day-row">
          <div class="day-date">
            <span class="day-name">${dayName}</span>
            <span class="day-number">${dateLabel}</span>
          </div>
          <div class="day-values">
            <span class="day-income ${dayIncome > 0 ? '' : 'zero'}">${dayIncome > 0 ? fmt(dayIncome) : '-'}</span>
            <span class="day-expense ${dayExpenses > 0 ? '' : 'zero'}">${dayExpenses > 0 ? fmt(dayExpenses) : '-'}</span>
            <span class="day-balance ${dayBalance >= 0 ? 'positive' : 'negative'}">${fmt(dayBalance)}</span>
          </div>
        </div>
      `;
    }).join('');
  };

  const changeMonth = (delta) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    render(document.getElementById('view-dashboard'));
  };

  return { init, changeMonth };
})();
