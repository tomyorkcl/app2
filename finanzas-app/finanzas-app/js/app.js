// app.js — the controller. Owns state, wires up events, and renders views.
// Every other file is a pure module (icons, state calculations, storage I/O, templates, AI call, auth).

import { emptyData, uid, applyRecurring } from './state.js';
import { loadAuth, saveAuth, loadData, saveData as persistData, loadChat, saveChat as persistChat, deleteEverything } from './storage.js';
import { viewLogin, viewVerify, viewOnboarding, viewHome, viewDebts, viewBudget, viewSavings, viewChat, viewSettings, renderModal, bottomNav } from './views.js';
import { fetchAIResponse } from './chat.js';
import { generateCode, sendVerificationCode } from './auth.js';

// Replace with a real donation link (Buy Me a Coffee, Ko-fi, bank transfer page, etc.)
const DONATION_URL = '';

let state = {
  route: 'home',
  data: null,
  chat: [],
  loading: true,
  modal: null,
  toast: null,
  sending: false,
  saveStatus: 'idle',
  onboardStep: 1,
  _keepScroll: false,

  // auth
  authData: null,          // {name, email, sessionActive}
  authStage: 'login',      // 'login' | 'verify'
  pendingCode: '',
  pendingName: '',
  pendingEmail: '',
  demoCode: null,
  authError: '',

  confirmDelete: false,
  donationUrl: DONATION_URL,
};

let saveStatusTimer = null;

/* ---------------- Boot ---------------- */
async function loadAll() {
  state.authData = await loadAuth();
  state.data = await loadData(emptyData);
  // migrate older saved data that may be missing newer fields
  if (!state.data.recurringExpenses) state.data.recurringExpenses = [];
  if (!state.data.settings) state.data.settings = { theme: 'dark', notificationsEnabled: false, lastNotifiedDate: null };
  state.chat = await loadChat();
  applyTheme();

  if (state.authData && state.authData.sessionActive) {
    const changed = applyRecurring(state.data);
    if (changed) await persistData(state.data);
    maybeNotify();
  }

  state.loading = false;
  render();
}

function applyTheme() {
  const theme = (state.data && state.data.settings && state.data.settings.theme) || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

/* ---------------- Notifications (best-effort, in-app only) ---------------- */
function maybeNotify() {
  const s = state.data.settings;
  if (!s.notificationsEnabled) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const today = new Date().toISOString().slice(0, 10);
  if (s.lastNotifiedDate === today) return;
  try {
    const { remaining } = computeQuickTotals();
    new Notification('Raíz — tu resumen de hoy', {
      body: `Tienes disponible aproximadamente $${Math.round(remaining).toLocaleString('es-CL')} este mes.`,
    });
  } catch (e) { /* ignore */ }
  s.lastNotifiedDate = today;
  autoSave();
}

function computeQuickTotals() {
  // small local helper to avoid importing totals() just for this
  const d = state.data;
  const month = new Date().toISOString().slice(0, 7);
  const spent = d.transactions.filter(t => t.type === 'expense' && (t.date || '').startsWith(month)).reduce((s, t) => s + t.amount, 0);
  return { remaining: (d.income || 0) - spent };
}

/* ---------------- Auto-save ---------------- */
async function autoSave() {
  state.saveStatus = 'saving';
  render();
  const ok = await persistData(state.data);
  state.saveStatus = ok ? 'saved' : 'idle';
  render();
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => { state.saveStatus = 'idle'; render(); }, 2000);
}

async function saveChatNow() {
  state.chat = await persistChat(state.chat);
}

function showToast(msg) {
  state.toast = msg;
  render();
  setTimeout(() => { state.toast = null; render(); }, 2600);
}

