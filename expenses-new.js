// ── Expenses View (Gastos, Contas, Faturas) ─────────────
const Expenses = (() => {
  let currentMonth = null;
  let activeTab = 'daily'; // daily, bills, cards

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
    const monthLabel = getMonthLabel(currentMonth);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Gastos</h1>
        <div class="month-selector">
          <button class="month-btn" onclick="Expenses.changeMonth(-1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="month-label">${monthLabel}</span>
          <button class="month-btn" onclick="Expenses.changeMonth(1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab ${activeTab === 'daily' ? 'active' : ''}" onclick="Expenses.setTab('daily')">Diário</button>
        <button class="tab ${activeTab === 'bills' ? 'active' : ''}" onclick="Expenses.setTab('bills')">Contas</button>
        <button class="tab ${activeTab === 'cards' ? 'active' : ''}" onclick="Expenses.setTab('cards')">Cartões</button>
      </div>

      <div class="tab-content">
        ${renderTabContent()}
      </div>

      <button class="fab" onclick="Expenses.openModal()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    `;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'daily':
        return renderDaily();
      case 'bills':
        return renderBills();
      case 'cards':
        return renderCards();
      default:
        return renderDaily();
    }
  };

  const renderDaily = () => {
    const expenses = Storage.getExpenses().filter(e => e.date.startsWith(currentMonth));
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by date
    const grouped = {};
    expenses.forEach(e => {
      if (!grouped[e.date]) grouped[e.date] = [];
      grouped[e.date].push(e);
    });

    // Sort dates (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

    return `
      <div class="tab-header">
        <div class="tab-total">Total: ${fmt(total)}</div>
      </div>
      <div class="expenses-list">
        ${sortedDates.length ? sortedDates.map(date => renderDateGroup(date, grouped[date])).join('') : renderEmpty('Nenhum gasto este mês')}
      </div>
    `;
  };

  const renderDateGroup = (date, expenses) => {
    const [y, m, d] = date.split('-');
    const dateLabel = `${d}/${m}`;
    const dayTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    return `
      <div class="date-group">
        <div class="date-header">
          <span class="date-label">${dateLabel}</span>
          <span class="date-total">${fmt(dayTotal)}</span>
        </div>
        <div class="date-expenses">
          ${expenses.map(e => renderExpense(e)).join('')}
        </div>
      </div>
    `;
  };

  const renderExpense = (expense) => {
    return `
      <div class="expense-item" onclick="Expenses.openModal(${expense.id})">
        <div class="expense-info">
          <div class="expense-category">${expense.category || 'Outros'}</div>
          <div class="expense-desc">${expense.description || ''}</div>
        </div>
        <div class="expense-amount">${fmt(expense.amount)}</div>
      </div>
    `;
  };

  const renderBills = () => {
    const bills = Storage.getBills();
    const pending = bills.filter(b => !b.paid);
    const paid = bills.filter(b => b.paid);
    const pendingTotal = pending.reduce((sum, b) => sum + b.amount, 0);

    return `
      <div class="tab-header">
        <div class="tab-total">Pendente: ${fmt(pendingTotal)}</div>
      </div>
      <div class="bills-list">
        ${pending.length ? pending.map(b => renderBill(b)).join('') : renderEmpty('Nenhuma conta pendente')}
        ${paid.length ? `<div class="bills-section"><h3 class="bills-section-title">Pagas</h3>${paid.map(b => renderBill(b)).join('')}</div>` : ''}
      </div>
    `;
  };

  const renderBill = (bill) => {
    const [y, m, d] = bill.dueDate.split('-');
    const dueLabel = `${d}/${m}`;

    return `
      <div class="bill-item" onclick="Expenses.openBillModal(${bill.id})">
        <div class="bill-info">
          <div class="bill-name">${bill.name}</div>
          <div class="bill-due">Vence: ${dueLabel}</div>
        </div>
        <div class="bill-actions">
          <div class="bill-amount">${fmt(bill.amount)}</div>
          <button class="bill-check ${bill.paid ? 'paid' : ''}" onclick="event.stopPropagation(); Expenses.toggleBill(${bill.id})">
            ${bill.paid ? '✓' : '○'}
          </button>
        </div>
      </div>
    `;
  };

  const renderCards = () => {
    const cards = Storage.getCards();

    return `
      <div class="cards-list">
        ${cards.length ? cards.map(c => renderCard(c)).join('') : renderEmpty('Nenhum cartão cadastrado')}
        <button class="add-card-btn" onclick="Expenses.openCardModal()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Adicionar cartão</span>
        </button>
      </div>
    `;
  };

  const renderCard = (card) => {
    const total = card.expenses.reduce((sum, e) => sum + e.amount, 0);

    return `
      <div class="card-item" onclick="Expenses.openCardModal(${card.id})">
        <div class="card-info">
          <div class="card-name">${card.name}</div>
          <div class="card-limit">Limite: ${fmt(card.limit)}</div>
        </div>
        <div class="card-balance">
          <div class="card-balance-label">Fatura atual</div>
          <div class="card-balance-value">${fmt(total)}</div>
        </div>
      </div>
    `;
  };

  const renderEmpty = (message) => {
    return `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-title">${message}</div>
      </div>
    `;
  };

  const setTab = (tab) => {
    activeTab = tab;
    render(document.getElementById('view-expenses'));
  };

  const changeMonth = (delta) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    render(document.getElementById('view-expenses'));
  };

  const openModal = (id = null) => {
    const expenses = Storage.getExpenses();
    const expense = id ? expenses.find(e => e.id === id) : null;
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${expense ? 'Editar gasto' : 'Novo gasto'}</h2>
        <button class="modal-close" onclick="App.closeModal()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" type="date" id="expenseDate" value="${expense ? expense.date : today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Valor</label>
          <input class="form-input" type="number" id="expenseAmount" value="${expense ? expense.amount : ''}" placeholder="0.00" step="0.01" inputmode="decimal" />
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <input class="form-input" type="text" id="expenseCategory" value="${expense ? (expense.category || '') : ''}" placeholder="Ex: Alimentação" />
        </div>
        <div class="form-group">
          <label class="form-label">Descrição (opcional)</label>
          <input class="form-input" type="text" id="expenseDesc" value="${expense ? (expense.description || '') : ''}" placeholder="Ex: Lanche" />
        </div>
        ${expense ? `<button class="btn btn-danger btn-full" onclick="Expenses.deleteExpense(${expense.id})">Excluir</button>` : ''}
        <button class="btn btn-primary btn-full" onclick="Expenses.saveExpense(${expense ? expense.id : null})">Salvar</button>
      </div>
    `);
  };

  const saveExpense = (id = null) => {
    const date = document.getElementById('expenseDate').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const category = document.getElementById('expenseCategory').value.trim();
    const description = document.getElementById('expenseDesc').value.trim();

    if (!date) {
      App.toast('Informe a data', 'error');
      return;
    }

    if (amount <= 0) {
      App.toast('Informe um valor válido', 'error');
      return;
    }

    if (id) {
      Storage.updateExpense(id, { date, amount, category, description });
    } else {
      Storage.addExpense(date, amount, category, description);
    }

    App.closeModal();
    App.toast('Gasto salvo', 'success');
    render(document.getElementById('view-expenses'));
  };

  const deleteExpense = (id) => {
    if (!confirm('Excluir este gasto?')) return;
    Storage.deleteExpense(id);
    App.closeModal();
    App.toast('Gasto excluído');
    render(document.getElementById('view-expenses'));
  };

  const openBillModal = (id = null) => {
    const bills = Storage.getBills();
    const bill = id ? bills.find(b => b.id === id) : null;
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${bill ? 'Editar conta' : 'Nova conta'}</h2>
        <button class="modal-close" onclick="App.closeModal()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input class="form-input" type="text" id="billName" value="${bill ? bill.name : ''}" placeholder="Ex: Luz" />
        </div>
        <div class="form-group">
          <label class="form-label">Valor</label>
          <input class="form-input" type="number" id="billAmount" value="${bill ? bill.amount : ''}" placeholder="0.00" step="0.01" inputmode="decimal" />
        </div>
        <div class="form-group">
          <label class="form-label">Vencimento</label>
          <input class="form-input" type="date" id="billDue" value="${bill ? bill.dueDate : today}" />
        </div>
        ${bill ? `<button class="btn btn-danger btn-full" onclick="Expenses.deleteBill(${bill.id})">Excluir</button>` : ''}
        <button class="btn btn-primary btn-full" onclick="Expenses.saveBill(${bill ? bill.id : null})">Salvar</button>
      </div>
    `);
  };

  const saveBill = (id = null) => {
    const name = document.getElementById('billName').value.trim();
    const amount = parseFloat(document.getElementById('billAmount').value) || 0;
    const dueDate = document.getElementById('billDue').value;

    if (!name) {
      App.toast('Informe o nome', 'error');
      return;
    }

    if (amount <= 0) {
      App.toast('Informe um valor válido', 'error');
      return;
    }

    if (!dueDate) {
      App.toast('Informe o vencimento', 'error');
      return;
    }

    if (id) {
      Storage.updateBill(id, { name, amount, dueDate });
    } else {
      Storage.addBill(name, amount, dueDate);
    }

    App.closeModal();
    App.toast('Conta salva', 'success');
    render(document.getElementById('view-expenses'));
  };

  const deleteBill = (id) => {
    if (!confirm('Excluir esta conta?')) return;
    Storage.deleteBill(id);
    App.closeModal();
    App.toast('Conta excluída');
    render(document.getElementById('view-expenses'));
  };

  const toggleBill = (id) => {
    const bills = Storage.getBills();
    const bill = bills.find(b => b.id === id);
    if (bill) {
      Storage.updateBill(id, { paid: !bill.paid });
      render(document.getElementById('view-expenses'));
    }
  };

  const openCardModal = (id = null) => {
    const cards = Storage.getCards();
    const card = id ? cards.find(c => c.id === id) : null;

    App.openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${card ? 'Editar cartão' : 'Novo cartão'}</h2>
        <button class="modal-close" onclick="App.closeModal()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input class="form-input" type="text" id="cardName" value="${card ? card.name : ''}" placeholder="Ex: Nubank" />
        </div>
        <div class="form-group">
          <label class="form-label">Limite</label>
          <input class="form-input" type="number" id="cardLimit" value="${card ? card.limit : ''}" placeholder="0.00" step="0.01" inputmode="decimal" />
        </div>
        <div class="form-group">
          <label class="form-label">Dia do vencimento</label>
          <input class="form-input" type="number" id="cardDue" value="${card ? card.dueDay : ''}" placeholder="10" min="1" max="31" />
        </div>
        ${card ? `<button class="btn btn-danger btn-full" onclick="Expenses.deleteCard(${card.id})">Excluir cartão</button>` : ''}
        <button class="btn btn-primary btn-full" onclick="Expenses.saveCard(${card ? card.id : null})">Salvar</button>
      </div>
    `);
  };

  const saveCard = (id = null) => {
    const name = document.getElementById('cardName').value.trim();
    const limit = parseFloat(document.getElementById('cardLimit').value) || 0;
    const dueDay = parseInt(document.getElementById('cardDue').value) || 10;

    if (!name) {
      App.toast('Informe o nome', 'error');
      return;
    }

    if (limit <= 0) {
      App.toast('Informe um limite válido', 'error');
      return;
    }

    if (id) {
      Storage.updateCard(id, { name, limit, dueDay });
    } else {
      Storage.addCard(name, limit, dueDay);
    }

    App.closeModal();
    App.toast('Cartão salvo', 'success');
    render(document.getElementById('view-expenses'));
  };

  const deleteCard = (id) => {
    if (!confirm('Excluir este cartão?')) return;
    Storage.deleteCard(id);
    App.closeModal();
    App.toast('Cartão excluído');
    render(document.getElementById('view-expenses'));
  };

  return { 
    init, 
    setTab, 
    changeMonth, 
    openModal, 
    saveExpense, 
    deleteExpense,
    openBillModal,
    saveBill,
    deleteBill,
    toggleBill,
    openCardModal,
    saveCard,
    deleteCard,
  };
})();
