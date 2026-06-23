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

  const computeStats = (txs, monthKey) => {
    const expenses = getTxsForMonth(txs, monthKey);
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
      let amount = parseFloat(
        String(rawAmt)
          .replace(/[R$\s-]/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
      );
      if (isNaN(amount)) continue;

      // Nubank credit card: positive = expense (we negate for convention)
      // We keep positive = income, negative = expense
      // If original was negative (payment received), keep as positive (income)
      // If original was positive (charge), make negative (expense)
      if (!isNegative) amount = -amount;

      const id = `tx_${date}_${rawDesc.replace(/\s+/g,'_').slice(0,20)}_${Math.random().toString(36).slice(2,7)}`;
      const category = Categories.suggest(rawDesc);
      const type = amount < 0 ? 'debit' : 'credit';

      txs.push({ id, date, description: rawDesc, amount, category, type, imported: true });
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

  return {
    fmt, fmtShort,
    getMonthKey, getMonthLabel, getAvailableMonths,
    getTxsForMonth, computeStats, computeMonthComparison,
    generateInsights, getMonthlyEvolution,
    parseNubankCSV, parseCSVLine,
  };
})();
