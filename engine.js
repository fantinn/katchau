// ── Analytics Engine ───────────────────────────────
const Engine = (() => {
  const fmt = (n) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };
  const fmtShort = (n) => {
    if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + 'k';
    return fmt(n);
  };

  const getMonthKey = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();

    // Tratar dias 28-31 como parte do próximo mês (fatura de cartão)
    // Isso permite que transações de 31 de maio sejam contadas em junho
    if (day >= 28) {
      const nextMonthDate = new Date(year, month + 1, 1);
      return `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
    }

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthLabel = (key) => {
    const [y, m] = key.split('-');
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${months[parseInt(m)-1]} ${y}`;
  };

  const getTxsForMonth = (txs, monthKey) =>
    txs.filter(t => getMonthKey(t.date) === monthKey && t.amount < 0);

  const getAvailableMonths = (txs) => {
    const keys = [...new Set(txs.map(t => getMonthKey(t.date)))];
    return keys.sort().reverse();
  };

  const computeStats = (txs, monthKey, sourceFilter = null) => {
    let monthTxs = txs.filter(t => getMonthKey(t.date) === monthKey);
    
    // Filter by source if specified
    if (sourceFilter) {
      monthTxs = monthTxs.filter(t => t.source === sourceFilter);
    }
    
    // For both credit card and account: only consider expenses (negative amounts)
    const expenses = monthTxs.filter(t => t.amount < 0);
    const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const count = expenses.length;
    const avgDay = total / 30;
    const largest = expenses.reduce((m, t) => Math.abs(t.amount) > m ? Math.abs(t.amount) : m, 0);

    // By category
    const byCat = {};
    expenses.forEach(t => {
      const c = t.category || 'Outros';
      byCat[c] = (byCat[c] || 0) + Math.abs(t.amount);
    });
    const topCat = Object.entries(byCat).sort((a,b) => b[1]-a[1])[0];

    // By day of week
    const byDow = Array(7).fill(0);
    expenses.forEach(t => {
      const d = new Date(t.date + 'T12:00:00');
      byDow[d.getDay()] += Math.abs(t.amount);
    });
    const dowLabels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const topDow = byDow.indexOf(Math.max(...byDow));

    // Top merchants
    const byMerchant = {};
    expenses.forEach(t => {
      byMerchant[t.description] = (byMerchant[t.description] || 0) + Math.abs(t.amount);
    });
    const topMerchants = Object.entries(byMerchant).sort((a,b) => b[1]-a[1]).slice(0,5);
    const top5Total = topMerchants.reduce((s, [,v]) => s + v, 0);
    const top5Pct = total > 0 ? ((top5Total / total) * 100).toFixed(0) : 0;

    // By day heatmap
    const byDay = {};
    expenses.forEach(t => {
      byDay[t.date] = (byDay[t.date] || 0) + Math.abs(t.amount);
    });

    return {
      total, count, avgDay, largest, byCat, topCat,
      byDow, dowLabels, topDow, topMerchants, top5Pct,
      byDay, expenses
    };
  };

  const computeMonthComparison = (txs, currentKey, prevKey) => {
    const curr = computeStats(txs, currentKey);
    const prev = computeStats(txs, prevKey);
    const diff = prev.total > 0 ? ((curr.total - prev.total) / prev.total) * 100 : 0;
    return { curr, prev, diff };
  };

  const generateInsights = (stats, prevStats, monthLabel) => {
    const insights = [];
    const { total, byCat, topCat, topDow, dowLabels, top5Pct, topMerchants, count, largest } = stats;

    if (topCat) {
      const pct = ((topCat[1] / total) * 100).toFixed(0);
      insights.push({ emoji: '📊', text: `<strong>${pct}%</strong> dos seus gastos foram com <strong>${topCat[0]}</strong> este mês` });
    }

    if (prevStats && prevStats.total > 0) {
      const diff = ((total - prevStats.total) / prevStats.total * 100).toFixed(0);
      const sign = diff > 0 ? '+' : '';
      const msg = diff > 0
        ? `Você gastou <strong>${sign}${diff}%</strong> a mais que no mês anterior`
        : `Você gastou <strong>${Math.abs(diff)}%</strong> a menos que no mês anterior 🎉`;
      insights.push({ emoji: diff > 0 ? '📈' : '📉', text: msg });
    }

    if (byCat['Assinaturas']) {
      insights.push({ emoji: '📱', text: `Assinaturas consumiram <strong>${fmt(byCat['Assinaturas'])}</strong> este mês` });
    }

    const dowName = dowLabels[topDow];
    insights.push({ emoji: '📅', text: `Seu dia mais caro costuma ser <strong>${dowName}feira</strong>` });

    if (top5Pct > 0 && topMerchants.length >= 3) {
      insights.push({ emoji: '🏪', text: `Seu top ${topMerchants.length} estabelecimentos consumiu <strong>${top5Pct}%</strong> da fatura` });
    }

    if (largest > 0) {
      insights.push({ emoji: '💳', text: `Sua maior compra foi de <strong>${fmt(largest)}</strong> este mês` });
    }

    const avg = total / 30;
    insights.push({ emoji: '📆', text: `Média de <strong>${fmt(avg)}</strong> por dia neste mês` });

    return insights;
  };

  const getMonthlyEvolution = (txs) => {
    const months = getAvailableMonths(txs).slice(0, 6).reverse();
    return months.map(mk => {
      const exp = getTxsForMonth(txs, mk);
      const total = exp.reduce((s, t) => s + Math.abs(t.amount), 0);
      return { month: getMonthLabel(mk), total, key: mk };
    });
  };

  // CSV parser for Nubank
  const parseNubankCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    // Detect header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const dateIdx = header.findIndex(h => h.includes('data') || h.includes('date'));
    const descIdx = header.findIndex(h => h.includes('descrição') || h.includes('descricao') || h.includes('description') || h.includes('titulo') || h.includes('title'));
    const amtIdx  = header.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value'));

    if (dateIdx === -1 || amtIdx === -1) return null; // Can't parse

    const txs = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;

      const rawDate = (cols[dateIdx] || '').replace(/"/g, '').trim();
      const rawDesc = (cols[descIdx !== -1 ? descIdx : 1] || '').replace(/"/g, '').trim();
      const rawAmt  = (cols[amtIdx] || '').replace(/"/g, '').replace('R$','').trim();

      if (!rawDate || !rawDesc || !rawAmt) continue;

      // Parse date (DD/MM/YYYY or YYYY-MM-DD)
      let date;
      if (rawDate.includes('/')) {
        const [d, m, y] = rawDate.split('/');
        date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      } else {
        date = rawDate; // Already ISO
      }

      // Parse amount (Brazilian: 1.234,56 or standard: 1234.56)
      // Preserve sign: negative = income (payment received), positive = expense
      const isNegative = rawAmt.includes('-');
      let cleanAmt = String(rawAmt).replace(/[R$\s-]/g, '');

      // Detect format: if has comma, it's Brazilian (1.234,56), else standard (1234.56)
      if (cleanAmt.includes(',')) {
        // Brazilian format: remove dots (thousands), replace comma with dot
        cleanAmt = cleanAmt.replace(/\./g, '').replace(',', '.');
      }
      // If no comma, already in standard format (dot is decimal)

      let amount = parseFloat(cleanAmt);
      if (isNaN(amount)) continue;

      // Nubank credit card: positive = expense (we negate for convention)
      // We keep positive = income, negative = expense
      // If original was negative (payment received), keep as positive (income)
      // If original was positive (charge), make negative (expense)
      if (!isNegative) amount = -amount;

      const id = `tx_${date}_${rawDesc.replace(/\s+/g,'_').slice(0,20)}_${Math.random().toString(36).slice(2,7)}`;
      const category = Categories.suggest(rawDesc);
      const type = amount < 0 ? 'debit' : 'credit';

      txs.push({ id, date, description: rawDesc, amount, category, type, imported: true, source: 'credit' });
    }
    return txs;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; }
      else if (c === ',' && !inQuote) { result.push(cur); cur = ''; }
      else { cur += c; }
    }
    result.push(cur);
    return result;
  };

  // CSV parser for Nubank Account Transactions (Pix, transfers, investments)
  const parseNubankTransactionsCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    // Detect header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const dateIdx = header.findIndex(h => h.includes('data') || h.includes('date'));
    const descIdx = header.findIndex(h => h.includes('descrição') || h.includes('descricao') || h.includes('description') || h.includes('titulo') || h.includes('title'));
    const amtIdx  = header.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value'));

    if (dateIdx === -1 || amtIdx === -1) return null;

    const txs = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;

      const rawDate = (cols[dateIdx] || '').replace(/"/g, '').trim();
      const rawDesc = (cols[descIdx !== -1 ? descIdx : 1] || '').replace(/"/g, '').trim();
      const rawAmt  = (cols[amtIdx] || '').replace(/"/g, '').replace('R$','').trim();

      if (!rawDate || !rawDesc || !rawAmt) continue;

      // Parse date (DD/MM/YYYY or YYYY-MM-DD)
      let date;
      if (rawDate.includes('/')) {
        const [d, m, y] = rawDate.split('/');
        date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      } else {
        date = rawDate;
      }

      // Parse amount - detect format
      const isNegative = rawAmt.includes('-');
      let cleanAmt = String(rawAmt).replace(/[R$\s-]/g, '');

      if (cleanAmt.includes(',')) {
        // Brazilian format: remove dots (thousands), replace comma with dot
        cleanAmt = cleanAmt.replace(/\./g, '').replace(',', '.');
      }
      // If no comma, already in standard format (dot is decimal)

      let amount = parseFloat(cleanAmt);
      if (isNaN(amount)) continue;

      // For account transactions: negative = expense, positive = income
      // Keep the sign as-is from the CSV
      if (isNegative) amount = -amount;

      const id = `tx_${date}_${rawDesc.replace(/\s+/g,'_').slice(0,20)}_${Math.random().toString(36).slice(2,7)}`;
      const category = Categories.suggest(rawDesc);
      const type = amount < 0 ? 'debit' : 'credit';

      // Detect transaction subtype for account transactions
      let txSubtype = 'other';
      const descLower = rawDesc.toLowerCase();
      
      if (descLower.includes('pix')) {
        txSubtype = amount < 0 ? 'pix_sent' : 'pix_received';
      } else if (descLower.includes('aplicação') || descLower.includes('aplicacao') || descLower.includes('rdb') || 
                 descLower.includes('cdb') || descLower.includes('cdi') || descLower.includes('caixinha') ||
                 descLower.includes('poupança') || descLower.includes('poupanca')) {
        // Aplicação = money leaving account to investment (negative in CSV)
        // Resgate = money coming from investment to account (positive in CSV)
        if (descLower.includes('resgate')) {
          txSubtype = 'investment_out'; // Resgate: money entering account
        } else {
          txSubtype = 'investment_in'; // Aplicação: money leaving account
        }
      } else if (descLower.includes('transferência') || descLower.includes('transferencia')) {
        txSubtype = amount < 0 ? 'transfer_sent' : 'transfer_received';
      }

      txs.push({ id, date, description: rawDesc, amount, category, type, imported: true, source: 'account', txSubtype });
    }
    return txs;
  };

  // CSV parser for Banco Inter (semicolon separated)
  const parseInterCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    console.log('[Inter Parser] Lines:', lines.length);

    // Find data start (skip header lines)
    let dataStart = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Data') && lines[i].includes('Lançamento')) {
        dataStart = i + 1;
        console.log('[Inter Parser] Found header at line', i, 'data starts at', dataStart);
        break;
      }
    }

    if (dataStart === 0) {
      console.log('[Inter Parser] Header not found, trying line 6');
      dataStart = 6; // Fallback to line 6 (typical for Inter)
    }

    const txs = [];
    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.includes('Total') || line.includes('Filtro')) continue;

      const cols = line.split(';').map(c => c.trim());
      if (cols.length < 4) continue;

      const rawDate = cols[0] || '';
      const rawHist = cols[1] || '';
      const rawDesc = cols[2] || '';
      const rawAmt = cols[3] || '';

      if (!rawDate || !rawAmt) continue;

      // Parse date (DD/MM/YYYY)
      let date;
      if (rawDate.includes('/')) {
        const [d, m, y] = rawDate.split('/');
        date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      } else {
        continue;
      }

      // Parse amount (Brazilian format with comma decimal)
      const isNegative = rawAmt.includes('-');
      let cleanAmt = rawAmt.replace(/[R$\s-]/g, '').replace(/\./g, '').replace(',', '.');
      let amount = parseFloat(cleanAmt);
      if (isNaN(amount)) continue;

      // Keep sign from CSV
      if (isNegative) amount = -amount;

      const description = rawDesc || rawHist || '';
      const id = `tx_${date}_${description.replace(/\s+/g,'_').slice(0,20)}_${Math.random().toString(36).slice(2,7)}`;
      const category = Categories.suggest(description);
      const type = amount < 0 ? 'debit' : 'credit';

      // Detect transaction subtype
      let txSubtype = 'other';
      const descLower = description.toLowerCase();
      
      if (descLower.includes('pix')) {
        txSubtype = amount < 0 ? 'pix_sent' : 'pix_received';
      } else if (descLower.includes('aplicação') || descLower.includes('aplicacao') || descLower.includes('poupança')) {
        if (descLower.includes('resgate')) {
          txSubtype = 'investment_out';
        } else {
          txSubtype = 'investment_in';
        }
      } else if (descLower.includes('transferência') || descLower.includes('transferencia')) {
        txSubtype = amount < 0 ? 'transfer_sent' : 'transfer_received';
      } else if (descLower.includes('compra no débito')) {
        txSubtype = 'debit_card';
      }

      txs.push({ id, date, description, amount, category, type, imported: true, source: 'account', txSubtype });
    }

    console.log('[Inter Parser] Parsed', txs.length, 'transactions');
    return txs;
  };

  // CSV parser for Bradesco (semicolon separated, separate credit/debit columns)
  const parseBradescoCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    console.log('[Bradesco Parser] Lines:', lines.length);
    console.log('[Bradesco Parser] First 3 lines:', lines.slice(0, 3));

    // Find data start (skip header lines)
    let dataStart = 0;
    for (let i = 0; i < lines.length; i++) {
      // Look for "Data Lançamento" or "Data" with "Histórico"
      if ((lines[i].includes('Data Lançamento') || lines[i].includes('Data')) && lines[i].includes('Histórico')) {
        dataStart = i + 1;
        console.log('[Bradesco Parser] Found header at line', i, 'data starts at', dataStart);
        break;
      }
    }

    if (dataStart === 0) {
      console.log('[Bradesco Parser] Header not found, trying line 5');
      dataStart = 5; // Fallback
    }

    const txs = [];
    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.includes('Total') || line.includes('Filtro') || line.includes('Últimos')) continue;

      const cols = line.split(';').map(c => c.trim());
      console.log('[Bradesco Parser] Line', i, 'cols:', cols.length, cols);

      // Check if it's the format with single "Valor" column (like the Bradesco example)
      if (cols.length === 5 && cols[3] && cols[4]) {
        // Format: Data Lançamento;Histórico;Descrição;Valor;Saldo
        const rawDate = cols[0] || '';
        const rawHist = cols[1] || '';
        const rawDesc = cols[2] || '';
        const rawAmt = cols[3] || '';

        if (!rawDate || !rawAmt) continue;

        // Parse date (DD/MM/YYYY)
        let date;
        if (rawDate.includes('/')) {
          const [d, m, y] = rawDate.split('/');
          date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } else {
          continue;
        }

        // Parse amount (Brazilian format with comma decimal)
        const isNegative = rawAmt.includes('-');
        let cleanAmt = rawAmt.replace(/[R$\s-]/g, '').replace(/\./g, '').replace(',', '.');
        let amount = parseFloat(cleanAmt);
        if (isNaN(amount)) continue;

        if (isNegative) amount = -amount;

        const description = rawDesc || rawHist || '';
        const id = `tx_${date}_${description.replace(/\s+/g,'_').slice(0,20)}_${Math.random().toString(36).slice(2,7)}`;
        const category = Categories.suggest(description);
        const type = amount < 0 ? 'debit' : 'credit';

        // Detect transaction subtype
        let txSubtype = 'other';
        const descLower = description.toLowerCase();
        
        if (descLower.includes('pix')) {
          txSubtype = amount < 0 ? 'pix_sent' : 'pix_received';
        } else if (descLower.includes('aplicação') || descLower.includes('aplicacao') || descLower.includes('poupança')) {
          if (descLower.includes('resgate')) {
            txSubtype = 'investment_out';
          } else {
            txSubtype = 'investment_in';
          }
        } else if (descLower.includes('transferência') || descLower.includes('transferencia')) {
          txSubtype = amount < 0 ? 'transfer_sent' : 'transfer_received';
        } else if (descLower.includes('compra no débito')) {
          txSubtype = 'debit_card';
        }

        txs.push({ id, date, description, amount, category, type, imported: true, source: 'account', txSubtype });
      } else if (cols.length >= 5) {
        // Format with separate credit/debit columns
        const rawDate = cols[0] || '';
        const rawHist = cols[1] || '';
        const rawCredit = cols[3] || '';
        const rawDebit = cols[4] || '';

        if (!rawDate) continue;

        // Parse date (DD/MM/YYYY)
        let date;
        if (rawDate.includes('/')) {
          const [d, m, y] = rawDate.split('/');
          date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } else {
          continue;
        }

        // Parse amount (Brazilian format)
        let amount = 0;
        if (rawCredit && rawCredit !== '' && rawCredit !== ' ') {
          let cleanAmt = rawCredit.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
          amount = parseFloat(cleanAmt);
        } else if (rawDebit && rawDebit !== '' && rawDebit !== ' ') {
          let cleanAmt = rawDebit.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
          amount = -parseFloat(cleanAmt);
        }

        if (isNaN(amount) || amount === 0) continue;

        const description = rawHist || '';
        const id = `tx_${date}_${description.replace(/\s+/g,'_').slice(0,20)}_${Math.random().toString(36).slice(2,7)}`;
        const category = Categories.suggest(description);
        const type = amount < 0 ? 'debit' : 'credit';

        // Detect transaction subtype
        let txSubtype = 'other';
        const descLower = description.toLowerCase();
        
        if (descLower.includes('pix')) {
          txSubtype = amount < 0 ? 'pix_sent' : 'pix_received';
        } else if (descLower.includes('transf')) {
          txSubtype = amount < 0 ? 'transfer_sent' : 'transfer_received';
        }

        txs.push({ id, date, description, amount, category, type, imported: true, source: 'account', txSubtype });
      }
    }

    console.log('[Bradesco Parser] Parsed', txs.length, 'transactions');
    return txs;
  };

  // Auto-detect CSV format and parse accordingly
  const parseAutoCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    console.log('[CSV Parser] Total lines:', lines.length);
    console.log('[CSV Parser] First line:', lines[0]);

    // Check first 5 lines for format detection
    const sampleLines = lines.slice(0, 5).map(l => l.toLowerCase());
    const sampleText = sampleLines.join(' ');

    // Detect Nubank (comma separated, has "Data,Valor" or similar)
    if (sampleText.includes('data') && sampleText.includes('valor') && sampleText.includes(',')) {
      console.log('[CSV Parser] Detected Nubank format');
      return parseNubankTransactionsCSV(text);
    }

    // Detect Inter (semicolon, has "Data Lançamento")
    if (sampleText.includes('data') && sampleText.includes('lançamento') && sampleText.includes(';')) {
      console.log('[CSV Parser] Detected Inter format');
      return parseInterCSV(text);
    }

    // Detect Bradesco (semicolon, has "Crédito" and "Débito" columns)
    if (sampleText.includes('crédito') && sampleText.includes('débito') && sampleText.includes(';')) {
      console.log('[CSV Parser] Detected Bradesco format');
      return parseBradescoCSV(text);
    }

    // Try to detect by checking all lines for semicolon
    const hasSemicolon = lines.some(l => l.includes(';'));
    if (hasSemicolon) {
      console.log('[CSV Parser] Detected semicolon format, trying Inter parser');
      return parseInterCSV(text);
    }

    console.log('[CSV Parser] Defaulting to Nubank parser');
    // Default to Nubank parser
    return parseNubankTransactionsCSV(text);
  };

  // Calculate cash flow for account transactions
  const computeAccountCashFlow = (txs, monthKey = null) => {
    let accountTxs = txs.filter(t => t.source === 'account');
    
    if (monthKey) {
      accountTxs = accountTxs.filter(t => getMonthKey(t.date) === monthKey);
    }

    const pixReceived = accountTxs.filter(t => t.txSubtype === 'pix_received').reduce((s, t) => s + t.amount, 0);
    const pixSent = accountTxs.filter(t => t.txSubtype === 'pix_sent').reduce((s, t) => s + Math.abs(t.amount), 0);
    const transferReceived = accountTxs.filter(t => t.txSubtype === 'transfer_received').reduce((s, t) => s + t.amount, 0);
    const transferSent = accountTxs.filter(t => t.txSubtype === 'transfer_sent').reduce((s, t) => s + Math.abs(t.amount), 0);
    
    // Investments: application (money going out of account to investment) vs resgate (money coming back)
    const investmentIn = accountTxs.filter(t => t.txSubtype === 'investment_in').reduce((s, t) => s + Math.abs(t.amount), 0);
    const investmentOut = accountTxs.filter(t => t.txSubtype === 'investment_out').reduce((s, t) => s + t.amount, 0);
    
    // Add extra income sources
    const income = Storage.getIncome() || { sources: [] };
    const incomeSources = income.sources || [];
    let incomeTotal = 0;
    
    if (monthKey) {
      // Filter income sources by month
      incomeTotal = incomeSources
        .filter(s => s.date && s.date.substring(0, 7) === monthKey)
        .reduce((s, source) => s + (source.amount || 0), 0);
    } else {
      incomeTotal = incomeSources.reduce((s, source) => s + (source.amount || 0), 0);
    }
    
    const totalIn = pixReceived + transferReceived + investmentOut + incomeTotal;
    const totalOut = pixSent + transferSent + investmentIn;
    const netBalance = totalIn - totalOut;
    const investmentNet = investmentOut - investmentIn; // Positive = gained, Negative = still invested

    return {
      pixReceived,
      pixSent,
      transferReceived,
      transferSent,
      investmentIn,
      investmentOut,
      investmentNet,
      incomeTotal,
      totalIn,
      totalOut,
      netBalance
    };
  };

  // Calculate current account balance (all time)
  const computeAccountBalance = (txs) => {
    const accountTxs = txs.filter(t => t.source === 'account');
    const accountBalance = accountTxs.reduce((s, t) => s + t.amount, 0);
    
    // Add extra income sources
    const income = Storage.getIncome() || { sources: [] };
    const incomeTotal = (income.sources || []).reduce((s, source) => s + (source.amount || 0), 0);
    
    return accountBalance + incomeTotal;
  };

  // Debug function to find which transaction caused negative balance
  const debugNegativeBalance = () => {
    const txs = Storage.getTransactions();
    const accountTxs = txs.filter(t => t.source === 'account').sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('=== DEBUG: Análise de Saldo Negativo ===');
    console.log('Total de transações de conta:', accountTxs.length);
    
    let balance = 0;
    let negativePoint = null;
    
    for (let i = 0; i < accountTxs.length; i++) {
      const tx = accountTxs[i];
      const prevBalance = balance;
      balance += tx.amount;
      
      if (balance < 0 && prevBalance >= 0 && !negativePoint) {
        negativePoint = {
          index: i,
          tx: tx,
          prevBalance: prevBalance,
          newBalance: balance,
          date: tx.date,
          description: tx.description,
          amount: tx.amount
        };
      }
    }
    
    console.log('Saldo final:', balance);
    
    if (negativePoint) {
      console.log('=== TRANSACÃO QUE CAUSOU SALDO NEGATIVO ===');
      console.log('Data:', negativePoint.date);
      console.log('Descrição:', negativePoint.description);
      console.log('Valor:', negativePoint.amount);
      console.log('Saldo antes:', negativePoint.prevBalance);
      console.log('Saldo depois:', negativePoint.newBalance);
      console.log('Índice:', negativePoint.index, 'de', accountTxs.length);
    } else {
      console.log('Nenhuma transação causou saldo negativo (saldo já estava negativo ou nunca ficou negativo)');
    }
    
    // Show last 10 transactions
    console.log('=== ÚLTIMAS 10 TRANSAÇÕES ===');
    accountTxs.slice(-10).forEach((tx, i) => {
      console.log(`${i+1}. ${tx.date} - ${tx.description} - ${tx.amount}`);
    });
    
    return negativePoint;
  };

  return {
    fmt, fmtShort,
    getMonthKey, getMonthLabel, getAvailableMonths,
    getTxsForMonth, computeStats, computeMonthComparison,
    generateInsights, getMonthlyEvolution,
    parseNubankCSV, parseNubankTransactionsCSV, parseInterCSV, parseBradescoCSV, parseAutoCSV, parseCSVLine,
    computeAccountCashFlow, computeAccountBalance,
    debugNegativeBalance,
  };
})();
