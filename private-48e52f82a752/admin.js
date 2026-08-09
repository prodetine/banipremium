const loginScreen = document.querySelector('#login-screen');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const leadsList = document.querySelector('#leads-list');
const template = document.querySelector('#lead-template');
const searchInput = document.querySelector('#search-input');
const statusFilter = document.querySelector('#status-filter');
const dashboardMessage = document.querySelector('#dashboard-message');
const emptyState = document.querySelector('#empty-state');
let leads = [];

const request = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Ошибка запроса');
    error.status = response.status;
    throw error;
  }
  return data;
};

const formatDate = (value) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const updateStats = () => {
  document.querySelector('#stat-total').textContent = leads.length;
  document.querySelector('#stat-new').textContent = leads.filter((lead) => lead.status === 'new').length;
  document.querySelector('#stat-progress').textContent = leads.filter((lead) => lead.status === 'progress').length;
  document.querySelector('#stat-done').textContent = leads.filter((lead) => lead.status === 'done').length;
};

const render = () => {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;
  const visible = leads.filter((lead) => {
    const matchesQuery = !query || `${lead.name} ${lead.phone}`.toLowerCase().includes(query);
    return matchesQuery && (filter === 'all' || lead.status === filter);
  });
  leadsList.replaceChildren();
  emptyState.hidden = visible.length !== 0;
  visible.forEach((lead) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.id = lead.id;
    card.querySelector('.lead-name').textContent = lead.name;
    const phone = card.querySelector('.lead-phone');
    phone.textContent = lead.phone;
    phone.href = `tel:${lead.phone.replace(/[^0-9+]/g, '')}`;
    const time = card.querySelector('.lead-time');
    time.textContent = formatDate(lead.created_at);
    time.dateTime = lead.created_at;
    card.querySelector('.lead-status').value = lead.status;
    card.querySelector('.lead-notes').value = lead.notes || '';
    card.querySelector('.save-button').addEventListener('click', () => saveLead(card));
    card.querySelector('.delete-button').addEventListener('click', () => deleteLead(card, lead));
    leadsList.append(card);
  });
  updateStats();
};

const showDashboard = () => {
  loginScreen.hidden = true;
  dashboard.hidden = false;
};

const showLogin = () => {
  dashboard.hidden = true;
  loginScreen.hidden = false;
};

const loadLeads = async () => {
  dashboardMessage.textContent = 'Загружаем заявки…';
  try {
    const data = await request('/api/admin/leads');
    leads = data.leads;
    showDashboard();
    render();
    dashboardMessage.textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    if (error.status === 401) showLogin();
    else dashboardMessage.textContent = error.message;
  }
};

const saveLead = async (card) => {
  const button = card.querySelector('.save-button');
  button.disabled = true;
  try {
    const payload = { id: Number(card.dataset.id), status: card.querySelector('.lead-status').value, notes: card.querySelector('.lead-notes').value.trim() };
    await request('/api/admin/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const lead = leads.find((item) => item.id === payload.id);
    if (lead) Object.assign(lead, payload);
    updateStats();
    button.textContent = 'Сохранено';
    setTimeout(() => { button.textContent = 'Сохранить'; }, 1200);
  } catch (error) { dashboardMessage.textContent = error.message; }
  finally { button.disabled = false; }
};

const deleteLead = async (card, lead) => {
  if (!confirm(`Удалить заявку от ${lead.name}? Восстановить её будет нельзя.`)) return;
  const button = card.querySelector('.delete-button');
  button.disabled = true;
  try {
    await request('/api/admin/leads', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id }) });
    leads = leads.filter((item) => item.id !== lead.id);
    render();
  } catch (error) { dashboardMessage.textContent = error.message; button.disabled = false; }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  const data = new FormData(loginForm);
  loginMessage.textContent = '';
  button.disabled = true;
  try {
    await request('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) });
    loginForm.reset();
    await loadLeads();
  } catch (error) { loginMessage.textContent = error.status === 429 ? 'Слишком много попыток. Попробуйте позднее.' : 'Неверный логин или пароль.'; }
  finally { button.disabled = false; }
});

document.querySelector('#logout-button').addEventListener('click', async () => { await request('/api/admin/logout', { method: 'POST' }).catch(() => {}); showLogin(); });
document.querySelector('#refresh-button').addEventListener('click', loadLeads);
searchInput.addEventListener('input', render);
statusFilter.addEventListener('change', render);
document.querySelector('#export-button').addEventListener('click', () => {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['Дата','Имя','Телефон','Статус','Заметки'], ...leads.map((lead) => [formatDate(lead.created_at), lead.name, lead.phone, lead.status, lead.notes || ''])];
  const csv = '\ufeff' + rows.map((row) => row.map(escape).join(';')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `zayavki-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

loadLeads();
