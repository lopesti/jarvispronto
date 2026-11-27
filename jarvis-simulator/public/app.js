const socket = io();
const tbody = document.getElementById('tbody');
const statusEl = document.getElementById('status');
const personaListEl = document.getElementById('personaList');

const rows = new Map(); // jid -> <tr>

function badgeClass(status) {
  if (status.startsWith('erro')) return 'b-err';
  if (status === 'concluída') return 'b-done';
  if (status === 'parado') return 'b-stop';
  return 'b-run';
}

function renderRow(jid, convo) {
  let tr = rows.get(jid);
  if (!tr) {
    tr = document.createElement('tr');
    rows.set(jid, tr);
    tbody.prepend(tr);
  }
  const lastTwo = convo.log.slice(-2);
  const logHtml = lastTwo
    .map((l) => `<div class="${l.from}"><b>${l.from === 'cliente' ? 'Cliente' : 'Jarvis'}:</b> ${escapeHtml(l.text || '')}</div>`)
    .join('');

  tr.innerHTML = `
    <td>${escapeHtml(convo.persona)}</td>
    <td>${escapeHtml(convo.produto || '—')}</td>
    <td>${jid.split('@')[0]}</td>
    <td><span class="badge ${badgeClass(convo.status)}">${escapeHtml(convo.status)}</span></td>
    <td>${convo.turns}</td>
    <td><div class="log">${logHtml}</div></td>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function applyStatus(status) {
  if (!status || status.status === 'idle') {
    statusEl.textContent = 'Ocioso';
    return;
  }
  statusEl.textContent = `Execução ${status.id} — ${status.status}`;
  (status.conversations || []).forEach((c) => renderRow(c.jid, c));
}

socket.on('run:status', applyStatus);
socket.on('run:started', applyStatus);
socket.on('run:finished', applyStatus);
socket.on('conversation:update', ({ jid, convo }) => renderRow(jid, convo));

async function loadPersonas() {
  const res = await fetch('/api/personas');
  const personas = await res.json();
  personaListEl.innerHTML = personas
    .map(
      (p) => `<label class="checkbox"><input type="checkbox" value="${p.id}" /> ${p.label}</label>`
    )
    .join('');
}
loadPersonas();

document.getElementById('startBtn').addEventListener('click', async () => {
  const quantity = document.getElementById('quantity').value;
  const maxTurns = document.getElementById('maxTurns').value;
  const pacingMs = document.getElementById('pacingMs').value;
  const personaIds = Array.from(personaListEl.querySelectorAll('input:checked')).map((i) => i.value);

  rows.clear();
  tbody.innerHTML = '';

  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, maxTurns, pacingMs, personaIds }),
  });
  const data = await res.json();
  if (!res.ok) alert(data.error || 'Erro ao iniciar');
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  await fetch('/api/stop', { method: 'POST' });
});
