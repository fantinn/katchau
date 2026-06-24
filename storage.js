// ── Storage Layer ──────────────────────────────────
// Firebase Realtime Database como banco de dados na nuvem
// localStorage serve como cache síncrono para leituras rápidas
// Todas as APIs públicas permanecem síncronas — o app não precisa mudar

const Storage = (() => {
  const VERSION = 3;
  let dbPrefix = 'fantin_';

  // ── Debounce map para evitar writes excessivos ──
  const _timers = {};
  const _debounce = (key, fn, ms = 600) => {
    clearTimeout(_timers[key]);
    _timers[key] = setTimeout(fn, ms);
  };

  // ── Firebase helpers ────────────────────────────
  const _firebaseAvailable = () => typeof window !== 'undefined' && typeof firebase !== 'undefined' && firebase.database;

  const _firebaseRef = (key) => {
    if (!_firebaseAvailable()) return null;
    return firebase.database().ref(`finara/${dbPrefix}${key}`);
  };

  // Grava no Firebase (com debounce por chave)
  const _firebaseSet = (key, val) => {
    if (!_firebaseAvailable()) return;
    const ref = _firebaseRef(key);
    if (!ref) return;
    _debounce(key, async () => {
      try {
        await ref.set(val);
      } catch (e) {
        console.warn('[Storage] Firebase set failed:', e);
      }
    });
  };

  // Lê do Firebase (assíncrono, usado só no init)
  const _firebaseGet = async (key) => {
    if (!_firebaseAvailable()) return null;
    const ref = _firebaseRef(key);
    if (!ref) return null;
    try {
      const snapshot = await ref.once('value');
      return snapshot.val();
    } catch {
      return null;
    }
  };

  const _firebaseDelete = async (key) => {
    if (!_firebaseAvailable()) return;
    const ref = _firebaseRef(key);
    if (!ref) return;
    try { await ref.remove(); } catch {}
  };

  // ── Sync: carrega Firebase → localStorage ───────
  // Chamado uma vez no init. Resolve quando os dados estão prontos.
  const syncFromCloud = async () => {
    if (!_firebaseAvailable()) {
      console.warn('[Storage] Firebase não disponível, usando apenas localStorage');
      return;
    }
    try {
      const keys = Object.values(KEYS);
      await Promise.all(keys.map(async (k) => {
        const val = await _firebaseGet(k);
        if (val !== null) {
          try {
            localStorage.setItem(prefixedKey(k), JSON.stringify(val));
          } catch {}
        }
      }));
      console.log('[Storage] Sync do Firebase concluído');
    } catch (error) {
      console.error('[Storage] Erro no sync do Firebase:', error);
    }
  };

  // ── Prefixed key para localStorage (cache) ──────
  const prefixedKey = (key) => dbPrefix + key;

  // ── KEYS ────────────────────────────────────────
  const KEYS = {
    TRANSACTIONS: 'finara_txs',
    DAILY:        'finara_daily',
    CATEGORIES:   'finara_cats',
    RULES:        'finara_rules',
    PREFS:        'finara_prefs',
    META:         'finara_meta',
  };

  // ── Cache read/write (síncrono) ─────────────────
  const _get = (key) => {
    try { return JSON.parse(localStorage.getItem(prefixedKey(key))); } catch { return null; }
  };
  const _set = (key, val) => {
    try {
      localStorage.setItem(prefixedKey(key), JSON.stringify(val));
      _firebaseSet(key, val); // dispara sync para o Firebase
      return true;
    } catch { return false; }
  };
  const _remove = (key) => {
    localStorage.removeItem(prefixedKey(key));
    _firebaseDelete(key);
  };

  // ── Database selection ──────────────────────────
  const setDatabase = (dbName) => { dbPrefix = dbName + '_'; };
  const getDatabase = () => dbPrefix.replace('_', '');

  // ── Transactions ────────────────────────────────
  const getTransactions = () => _get(KEYS.TRANSACTIONS) || [];
  const saveTransactions = (txs) => _set(KEYS.TRANSACTIONS, txs);

  const addTransactions = (newTxs) => {
    const existing = getTransactions();
    // Sem deduplicação para permitir reimportação de faturas que incluem dias do mês anterior
    const merged = [...existing, ...newTxs].sort((a, b) => new Date(b.date) - new Date(a.date));
    saveTransactions(merged);
    return newTxs.length;
  };

  const updateTransaction = (id, patch) => {
    const txs = getTransactions().map(t => t.id === id ? { ...t, ...patch } : t);
    saveTransactions(txs);
  };

  const updateTransactionsBulk = (ids, patch) => {
    const idSet = new Set(ids);
    const txs = getTransactions().map(t => idSet.has(t.id) ? { ...t, ...patch } : t);
    saveTransactions(txs);
  };

  const deleteTransaction = (id) => {
    saveTransactions(getTransactions().filter(t => t.id !== id));
  };

  // ── Daily Transactions (separadas das principais) ──
  const getDailyTransactions = () => _get(KEYS.DAILY) || [];
  const saveDailyTransactions = (txs) => _set(KEYS.DAILY, txs);

  const addDailyTransaction = (tx) => {
    const existing = getDailyTransactions();
    const newTxs = [{ ...tx, id: Date.now().toString(), date: new Date().toISOString().split('T')[0] }, ...existing];
    saveDailyTransactions(newTxs);
    return tx;
  };

  const updateDailyTransaction = (id, patch) => {
    const txs = getDailyTransactions().map(t => t.id === id ? { ...t, ...patch } : t);
    saveDailyTransactions(txs);
  };

  const deleteDailyTransaction = (id) => {
    saveDailyTransactions(getDailyTransactions().filter(t => t.id !== id));
  };

  // ── 
  // ── Category rules (learning) ───────────────────
  const getRules = () => _get(KEYS.RULES) || {};
  const sanitizeKey = (key) => key.replace(/[.#$\[\]\/]/g, '_');

  const saveRule = (keyword, category) => {
    const rules = getRules();
    rules[sanitizeKey(keyword.toLowerCase())] = category;
    _set(KEYS.RULES, rules);
  };
  const learnFromTransactions = (txs) => {
    const rules = getRules();
    txs.forEach(t => {
      if (t.category && t.category !== 'Outros') {
        const words = t.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        words.forEach(w => { if (!rules[sanitizeKey(w)]) rules[sanitizeKey(w)] = t.category; });
      }
    });
    _set(KEYS.RULES, rules);
  };

  // ── Preferences ─────────────────────────────────
  const getPrefs = () => _get(KEYS.PREFS) || { dark: false, currency: 'BRL' };
  const savePref = (key, val) => {
    const p = getPrefs(); p[key] = val; _set(KEYS.PREFS, p);
  };
  const getSettings = () => getPrefs();
  const saveSettings = (obj) => _set(KEYS.PREFS, obj);

  // ── Custom categories ───────────────────────────
  const getCategories = () => _get(KEYS.CATEGORIES) || null;
  const saveCategories = (cats) => _set(KEYS.CATEGORIES, cats);

  // ── Export ──────────────────────────────────────
  const exportCSV = () => {
    const txs = getTransactions();
    const rows = [['Data','Descrição','Valor','Categoria','Tipo']];
    txs.forEach(t => rows.push([t.date, `"${t.description}"`, t.amount, t.category, t.type]));
    return rows.map(r => r.join(',')).join('\n');
  };

  // ── Clear ───────────────────────────────────────
  const clearAll = () => {
    Object.values(KEYS).forEach(k => _remove(k));
  };

  // ── Init (público) ──────────────────────────────
  // Retorna Promise. O App deve aguardar antes de renderizar.
  const init = async () => {
    await syncFromCloud();
  };

  return {
    init,
    setDatabase, getDatabase,
    getTransactions, saveTransactions, addTransactions,
    updateTransaction, updateTransactionsBulk, deleteTransaction,
    getDailyTransactions, saveDailyTransactions, addDailyTransaction,
    updateDailyTransaction, deleteDailyTransaction,
    getRules, saveRule, learnFromTransactions,
    getPrefs, savePref, getSettings, saveSettings,
    getCategories, saveCategories,
    exportCSV, clearAll,
    KEYS,
  };
})();
