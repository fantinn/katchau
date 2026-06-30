const Budget = (() => {
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

  const getCreditTotal = (monthKey) => {
    return Storage.getTransactions()
      .filter(t => (t.source || 'credit') === 'credit' && t.amount < 0 && Engine.getMonthKey(t.date) === monthKey)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getAccountManualTotal = (monthKey) => {
    return Storage.getTransactions()
      .filter(t => t.source === 'account' && !t.imported && t.amount < 0 && Engine.getMonthKey(t.date) === monthKey)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const calc = () => {
    const budget = Storage.getBudget();
    const expenses = budget.expenses || [];
    const fixedTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const creditTotal = getCreditTotal(currentMonth);
    const manualAccountTotal = getAccountManualTotal(currentMonth);
    const salary = Number(budget.salary || 0);
    const committed = fixedTotal + creditTotal + manualAccountTotal;
    const left = salary - committed;
    return { budget, expenses, fixedTotal, creditTotal, manualAccountTotal, salary, committed, left };
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
          <div class="page-title">Conta</div>
          <div class="page-subtitle">Salario, contas e sobra do mes</div>
        </div>
      </div>

      <div class="month-picker">
        <button class="month-btn" id="budgetPrevMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="month-label">${monthLabel}</div>
        <button class="month-btn" id="budgetNextMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div class="budget-hero ${data.left < 0 ? 'negative' : ''}">
        <div class="budget-hero-label">Sobra estimada</div>
        <div class="budget-hero-value">${Engine.fmt(data.left)}</div>
        <div class="budget-hero-sub">${Engine.fmt(data.salary)} salario - ${Engine.fmt(data.committed)} compromissos</div>
      </div>

      <div class="budget-grid">
        <div class="budget-card">
          <div class="budget-card-label">Salario</div>
          <div class="budget-card-value">${Engine.fmt(data.salary)}</div>
          <div class="budget-card-sub">Dia ${data.budget.salaryDay || 5}</div>
        </div>
        <div class="budget-card">
          <div class="budget-card-label">Cartao</div>
          <div class="budget-card-value">${Engine.fmt(data.creditTotal)}</div>
          <div class="budget-card-sub">Fatura do mes</div>
        </div>
        <div class="budget-card">
          <div class="budget-card-label">Contas</div>
          <div class="budget-card-value">${Engine.fmt(data.fixedTotal)}</div>
          <div class="budget-card-sub">${data.expenses.length} cadastradas</div>
        </div>
        <div class="budget-card">
          <div class="budget-card-label">Gastos conta</div>
          <div class="budget-card-value">${Engine.fmt(data.manualAccountTotal)}</div>
          <div class="budget-card-sub">Debito, Pix, dinheiro</div>
        </div>
      </div>

      <div class="budget-actions">
        <button class="btn btn-primary btn-full" onclick="Budget._openSalaryModal()">Editar salario</button>
        <button class="btn btn-secondary btn-full" onclick="Budget._openExpenseModal()">Nova despesa</button>
      </div>

      <div class="section-head">
        <div class="section-title">Proximos pagamentos</div>
      </div>
      <div class="budget-list">
        ${renderExpenses(data.expenses)}
      </div>
    `;

    document.getElementById('budgetPrevMonth').onclick = () => shiftMonth(-1);
    document.getElementById('budgetNextMonth').onclick = () => shiftMonth(1);
  };

  const renderExpenses = (expenses) => {
    if (!expenses.length) {
      return `<div class="empty-state budget-empty"><div class="empty-title">Nenhuma despesa cadastrada</div><div class="empty-sub">Adicione aluguel, internet, academia, financiamento e outras contas fora do cartao.</div></div>`;
    }

    return [...expenses].sort((a, b) => Number(a.dueDay || 31) - Number(b.dueDay || 31)).map(expense => `
      <div class="budget-expense" onclick="Budget._openExpenseModal('${expense.id}')">
        <div class="budget-date">Dia ${String(expense.dueDay || 1).padStart(2, '0')}</div>
        <div class="budget-expense-main">
          <div class="budget-expense-name">${expense.name || 'Despesa'}</div>
          <div class="budget-expense-meta">${expense.category || 'Conta fixa'}</div>
        </div>
        <div class="budget-expense-amount">${Engine.fmt(Number(expense.amount || 0))}</div>
      </div>
    `).join('');
  };

  const shiftMonth = (delta) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    render(document.getElementById('view-budget'));
  };

  const _openSalaryModal = () => {
    const budget = Storage.getBudget();
    App.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Salario do mes</div>
      <div class="form-group">
        <label class="form-label">Valor do salario</label>
        <input class="form-input" id="budgetSalary" inputmode="decimal" value="${budget.salary || ''}" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label class="form-label">Dia que recebe</label>
        <input class="form-input" id="budgetSalaryDay" inputmode="numeric" min="1" max="31" value="${budget.salaryDay || 5}" />
      </div>
      <button class="btn btn-primary btn-full" onclick="Budget._saveSalary()">Salvar</button>
    `);
  };

  const _saveSalary = () => {
    const salary = parseMoney(document.getElementById('budgetSalary').value);
    const salaryDay = Math.min(31, Math.max(1, parseInt(document.getElementById('budgetSalaryDay').value, 10) || 5));
    Storage.updateBudgetSettings({ salary, salaryDay });
    App.closeModal();
    App.toast('Salario salvo', 'success');
    render(document.getElementById('view-budget'));
  };

  const _openExpenseModal = (id = null) => {
    const budget = Storage.getBudget();
    const expense = id ? (budget.expenses || []).find(e => e.id === id) : null;
    App.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">${expense ? 'Editar despesa' : 'Nova despesa'}</div>
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input class="form-input" id="budgetExpenseName" value="${expense ? expense.name : ''}" placeholder="Ex: Aluguel" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor</label>
        <input class="form-input" id="budgetExpenseAmount" inputmode="decimal" value="${expense ? expense.amount : ''}" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label class="form-label">Dia de pagamento</label>
        <input class="form-input" id="budgetExpenseDay" inputmode="numeric" min="1" max="31" value="${expense ? expense.dueDay : 10}" />
      </div>
      <div class="form-group">
        <label class="form-label">Categoria opcional</label>
        <input class="form-input" id="budgetExpenseCategory" value="${expense ? (expense.category || '') : ''}" placeholder="Ex: Moradia" />
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        ${expense ? `<button class="btn btn-danger btn-sm" onclick="Budget._deleteExpense('${expense.id}')">Excluir</button>` : ''}
        <button class="btn btn-primary" style="flex:1" onclick="Budget._saveExpense(${expense ? `'${expense.id}'` : ''})">Salvar</button>
      </div>
    `);
  };

  const _saveExpense = (id = null) => {
    const name = document.getElementById('budgetExpenseName').value.trim() || 'Despesa';
    const amount = parseMoney(document.getElementById('budgetExpenseAmount').value);
    const dueDay = Math.min(31, Math.max(1, parseInt(document.getElementById('budgetExpenseDay').value, 10) || 1));
    const category = document.getElementById('budgetExpenseCategory').value.trim();

    if (amount <= 0) {
      App.toast('Informe um valor valido', 'error');
      return;
    }

    const payload = { name, amount, dueDay, category };
    if (id) Storage.updateBudgetExpense(id, payload);
    else Storage.addBudgetExpense(payload);

    App.closeModal();
    App.toast('Despesa salva', 'success');
    render(document.getElementById('view-budget'));
  };

  const _deleteExpense = (id) => {
    if (!confirm('Excluir esta despesa?')) return;
    Storage.deleteBudgetExpense(id);
    App.closeModal();
    App.toast('Despesa excluida');
    render(document.getElementById('view-budget'));
  };

  return { init, _openSalaryModal, _saveSalary, _openExpenseModal, _saveExpense, _deleteExpense };
})();
