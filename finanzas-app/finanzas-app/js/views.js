// views.js — pure render functions: (state) => HTML string. No event wiring, no storage calls.

import { icon, ICON_CHOICES } from './icons.js';
import { money, esc, clamp, colorFor, formatDate, totals, healthScore, categorySpent, uid } from './state.js';

export function emptyState(txt) {
  return `<div class="empty-state">${esc(txt)}</div>`;
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ---------------- Auth: login / verify ---------------- */
export function viewLogin(state) {
  const a = state.authData || {};
  return `
    <div class="onboard-screen">
      <div class="onboard-emoji">${icon('user', 38)}</div>
      <div class="onboard-title">Ingresa a tu cuenta</div>
      <div class="onboard-sub">Regístrate con tu nombre y correo. Te enviaremos un código de 6 dígitos para verificar tu cuenta.</div>
      <div class="onboard-body">
        <div class="field"><label>Tu nombre</label><input id="au_name" placeholder="Ej: Tomás" value="${esc(a.name || '')}"/></div>
        <div class="field"><label>Correo electrónico</label><input id="au_email" type="email" placeholder="tucorreo@ejemplo.com" value="${esc(a.email || '')}"/></div>
        ${state.authError ? `<p class="hint" style="color:var(--rust)">${esc(state.authError)}</p>` : ''}
      </div>
      <div class="onboard-foot">
        <button class="btn btn-primary btn-block" data-act="authContinue">${icon('mail', 15)} Enviar código</button>
      </div>
    </div>`;
}

export function viewVerify(state) {
  return `
    <div class="onboard-screen">
      <div class="onboard-emoji">${icon('lock', 38)}</div>
      <div class="onboard-title">Verifica tu correo</div>
      <div class="onboard-sub">Enviamos un código de 6 dígitos a <b>${esc(state.pendingEmail)}</b>.</div>
      <div class="onboard-body">
        ${state.demoCode ? `<div class="demo-code-banner">
          <div class="lbl">Modo demo — esta app aún no tiene un servicio de correo conectado, así que tu código aparece aquí mismo:</div>
          <div class="code">${state.demoCode}</div>
        </div>` : ''}
        <div class="field"><label>Código de verificación</label><input id="au_code" class="code-input" type="text" inputmode="numeric" maxlength="6" placeholder="000000"/></div>
        ${state.authError ? `<p class="hint" style="color:var(--rust)">${esc(state.authError)}</p>` : ''}
        <div class="onboard-skip" data-act="authResend">Reenviar código</div>
      </div>
      <div class="onboard-foot">
        <button class="btn btn-ghost" data-act="authBack">Atrás</button>
        <button class="btn btn-primary btn-block" data-act="authVerify">Verificar</button>
      </div>
    </div>`;
}

/* ---------------- Onboarding (5 steps) ---------------- */
export function viewOnboarding(state) {
  const step = state.onboardStep || 1;
  const total = 5;
  const progress = Array.from({ length: total }, (_, i) => `<i class="${i < step ? 'done' : ''}"></i>`).join('');
  const d = state.data;

  if (step === 1) {
    return `<div class="onboard-screen">
      <div class="onboard-progress">${progress}</div>
      <div class="onboard-emoji">${icon('waveHand', 40)}</div>
      <div class="onboard-title">Bienvenido a Raíz</div>
      <div class="onboard-sub">Una app simple y humana para ayudarte a organizar tu dinero, cumplir tus metas y vivir con más tranquilidad. Primero, ¿cómo te llamas?</div>
      <div class="onboard-body">
        <div class="field"><label>Tu nombre</label><input id="ob_name" placeholder="Ej: Tomás" value="${esc(d.name || '')}"/></div>
      </div>
      <div class="onboard-foot"><button class="btn btn-primary btn-block" data-act="obNext1">Continuar</button></div>
    </div>`;
  }
  if (step === 2) {
    return `<div class="onboard-screen">
      <div class="onboard-progress">${progress}</div>
      <div class="onboard-emoji">${icon('wallet', 36)}</div>
      <div class="onboard-title">¿Cuál es tu ingreso mensual?</div>
      <div class="onboard-sub">Con esto calculamos tu presupuesto restante, el progreso de tus ingresos y tu salud financiera. Puedes cambiarlo cuando quieras.</div>
      <div class="onboard-body">
        <div class="field"><label>Ingreso mensual aproximado</label><input id="ob_income" type="number" placeholder="0" value="${d.income || ''}"/></div>
      </div>
      <div class="onboard-foot">
        <button class="btn btn-ghost" data-act="obBack">Atrás</button>
        <button class="btn btn-primary btn-block" data-act="obNext2">Continuar</button>
      </div>
    </div>`;
  }
  if (step === 3) {
    return `<div class="onboard-screen">
      <div class="onboard-progress">${progress}</div>
      <div class="onboard-emoji">${icon('house', 36)}</div>
      <div class="onboard-title">¿Tienes gastos fijos?</div>
      <div class="onboard-sub">Cosas como el arriendo, se registrarán solas cada mes, sin que tengas que anotarlas tú.</div>
      <div class="onboard-body">
        ${d.recurringExpenses.length ? `<div class="card list-card" style="margin-bottom:14px;">
          ${d.recurringExpenses.map(r => `<div class="rec-row"><div class="ricon">${icon('house',16)}</div><div class="rmid"><div class="r1">${esc(r.name)}</div><div class="r2">Se descuenta el día ${r.day} de cada mes</div></div><div class="ramt num">${money(r.amount)}</div></div>`).join('')}
        </div>` : ''}
        <button class="btn btn-ghost btn-block" data-act="addType" data-type="recurringExpense">${icon('plus', 14)} Agregar gasto fijo</button>
      </div>
      <div class="onboard-foot">
        <button class="btn btn-ghost" data-act="obBack">Atrás</button>
        <button class="btn btn-primary btn-block" data-act="obNext3">Continuar</button>
      </div>
    </div>`;
  }
  if (step === 4) {
    return `<div class="onboard-screen">
      <div class="onboard-progress">${progress}</div>
      <div class="onboard-emoji">${icon('piggy', 36)}</div>
      <div class="onboard-title">Ahorro automático</div>
      <div class="onboard-sub">Crea una meta y define un monto mensual: se sumará solo cada mes, sin que tengas que hacer nada.</div>
      <div class="onboard-body">
        ${d.savingsGoals.length ? `<div class="card list-card" style="margin-bottom:14px;">
          ${d.savingsGoals.map((g,i) => `<div class="rec-row"><div class="ricon" style="background:${colorFor(i)}22; color:${colorFor(i)};">${icon(g.icon||'target',16)}</div><div class="rmid"><div class="r1">${esc(g.name)}</div><div class="r2">${g.monthlyAmount>0 ? 'Ahorro automático: '+money(g.monthlyAmount)+'/mes' : 'Sin ahorro automático'}</div></div></div>`).join('')}
        </div>` : ''}
        <button class="btn btn-ghost btn-block" data-act="addType" data-type="goal">${icon('plus', 14)} Crear meta de ahorro</button>
      </div>
      <div class="onboard-foot">
        <button class="btn btn-ghost" data-act="obBack">Atrás</button>
        <button class="btn btn-primary btn-block" data-act="obNext4">Continuar</button>
      </div>
    </div>`;
  }
  // step 5
  return `<div class="onboard-screen">
    <div class="onboard-progress">${progress}</div>
    <div class="onboard-emoji">${icon('sparkles', 36)}</div>
    <div class="onboard-title">Un último paso</div>
    <div class="onboard-sub">¿Quieres agregar algo más? Puedes omitir esto y hacerlo después desde la app.</div>
    <div class="onboard-body">
      <div class="onboard-quick">
        <div class="oq" data-act="addType" data-type="debt">
          <div class="oqicon">${icon('wallet', 18)}</div>
          <div class="oqtext"><div class="t1">Registrar una deuda</div><div class="t2">Tarjetas, préstamos, dinero que debes</div></div>
        </div>
        <div class="oq" data-act="addType" data-type="cat">
          <div class="oqicon">${icon('chart', 18)}</div>
          <div class="oqtext"><div class="t1">Crear categoría de gasto</div><div class="t2">Comida, transporte, entretenimiento…</div></div>
        </div>
      </div>
    </div>
    <div class="onboard-foot">
      <button class="btn btn-ghost" data-act="obBack">Atrás</button>
      <button class="btn btn-primary btn-block" data-act="obFinish">Ir a mi app</button>
    </div>
  </div>`;
}

/* ---------------- Bottom nav ---------------- */
export function bottomNav(state) {
  const items = [
    { k: 'home', ic: 'home', lbl: 'Inicio' },
    { k: 'debts', ic: 'wallet', lbl: 'Deudas' },
    { k: '__fab__' },
    { k: 'savings', ic: 'piggy', lbl: 'Ahorros' },
    { k: 'ia', ic: 'sparkles', lbl: 'IA' },
  ];
  return `<div class="bottomnav">
    ${items.map(it => it.k === '__fab__'
      ? `<div class="fab" data-act="openAdd">${icon('plus', 22)}</div>`
      : `<button class="navitem ${state.route === it.k ? 'active' : ''}" data-nav="${it.k}">${icon(it.ic, 20)}<span>${it.lbl}</span></button>`
    ).join('')}
  </div>`;
}

function autosaveBadge(state) {
  const s = state.saveStatus || 'idle';
  const label = s === 'saving' ? 'Guardando…' : s === 'saved' ? 'Guardado' : 'Autoguardado activo';
  return `<span class="autosave ${s}"><span class="adot"></span>${label}</span>`;
}

/* ---------------- HOME ---------------- */
export function viewHome(state) {
  const t = totals(state.data);
  const score = healthScore(state.data);
  const scoreColor = score >= 70 ? 'var(--sage)' : score >= 45 ? 'var(--accent-2)' : 'var(--rust)';
  const circumference = 2 * Math.PI * 54;
  const dash = circumference * (score / 100);
  const msg = score >= 70 ? '¡Vas por buen camino!' : score >= 45 ? 'Puedes mejorar, paso a paso.' : 'Ordenemos tus finanzas juntos.';

  return `
    <div class="topbar">
      <div>
        <div class="greet">Hola, ${esc(state.data.name || 'de nuevo')} 👋</div>
        <div class="sub">${autosaveBadge(state)}</div>
      </div>
      <div class="topbar-actions">
        <div class="iconbtn" data-nav="settings">${icon('gear', 18)}</div>
      </div>
    </div>

    <div class="card">
      <div class="gauge-wrap">
        <div class="gauge-label">Tu salud financiera</div>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="54" fill="none" stroke="var(--surface-2)" stroke-width="11"/>
          <circle cx="70" cy="70" r="54" fill="none" stroke="${scoreColor}" stroke-width="11"
            stroke-linecap="round" stroke-dasharray="${dash} ${circumference}"
            transform="rotate(-90 70 70)"/>
        </svg>
        <div class="gauge-score" style="color:${scoreColor}">${score}<sup>/100</sup></div>
        <div class="gauge-msg" style="color:${scoreColor}">${msg}</div>
      </div>
      <div class="stat-row">
        <div class="stat-chip debt"><div class="lbl">Deudas totales</div><div class="val num">${money(t.totalDebt)}</div></div>
        <div class="stat-chip save"><div class="lbl">Ahorros totales</div><div class="val num">${money(t.totalSaved)}</div></div>
        <div class="stat-chip budget"><div class="lbl">Presupuesto restante</div><div class="val num">${money(t.remaining)}</div></div>
      </div>
      <div class="progress-block">
        <div class="prow"><span>Progreso de ingresos este mes</span><b class="num">${money(t.totalReceived)} / ${money(t.totalExpected)}</b></div>
        <div class="progress-outer"><i style="width:${clamp(t.incomePct,0,100)}%"></i></div>
      </div>
    </div>

    <div class="section-title">Accesos rápidos</div>
    <div class="card quick-list">
      <div class="quick-item income" data-act="addType" data-type="income"><div class="qicon">${icon('arrowDown', 16)}</div><div class="qtext">Registrar ingreso</div><div class="chev">${icon('chev', 16)}</div></div>
      <div class="quick-item expense" data-act="addType" data-type="expense"><div class="qicon">${icon('arrowUp', 16)}</div><div class="qtext">Registrar gasto</div><div class="chev">${icon('chev', 16)}</div></div>
      <div class="quick-item" data-nav="debts"><div class="qicon">${icon('wallet', 16)}</div><div class="qtext">Ver todas mis deudas</div><div class="chev">${icon('chev', 16)}</div></div>
      <div class="quick-item" data-nav="budget"><div class="qicon">${icon('chart', 16)}</div><div class="qtext">Mi presupuesto</div><div class="chev">${icon('chev', 16)}</div></div>
      <div class="quick-item" data-nav="savings"><div class="qicon">${icon('piggy', 16)}</div><div class="qtext">Mis ahorros</div><div class="chev">${icon('chev', 16)}</div></div>
    </div>

    <div class="section-title">Personaliza tu experiencia</div>
    <div class="custom-row">
      ${['heart:Salud', 'book:Educación', 'paw:Mascotas', 'trend:Inversiones', 'house:Hogar'].map(p => {
        const [ic, lbl] = p.split(':');
        return `<div class="custom-chip" data-act="quickCat" data-icon="${ic}" data-label="${lbl}">
          <div class="ci">${icon(ic, 20)}</div><span>${lbl}</span>
        </div>`;
      }).join('')}
      <div class="custom-chip" data-act="openAdd">
        <div class="ci" style="color:var(--accent-2); border-color:var(--accent);">${icon('plus', 20)}</div><span>Agregar</span>
      </div>
    </div>

    <div class="card tip-card" style="margin-top:14px;">
      <div class="ticon">${icon('lock', 18)}</div>
      <p><b>Seguro y privado.</b> Tus datos se guardan solo en tu cuenta y nadie más tiene acceso a ellos.</p>
    </div>
  `;
}

/* ---------------- DEBTS ---------------- */
export function viewDebts(state) {
  const t = totals(state.data);
  const debts = state.data.debts;
  return `
    <div class="headerrow">
      <div class="iconbtn back" data-nav="home">${icon('back', 18)}</div>
      <h2>Mis deudas</h2>
      <div class="spacer"></div>
      ${autosaveBadge(state)}
      <div class="iconbtn" data-act="addType" data-type="debt">${icon('plus', 18)}</div>
    </div>
    <div class="card debt-total-card">
      <div class="lbl">Deuda total</div>
      <div class="amt num">${money(t.totalDebt)}</div>
    </div>
    <div class="card list-card" style="margin-top:12px;">
      ${debts.length === 0 ? emptyState('Aún no registras deudas. Toca “+” para agregar la primera.') :
        debts.map(d => {
          const remaining = Math.max(0, d.total - d.paid);
          const pct = d.total > 0 ? clamp(Math.round((d.paid / d.total) * 100), 0, 100) : 0;
          const ringColor = pct >= 66 ? 'var(--sage)' : pct >= 33 ? 'var(--accent-2)' : 'var(--rust)';
          const c = 2 * Math.PI * 20;
          return `<div class="item-row" data-act="editDebt" data-id="${d.id}">
            <div class="item-main">
              <div class="name">${esc(d.name)}</div>
              <div class="amt num" style="color:var(--rust)">${money(remaining)}</div>
              <div class="meta">Pago mínimo: ${money(d.minPayment)} · Vence: ${formatDate(d.dueDate)}</div>
            </div>
            <div class="ring">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="20" fill="none" stroke="var(--surface-2)" stroke-width="5"/>
                <circle cx="26" cy="26" r="20" fill="none" stroke="${ringColor}" stroke-width="5" stroke-linecap="round"
                  stroke-dasharray="${c * pct / 100} ${c}"/>
              </svg>
              <div class="pct">${pct}%</div>
            </div>
          </div>`;
        }).join('')
      }
    </div>
    ${debts.length > 0 ? `<div class="card tip-card" style="margin-top:12px;">
      <div class="ticon">${icon('sparkles', 18)}</div>
      <p><b>Tip IA:</b> pídele al asistente un plan concreto para pagar tus deudas más rápido según tu presupuesto actual.</p>
    </div>` : ''}
  `;
}

/* ---------------- BUDGET ---------------- */
export function viewBudget(state) {
  const d = state.data;
  const t = totals(d);
  const cats = d.budgetCategories;
  const spentByCat = cats.map(c => categorySpent(d, c.id));
  const totalSpentForDonut = spentByCat.reduce((s, v) => s + v, 0) || 1;
  let accFrac = 0;
  const r = 46, c = 2 * Math.PI * r;
  const segs = cats.map((cat, i) => {
    const frac = spentByCat[i] / totalSpentForDonut;
    const seg = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${colorFor(i)}" stroke-width="14"
      stroke-dasharray="${c * frac} ${c}" stroke-dashoffset="${-accFrac * c}" transform="rotate(-90 60 60)"/>`;
    accFrac += frac;
    return seg;
  }).join('');

  const recentTx = d.transactions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);

  return `
    <div class="headerrow">
      <div class="iconbtn back" data-nav="home">${icon('back', 18)}</div>
      <h2>Mi presupuesto</h2>
      <div class="spacer"></div>
      ${autosaveBadge(state)}
    </div>
    <div class="card">
      <div class="donut-wrap">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="14"/>
          ${cats.length ? segs : ''}
        </svg>
        <div class="donut-mid">
          <div class="row income"><span class="l">Ingreso esperado</span><span class="v num">${money(t.totalExpected)}</span></div>
          <div class="row expense"><span class="l">Gastos</span><span class="v num">${money(t.totalSpent)}</span></div>
          <div class="row rest"><span class="l">Restante</span><span class="v num">${money(t.remaining)}</span></div>
        </div>
      </div>
      <div class="quickadd-row">
        <button class="btn btn-income btn-sm btn-block" data-act="addType" data-type="income">${icon('arrowDown', 14)} Nuevo ingreso</button>
        <button class="btn btn-expense btn-sm btn-block" data-act="addType" data-type="expense">${icon('arrowUp', 14)} Nuevo gasto</button>
      </div>
    </div>

    <div class="section-title">Categorías de gasto</div>
    <div class="card list-card">
      ${cats.length === 0 ? emptyState('Crea tu primera categoría para organizar tus gastos.') :
        cats.map((cat, i) => {
          const spent = spentByCat[i];
          const pct = cat.budget > 0 ? clamp(Math.round((spent / cat.budget) * 100), 0, 999) : 0;
          const over = spent > cat.budget;
          return `<div class="item-row" data-act="editCat" data-id="${cat.id}" style="align-items:center;">
            <div class="qicon" style="background:${colorFor(i)}22; color:${colorFor(i)};">${icon(cat.icon || 'more', 16)}</div>
            <div class="cwrap">
              <div style="display:flex; justify-content:space-between; align-items:baseline;">
                <span class="cn">${esc(cat.name)}</span>
                <span class="camt num" style="color:${over ? 'var(--rust)' : 'var(--text-mute)'}">${money(spent)} / ${money(cat.budget)}</span>
              </div>
              <div class="cbar"><i style="width:${clamp(pct, 0, 100)}%; background:${over ? 'var(--rust)' : colorFor(i)};"></i></div>
            </div>
          </div>`;
        }).join('')
      }
      <div class="item-row" data-act="addType" data-type="cat" style="justify-content:center; color:var(--accent-2); font-weight:600; font-size:13px; cursor:pointer;">
        ${icon('plus', 15)}&nbsp; Agregar categoría
      </div>
    </div>

    <div class="section-title">Gastos automáticos</div>
    <div class="card list-card">
      ${d.recurringExpenses.length === 0 ? emptyState('Configura gastos como el arriendo para que se registren solos cada mes.') :
        d.recurringExpenses.map(r => `<div class="item-row" data-act="editRecurringExpense" data-id="${r.id}">
          <div class="qicon">${icon('house', 16)}</div>
          <div class="cwrap">
            <div class="cn">${esc(r.name)}</div>
            <div class="meta" style="font-size:11.5px; color:var(--text-mute); margin-top:2px;">Cada mes, día ${r.day}</div>
          </div>
          <div class="amt num" style="color:var(--rust); font-size:14px; font-family:var(--font-display);">${money(r.amount)}</div>
        </div>`).join('')
      }
      <div class="item-row" data-act="addType" data-type="recurringExpense" style="justify-content:center; color:var(--accent-2); font-weight:600; font-size:13px; cursor:pointer;">
        ${icon('plus', 15)}&nbsp; Agregar gasto automático
      </div>
    </div>

    <div class="section-title">Movimientos recientes</div>
    <div class="card list-card">
      ${recentTx.length === 0 ? emptyState('Aún no registras ingresos ni gastos este mes.') :
        recentTx.map(tx => {
          const cat = cats.find(c => c.id === tx.categoryId);
          return `<div class="tx-row">
            <div class="tx-icon ${tx.type === 'income' ? 'in' : 'out'}">${icon(tx.type === 'income' ? 'arrowDown' : 'arrowUp', 14)}</div>
            <div class="tx-mid">
              <div class="t1">${esc(tx.note) || (tx.type === 'income' ? 'Ingreso' : (cat ? cat.name : 'Gasto'))}${tx.recurringId ? ' <span class="badge-auto">Auto</span>' : ''}</div>
              <div class="t2">${formatDate(tx.date)}${tx.type === 'expense' && cat ? ' · ' + esc(cat.name) : ''}</div>
            </div>
            <div class="tx-amt ${tx.type === 'income' ? 'in' : 'out'} num">${tx.type === 'income' ? '+' : '-'}${money(tx.amount)}</div>
            <div class="tx-del" data-act="deleteTx" data-id="${tx.id}">${icon('x', 14)}</div>
          </div>`;
        }).join('')
      }
    </div>
  `;
}

/* ---------------- SAVINGS ---------------- */
export function viewSavings(state) {
  const d = state.data;
  const t = totals(d);
  return `
    <div class="headerrow">
      <div class="iconbtn back" data-nav="home">${icon('back', 18)}</div>
      <h2>Mis ahorros</h2>
      <div class="spacer"></div>
      ${autosaveBadge(state)}
      <div class="iconbtn" data-act="addType" data-type="goal">${icon('plus', 18)}</div>
    </div>
    <div class="card debt-total-card">
      <div class="lbl">Ahorros totales</div>
      <div class="amt num" style="color:var(--sage)">${money(t.totalSaved)}</div>
    </div>
    <div class="section-title">Mis metas</div>
    ${d.savingsGoals.length === 0 ? `<div class="card">${emptyState('Crea tu primera meta de ahorro.')}</div>` :
      d.savingsGoals.map((g, i) => {
        const pct = g.target > 0 ? clamp(Math.round((g.current / g.target) * 100), 0, 999) : 0;
        return `<div class="card goal-card" data-id="${g.id}">
          <div class="goal-head">
            <div class="goal-icon" style="background:${colorFor(i)}22; color:${colorFor(i)};">${icon(g.icon || 'target', 20)}</div>
            <div>
              <div class="goal-name">${esc(g.name)}${g.monthlyAmount > 0 ? '<span class="badge-auto">Auto</span>' : ''}</div>
              <div class="goal-amt num">${money(g.current)} / ${money(g.target)}${g.monthlyAmount > 0 ? ' · +' + money(g.monthlyAmount) + '/mes' : ''}</div>
            </div>
            <div class="goal-pct">${pct}%</div>
          </div>
          <div class="goal-bar"><i style="width:${clamp(pct, 0, 100)}%"></i></div>
          <div class="goal-actions">
            <button class="btn btn-primary btn-sm" data-act="contribute" data-id="${g.id}">${icon('plus', 13)} Abonar</button>
            <button class="btn btn-ghost btn-sm" data-act="editGoal" data-id="${g.id}">${icon('edit', 13)} Editar</button>
          </div>
        </div>`;
      }).join('')
    }
    <div class="card quote-card" style="margin-top:14px;">
      <p>"El ahorro no se trata de cuánto ganas, sino de cuánto guardas para tu futuro."</p>
    </div>
  `;
}

/* ---------------- IA CHAT ---------------- */
export function viewChat(state) {
  const msgs = state.chat;
  return `
    <div class="headerrow">
      <div class="iconbtn back" data-nav="home">${icon('back', 18)}</div>
      <h2>Asistente IA</h2>
      <div class="spacer"></div>
    </div>
    <div class="chat-scroll">
      ${msgs.length === 0 ? `<div class="msg bot">¡Hola${state.data.name ? ', ' + esc(state.data.name) : ''}! 👋 Soy tu asistente financiero. Puedo revisar tus deudas, tu presupuesto y tus metas de ahorro para darte consejos concretos. ¿En qué puedo ayudarte hoy?</div>` : ''}
      ${msgs.map(m => `<div class="msg ${m.role === 'user' ? 'user' : 'bot'}">${esc(m.content)}</div>`).join('')}
      ${state.sending ? `<div class="msg bot typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>` : ''}
    </div>
    ${msgs.length === 0 && !state.sending ? `<div class="chips-row">
      <div class="chip" data-act="chatChip">¿Cómo salgo de deudas más rápido?</div>
      <div class="chip" data-act="chatChip">Analiza mi presupuesto</div>
      <div class="chip" data-act="chatChip">Tips para ahorrar más</div>
    </div>` : ''}
    <div class="chat-inputbar">
      <input id="chatInput" type="text" placeholder="Escribe tu mensaje…" ${state.sending ? 'disabled' : ''} />
      <button class="sendbtn" data-act="sendChat" ${state.sending ? 'disabled' : ''}>${icon('send', 15)}</button>
    </div>
  `;
}

/* ---------------- SETTINGS ---------------- */
export function viewSettings(state) {
  const a = state.authData || {};
  const s = state.data.settings;
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
  return `
    <div class="headerrow">
      <div class="iconbtn back" data-nav="home">${icon('back', 18)}</div>
      <h2>Configuración</h2>
      <div class="spacer"></div>
    </div>

    <div class="card profile-card">
      <div class="profile-avatar">${initials(a.name || state.data.name)}</div>
      <div>
        <div class="profile-name">${esc(a.name || state.data.name || 'Sin nombre')}</div>
        <div class="profile-email">${esc(a.email || '')}</div>
      </div>
    </div>

    <div class="section-title">Apariencia</div>
    <div class="card">
      <div class="theme-row">
        <div class="theme-opt ${s.theme === 'light' ? 'active' : ''}" data-act="setTheme" data-theme="light">${icon('sun', 22)}<span>Claro</span></div>
        <div class="theme-opt ${s.theme === 'dark' ? 'active' : ''}" data-act="setTheme" data-theme="dark">${icon('moon', 22)}<span>Oscuro</span></div>
      </div>
    </div>

    <div class="section-title">Notificaciones</div>
    <div class="card">
      <div class="settings-row">
        <div>
          <div class="st1">Recordatorio diario</div>
          <div class="st2">${notifSupported ? 'Te avisamos tu salud financiera y cuánto dinero tienes disponible.' : 'Tu navegador no soporta notificaciones.'}</div>
        </div>
        <label class="switch"><input type="checkbox" data-act="toggleNotif" ${s.notificationsEnabled ? 'checked' : ''} ${notifSupported ? '' : 'disabled'}/><span class="slider"></span></label>
      </div>
    </div>

    <div class="section-title">Dinero</div>
    <div class="card list-card">
      <div class="item-row" data-act="editIncome">
        <div class="qicon">${icon('wallet', 16)}</div>
        <div class="cwrap"><div class="cn">Ingreso mensual esperado</div></div>
        <div class="amt num" style="font-size:14px; font-family:var(--font-display);">${money(state.data.income)}</div>
      </div>
      <div class="item-row" data-nav="budget">
        <div class="qicon">${icon('house', 16)}</div>
        <div class="cwrap"><div class="cn">Gastos automáticos (${state.data.recurringExpenses.length})</div></div>
        <div class="chev">${icon('chev', 16)}</div>
      </div>
      <div class="item-row" data-nav="savings">
        <div class="qicon">${icon('piggy', 16)}</div>
        <div class="cwrap"><div class="cn">Ahorro automático</div></div>
        <div class="chev">${icon('chev', 16)}</div>
      </div>
    </div>

    <div class="section-title">Apoya esta app</div>
    <div class="card donation-card">
      <div class="dicon">${icon('gift', 26)}</div>
      <p>Raíz se mantiene gracias a la comunidad. Si te ha servido, considera hacer una donación para mantenerla activa y sin publicidad.</p>
      <button class="btn btn-primary btn-block" data-act="openDonate">${icon('heart', 14)} Donar</button>
    </div>

    <div class="section-title">Cuenta</div>
    <div class="card list-card">
      <div class="item-row" data-act="logout">
        <div class="qicon">${icon('user', 16)}</div>
        <div class="cwrap"><div class="cn">Cerrar sesión</div></div>
        <div class="chev">${icon('chev', 16)}</div>
      </div>
    </div>

    <div class="section-title">Zona de peligro</div>
    <div class="card danger-zone">
      <p>Esto elimina tu cuenta y todos tus datos financieros de este dispositivo de forma permanente. No se puede deshacer.</p>
      <button class="btn btn-danger btn-block" data-act="${state.confirmDelete ? 'deleteAccountConfirmed' : 'askDeleteAccount'}">
        ${icon('trash', 14)} ${state.confirmDelete ? '¿Confirmar? Se borrará todo' : 'Eliminar mi cuenta y datos'}
      </button>
    </div>
  `;
}

/* ---------------- Modal ---------------- */
export function renderModal(state) {
  const m = state.modal;
  let content = '';

  if (m.type === 'chooseType') {
    content = `
      <h3>¿Qué quieres agregar?</h3>
      <div class="type-toggle">
        <button data-act="addType" data-type="income">${icon('arrowDown', 18)}Ingreso</button>
        <button data-act="addType" data-type="expense">${icon('arrowUp', 18)}Gasto</button>
        <button data-act="addType" data-type="debt">${icon('wallet', 18)}Deuda</button>
        <button data-act="addType" data-type="goal">${icon('piggy', 18)}Ahorro</button>
      </div>
      <button class="btn btn-ghost btn-block" data-act="closeModal">Cancelar</button>
    `;
  } else if (m.type === 'income' || m.type === 'expense') {
    const kind = m.type;
    const e = m.payload || {};
    const cats = state.data.budgetCategories;
    content = `
      <h3>${kind === 'income' ? 'Registrar ingreso' : 'Registrar gasto'}</h3>
      <div class="field"><label>Monto</label><input id="f_amount" type="number" placeholder="0"/></div>
      <div class="field"><label>Fecha</label><input id="f_date" type="date" value="${e.date || new Date().toISOString().slice(0,10)}"/></div>
      ${kind === 'expense' ? `
        <label style="font-size:12px; color:var(--text-mute); display:block; margin-bottom:6px; font-weight:500;">Categoría</label>
        ${cats.length === 0
          ? `<p class="hint">Aún no tienes categorías. Crea una primero para poder clasificar tus gastos.</p>
             <button class="btn btn-ghost btn-block" data-act="addType" data-type="cat" style="margin-bottom:14px;">${icon('plus',14)} Crear categoría</button>`
          : `<div class="cat-chip-picker">
              ${cats.map((c,i) => `<div class="cat-chip" data-picker="cat" data-val="${c.id}">${icon(c.icon||'more',14)} ${esc(c.name)}</div>`).join('')}
            </div>`
        }
      ` : ''}
      <div class="field"><label>Nota (opcional)</label><input id="f_note" placeholder="${kind === 'income' ? 'Ej: Bono, freelance' : 'Ej: Supermercado'}"/></div>
      <div class="modal-actions">
        <button class="btn ${kind==='income'?'btn-income':'btn-expense'} btn-block" data-act="saveTx" data-kind="${kind}" ${kind === 'expense' && cats.length === 0 ? 'disabled' : ''}>Guardar</button>
      </div>
    `;
  } else if (m.type === 'debt') {
    const e = m.payload || {};
    content = `
      <h3>${e.id ? 'Editar deuda' : 'Nueva deuda'}</h3>
      <div class="field"><label>Nombre</label><input id="f_name" value="${esc(e.name || '')}" placeholder="Ej: Tarjeta de crédito"/></div>
      <div class="field"><label>Monto total</label><input id="f_total" type="number" value="${e.total || ''}" placeholder="450000"/></div>
      <div class="field"><label>Ya pagado</label><input id="f_paid" type="number" value="${e.paid || 0}" placeholder="0"/></div>
      <div class="field"><label>Pago mínimo mensual</label><input id="f_min" type="number" value="${e.minPayment || ''}" placeholder="25000"/></div>
      <div class="field"><label>Fecha de vencimiento</label><input id="f_date" type="date" value="${e.dueDate || ''}"/></div>
      <div class="modal-actions">
        ${e.id ? `<button class="btn btn-danger" data-act="deleteDebt" data-id="${e.id}">${icon('trash', 14)}</button>` : ''}
        <button class="btn btn-primary" data-act="saveDebt" data-id="${e.id || ''}">Guardar</button>
      </div>
    `;
  } else if (m.type === 'cat') {
    const e = m.payload || {};
    content = `
      <h3>${e.id ? 'Editar categoría' : 'Nueva categoría de gasto'}</h3>
      <div class="field"><label>Nombre</label><input id="f_name" value="${esc(e.name || '')}" placeholder="Ej: Salud"/></div>
      <div class="icon-picker">
        ${ICON_CHOICES.map(ic => `<div class="icon-opt ${e.icon === ic ? 'active' : (!e.icon && ic === ICON_CHOICES[0] ? 'active' : '')}" data-picker="icon" data-val="${ic}">${icon(ic, 18)}</div>`).join('')}
      </div>
      <div class="field"><label>Presupuesto mensual</label><input id="f_budget" type="number" value="${e.budget || ''}" placeholder="150000"/></div>
      <div class="modal-actions">
        ${e.id ? `<button class="btn btn-danger" data-act="deleteCat" data-id="${e.id}">${icon('trash', 14)}</button>` : ''}
        <button class="btn btn-primary" data-act="saveCat" data-id="${e.id || ''}" data-icon="${e.icon || ICON_CHOICES[0]}">Guardar</button>
      </div>
    `;
  } else if (m.type === 'goal') {
    const e = m.payload || {};
    content = `
      <h3>${e.id ? 'Editar meta' : 'Nueva meta de ahorro'}</h3>
      <div class="field"><label>Nombre</label><input id="f_name" value="${esc(e.name || '')}" placeholder="Ej: Viaje a Japón"/></div>
      <div class="icon-picker">
        ${ICON_CHOICES.map(ic => `<div class="icon-opt ${e.icon === ic ? 'active' : (!e.icon && ic === ICON_CHOICES[0] ? 'active' : '')}" data-picker="icon" data-val="${ic}">${icon(ic, 18)}</div>`).join('')}
      </div>
      <div class="field"><label>Meta total</label><input id="f_target" type="number" value="${e.target || ''}" placeholder="1500000"/></div>
      <div class="field"><label>Ahorrado hasta ahora</label><input id="f_current" type="number" value="${e.current || 0}" placeholder="0"/></div>
      <div class="field"><label>Ahorro automático mensual (opcional)</label><input id="f_monthly" type="number" value="${e.monthlyAmount || ''}" placeholder="0"/></div>
      <p class="hint">Si dejas un monto aquí, se sumará solo a esta meta cada mes.</p>
      <div class="modal-actions">
        ${e.id ? `<button class="btn btn-danger" data-act="deleteGoal" data-id="${e.id}">${icon('trash', 14)}</button>` : ''}
        <button class="btn btn-primary" data-act="saveGoal" data-id="${e.id || ''}" data-icon="${e.icon || ICON_CHOICES[0]}">Guardar</button>
      </div>
    `;
  } else if (m.type === 'contribute') {
    const e = m.payload || {};
    content = `
      <h3>Abonar a "${esc(e.name)}"</h3>
      <div class="field"><label>Monto a abonar</label><input id="f_amount" type="number" placeholder="20000"/></div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" data-act="doContribute" data-id="${e.id}">Confirmar</button>
      </div>
    `;
  } else if (m.type === 'quickCat') {
    const e = m.payload || {};
    content = `
      <h3>Agregar categoría "${esc(e.label)}"</h3>
      <div class="field"><label>Presupuesto mensual</label><input id="f_budget" type="number" placeholder="100000"/></div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" data-act="saveQuickCat" data-icon="${e.icon}" data-label="${esc(e.label)}">Agregar</button>
      </div>
    `;
  } else if (m.type === 'editIncome') {
    content = `
      <h3>Ingreso mensual esperado</h3>
      <div class="field"><label>Monto</label><input id="f_income" type="number" value="${state.data.income || ''}" placeholder="0"/></div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" data-act="saveIncome">Guardar</button>
      </div>
    `;
  } else if (m.type === 'recurringExpense') {
    const e = m.payload || {};
    content = `
      <h3>${e.id ? 'Editar gasto automático' : 'Nuevo gasto automático'}</h3>
      <div class="field"><label>Nombre</label><input id="f_name" value="${esc(e.name || '')}" placeholder="Ej: Arriendo"/></div>
      <div class="field"><label>Monto mensual</label><input id="f_amount" type="number" value="${e.amount || ''}" placeholder="450000"/></div>
      <div class="field"><label>Día del mes en que se descuenta</label><input id="f_day" type="number" min="1" max="28" value="${e.day || 1}"/></div>
      <p class="hint">Se registrará automáticamente como gasto cada mes en la fecha que elijas.</p>
      <div class="modal-actions">
        ${e.id ? `<button class="btn btn-danger" data-act="deleteRecurringExpense" data-id="${e.id}">${icon('trash', 14)}</button>` : ''}
        <button class="btn btn-primary" data-act="saveRecurringExpense" data-id="${e.id || ''}">Guardar</button>
      </div>
    `;
  } else if (m.type === 'donate') {
    content = `
      <h3>${icon('heart',16)} Apoya esta app</h3>
      <p class="hint" style="margin-top:0;">Raíz es mantenida por la comunidad. Tu aporte ayuda a cubrir los costos de hosting y desarrollo.</p>
      ${state.donationUrl
        ? `<a href="${state.donationUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-block" style="text-decoration:none;">Ir a donar</a>`
        : `<p class="hint">Aún no se ha configurado un enlace de donación para esta app.</p>`
      }
      <button class="btn btn-ghost btn-block" data-act="closeModal" style="margin-top:10px;">Cerrar</button>
    `;
  }

  return `<div class="modal-backdrop" data-act="backdrop">
    <div class="modal-sheet" data-stop="1">${content}</div>
  </div>`;
}
