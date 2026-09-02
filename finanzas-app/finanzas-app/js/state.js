// state.js — data model + pure calculations (no DOM, no storage calls)

export const CAT_COLORS = ['#5B8DEF', '#5FAE7C', '#E0685A', '#B98FE0', '#E0A85B', '#5BC4D8'];
export function colorFor(idx) { return CAT_COLORS[idx % CAT_COLORS.length]; }

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function money(n) {
  n = Math.round(n || 0);
  return '$' + n.toLocaleString('es-CL');
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

// A brand-new user starts with a completely empty ledger — nothing is pre-filled.
// Onboarding (see onboarding view) walks them through setting their own numbers.
export function emptyData() {
  return {
    name: '',
    onboarded: false,
    income: 0,                 // expected monthly income (used as a target for the progress bar)
    transactions: [],          // {id, type:'income'|'expense', amount, categoryId, note, date, recurringId?}
    debts: [],
    budgetCategories: [],      // {id, name, icon, budget}
    savingsGoals: [],          // {id, name, icon, target, current, monthlyAmount, lastAppliedMonth}
    recurringExpenses: [],     // {id, name, amount, day, categoryId, lastAppliedMonth}  e.g. arriendo
    settings: {
      theme: 'dark',
      notificationsEnabled: false,
      lastNotifiedDate: null,
    },
  };
}

export function monthTransactions(data, monthKey = currentMonthKey()) {
  return data.transactions.filter(t => (t.date || '').startsWith(monthKey));
}

export function totals(data) {
  const mtx = monthTransactions(data);
  const totalReceived = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalSpent = mtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalExpected = data.income || 0;
  const totalDebt = data.debts.reduce((s, x) => s + Math.max(0, x.total - x.paid), 0);
  const totalSaved = data.savingsGoals.reduce((s, x) => s + x.current, 0);
  const totalBudget = data.budgetCategories.reduce((s, x) => s + x.budget, 0);
  const remaining = totalExpected - totalSpent;
  const incomePct = totalExpected > 0 ? clamp(Math.round((totalReceived / totalExpected) * 100), 0, 999) : 0;
  return { totalDebt, totalSaved, totalSpent, totalBudget, totalExpected, totalReceived, remaining, incomePct };
}

export function categorySpent(data, categoryId, monthKey = currentMonthKey()) {
  return monthTransactions(data, monthKey)
    .filter(t => t.type === 'expense' && t.categoryId === categoryId)
    .reduce((s, t) => s + t.amount, 0);
}

export function healthScore(data) {
  const { totalDebt, totalSaved, totalSpent, totalExpected } = totals(data);
  const income = totalExpected || 1;
  const debtRatio = clamp(totalDebt / (income * 4), 0, 1);
  const saveRatio = clamp(totalSaved / (income * 2), 0, 1);
  const spendRatio = clamp(totalSpent / income, 0, 1.4);
  let score = 100 - debtRatio * 45 - Math.max(0, spendRatio - 0.9) * 60 + saveRatio * 25;
  return Math.round(clamp(score, 4, 99));
}

// Applies recurring expenses and automatic savings contributions for the current
// month, if they haven't already been applied. Returns true if `data` was mutated
// (so the caller knows whether to persist it). Safe to call every time the app loads.
export function applyRecurring(data) {
  const month = currentMonthKey();
  let changed = false;

  data.recurringExpenses.forEach(r => {
    if (r.lastAppliedMonth !== month) {
      data.transactions.push({ id: uid(), type: 'expense', amount: r.amount, date: todayStr(), note: r.name, categoryId: r.categoryId || null, recurringId: r.id });
      r.lastAppliedMonth = month;
      changed = true;
    }
  });

  data.savingsGoals.forEach(g => {
    if (g.monthlyAmount > 0 && g.lastAppliedMonth !== month) {
      g.current += g.monthlyAmount;
      g.lastAppliedMonth = month;
      changed = true;
    }
  });

  return changed;
}
