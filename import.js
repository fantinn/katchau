// ── Import Component ───────────────────────────────
const Import = (() => {
  let parsedTxs = [];
  let step = 1; // 1: upload, 2: preview, 3: done

  const init = (container) => {
    parsedTxs = [];
    step = 1;
    render(container);
  };

  const render = (container) => {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Importar CSV</div>
          <div class="page-subtitle">Nubank e outros bancos</div>
        </div>
      </div>

      <!-- Steps indicator -->
      <div class="import-steps">
        <div class="import-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}">
          <div class="step-dot">${step > 1 ? '✓' : '1'}</div>
          <span>Upload</span>
        </div>
        <div class="import-step-line ${step > 1 ? 'done' : ''}"></div>
        <div class="import-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}">
          <div class="step-dot">${step > 2 ? '✓' : '2'}</div>
          <span>Preview</span>
        </div>
        <div class="import-step-line ${step > 2 ? 'done' : ''}"></div>
        <div class="import-step ${step >= 3 ? 'active' : ''}">
          <div class="step-dot">3</div>
          <span>Pronto</span>
        </div>
      </div>

      <div id="importContent">
        ${step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
      </div>
    `;

    if (step === 1) bindStep1(container);
  };

  const renderStep1 = () => `
    <!-- Drop zone -->
    <div class="import-zone" id="dropZone">
      <input type="file" id="csvFile" accept=".csv,text/csv" />
      <div class="import-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div class="import-title">Arraste seu CSV aqui</div>
      <div class="import-sub">ou toque para selecionar o arquivo.<br/>Suporta Nubank, Inter, C6, XP e mais.</div>
    </div>

    <!-- Tips -->
    <div style="margin:0 20px">
      <div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:10px">Como exportar do Nubank:</div>
      <div style="background:var(--surface);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-sm);border:1px solid var(--border-light)">
        ${['Abra o app Nubank', 'Vá em Cartão de Crédito → Fatura', 'Toque em "Exportar PDF" (baixe o CSV)', 'Ou acesse nubank.com.br → Transações → Exportar'].map((s,i) => `
          <div style="display:flex;gap:12px;${i>0?'margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light)':''}">
            <div style="width:22px;height:22px;border-radius:50%;background:var(--blue-light);color:var(--blue);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
            <div style="font-size:13px;color:var(--text2)">${s}</div>
          </div>`).join('')}
      </div>

      <!-- Test button -->
      <div style="margin-top:16px;text-align:center">
        <button onclick="Import._loadSample()" style="font-size:13px;color:var(--blue);font-weight:600;padding:8px">
          Testar com dados de exemplo
        </button>
      </div>
    </div>
  `;

  const renderStep2 = () => {
    const preview = parsedTxs.slice(0, 8);
    const catCount = {};
    parsedTxs.forEach(t => { catCount[t.category] = (catCount[t.category] || 0) + 1; });

    return `
    <div style="margin:0 20px 16px">
      <div class="card card-pad" style="background:var(--blue-light);border-color:var(--blue-mid)">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:28px">✅</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--blue)">${parsedTxs.length} transações detectadas</div>
            <div style="font-size:13px;color:var(--text2);margin-top:2px">Categorias sugeridas automaticamente</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Categories summary -->
    <div style="margin:0 20px 16px;display:flex;flex-wrap:wrap;gap:6px">
      ${Object.entries(catCount).sort((a,b)=>b[1]-a[1]).map(([cat, cnt]) => {
        const c = Categories.getCategoryColor(cat);
        return `<span style="padding:5px 12px;border-radius:99px;font-size:12px;font-weight:600;background:${c.bg};color:${c.color}">${c.emoji} ${cat} (${cnt})</span>`;
      }).join('')}
    </div>

    <!-- Preview table -->
    <div class="preview-wrap">
      <div class="preview-scroll">
        <table class="preview-table">
          <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Categoria</th></tr></thead>
          <tbody>
            ${preview.map(t => {
              const c = Categories.getCategoryColor(t.category);
              return `<tr>
                <td>${new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</td>
                <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.description}</td>
                <td style="font-weight:700;color:${t.amount<0?'var(--red)':'var(--green)'}">${Engine.fmt(t.amount)}</td>
                <td><span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${c.bg};color:${c.color};font-weight:600">${c.emoji} ${t.category}</span></td>
              </tr>`;
            }).join('')}
            ${parsedTxs.length > 8 ? `<tr><td colspan="4" style="text-align:center;color:var(--text3);font-size:12px">... e mais ${parsedTxs.length - 8} transações</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>

    <div style="padding:0 20px;display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary btn-full" onclick="Import._confirmImport()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Importar ${parsedTxs.length} transações
      </button>
      <button class="btn btn-secondary btn-full" onclick="Import._reset()">Cancelar</button>
    </div>
    `;
  };

  const renderStep3 = () => `
    <div class="empty-state fade-in" style="padding-top:40px">
      <div style="font-size:60px">🎉</div>
      <div class="empty-title">Importação concluída!</div>
      <div class="empty-sub">Suas transações foram importadas e categorizadas automaticamente.</div>
      <div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-top:16px">
        <button class="btn btn-primary btn-full" onclick="App.navigate('dashboard')">Ver Dashboard</button>
        <button class="btn btn-secondary btn-full" onclick="Import._reset()">Importar mais</button>
      </div>
    </div>
  `;

  const bindStep1 = (container) => {
    const zone = document.getElementById('dropZone');
    const input = document.getElementById('csvFile');

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processFile(file, container);
    });

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) processFile(file, container);
    });
  };

  const processFile = (file, container) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      App.toast('Selecione um arquivo CSV', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const txs = Engine.parseNubankCSV(text);

      if (!txs || txs.length === 0) {
        App.toast('Nenhuma transação encontrada no CSV', 'error');
        return;
      }

      parsedTxs = txs;
      step = 2;
      render(container);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const _confirmImport = () => {
    const added = Storage.addTransactions(parsedTxs);
    Storage.learnFromTransactions(parsedTxs);
    step = 3;
    App.toast(`${added} novas transações importadas!`, 'success');
    const container = document.getElementById('view-import');
    render(container);
  };

  const _reset = () => {
    parsedTxs = [];
    step = 1;
    const container = document.getElementById('view-import');
    render(container);
  };

  const _loadSample = () => {
    const today = new Date();
    const fmt = (d) => {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      return date.toISOString().split('T')[0];
    };

    const sample = `Data,Descrição,Valor
${fmt(1)},iFood,45.90
${fmt(2)},Uber,23.50
${fmt(3)},Netflix,39.90
${fmt(4)},Pão de Açúcar,187.30
${fmt(5)},Farmácia Drogaria,32.00
${fmt(6)},Posto Ipiranga,180.00
${fmt(7)},Spotify,19.90
${fmt(8)},Restaurante Sabor Mineiro,62.00
${fmt(9)},Amazon Prime,14.90
${fmt(10)},iFood,38.50
${fmt(11)},99 Pop,18.00
${fmt(12)},Magazine Luiza,259.99
${fmt(13)},Uber,31.20
${fmt(14)},Supermercado Extra,215.40
${fmt(15)},Cinema Cinemark,52.00
${fmt(16)},Farmácia Ultrafarma,44.50
${fmt(17)},McDonalds,28.90
${fmt(18)},Shell Gasolina,200.00
${fmt(19)},Drogaria São Paulo,67.00
${fmt(20)},Padaria Central,15.00
${fmt(21)},Disney+,27.90
${fmt(22)},Mercado Carrefour,342.00
${fmt(23)},Renner Lojas,189.90
${fmt(24)},Burger King,34.50
${fmt(25)},Spotify,19.90
${fmt(26)},iFood,52.00
${fmt(27)},Uber,41.00
${fmt(28)},Academia Smart Fit,99.00`;

    const txs = Engine.parseNubankCSV(sample);
    if (txs && txs.length) {
      parsedTxs = txs;
      step = 2;
      const container = document.getElementById('view-import');
      render(container);
    }
  };

  return { init, _confirmImport, _reset, _loadSample };
})();
