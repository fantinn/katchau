// ── Categories Engine ──────────────────────────────
const Categories = (() => {
  const DEFAULT_CATS = [
    { id: 'food',     name: 'Alimentação', emoji: '🍽️', color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'market',   name: 'Mercado',     emoji: '🛒', color: '#10B981', bg: '#ECFDF5' },
    { id: 'transport',name: 'Transporte',  emoji: '🚗', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'leisure',  name: 'Lazer',       emoji: '🎮', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'health',   name: 'Saúde',       emoji: '❤️', color: '#EF4444', bg: '#FEF2F2' },
    { id: 'shopping', name: 'Compras',     emoji: '🛍️', color: '#EC4899', bg: '#FDF2F8' },
    { id: 'subs',     name: 'Assinaturas', emoji: '📱', color: '#6366F1', bg: '#EEF2FF' },
    { id: 'transfer', name: 'Transferências', emoji: '💸', color: '#F97316', bg: '#FFF7ED' },
    { id: 'invest',   name: 'Investimentos', emoji: '📈', color: '#0891B2', bg: '#ECFEFF' },
    { id: 'others',   name: 'Outros',      emoji: '📦', color: '#94A3B8', bg: '#F8FAFC' },
  ];

  // Built-in keyword rules
  const BUILTIN_RULES = {
    'uber': 'Transporte', 'taxi': 'Transporte', '99pop': 'Transporte', 'cabify': 'Transporte',
    'bilhete': 'Transporte', 'passagem': 'Transporte', 'metro': 'Transporte', 'onibus': 'Transporte',
    'posto': 'Transporte', 'combustivel': 'Transporte', 'gasolina': 'Transporte', 'shell': 'Transporte',
    'ipiranga': 'Transporte', 'petrobras': 'Transporte', 'estacionamento': 'Transporte',

    'ifood': 'Alimentação', 'rappi': 'Alimentação', 'delivery': 'Alimentação',
    'mcdonald': 'Alimentação', 'mcdonalds': 'Alimentação', 'burger': 'Alimentação',
    'subway': 'Alimentação', 'pizza': 'Alimentação', 'sushi': 'Alimentação',
    'restaurante': 'Alimentação', 'lanchonete': 'Alimentação', 'padaria': 'Alimentação',
    'cafe': 'Alimentação', 'starbucks': 'Alimentação', 'bar': 'Alimentação',

    'mercado': 'Mercado', 'supermercado': 'Mercado', 'extra': 'Mercado',
    'carrefour': 'Mercado', 'pao': 'Mercado', 'hortifruti': 'Mercado',
    'prezunic': 'Mercado', 'assai': 'Mercado', 'atacadao': 'Mercado',
    'walmart': 'Mercado', 'aldi': 'Mercado', 'lidl': 'Mercado',

    'netflix': 'Assinaturas', 'spotify': 'Assinaturas', 'amazon': 'Assinaturas',
    'prime': 'Assinaturas', 'disney': 'Assinaturas', 'hbo': 'Assinaturas',
    'youtube': 'Assinaturas', 'apple': 'Assinaturas', 'microsoft': 'Assinaturas',
    'adobe': 'Assinaturas', 'google': 'Assinaturas', 'dropbox': 'Assinaturas',
    'icloud': 'Assinaturas', 'deezer': 'Assinaturas', 'globoplay': 'Assinaturas',

    'farmacia': 'Saúde', 'drogaria': 'Saúde', 'ultrafarma': 'Saúde',
    'medico': 'Saúde', 'clinica': 'Saúde', 'hospital': 'Saúde',
    'laboratorio': 'Saúde', 'academia': 'Saúde', 'plano': 'Saúde',

    'cinema': 'Lazer', 'teatro': 'Lazer', 'show': 'Lazer',
    'ingresso': 'Lazer', 'parque': 'Lazer', 'museu': 'Lazer',
    'jogo': 'Lazer', 'steam': 'Lazer', 'playstation': 'Lazer',
    'xbox': 'Lazer', 'nintendo': 'Lazer',

    'americanas': 'Compras', 'magazineluiza': 'Compras', 'casasbahia': 'Compras',
    'mercadolivre': 'Compras', 'shopee': 'Compras', 'aliexpress': 'Compras',
    'shein': 'Compras', 'renner': 'Compras', 'riachuelo': 'Compras',
    'zara': 'Compras', 'hm': 'Compras', 'lojas': 'Compras',

    'pix': 'Transferências', 'transferência': 'Transferências', 'transferencia': 'Transferências',
    'aplicação': 'Investimentos', 'aplicacao': 'Investimentos', 'rdb': 'Investimentos',
    'resgate': 'Investimentos', 'cdb': 'Investimentos', 'cdi': 'Investimentos',
    'caixinha': 'Investimentos', 'poupança': 'Investimentos', 'poupanca': 'Investimentos',
    'rendimento': 'Investimentos', 'juros': 'Investimentos',
  };

  const getAll = () => {
    const saved = Storage.getCategories();
    if (!saved) return [...DEFAULT_CATS];
    return saved;
  };

  const getById = (id) => getAll().find(c => c.id === id);
  const getByName = (name) => getAll().find(c => c.name === name);

  const suggest = (description) => {
    const desc = description.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Check user-learned rules first
    const userRules = Storage.getRules();
    for (const [kw, cat] of Object.entries(userRules)) {
      if (desc.includes(kw)) return cat;
    }

    // Check built-in rules
    for (const [kw, cat] of Object.entries(BUILTIN_RULES)) {
      if (desc.includes(kw)) return cat;
    }

    return 'Outros';
  };

  const getCategoryColor = (name) => {
    const c = getByName(name);
    return c ? { color: c.color, bg: c.bg, emoji: c.emoji } : { color: '#94A3B8', bg: '#F8FAFC', emoji: '📦' };
  };

  const addCustom = (name, emoji, color, bg) => {
    const cats = getAll();
    const id = 'custom_' + Date.now();
    cats.push({ id, name, emoji: emoji || '📌', color: color || '#64748B', bg: bg || '#F8FAFC', custom: true });
    Storage.saveCategories(cats);
    return id;
  };

  const remove = (id) => {
    const cats = getAll().filter(c => c.id !== id && c.custom);
    Storage.saveCategories([...DEFAULT_CATS, ...cats.filter(c => c.custom)]);
  };

  return { getAll, getById, getByName, suggest, getCategoryColor, addCustom, remove, DEFAULT_CATS };
})();