/* ---------------- Render ---------------- */
function render() {
  const root = document.getElementById('root');
  if (state.loading) {
    root.innerHTML = `<div class="app-shell"><div class="loader-screen"><div class="spinner"></div><div>Cargando tu bienestar financiero…</div></div></div>`;
    return;
  }

  // Not logged in yet
  if (!state.authData || !state.authData.sessionActive) {
    const body = state.authStage === 'verify' ? viewVerify(state) : viewLogin(state);
    root.innerHTML = `<div class="app-shell">${body}${state.modal ? renderModal(state) : ''}</div>`;
    attachHandlers();
    return;
  }

  if (!state.data.onboarded) {
    root.innerHTML = `<div class="app-shell">${viewOnboarding(state)}${state.modal ? renderModal(state) : ''}</div>`;
    attachHandlers();
    return;
  }

  let body = '';
  if (state.route === 'home') body = viewHome(state);
  else if (state.route === 'debts') body = viewDebts(state);
  else if (state.route === 'budget') body = viewBudget(state);
  else if (state.route === 'savings') body = viewSavings(state);
  else if (state.route === 'ia') body = viewChat(state);
  else if (state.route === 'settings') body = viewSettings(state);

  const showNav = state.route !== 'settings';

  root.innerHTML = `
    <div class="app-shell">
      <div class="app-main" id="scrollArea" style="${showNav ? '' : 'padding-bottom:24px;'}">${body}</div>
      ${showNav ? bottomNav(state) : ''}
      ${state.modal ? renderModal(state) : ''}
      ${state.toast ? `<div class="toast">${state.toast}</div>` : ''}
    </div>
  `;
  attachHandlers();
  const sa = document.getElementById('scrollArea');
  if (sa && state._keepScroll) { sa.scrollTop = sa.scrollHeight; state._keepScroll = false; }
}

/* ---------------- Events ---------------- */
function attachHandlers() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => { state.route = el.getAttribute('data-nav'); state.modal = null; state.confirmDelete = false; render(); });
  });
  const modalSheet = document.querySelector('[data-stop]');
  if (modalSheet) modalSheet.addEventListener('click', e => e.stopPropagation());
  const backdrop = document.querySelector('[data-act="backdrop"]');
  if (backdrop) backdrop.addEventListener('click', () => { state.modal = null; render(); });

  document.querySelectorAll('[data-act]').forEach(el => {
    const act = el.getAttribute('data-act');
    if (act === 'backdrop') return;
    if (el.tagName === 'INPUT') { el.addEventListener('change', () => handleAction(act, el)); return; }
    el.addEventListener('click', () => handleAction(act, el));
  });
  document.querySelectorAll('[data-picker="icon"]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('[data-picker="icon"]').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      const target = document.querySelector('[data-act="saveCat"],[data-act="saveGoal"]');
      if (target) target.setAttribute('data-icon', el.getAttribute('data-val'));
    });
  });
  document.querySelectorAll('[data-picker="cat"]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('[data-picker="cat"]').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
    });
  });
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });
}

