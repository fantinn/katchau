// ── Income View ───────────────────────────────────────
const Income = (() => {
  let currentMonth = null;

  const parseMoney = (value) => {
    const normalized = String(value || '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(normalized);
    return Number.isFinite(amount) ? amount : 0;
  };

  const getDefaultMonth = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const calc = () => {
    const income = Storage.getIncome() || { sources: [] };
    const sources = income.sources || [];
    
    // Filter by current month if source has a date
    const monthSources = sources.filter(s => {
      if (!s.date) return true; // Include sources without date (legacy)
      const sourceMonth = s.date.substring(0, 7);
      return sourceMonth === currentMonth;
    });
    
    const total = monthSources.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const allTimeTotal = sources.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    
    return { income, sources, monthSources, total, allTimeTotal };
  };

  const init = (container) => {
    if (!currentMonth) currentMonth = getDefaultMonth();
    render(container);
  };

  const render = (container) => {
    const data = calc();
    const monthLabel = Engine.getMonthLabel(currentMonth);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Ganhos</div>
          <div class="page-subtitle">Renda extra e entradas adicionais</div>
        </div>
      </div>

      <div class="month-picker">
        <button class="month-btn" id="incomePrevMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="month-label">${monthLabel}</div>
        <button class="month-btn" id="incomeNextMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div class="income-hero">
        <div class="income-hero-label">Total do mês</div>
        <div class="income-hero-value">${Engine.fmt(data.total)}</div>
        <div class="income-hero-sub">${data.monthSources.length} entrada(s) · Total geral: ${Engine.fmt(data.allTimeTotal)}</div>
      </div>

      <div class="income-actions">
        <button class="btn btn-primary btn-full" onclick="Income._openSourceModal()">Novo ganho</button>
      </div>

      <div class="section-head">
        <div class="section-title">Entradas deste mês</div>
      </div>
      <div class="income-list">
        ${renderSources(data.monthSources)}
      </div>
    `;

    document.getElementById('incomePrevMonth').onclick = () => shiftMonth(-1);
    document.getElementById('incomeNextMonth').onclick = () => shiftMonth(1);
  };

  const renderSources = (sources) => {
    if (!sources.length) {
      return `<div class="empty-state income-empty"><div class="empty-icon">💰</div><div class="empty-title">Nenhuma entrada neste mês</div><div class="empty-sub">Adicione freelances, vendas, bônus e outras rendas extras.</div></div>`;
    }

    // Sort by date (newest first)
    const sorted = [...sources].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });

    return sorted.map(source => `
      <div class="income-source" onclick="Income._openSourceModal('${source.id}')">
        <div class="income-icon">💰</div>
        <div class="income-source-main">
          <div class="income-source-name">${source.name || 'Entrada'}</div>
          <div class="income-source-meta">${source.category || 'Renda extra'}</div>
          <div class="income-source-date">${source.date ? formatDate(source.date) : ''}</div>
        </div>
        <div class="income-source-amount">${Engine.fmt(Number(source.amount || 0))}</div>
      </div>
    `).join('');
  };

  const shiftMonth = (delta) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    render(document.getElementById('view-income'));
  };

  const _openSourceModal = (id = null) => {
    const income = Storage.getIncome() || { sources: [] };
    const source = id ? income.sources.find(s => s.id === id) : null;
    
    // Default date to current month if new entry
    const defaultDate = source?.date || `${currentMonth}-${String(new Date().getDate()).padStart(2, '0')}`;
    
    App.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">${source ? 'Editar ganho' : 'Novo ganho'}</div>
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input class="form-input" id="incomeSourceName" value="${source ? source.name : ''}" placeholder="Ex: Freelance, Venda, Bônus" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor</label>
        <input class="form-input" id="incomeSourceAmount" inputmode="decimal" value="${source ? source.amount : ''}" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label class="form-label">Data</label>
        <input class="form-input" id="incomeSourceDate" type="date" value="${defaultDate}" />
      </div>
      <div class="form-group">
        <label class="form-label">Categoria (opcional)</label>
        <input class="form-input" id="incomeSourceCategory" value="${source ? (source.category || '') : ''}" placeholder="Ex: Freelance, Venda, Bônus" />
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        ${source ? `<button class="btn btn-danger btn-sm" onclick="Income._deleteSource('${source.id}')">Excluir</button>` : ''}
        <button class="btn btn-primary" style="flex:1" onclick="Income._saveSource(${source ? `'${source.id}'` : ''})">Salvar</button>
      </div>
    `);
  };

  const _saveSource = (id = null) => {
    const name = document.getElementById('incomeSourceName').value.trim() || 'Entrada';
    const amount = parseMoney(document.getElementById('incomeSourceAmount').value);
    const date = document.getElementById('incomeSourceDate').value;
    const category = document.getElementById('incomeSourceCategory').value.trim();

    if (amount <= 0) {
      App.toast('Informe um valor válido', 'error');
      return;
    }

    if (!date) {
      App.toast('Informe a data', 'error');
      return;
    }

    const payload = { name, amount, date, category };
    if (id) Storage.updateIncomeSource(id, payload);
    else Storage.addIncomeSource(payload);

    App.closeModal();
    App.toast('Ganho salvo', 'success');
    render(document.getElementById('view-income'));
  };

  const _deleteSource = (id) => {
    if (!confirm('Excluir este ganho?')) return;
    Storage.deleteIncomeSource(id);
    App.closeModal();
    App.toast('Ganho excluído');
    render(document.getElementById('view-income'));
  };

  return { init, _openSourceModal, _saveSource, _deleteSource };
})();
