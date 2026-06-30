// ── App Controller ─────────────────────────────────
const App = (() => {
  const views = {
    dashboard: Dashboard,
    budget: Budget,
    transactions: Transactions,
    daily: Daily,
    import: Import,
    analytics: Analytics,
    schedule: Schedule,
    settings: Settings,
  };

  let currentView = 'dashboard';

  const init = async () => {
    const savedDb = localStorage.getItem('tinpay_selected_db');

    if (savedDb) {
      Storage.setDatabase(savedDb);
      try {
        await Storage.init(); // ← carrega dados do cloud antes de renderizar
        showApp();
      } catch (error) {
        console.error('[App] Erro no Storage.init:', error);
        showApp(); // mostra o app mesmo com erro no Firebase
      }
    } else {
      showDbSelect();
    }
  };

  const showDbSelect = () => {
    const splash = document.getElementById('splash');
    const dbSelect = document.getElementById('db-select');

    splash.style.display = 'none';
    dbSelect.classList.remove('hidden');

    document.querySelectorAll('.db-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const dbName = btn.dataset.db;
        localStorage.setItem('tinpay_selected_db', dbName);
        Storage.setDatabase(dbName);
        dbSelect.classList.add('hidden');

        // Mostra splash enquanto carrega do cloud
        splash.style.display = 'flex';
        await Storage.init();
        showApp();
      });
    });
  };

  const showApp = () => {
    const s = Storage.getPrefs();
    if (s.dark) document.documentElement.setAttribute('data-dark', '');

    const splash = document.getElementById('splash');
    const main = document.getElementById('main');
    splash.classList.add('out');
    setTimeout(() => { splash.style.display = 'none'; main.classList.remove('hidden'); }, 400);

    document.getElementById('bottomNav').addEventListener('click', e => {
      const btn = e.target.closest('[data-view]');
      if (btn) navigate(btn.dataset.view);
    });

    navigate('dashboard');
  };

  const navigate = (viewName) => {
    if (!views[viewName]) return;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });

    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const viewEl = document.getElementById(`view-${viewName}`);
    if (viewEl) viewEl.classList.add('active');

    currentView = viewName;
    views[viewName].init(viewEl);
  };

  const toast = (msg, type = 'default') => {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2500);
  };

  const showModal = (html) => {
    const overlay = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    box.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  };

  // Alias usado em settings.js
  const openModal = showModal;

  const closeModal = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
  };

  const showTxModal = (tx) => {
    const cat = Categories.getCategoryColor(tx.category || 'Outros');
    const cats = Categories.getAll();
    showModal(`
      <div class="modal-handle"></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div class="tx-icon" style="background:${cat.bg};width:48px;height:48px;border-radius:14px;font-size:22px">${cat.emoji}</div>
        <div>
          <div style="font-size:16px;font-weight:700">${tx.description}</div>
          <div style="font-size:13px;color:var(--text2)">${new Date(tx.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</div>
        </div>
      </div>
      <div style="font-size:32px;font-weight:700;color:${tx.amount<0?'var(--red)':'var(--green)'};margin-bottom:20px">${Engine.fmt(tx.amount)}</div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-input" id="txCatSelect">
          ${cats.map(c => `<option value="${c.name}" ${c.name===tx.category?'selected':''}>${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-full" onclick="App._saveTxCat('${tx.id}')">Salvar</button>
        <button class="btn btn-danger btn-full" onclick="App._deleteTx('${tx.id}')">Excluir transação</button>
        <button class="btn btn-secondary btn-full" onclick="App.closeModal()">Fechar</button>
      </div>
    `);
  };

  const _saveTxCat = (id) => {
    const cat = document.getElementById('txCatSelect').value;
    Storage.updateTransaction(id, { category: cat });
    closeModal();
    toast('Categoria atualizada', 'success');
    views[currentView].init(document.getElementById(`view-${currentView}`));
  };

  const _deleteTx = (id) => {
    Storage.deleteTransaction(id);
    closeModal();
    toast('Transação excluída', 'success');
    views[currentView].init(document.getElementById(`view-${currentView}`));
  };

  return { init, navigate, toast, showModal, openModal, closeModal, showTxModal, _saveTxCat, _deleteTx };
})();

document.addEventListener('DOMContentLoaded', App.init);