function handleAction(act, el) {
  /* ---------- Auth ---------- */
  if (act === 'authContinue') {
    const name = document.getElementById('au_name').value.trim();
    const email = document.getElementById('au_email').value.trim();
    if (!name) { state.authError = 'Ingresa tu nombre.'; render(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { state.authError = 'Ingresa un correo válido.'; render(); return; }
    state.authError = '';
    state.pendingName = name;
    state.pendingEmail = email;
    startVerification();
    return;
  }
  if (act === 'authBack') { state.authStage = 'login'; state.authError = ''; render(); return; }
  if (act === 'authResend') { startVerification(); showToast('Código reenviado'); return; }
  if (act === 'authVerify') {
    const code = (document.getElementById('au_code').value || '').trim();
    if (code !== state.pendingCode) { state.authError = 'Código incorrecto. Intenta de nuevo.'; render(); return; }
    state.authData = { name: state.pendingName, email: state.pendingEmail, sessionActive: true };
    saveAuth(state.authData);
    state.authError = '';
    state.demoCode = null;
    // load / apply recurring now that we're "in"
    (async () => {
      const changed = applyRecurring(state.data);
      if (changed) await persistData(state.data);
      maybeNotify();
      render();
    })();
    return;
  }
  if (act === 'logout') {
    state.authData.sessionActive = false;
    saveAuth(state.authData);
    state.route = 'home';
    render();
    return;
  }

  /* ---------- Onboarding ---------- */
  if (act === 'obNext1') {
    const name = document.getElementById('ob_name').value.trim();
    state.data.name = name || state.authData.name;
    state.onboardStep = 2; render(); return;
  }
  if (act === 'obNext2') {
    state.data.income = Number(document.getElementById('ob_income').value) || 0;
    state.onboardStep = 3; render(); return;
  }
  if (act === 'obNext3') { state.onboardStep = 4; render(); return; }
  if (act === 'obNext4') { state.onboardStep = 5; render(); return; }
  if (act === 'obBack') { state.onboardStep = Math.max(1, state.onboardStep - 1); render(); return; }
  if (act === 'obFinish') {
    state.data.onboarded = true;
    autoSave();
    state.route = 'home';
    render();
    return;
  }

  /* ---------- Navigation / modal open-close ---------- */
  if (act === 'openAdd') { state.modal = { type: 'chooseType' }; render(); return; }
  if (act === 'closeModal') { state.modal = null; render(); return; }
  if (act === 'addType') { state.modal = { type: el.getAttribute('data-type'), payload: {} }; render(); return; }
  if (act === 'openDonate') { state.modal = { type: 'donate' }; render(); return; }

  if (act === 'editDebt') {
    const d = state.data.debts.find(x => x.id === el.getAttribute('data-id'));
    state.modal = { type: 'debt', payload: d }; render(); return;
  }
  if (act === 'editCat') {
    const c = state.data.budgetCategories.find(x => x.id === el.getAttribute('data-id'));
    state.modal = { type: 'cat', payload: c }; render(); return;
  }
  if (act === 'editGoal') {
    const g = state.data.savingsGoals.find(x => x.id === el.getAttribute('data-id'));
    state.modal = { type: 'goal', payload: g }; render(); return;
  }
  if (act === 'editRecurringExpense') {
    const r = state.data.recurringExpenses.find(x => x.id === el.getAttribute('data-id'));
    state.modal = { type: 'recurringExpense', payload: r }; render(); return;
  }
  if (act === 'contribute') {
    const g = state.data.savingsGoals.find(x => x.id === el.getAttribute('data-id'));
    state.modal = { type: 'contribute', payload: g }; render(); return;
  }
  if (act === 'quickCat') {
    state.modal = { type: 'quickCat', payload: { icon: el.getAttribute('data-icon'), label: el.getAttribute('data-label') } };
    render(); return;
  }
  if (act === 'editIncome') { state.modal = { type: 'editIncome' }; render(); return; }

  /* ---------- Settings: theme / notifications ---------- */
  if (act === 'setTheme') {
    state.data.settings.theme = el.getAttribute('data-theme');
    applyTheme();
    autoSave();
    render();
    return;
  }
  if (act === 'toggleNotif') {
    const wantOn = el.checked;
    if (wantOn && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission().then(perm => {
        state.data.settings.notificationsEnabled = perm === 'granted';
        autoSave(); render();
        if (perm !== 'granted') showToast('Necesitas permitir notificaciones en tu navegador');
      });
      return;
    }
    state.data.settings.notificationsEnabled = wantOn;
    autoSave(); render();
    return;
  }

  /* ---------- Delete account ---------- */
  if (act === 'askDeleteAccount') { state.confirmDelete = true; render(); return; }
  if (act === 'deleteAccountConfirmed') {
    (async () => {
      await deleteEverything();
      state = {
        route: 'home', data: emptyData(), chat: [], loading: false, modal: null, toast: null,
        sending: false, saveStatus: 'idle', onboardStep: 1, _keepScroll: false,
        authData: null, authStage: 'login', pendingCode: '', pendingName: '', pendingEmail: '',
        demoCode: null, authError: '', confirmDelete: false, donationUrl: DONATION_URL,
      };
      applyTheme();
      render();
    })();
    return;
  }

  /* ---------- Transactions (ingreso / gasto) ---------- */
  if (act === 'saveTx') {
    const kind = el.getAttribute('data-kind');
    const amount = Number(document.getElementById('f_amount').value) || 0;
    const date = document.getElementById('f_date').value || new Date().toISOString().slice(0, 10);
    const note = document.getElementById('f_note') ? document.getElementById('f_note').value.trim() : '';
    if (amount <= 0) { showToast('Ingresa un monto válido'); return; }
    let categoryId = null;
    if (kind === 'expense') {
      const picked = document.querySelector('[data-picker="cat"].active');
      if (!picked) { showToast('Elige una categoría'); return; }
      categoryId = picked.getAttribute('data-val');
    }
    state.data.transactions.push({ id: uid(), type: kind, amount, date, note, categoryId });
    autoSave(); state.modal = null; render();
    showToast(kind === 'income' ? 'Ingreso registrado' : 'Gasto registrado');
    return;
  }
  if (act === 'deleteTx') {
    state.data.transactions = state.data.transactions.filter(x => x.id !== el.getAttribute('data-id'));
    autoSave(); render(); showToast('Movimiento eliminado'); return;
  }

  /* ---------- Income base ---------- */
  if (act === 'saveIncome') {
    state.data.income = Number(document.getElementById('f_income').value) || 0;
    autoSave(); state.modal = null; render(); showToast('Ingreso mensual actualizado'); return;
  }

  /* ---------- Categories ---------- */
  if (act === 'saveQuickCat') {
    state.data.budgetCategories.push({ id: uid(), name: el.getAttribute('data-label'), icon: el.getAttribute('data-icon'), budget: 0 });
    autoSave(); state.modal = null; state.route = 'budget'; render(); showToast('Categoría agregada'); return;
  }
  if (act === 'saveCat') {
    const id = el.getAttribute('data-id');
    const name = document.getElementById('f_name').value.trim() || 'Categoría';
    const budget = Number(document.getElementById('f_budget').value) || 0;
    const iconv = el.getAttribute('data-icon');
    if (id) {
      const c = state.data.budgetCategories.find(x => x.id === id);
      Object.assign(c, { name, budget, icon: iconv });
    } else {
      state.data.budgetCategories.push({ id: uid(), name, icon: iconv, budget });
    }
    autoSave(); state.modal = null; render(); showToast('Categoría guardada'); return;
  }
  if (act === 'deleteCat') {
    const id = el.getAttribute('data-id');
    state.data.budgetCategories = state.data.budgetCategories.filter(x => x.id !== id);
    state.data.transactions = state.data.transactions.filter(x => x.categoryId !== id);
    autoSave(); state.modal = null; render(); showToast('Categoría eliminada'); return;
  }

  /* ---------- Recurring expenses ---------- */
  if (act === 'saveRecurringExpense') {
    const id = el.getAttribute('data-id');
    const name = document.getElementById('f_name').value.trim() || 'Gasto fijo';
    const amount = Number(document.getElementById('f_amount').value) || 0;
    const day = Math.min(28, Math.max(1, Number(document.getElementById('f_day').value) || 1));
    if (id) {
      const r = state.data.recurringExpenses.find(x => x.id === id);
      Object.assign(r, { name, amount, day });
    } else {
      // auto-create/find a matching budget category so it shows up nicely in Presupuesto
      let cat = state.data.budgetCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!cat) {
        cat = { id: uid(), name, icon: 'house', budget: amount };
        state.data.budgetCategories.push(cat);
      }
      state.data.recurringExpenses.push({ id: uid(), name, amount, day, categoryId: cat.id, lastAppliedMonth: null });
    }
    autoSave(); state.modal = null; render(); showToast('Gasto automático guardado'); return;
  }
  if (act === 'deleteRecurringExpense') {
    state.data.recurringExpenses = state.data.recurringExpenses.filter(x => x.id !== el.getAttribute('data-id'));
    autoSave(); state.modal = null; render(); showToast('Gasto automático eliminado'); return;
  }

  /* ---------- Debts ---------- */
  if (act === 'saveDebt') {
    const id = el.getAttribute('data-id');
    const name = document.getElementById('f_name').value.trim() || 'Deuda';
    const total = Number(document.getElementById('f_total').value) || 0;
    const paid = Number(document.getElementById('f_paid').value) || 0;
    const minPayment = Number(document.getElementById('f_min').value) || 0;
    const dueDate = document.getElementById('f_date').value;
    if (id) {
      const d = state.data.debts.find(x => x.id === id);
      Object.assign(d, { name, total, paid, minPayment, dueDate });
    } else {
      state.data.debts.push({ id: uid(), name, total, paid, minPayment, dueDate });
    }
    autoSave(); state.modal = null; render(); showToast('Deuda guardada'); return;
  }
  if (act === 'deleteDebt') {
    state.data.debts = state.data.debts.filter(x => x.id !== el.getAttribute('data-id'));
    autoSave(); state.modal = null; render(); showToast('Deuda eliminada'); return;
  }

  /* ---------- Savings goals ---------- */
  if (act === 'saveGoal') {
    const id = el.getAttribute('data-id');
    const name = document.getElementById('f_name').value.trim() || 'Meta';
    const target = Number(document.getElementById('f_target').value) || 0;
    const current = Number(document.getElementById('f_current').value) || 0;
    const monthlyAmount = Number(document.getElementById('f_monthly').value) || 0;
    const iconv = el.getAttribute('data-icon');
    if (id) {
      const g = state.data.savingsGoals.find(x => x.id === id);
      Object.assign(g, { name, target, current, icon: iconv, monthlyAmount });
    } else {
      state.data.savingsGoals.push({ id: uid(), name, icon: iconv, target, current, monthlyAmount, lastAppliedMonth: null });
    }
    autoSave(); state.modal = null; render(); showToast('Meta guardada'); return;
  }
  if (act === 'deleteGoal') {
    state.data.savingsGoals = state.data.savingsGoals.filter(x => x.id !== el.getAttribute('data-id'));
    autoSave(); state.modal = null; render(); showToast('Meta eliminada'); return;
  }
  if (act === 'doContribute') {
    const id = el.getAttribute('data-id');
    const amount = Number(document.getElementById('f_amount').value) || 0;
    const g = state.data.savingsGoals.find(x => x.id === id);
    if (g && amount > 0) { g.current += amount; autoSave(); showToast('¡Abono agregado! 🎉'); }
    state.modal = null; render(); return;
  }

  /* ---------- Chat ---------- */
  if (act === 'sendChat') { sendChatMessage(); return; }
  if (act === 'chatChip') { sendChatMessage(el.textContent.trim()); return; }
}

/* ---------------- Verification flow ---------------- */
async function startVerification() {
  const code = generateCode();
  state.pendingCode = code;
  state.authStage = 'verify';
  render();
  const result = await sendVerificationCode(state.pendingName, state.pendingEmail, code);
  state.demoCode = result.simulated ? code : null;
  render();
}

/* ---------------- Chat flow ---------------- */
async function sendChatMessage(preset) {
  if (state.sending) return;
  const input = document.getElementById('chatInput');
  const text = preset || (input ? input.value.trim() : '');
  if (!text) return;

  state.chat.push({ role: 'user', content: text });
  state.sending = true;
  state._keepScroll = true;
  render();
  saveChatNow();

  const reply = await fetchAIResponse(state.data, state.chat);
  state.chat.push({ role: 'assistant', content: reply });
  state.sending = false;
  state._keepScroll = true;
  if (input) input.value = '';
  render();
  saveChatNow();
}

loadAll();
