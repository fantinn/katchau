// ── Storage Simplificado com Firebase ──────────────────
const Storage = (() => {
  const KEYS = {
    DAILY: 'tinpay_daily',
    EXPENSES: 'tinpay_expenses',
    BILLS: 'tinpay_bills',
    CARDS: 'tinpay_cards',
  };

  let currentUser = null;
  let db = null;

  // Inicializar Firebase
  const initFirebase = () => {
    if (typeof firebase !== 'undefined' && firebase.database) {
      db = firebase.database();
      console.log('[Storage] Firebase inicializado');
    } else {
      console.warn('[Storage] Firebase não disponível, usando apenas localStorage');
    }
  };

  // Obter caminho do usuário no Firebase
  const getUserPath = () => {
    const userKey = localStorage.getItem('tinpay_user') || 'default';
    return `/users/${userKey}`;
  };

  // Salvar no Firebase
  const saveToFirebase = (key, value) => {
    if (db) {
      const path = `${getUserPath()}/${key}`;
      db.ref(path).set(value).catch(err => {
        console.error('[Storage] Erro ao salvar no Firebase:', err);
      });
    }
  };

  // Carregar do Firebase
  const loadFromFirebase = (key, callback) => {
    if (db) {
      const path = `${getUserPath()}/${key}`;
      db.ref(path).once('value', (snapshot) => {
        const value = snapshot.val();
        if (value !== null) {
          localStorage.setItem(key, JSON.stringify(value));
          if (callback) callback(value);
        }
      }).catch(err => {
        console.error('[Storage] Erro ao carregar do Firebase:', err);
      });
    }
  };

  const get = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch {
      return null;
    }
  };

  const set = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      saveToFirebase(key, value);
    } catch (e) {
      console.error('Storage error:', e);
    }
  };

  // ── Daily Earnings (Ganhos por dia) ───────────────────
  const getDaily = () => get(KEYS.DAILY) || [];
  const setDaily = (data) => set(KEYS.DAILY, data);
  
  const addDaily = (date, amount, notes = '') => {
    const daily = getDaily();
    const existing = daily.find(d => d.date === date);
    if (existing) {
      existing.amount += amount;
      existing.notes = notes || existing.notes;
    } else {
      daily.push({ id: Date.now(), date, amount, notes });
    }
    setDaily(daily);
  };

  const updateDaily = (id, patch) => {
    const daily = getDaily();
    const index = daily.findIndex(d => d.id === id);
    if (index !== -1) {
      daily[index] = { ...daily[index], ...patch };
      setDaily(daily);
    }
  };

  const deleteDaily = (id) => {
    const daily = getDaily().filter(d => d.id !== id);
    setDaily(daily);
  };

  // ── Expenses (Gastos por dia) ─────────────────────────
  const getExpenses = () => get(KEYS.EXPENSES) || [];
  const setExpenses = (data) => set(KEYS.EXPENSES, data);
  
  const addExpense = (date, amount, category, description = '') => {
    const expenses = getExpenses();
    expenses.push({ id: Date.now(), date, amount, category, description });
    setExpenses(expenses);
  };

  const updateExpense = (id, patch) => {
    const expenses = getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...patch };
      setExpenses(expenses);
    }
  };

  const deleteExpense = (id) => {
    const expenses = getExpenses().filter(e => e.id !== id);
    setExpenses(expenses);
  };

  // ── Bills (Contas pendentes) ───────────────────────────
  const getBills = () => get(KEYS.BILLS) || [];
  const setBills = (data) => set(KEYS.BILLS, data);
  
  const addBill = (name, amount, dueDate, paid = false) => {
    const bills = getBills();
    bills.push({ id: Date.now(), name, amount, dueDate, paid });
    setBills(bills);
  };

  const updateBill = (id, patch) => {
    const bills = getBills();
    const index = bills.findIndex(b => b.id === id);
    if (index !== -1) {
      bills[index] = { ...bills[index], ...patch };
      setBills(bills);
    }
  };

  const deleteBill = (id) => {
    const bills = getBills().filter(b => b.id !== id);
    setBills(bills);
  };

  // ── Credit Cards (Faturas) ────────────────────────────
  const getCards = () => get(KEYS.CARDS) || [];
  const setCards = (data) => set(KEYS.CARDS, data);
  
  const addCard = (name, limit, dueDay) => {
    const cards = getCards();
    cards.push({ id: Date.now(), name, limit, dueDay, expenses: [] });
    setCards(cards);
  };

  const addCardExpense = (cardId, date, amount, description) => {
    const cards = getCards();
    const card = cards.find(c => c.id === cardId);
    if (card) {
      card.expenses.push({ id: Date.now(), date, amount, description });
      setCards(cards);
    }
  };

  const updateCard = (id, patch) => {
    const cards = getCards();
    const index = cards.findIndex(c => c.id === id);
    if (index !== -1) {
      cards[index] = { ...cards[index], ...patch };
      setCards(cards);
    }
  };

  const deleteCard = (id) => {
    const cards = getCards().filter(c => c.id !== id);
    setCards(cards);
  };

  // ── Summary Stats ─────────────────────────────────────
  const getSummary = (month = null) => {
    const daily = getDaily();
    const expenses = getExpenses();
    const bills = getBills();
    const cards = getCards();

    let totalIncome = 0;
    let totalExpenses = 0;
    let pendingBills = 0;
    let cardTotal = 0;

    daily.forEach(d => {
      if (!month || d.date.startsWith(month)) {
        totalIncome += d.amount;
      }
    });

    expenses.forEach(e => {
      if (!month || e.date.startsWith(month)) {
        totalExpenses += e.amount;
      }
    });

    bills.forEach(b => {
      if (!b.paid) {
        pendingBills += b.amount;
      }
    });

    cards.forEach(c => {
      c.expenses.forEach(e => {
        cardTotal += e.amount;
      });
    });

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      pendingBills,
      cardTotal,
    };
  };

  // ── Sync Functions ─────────────────────────────────────
  const syncFromFirebase = () => {
    if (!db) return;

    KEYS.DAILY && loadFromFirebase(KEYS.DAILY);
    KEYS.EXPENSES && loadFromFirebase(KEYS.EXPENSES);
    KEYS.BILLS && loadFromFirebase(KEYS.BILLS);
    KEYS.CARDS && loadFromFirebase(KEYS.CARDS);
  };

  const setUser = (userKey) => {
    localStorage.setItem('tinpay_user', userKey);
    syncFromFirebase();
  };

  return {
    init: initFirebase,
    sync: syncFromFirebase,
    setUser,
    getDaily, addDaily, updateDaily, deleteDaily,
    getExpenses, addExpense, updateExpense, deleteExpense,
    getBills, addBill, updateBill, deleteBill,
    getCards, addCard, addCardExpense, updateCard, deleteCard,
    getSummary,
  };
})();
