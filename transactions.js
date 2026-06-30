// ── Transactions Component ─────────────────────────
const Transactions = (() => {
  let allTxs = [];
  let filtered = [];
  let activeCategory = 'all';
  let activeSource = 'account';
  let searchQuery = '';
  let selectedIds = new Set();
  let selectMode = false;

  const init = (container) => {
    allTxs = Storage.getTransactions();
    filtered = [...allTxs];
    selectedIds.clear();
    selectMode = false;
    render(container);
  };

  const render = (container) => {
    applyFilters();
    const allCats = Categories.getAll().map(c => c.name);
    // Garantir que "Outros" esteja sempre nos filtros
    const cats = ['all', ...allCats.filter(c => c !== 'Outros').slice(0, 7), 'Outros'];
    const sourceTxs = allTxs.filter(t => (t.source || 'credit') === activeSource);
    const creditCount = allTxs.filter(t => (t.source || 'credit') === 'credit').length;
    const accountCount = allTxs.filter(t => t.source === 'account').length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Gastos</div>
          <div class="page-subtitle">${allTxs.length} transações</div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="Transactions._exportCSV()" style="padding:8px;border-radius:10px;background:var(--surface2);color:var(--text2)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          </button>
          <button onclick="Transactions._toggleSelect()" style="padding:8px;border-radius:10px;background:var(--surface2);color:var(--text2)" id="selectToggleBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </button>
        </div>
      </div>

      <div class="tx-source-tabs">
        <button class="tx-source-tab ${activeSource === 'credit' ? 'active' : ''}" data-source="credit">
          Cr&eacute;dito <span>${creditCount}</span>
        </button>
        <button class="tx-source-tab ${activeSource === 'account' ? 'active' : ''}" data-source="account">
          Conta <span>${accountCount}</span>
        </button>
      </div>

      ${activeSource === 'account' ? renderAccountExpenseForm() : ''}

      <!-- Search -->
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="search" placeholder="Buscar transação..." id="txSearch" value="${searchQuery}" autocomplete="off" />
      </div>

      <!-- Category filters -->
      <div class="filter-row" id="filterRow">
        ${cats.map(c => `
          <button class="filter-pill ${activeCategory === c ? 'active' : ''}" data-cat="${c}">
            ${c === 'all' ? 'Todos' : c}
          </button>`).join('')}
      </div>

      <!-- List -->
      <div class="tx-list" id="txList">
        ${renderList()}
      </div>

      <!-- Bulk action bar -->
      <div class="bulk-bar ${selectMode && selectedIds.size > 0 ? '' : 'hidden'}" id="bulkBar">
        <div class="bulk-bar-info">${selectedIds.size} selecionadas</div>
        <div class="bulk-bar-actions">
          <button class="bulk-btn" onclick="Transactions._bulkCategorize()">Categorizar</button>
          <button class="bulk-btn" onclick="Transactions._bulkDelete()" style="background:rgba(239,68,68,.3)">Excluir</button>
        </div>
      </div>
    `;

    // Events
    const subtitle = container.querySelector('.page-subtitle');
    if (subtitle) subtitle.textContent = `${sourceTxs.length} transacoes em ${activeSource === 'account' ? 'conta' : 'credito'}`;

    document.querySelectorAll('.tx-source-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSource = btn.dataset.source;
        activeCategory = 'all';
        selectedIds.clear();
        selectMode = false;
        render(container);
      });
    });

    const accountForm = document.getElementById('accountExpenseForm');
    if (accountForm) {
      accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addAccountExpense();
      });
    }

    document.getElementById('txSearch').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      applyFilters();
      document.getElementById('txList').innerHTML = renderList();
    });

    document.getElementById('filterRow').addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      activeCategory = pill.dataset.cat;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyFilters();
      document.getElementById('txList').innerHTML = renderList();
    });

    document.getElementById('txList').addEventListener('click', (e) => {
      const item = e.target.closest('.tx-item');
      if (!item) return;
      const id = item.dataset.id;

      if (selectMode) {
        toggleSelect(id, item);
      } else {
        openEditModal(id);
      }
    });

    document.getElementById('txList').addEventListener('click', (e) => {
      const chk = e.target.closest('.tx-check');
      if (!chk) return;
      e.stopPropagation();
      const id = chk.closest('.tx-item').dataset.id;
      toggleSelect(id);
    });
  };

  const applyFilters = () => {
    filtered = allTxs.filter(t => {
      const sourceMatch = (t.source || 'credit') === activeSource;
      const catMatch = activeCategory === 'all' || t.category === activeCategory;
      const searchMatch = !searchQuery || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return sourceMatch && catMatch && searchMatch;
    });
  };

  const renderAccountExpenseForm = () => {
    const cats = Categories.getAll();
    return `
      <form class="account-expense-form" id="accountExpenseForm">
        <div class="account-form-head">
          <div>
            <div class="account-form-title">Gasto de conta</div>
            <div class="account-form-sub">D&eacute;bito, Pix ou dinheiro, separado do cr&eacute;dito.</div>
          </div>
        </div>
        <div class="account-form-grid">
          <div class="form-group">
            <label class="form-label">Valor</label>
            <input class="form-input" id="accountExpenseAmount" inputmode="decimal" placeholder="0,00" required />
          </div>
          <div class="form-group">
            <label class="form-label">Forma</label>
            <select class="form-input" id="accountExpenseMethod">
              <option value="debit_card">D&eacute;bito</option>
              <option value="pix_sent">Pix</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nome opcional</label>
            <input class="form-input" id="accountExpenseDesc" placeholder="Ex: padaria" />
          </div>
          <div class="form-group">
            <label class="form-label">Categoria opcional</label>
            <select class="form-input" id="accountExpenseCat">
              <option value="">Sugerir automaticamente</option>
              ${cats.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-full" type="submit">Adicionar gasto</button>
      </form>
    `;
  };

  const parseMoney = (value) => {
    const normalized = String(value || '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(normalized);
    return Number.isFinite(amount) ? amount : 0;
  };

  const paymentLabels = {
    debit_card: 'Debito',
    pix_sent: 'Pix',
    cash: 'Dinheiro',
  };

  const addAccountExpense = () => {
    const amount = parseMoney(document.getElementById('accountExpenseAmount').value);
    if (amount <= 0) {
      App.toast('Informe um valor valido', 'error');
      return;
    }

    const method = document.getElementById('accountExpenseMethod').value;
    const descInput = document.getElementById('accountExpenseDesc').value.trim();
    const description = descInput || `Gasto em ${paymentLabels[method] || 'conta'}`;
    const categoryInput = document.getElementById('accountExpenseCat').value;
    const category = categoryInput || Categories.suggest(description);
    const date = new Date().toISOString().split('T')[0];

    Storage.addTransactions([{
      id: `tx_${date}_${method}_${Date.now()}`,
      date,
      description,
      amount: -Math.abs(amount),
      category,
      type: 'debit',
      source: 'account',
      txSubtype: method,
      paymentMethod: method,
      imported: false,
    }]);

    if (descInput && categoryInput) Storage.saveRule(descInput, categoryInput);
    App.toast('Gasto adicionado', 'success');
    allTxs = Storage.getTransactions();
    render(document.getElementById('view-transactions'));
  };

  const renderList = () => {
    if (!filtered.length) {
      return `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Nenhuma transação</div><div class="empty-sub">Tente um filtro diferente.</div></div>`;
    }

    // Group by month
    const groups = {};
    filtered.forEach(t => {
      const mk = Engine.getMonthKey(t.date);
      if (!groups[mk]) groups[mk] = [];
      groups[mk].push(t);
    });

    return Object.entries(groups).sort((a,b) => b[0].localeCompare(a[0])).map(([mk, txs]) => `
      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px;padding:0 2px">
        ${Engine.getMonthLabel(mk)}
      </div>
      ${txs.map(t => renderTxItem(t, selectMode, selectedIds.has(t.id))).join('')}
    `).join('');
  };

  const renderTxItem = (t, showCheck = false, checked = false) => {
    const cat = Categories.getCategoryColor(t.category);
    const amtClass = t.amount < 0 ? 'negative' : 'positive';
    const amtStr = t.amount < 0 ? `- ${Engine.fmt(Math.abs(t.amount))}` : `+ ${Engine.fmt(t.amount)}`;
    const dateStr = new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
    const method = t.source === 'account' ? ` - ${paymentLabels[t.paymentMethod || t.txSubtype] || 'Conta'}` : '';

    return `
      <div class="tx-item" data-id="${t.id}">
        ${showCheck ? `<div class="tx-check ${checked ? 'checked' : ''}"></div>` : ''}
        <div class="tx-icon" style="background:${cat.bg}">${cat.emoji}</div>
        <div class="tx-info">
          <div class="tx-desc">${t.description}</div>
          <div class="tx-meta">${dateStr}${method}</div>
          <span class="tx-cat-badge" style="background:${cat.bg};color:${cat.color}">${t.category}</span>
        </div>
        <div class="tx-amount ${amtClass}">${amtStr}</div>
      </div>`;
  };

  const toggleSelect = (id, item) => {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    updateBulkBar();
    if (item) {
      const chk = item.querySelector('.tx-check');
      if (chk) chk.classList.toggle('checked', selectedIds.has(id));
    }
  };

  const updateBulkBar = () => {
    const bar = document.getElementById('bulkBar');
    if (!bar) return;
    bar.classList.toggle('hidden', !(selectMode && selectedIds.size > 0));
    const info = bar.querySelector('.bulk-bar-info');
    if (info) info.textContent = `${selectedIds.size} selecionadas`;
  };

  const _toggleSelect = () => {
    selectMode = !selectMode;
    if (!selectMode) selectedIds.clear();
    const container = document.getElementById('view-transactions');
    render(container);
  };

  const _bulkCategorize = () => {
    if (!selectedIds.size) return;
    const cats = Categories.getAll();
    const html = `
      <div class="modal-handle"></div>
      <div class="modal-title">Categorizar em lote</div>
      <div class="form-group">
        <label class="form-label">Nova categoria para ${selectedIds.size} transações</label>
        <select class="form-input" id="bulkCatSelect">
          ${cats.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-full" onclick="Transactions._confirmBulkCat()">Aplicar</button>
    `;
    App.openModal(html);
  };

  const _confirmBulkCat = () => {
    const cat = document.getElementById('bulkCatSelect').value;
    Storage.updateTransactionsBulk([...selectedIds], { category: cat });
    Storage.learnFromTransactions(
      Storage.getTransactions().filter(t => selectedIds.has(t.id))
    );
    App.closeModal();
    App.toast(`${selectedIds.size} transações atualizadas`, 'success');
    selectedIds.clear(); selectMode = false;
    allTxs = Storage.getTransactions();
    const container = document.getElementById('view-transactions');
    render(container);
  };

  const _bulkDelete = () => {
    if (!confirm(`Excluir ${selectedIds.size} transações?`)) return;
    selectedIds.forEach(id => Storage.deleteTransaction(id));
    App.toast('Transações excluídas');
    selectedIds.clear(); selectMode = false;
    allTxs = Storage.getTransactions();
    const container = document.getElementById('view-transactions');
    render(container);
  };

  const openEditModal = (id) => {
    const t = Storage.getTransactions().find(x => x.id === id);
    if (!t) return;
    const cats = Categories.getAll();
    const html = `
      <div class="modal-handle"></div>
      <div class="modal-title">Editar transação</div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input class="form-input" id="editDesc" value="${t.description}" />
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-input" id="editCat">
          ${cats.map(c => `<option value="${c.name}" ${c.name === t.category ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-input" id="editType">
          <option value="debit" ${t.type==='debit'?'selected':''}>Débito</option>
          <option value="credit" ${t.type==='credit'?'selected':''}>Crédito</option>
          <option value="recurring" ${t.type==='recurring'?'selected':''}>Recorrente</option>
        </select>
      </div>
      ${t.source === 'account' ? `
      <div class="form-group">
        <label class="form-label">Forma</label>
        <select class="form-input" id="editPaymentMethod">
          <option value="debit_card" ${(t.paymentMethod || t.txSubtype)==='debit_card'?'selected':''}>D&eacute;bito</option>
          <option value="pix_sent" ${(t.paymentMethod || t.txSubtype)==='pix_sent'?'selected':''}>Pix</option>
          <option value="cash" ${(t.paymentMethod || t.txSubtype)==='cash'?'selected':''}>Dinheiro</option>
        </select>
      </div>` : ''}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-danger btn-sm" onclick="Transactions._deleteOne('${id}')">Excluir</button>
        <button class="btn btn-primary" style="flex:1" onclick="Transactions._saveEdit('${id}')">Salvar</button>
      </div>
    `;
    App.openModal(html);
  };

  const _saveEdit = (id) => {
    const desc = document.getElementById('editDesc').value.trim();
    const cat  = document.getElementById('editCat').value;
    const type = document.getElementById('editType').value;
    const paymentInput = document.getElementById('editPaymentMethod');
    const patch = { description: desc || 'Gasto', category: cat, type };
    if (paymentInput) {
      patch.paymentMethod = paymentInput.value;
      patch.txSubtype = paymentInput.value;
      patch.source = 'account';
    }
    Storage.updateTransaction(id, patch);
    if (desc) Storage.saveRule(desc, cat);
    App.closeModal();
    App.toast('Salvo!', 'success');
    allTxs = Storage.getTransactions();
    const container = document.getElementById('view-transactions');
    render(container);
  };

  const _deleteOne = (id) => {
    if (!confirm('Excluir esta transação?')) return;
    Storage.deleteTransaction(id);
    App.closeModal();
    App.toast('Excluída');
    allTxs = Storage.getTransactions();
    const container = document.getElementById('view-transactions');
    render(container);
  };

  const _exportCSV = () => {
    const csv = Storage.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'finara_export.csv'; a.click();
    URL.revokeObjectURL(url);
    App.toast('CSV exportado!', 'success');
  };

  return { init, renderTxItem, _toggleSelect, _bulkCategorize, _confirmBulkCat, _bulkDelete, _saveEdit, _deleteOne, _exportCSV };
})();
