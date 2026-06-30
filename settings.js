// ── Settings Component ─────────────────────────────
const Settings = (() => {
  const init = (container) => render(container);

  const render = (container) => {
    const s = Storage.getSettings();
    const dark = document.documentElement.hasAttribute('data-dark');
    const txs = Storage.getTransactions();
    const currentDb = Storage.getDatabase();

    container.innerHTML = `
      <div class="page-header"><div><div class="page-title">Configurações</div></div></div>

      <div class="settings-section">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Banco de Dados</div>
        <div class="settings-card">
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-icon" style="background:var(--blue-light)">💾</div>
              <div><div class="settings-label">Banco atual</div><div class="settings-sub">${currentDb}</div></div>
            </div>
          </div>
          <div class="settings-item" onclick="Settings._switchDb()" style="cursor:pointer">
            <div class="settings-item-left">
              <div class="settings-icon" style="background:var(--orange-bg)">🔄</div>
              <div><div class="settings-label">Trocar banco</div><div class="settings-sub">Selecionar outro banco de dados</div></div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>

      <div class="settings-section" style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Aparência</div>
        <div class="settings-card">
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-icon" style="background:var(--surface2)">🌙</div>
              <div><div class="settings-label">Modo escuro</div></div>
            </div>
            <label class="toggle">
              <input type="checkbox" ${dark?'checked':''} onchange="Settings._toggleDark(this.checked)"/>
              <div class="toggle-track"></div>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-section" style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Dados</div>
        <div class="settings-card">
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-icon" style="background:var(--green-bg)">📊</div>
              <div><div class="settings-label">Transações</div><div class="settings-sub">${txs.length} registros</div></div>
            </div>
          </div>
          <div class="settings-item" onclick="Settings._openImport()" style="cursor:pointer">
            <div class="settings-item-left">
              <div class="settings-icon" style="background:var(--blue-light);color:var(--blue);font-size:12px;font-weight:700">CSV</div>
              <div><div class="settings-label">Importar CSV</div><div class="settings-sub">Adicionar dados do cartão ou da conta</div></div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div class="settings-item" onclick="Settings._clearData()" style="cursor:pointer">
            <div class="settings-item-left">
              <div class="settings-icon" style="background:var(--red-bg)">🗑️</div>
              <div><div class="settings-label" style="color:var(--red)">Limpar todos os dados</div><div class="settings-sub">Remove todas as transações</div></div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>

      <div class="settings-section" style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Sobre</div>
        <div class="settings-card">
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-icon" style="background:var(--blue-light)">💙</div>
              <div><div class="settings-label">Tinpay</div><div class="settings-sub">v1.0 · Controle financeiro pessoal</div></div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const _toggleDark = (on) => {
    if (on) document.documentElement.setAttribute('data-dark','');
    else document.documentElement.removeAttribute('data-dark');
    const s = Storage.getSettings();
    Storage.saveSettings({ ...s, dark: on });
    Charts.refreshAll();
  };

  const _clearData = () => {
    App.showModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Limpar dados?</div>
      <p style="color:var(--text2);font-size:14px;margin-bottom:20px">Isso removerá todas as transações e não pode ser desfeito.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-danger btn-full" onclick="Settings._confirmClear()">Limpar tudo</button>
        <button class="btn btn-secondary btn-full" onclick="App.closeModal()">Cancelar</button>
      </div>
    `);
  };

  const _confirmClear = () => {
    Storage.clearAll();
    App.closeModal();
    App.toast('Dados removidos', 'success');
    App.navigate('dashboard');
  };

  const _switchDb = () => {
    App.showModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Trocar banco de dados?</div>
      <p style="color:var(--text2);font-size:14px;margin-bottom:20px">Isso irá mostrar a tela de seleção de banco novamente. Seus dados atuais serão preservados.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary btn-full" onclick="Settings._confirmSwitchDb()">Continuar</button>
        <button class="btn btn-secondary btn-full" onclick="App.closeModal()">Cancelar</button>
      </div>
    `);
  };

  const _confirmSwitchDb = () => {
    localStorage.removeItem('tinpay_selected_db');
    App.closeModal();
    location.reload();
  };

  const _openImport = () => App.navigate('import');

  return { init, _toggleDark, _clearData, _confirmClear, _switchDb, _confirmSwitchDb, _openImport };
})();
