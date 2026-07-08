// ── Income View (Ganhos por dia) ───────────────────────
const Income = (() => {
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
    const daily = Storage.getDaily().filter(d => d.date.startsWith(currentMonth));
    const total = daily.reduce((sum, d) => sum + d.amount, 0);
    const monthLabel = getMonthLabel(currentMonth);

    // Sort by date (newest first)
    const sorted = [...daily].sort((a, b) => new Date(b.date)
 - new Date(a.date));

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Ganhos</h1>
        <div class="month-selector">
          <button class="month-btn" onclick="Income.changeMonth(-1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="month-label">${monthLabel}</span>
          <button class="month-btn" onclick="Income.changeMonth(1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div class="total-card">
        <div class="total-label">Total do mês</div>
        <div class="total-value">${fmt(total)}</div>
        <div class="total-sub">${daily.length} dia(s) com ganhos</div>
      </div>

      <button class="fab" onclick="Income.openModal()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      <div class="income-list">
        ${sorted.length ? sorted.map(day => renderDay(day)).join('') : renderEmpty()}
      </div>
    `;
  };

  const renderDay = (day) => {
    const [y, m, d] = day.date.split('-');
    const dateLabel = `${d}/${m}`;
    const dayName = new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'long' });

    return `
      <div class="income-day" onclick="Income.openModal(${day.id})">
        <div class="day-header">
          <div class="day-info">
            <span class="day-name">${dayName}</span>
            <span class="day-date">${dateLabel}</span>
          </div>
          <div class="day-amount">${fmt(day.amount)}</div>
        </div>
        ${day.notes ? `<div class="day-notes">${day.notes}</div>` : ''}
      </div>
    `;
  };

  const renderEmpty = () => {
    return `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <div class="empty-title">Nenhum ganho este mês</div>
        <div class="empty-sub">Toque no + para adicionar seus ganhos</div>
      </div>
    `;
  };

  const changeMonth = (delta) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    render(document.getElementById('view-income'));
  };

  const openModal = (id = null) => {
    const daily = Storage.getDaily();
    const day = id ? daily.find(d => d.id === id) : null;
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${day ? 'Editar ganho' : 'Novo ganho'}</h2>
        <button class="modal-close" onclick="App.closeModal()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" type="date" id="incomeDate" value="${day ? day.date : today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Valor</label>
          <input class="form-input" type="number" id="incomeAmount" value="${day ? day.amount : ''}" placeholder="0.00" step="0.01" inputmode="decimal" />
        </div>
        <div class="form-group">
          <label class="form-label">Observações (opcional)</label>
          <input class="form-input" type="text" id="incomeNotes" value="${day ? (day.notes || '') : ''}" placeholder="Ex: Entregas iFood" />
        </div>
        ${day ? `<button class="btn btn-danger btn-full" onclick="Income.deleteDaily(${day.id})">Excluir</button>` : ''}
        <button class="btn btn-primary btn-full" onclick="Income.save(${day ? day.id : null})">Salvar</button>
      </div>
    `);
  };

  const save = (id = null) => {
    const date = document.getElementById('incomeDate').value;
    const amount = parseFloat(document.getElementById('incomeAmount').value) || 0;
    const notes = document.getElementById('incomeNotes').value.trim();

    if (!date) {
      App.toast('Informe a data', 'error');
      return;
    }

    if (amount <= 0) {
      App.toast('Informe um valor válido', 'error');
      return;
    }

    if (id) {
      Storage.updateDaily(id, { date, amount, notes });
    } else {
      Storage.addDaily(date, amount, notes);
    }

    App.closeModal();
    App.toast('Ganho salvo', 'success');
    render(document.getElementById('view-income'));
  };

  const deleteDaily = (id) => {
    if (!confirm('Excluir este ganho?')) return;
    Storage.deleteDaily(id);
    App.closeModal();
    App.toast('Ganho excluído');
    render(document.getElementById('view-income'));
  };

  return { init, changeMonth, openModal, save, deleteDaily };
})();
