// chat.js — talks to the Claude API. No key management needed: requests to
// api.anthropic.com are handled by the runtime this app is built for.

import { money, totals } from './state.js';

function buildSystemContext(data) {
  const t = totals(data);
  return `Eres el asistente financiero de la app "Raíz". Hablas en español de Chile, tono cálido, cercano y directo. Da consejos breves, concretos y accionables (usa listas numeradas cuando ayude). No des consejos de inversión específicos ni asesoría legal o tributaria; para eso sugiere un profesional.

Contexto financiero real de ${data.name || 'la persona usuaria'}:
- Ingreso mensual esperado: ${money(t.totalExpected)} (recibido hasta ahora este mes: ${money(t.totalReceived)})
- Deuda total pendiente: ${money(t.totalDebt)} (detalle: ${data.debts.map(x => `${x.name}: ${money(Math.max(0, x.total - x.paid))} pendiente`).join('; ') || 'sin deudas registradas'})
- Gasto del mes: ${money(t.totalSpent)} de un presupuesto de ${money(t.totalBudget)} (categorías: ${data.budgetCategories.map(c => `${c.name}`).join('; ') || 'sin categorías registradas'})
- Gastos fijos automáticos: ${data.recurringExpenses.map(r => `${r.name} ${money(r.amount)}/mes`).join('; ') || 'ninguno'}
- Ahorro total: ${money(t.totalSaved)} (metas: ${data.savingsGoals.map(g => `${g.name} ${money(g.current)}/${money(g.target)}${g.monthlyAmount > 0 ? ' (ahorro automático ' + money(g.monthlyAmount) + '/mes)' : ''}`).join('; ') || 'sin metas registradas'})
- Presupuesto restante este mes: ${money(t.remaining)}

Si la persona aún no tiene datos cargados, invítala amablemente a registrarlos en la app para poder ayudarla mejor. Responde la pregunta usando este contexto cuando sea relevante.`;
}

export async function fetchAIResponse(data, chatHistory) {
  const system = buildSystemContext(data);
  const history = chatHistory.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages: history,
      }),
    });
    const dataRes = await response.json();
    const text = (dataRes.content || []).map(b => b.text || '').join('\n').trim();
    return text || 'No pude generar una respuesta, intenta de nuevo.';
  } catch (e) {
    return 'No pude conectarme en este momento. Revisa tu conexión e intenta de nuevo.';
  }
}
