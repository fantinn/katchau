// ── Daily Transactions Component ─────────────────────
// Gastos e ganhos diários separados das transações principais
const Daily = (() => {
  let allTxs = [];

  const init = (container) => {
    allTxs = Storage.getDailyTransactions();
    render(container);
  };

  const render = (container) => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = allTxs.filter(t => t.date === today);
    const totalExpense = todayTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = todayTxs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Diário</div>
          <div class="page-subtitle">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button onclick="Daily._showAddModal()" style="padding:12px;border-radius:12px;background:var(--primary);color:#fff">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="summary-card" style="background:rgba(239,68,68,.1)">
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Gastos hoje</div>
          <div style="font-size:24px;font-weight:700;color:var(--red)">${Engine.fmt(Math.abs(totalExpense))}</div>
        </div>
        <div class="summary-card" style="background:rgba(34,197,94,.1)">
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Ganhos hoje</div>
          <div style="font-size:24px;font-weight:700;color:var(--green)">${Engine.fmt(totalIncome)}</div>
        </div>
      </div>

      <!-- Today's transactions -->
      <div style="font-size:14px;font-weight:600;margin-bottom:12px">Hoje</div>
      <div class="tx-list">
        ${todayTxs.length ? todayTxs.map(t => renderTxItem(t)).join('') : '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">Nenhum registro hoje</div><div class="empty-sub">Adicione gastos ou ganhos do dia.</div></div>'}
      </div>

      <!-- Previous days -->
      ${renderPreviousDays()}
    `;

    container.addEventListener('click', (e) => {
      const item = e.target.closest('.tx-item');
      if (!item) return;
      const id = item.dataset.id;
      openEditModal(id);
    });
  };

  const renderPreviousDays = () => {
    const today = new Date().toISOString().split('T')[0];
    const previousTxs = allTxs.filter(t => t.date !== today);
    
    if (!previousTxs.length) return '';

    const groups = {};
    previousTxs.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([date, txs]) => `
      <div style="font-size:14px;font-weight:600;margin:20px 0 12px">${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long' })}</div>
      <div class="tx-list">
        ${txs.map(t => renderTxItem(t)).join('')}
      </div>
    `).join('');
  };

  const renderTxItem = (t) => {
    const cat = Categories.getCategoryColor(t.category || 'Outros');
    const amtClass = t.amount < 0 ? 'negative' : 'positive';
    const amtStr = t.amount < 0 ? `- ${Engine.fmt(Math.abs(t.amount))}` : `+ ${Engine.fmt(t.amount)}`;
    const dateStr = new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });

    return `
      <div class="tx-item" data-id="${t.id}">
        <div class="tx-icon" style="background:${cat.bg}">${cat.emoji}</div>
        <div class="tx-info">
          <div class="tx-desc">${t.description}</div>
          <div class="tx-meta">${dateStr}</div>
          <span class="tx-cat-badge" style="background:${cat.bg};color:${cat.color}">${t.category || 'Outros'}</span>
        </div>
        <div class="tx-amount ${amtClass}">${amtStr}</div>
      </div>`;
  };

  const _showAddModal = () => {
    const cats = Categories.getAll();
    const html = `
      <div class="modal-handle"></div>
      <div class="modal-title">Adicionar registro diário</div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input class="form-input" id="dailyDesc" placeholder="Ex: Café, Almoço, Salário" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor</label>
        <input class="form-input" id="dailyAmount" type="number" step="0.01" placeholder="0.00" />
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" id="btnExpense" onclick="Daily._setType('expense')" style="flex:1">Gasto</button>
          <button class="btn btn-secondary" id="btnIncome" onclick="Daily._setType('income')" style="flex:1">Ganho</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-input" id="dailyCat">
          ${cats.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-full" onclick="Daily._save()">Salvar</button>
    `;
    App.openModal(html);
    Daily._setType('expense');
  };

  let txType = 'expense';

  const _setType = (type) => {
    txType = type;
    document.getElementById('btnExpense').style.background = type === 'expense' ? 'var(--primary)' : 'var(--surface2)';
    document.getElementById('btnExpense').style.color = type === 'expense' ? '#fff' : 'var(--text2)';
    document.getElementById('btnIncome').style.background = type === 'income' ? 'var(--primary)' : 'var(--surface2)';
    document.getElementById('btnIncome').style.color = type === 'income' ? '#fff' : 'var(--text2)';
  };

  const _save = () => {
    const desc = document.getElementById('dailyDesc').value.trim();
    const amount = parseFloat(document.getElementById('dailyAmount').value);
    const cat = document.getElementById('dailyCat').value;

    if (!desc || !amount) {
      App.toast('Preencha todos os campos', 'error');
      return;
    }

    const finalAmount = txType === 'expense' ? -Math.abs(amount) : Math.abs(amount);

    Storage.addDailyTransaction({
      description: desc,
      amount: finalAmount,
      category: cat,
      type: txType
    });

    App.closeModal();
    App.toast('Registro adicionado!', 'success');
    allTxs = Storage.getDailyTransactions();
    const container = document.getElementById('view-daily');
    render(container);
  };

  const openEditModal = (id) => {
    const t = allTxs.find(x => x.id === id);
    if (!t) return;
    const cats = Categories.getAll();
    const html = `
      <div class="modal-handle"></div>
      <div class="modal-title">Editar registro</div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input class="form-input" id="editDailyDesc" value="${t.description}" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor</label>
        <input class="form-input" id="editDailyAmount" type="number" step="0.01" value="${Math.abs(t.amount)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-input" id="editDailyCat">
          ${cats.map(c => `<option value="${c.name}" ${c.name === t.category ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-danger btn-sm" onclick="Daily._deleteOne('${id}')">Excluir</button>
        <button class="btn btn-primary" style="flex:1" onclick="Daily._saveEdit('${id}')">Salvar</button>
      </div>
    `;
    App.openModal(html);
  };

  const _saveEdit = (id) => {
    const desc = document.getElementById('editDailyDesc').value.trim();
    const amount = parseFloat(document.getElementById('editDailyAmount').value);
    const cat = document.getElementById('editDailyCat').value;

    if (!desc || !amount) {
      App.toast('Preencha todos os campos', 'error');
      return;
    }

    const t = allTxs.find(x => x.id === id);
    const finalAmount = t.amount < 0 ? -Math.abs(amount) : Math.abs(amount);

    Storage.updateDailyTransaction(id, { description: desc, amount: finalAmount, category: cat });
    App.closeModal();
    App.toast('Salvo!', 'success');
    allTxs = Storage.getDailyTransactions();
    const container = document.getElementById('view-daily');
    render(container);
  };

  const _deleteOne = (id) => {
    if (!confirm('Excluir este registro?')) return;
    Storage.deleteDailyTransaction(id);
    App.closeModal();
    App.toast('Excluído');
    allTxs = Storage.getDailyTransactions();
    const container = document.getElementById('view-daily');
    render(container);
  };

  return { init, _showAddModal, _setType, _save, _saveEdit, _deleteOne };
})();
