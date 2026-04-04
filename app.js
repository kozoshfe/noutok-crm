let authBootstrapped = false;

const SUPABASE_URL = 'https://qzcapeempzzdhicsweqz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nXxnpG6C_RO9mVqcYEt1mg_Z9Z-dpDr';
const TABLE = 'laptops';

let supabaseClient = null;
let laptops = [];
let currentEditId = null;
let currentEditMode = 'full';
let realtimeChannel = null;
let hasSupabaseConnection = false;
const THEME_KEY = 'notebook-crm-theme';

const statusLabels = {
  in_transit: 'В дорозі',
  received: 'Отримав',
  sold: 'Продано'
};

function normalizeStatus(status){
  const value = String(status || '').trim();
  if(value === 'received' || value === 'Отримано' || value === 'Отримав') return 'received';
  if(value === 'sold' || value === 'Продано') return 'sold';
  return 'in_transit';
}

function normalizeLocation(location){
  const value = String(location || '').trim();
  const map = {
    'Кладовка 1': 'Кладовка верх',
    'Кладовка 2': 'Кладовка низ',
    'Спальня 1': 'Спальня верх',
    'Спальня 2': 'Спальня низ'
  };
  return map[value] || value;
}

function normalizeLocationState(state){
  const value = String(state || '').trim();
  if(value === 'На гравіювання' || value === 'engraving') return 'На гравіювання';
  if(value === 'На ремонт' || value === 'repair') return 'На ремонт';
  return '';
}

function getLocationStateBadgeClass(state){
  const normalizedState = normalizeLocationState(state);
  if(normalizedState === 'На ремонт') return 'location-card-badge-repair';
  if(normalizedState === 'На гравіювання') return 'location-card-badge-engraving';
  return 'location-card-badge-alt';
}

function showAppShell(){
  const auth = document.getElementById('authScreen');
  const app = document.getElementById('appShell');
  if(auth) auth.style.display = 'none';
  if(app) app.style.display = 'block';
}

function showAuthScreen(){
  const auth = document.getElementById('authScreen');
  const app = document.getElementById('appShell');
  if(auth) auth.style.display = 'flex';
  if(app) app.style.display = 'none';
}

function applyTheme(theme){
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = normalized;

  const toggle = document.getElementById('authThemeToggle');
  const label = document.getElementById('authThemeLabel');
  if(toggle) toggle.setAttribute('aria-pressed', String(normalized === 'light'));
  if(label) label.textContent = normalized === 'light' ? 'Світла' : 'Темна';

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if(themeMeta){
    themeMeta.setAttribute('content', normalized === 'light' ? '#eef4ff' : '#061126');
  }
}

function loadTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || 'dark');
}

function toggleTheme(){
  const nextTheme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

async function authLogin(){
  const email = document.getElementById('simpleLogin')?.value.trim();
  const password = document.getElementById('simplePassword')?.value;
  const msg = document.getElementById('simpleLoginMsg');
  if(msg) msg.textContent = '';

  if(!email || !password){
    if(msg) msg.textContent = 'Введи email і пароль';
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error && msg){
    msg.textContent = 'Помилка входу: ' + error.message;
  }
}

async function authLogout(){
  try{
    await supabaseClient.auth.signOut();
  }catch(error){}
  showAuthScreen();
}

function initAuthUI(){
  const btn = document.getElementById('simpleLoginBtn');
  if(btn && !btn.dataset.bound){
    btn.addEventListener('click', authLogin);
    btn.dataset.bound = '1';
  }

  const themeToggle = document.getElementById('authThemeToggle');
  if(themeToggle && !themeToggle.dataset.bound){
    themeToggle.addEventListener('click', toggleTheme);
    themeToggle.dataset.bound = '1';
  }

  ['simpleLogin', 'simplePassword'].forEach((id) => {
    const el = document.getElementById(id);
    if(el && !el.dataset.bound){
      el.addEventListener('keydown', (event) => {
        if(event.key === 'Enter') authLogin();
      });
      el.dataset.bound = '1';
    }
  });
}

async function handleAuthSession(session){
  if(session?.user){
    showAppShell();
    const msg = document.getElementById('simpleLoginMsg');
    if(msg) msg.textContent = '';
    if(!authBootstrapped){
      await loadLaptops();
      subscribeRealtime();
      authBootstrapped = true;
    }
  } else {
    authBootstrapped = false;
    showAuthScreen();
  }
}

function money(v){
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(Number(v || 0)) + ' ₴';
}

function toNum(v){
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function safe(val){
  return String(val ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function monthKey(dateStr){
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthName(key){
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
}

function calcCost(item){
  return toNum(item.ebay_price)
    + toNum(item.delivery_cost)
    + toNum(item.charger_cost)
    + toNum(item.duty_cost)
    + toNum(item.olx_ad_cost)
    + toNum(item.engraving_cost)
    + toNum(item.ssd)
    + toNum(item.ram);
}

function calcProfit(item){
  return toNum(item.sold_price) - calcCost(item);
}

function setBanner(text, ok = true){
  const el = document.getElementById('banner');
  if(!el) return;
  el.textContent = text;
  el.style.color = ok ? '#8cf2b1' : '#ffb5b5';
  el.style.background = ok ? 'rgba(29,124,76,.22)' : 'rgba(145,42,42,.22)';
  el.classList.add('show');
}

function clearBanner(){
  const el = document.getElementById('banner');
  if(!el) return;
  el.textContent = '';
  el.classList.remove('show');
}

function setBaseStatus(text, ok = true){
  const el = document.getElementById('baseStatus');
  if(!el) return;
  el.textContent = text;
  el.style.color = ok ? '#8cf2b1' : '#ffb5b5';
}

function updateNetwork(){
  const online = hasSupabaseConnection || (!supabaseClient && navigator.onLine);
  const dot = document.getElementById('netDot');
  const text = document.getElementById('netText');
  if(dot) dot.className = 'dot ' + (online ? 'green' : 'red');
  if(text) text.textContent = online ? 'Онлайн' : 'Офлайн';
}

function switchView(name){
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
  document.querySelector(`.nav-btn[data-view="${name}"]`)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStats(){
  const active = laptops.filter((x) => normalizeStatus(x.status) !== 'sold');
  const sold = laptops.filter((x) => normalizeStatus(x.status) === 'sold');
  const currentMonth = monthKey(new Date().toISOString());
  const soldMonth = sold.filter((x) => x.sold_at && monthKey(x.sold_at) === currentMonth);
  const profitMonth = soldMonth.reduce((s, x) => s + calcProfit(x), 0);
  const profitTotal = sold.reduce((s, x) => s + calcProfit(x), 0);
  const soldRevenue = sold.reduce((s, x) => s + toNum(x.sold_price), 0);
  const totalCost = active.reduce((s, x) => s + calcCost(x), 0);

  document.getElementById('statActiveBig').textContent = active.length;
  document.getElementById('statSoldMonthBig').textContent = soldMonth.length;
  document.getElementById('statProfitMonthBig').textContent = money(profitMonth);
  document.getElementById('statProfitTotalBig').textContent = money(profitTotal);
  const statCostTotalBig = document.getElementById('statCostTotalBig');
  if(statCostTotalBig) statCostTotalBig.textContent = money(totalCost);

  document.getElementById('activeCount').textContent = active.length;
  document.getElementById('soldCount').textContent = sold.length;

  const soldRevenueEl = document.getElementById('soldRevenue');
  const soldProfitEl = document.getElementById('soldProfit');
  if(soldRevenueEl) soldRevenueEl.textContent = money(soldRevenue);
  if(soldProfitEl) soldProfitEl.textContent = money(profitTotal);
}

function cardTemplate(item, soldMode){
  const normalizedStatus = normalizeStatus(item.status);
  const cost = calcCost(item);
  const sale = toNum(item.sold_price);
  const profit = sale - cost;

  if(soldMode){
    return `
      <div class="item">
        <div class="sold-card">
          <div class="sold-card-top">
            <div class="sold-card-header">
              <div class="sold-card-heading">
                <div class="item-title">${safe(item.number || 'Без номера')}</div>
                <button class="edit-mini sold-card-edit" onclick="openEditModal('${item.id}')" title="Редагувати">✏️</button>
              </div>
            <div class="sold-card-links">
              ${item.ebay_link ? `<a href="${safe(item.ebay_link)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(138,180,255,0.15);color:#8ab4ff;font-size:14px;text-decoration:none;display:inline-block;">🔗 eBay</a>` : ''}
            </div>
            </div>
            <div class="sold-card-side">
              <div class="badge sold-card-status st-${safe(normalizedStatus)}">${safe(statusLabels[normalizedStatus] || item.status)}</div>
              <div class="sold-profit ${profit >= 0 ? 'sold-profit-pos' : 'sold-profit-neg'}">📈 ${sale ? money(profit) : '—'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="item">
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="active-card-top">
          <div class="active-card-header">
            <div class="active-card-heading">
              <div class="item-title">${safe(item.number || 'Без номера')}</div>
              <button class="edit-mini active-card-edit" onclick="openEditModal('${item.id}')" title="Редагувати">✏️</button>
            </div>
            <div class="active-card-links">
              ${item.ebay_link ? `<a href="${safe(item.ebay_link)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(138,180,255,0.15);color:#8ab4ff;font-size:14px;text-decoration:none;display:inline-block;">🔗 eBay</a>` : ''}
              ${item.olx_link ? `<a href="${safe(item.olx_link)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(34,197,94,0.15);color:#7df0a3;font-size:14px;display:inline-block;text-decoration:none;">✅ OLX</a>` : ''}
              ${item.telegram_link ? `<a href="${safe(item.telegram_link)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(139,92,246,0.15);color:#d8b4fe;font-size:14px;display:inline-block;text-decoration:none;">✈️ Telegram</a>` : ''}
            </div>
          </div>
          <div class="active-card-side">
            <span class="cost-badge active-card-price">💰 ${money(calcCost(item))}</span>
            <div class="badge active-card-status st-${safe(normalizedStatus)}">${safe(statusLabels[normalizedStatus] || item.status)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderActive(){
  const statusF = document.getElementById('filterStatus')?.value;
  const marketF = document.getElementById('filterMarket')?.value;

  let data = laptops.filter((x) => normalizeStatus(x.status) !== 'sold');

  if(statusF) data = data.filter((x) => normalizeStatus(x.status) === statusF);
  if(marketF === 'no_olx') data = data.filter((x) => !x.olx_link);
  if(marketF === 'no_telegram') data = data.filter((x) => !x.telegram_link);

  const activeCountEl = document.getElementById('activeCount');
  if(activeCountEl) activeCountEl.textContent = data.length;

  document.getElementById('activeCards').innerHTML = data.length
    ? data.map((item) => cardTemplate(item, false)).join('')
    : '<div class="empty">Немає ноутбуків по фільтру</div>';
}

function renderSold(){
  const data = laptops.filter((x) => normalizeStatus(x.status) === 'sold');
  document.getElementById('soldCards').innerHTML = data.length
    ? data.map((item) => cardTemplate(item, true)).join('')
    : '<div class="empty">Ще немає проданих ноутбуків</div>';
}

function renderLocation(){
  const locationF = document.getElementById('filterLocation')?.value;
  let data = laptops.filter((x) => normalizeStatus(x.status) === 'received');
  if(locationF) data = data.filter((x) => normalizeLocation(x.location) === locationF);
  const wrap = document.getElementById('locationCards');
  const countEl = document.getElementById('locationCount');
  if(countEl) countEl.textContent = String(data.length);
  if(!wrap) return;

  wrap.innerHTML = data.length ? data.map((item) => `
    <div class="item">
      <div class="location-card">
        <div class="location-card-header">
          <div class="location-card-meta">
            <div class="location-card-title">${safe(item.number || 'Без номера')}</div>
            ${item.location ? `<div class="location-card-badge">${safe(normalizeLocation(item.location))}</div>` : ''}
            ${item.location_state ? `<div class="location-card-badge ${getLocationStateBadgeClass(item.location_state)}">${safe(normalizeLocationState(item.location_state))}</div>` : ''}
          </div>
          <button class="edit-mini location-card-edit" onclick="openEditModal('${item.id}', 'location')" title="Редагувати локацію">✏️</button>
        </div>
      </div>
    </div>
  `).join('') : `<div class="empty">${locationF ? 'Немає ноутбуків у вибраній локації' : 'Немає ноутбуків зі статусом "Отримано"'}</div>`;
}

function renderMonths(){
  const sold = laptops.filter((x) => normalizeStatus(x.status) === 'sold' && x.sold_at);
  const wrap = document.getElementById('monthsWrap');
  if(!sold.length){
    wrap.innerHTML = '<div class="empty">Ще немає статистики по місяцях</div>';
    return;
  }

  const grouped = {};
  sold.forEach((item) => {
    const key = monthKey(item.sold_at);
    if(!grouped[key]) grouped[key] = { count: 0, profit: 0 };
    grouped[key].count += 1;
    grouped[key].profit += calcProfit(item);
  });

  const keys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  wrap.innerHTML = keys.map((key) => `
    <div class="month-card">
      <div class="muted">Місяць</div>
      <div class="month-title">${safe(monthName(key))}</div>
      <div style="margin-top:10px">Продано ноутбуків: <b>${grouped[key].count}</b></div>
      <div style="margin-top:8px">Чистий заробіток: <b>${money(grouped[key].profit)}</b></div>
    </div>
  `).join('');
}

function renderAll(){
  renderStats();
  renderActive();
  renderSold();
  renderLocation();
  renderMonths();
}

async function pasteIntoField(fieldId){
  const field = document.getElementById(fieldId);
  if(!field) return;

  field.focus();
  field.select();

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const manualHint = isMac ? 'Поле готове. Натисни Cmd+V, щоб вставити.' : 'Поле готове. Натисни Ctrl+V, щоб вставити.';

  const isSecureClipboard = window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.readText === 'function';
  if(!isSecureClipboard){
    setBanner(manualHint);
    return;
  }

  try{
    const text = await navigator.clipboard.readText();
    if(text && text.trim()){
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      setBanner('Вставлено з буфера обміну.');
      return;
    }
    setBanner(manualHint);
  }catch(error){
    console.error(error);
    setBanner('Автовставка недоступна в цьому браузері. Спробуй вставити вручну через клавіатуру.', false);
  }
}

function openAddModal(){
  currentEditId = null;
  currentEditMode = 'full';
  document.getElementById('modalTitle').textContent = 'Додати ноутбук';
  const delBtn = document.getElementById('deleteBtn');
  if(delBtn) delBtn.style.display = 'none';
  document.getElementById('laptopForm').reset();
  document.getElementById('editId').value = '';
  const baseFields = document.getElementById('baseFields');
  if(baseFields) baseFields.style.display = '';
  const extra = document.getElementById('editOnlyFields');
  if(extra) extra.remove();
  const locationOnly = document.getElementById('locationOnlyFields');
  if(locationOnly) locationOnly.remove();
  document.getElementById('addModal').classList.add('show');
}

function closeAddModal(){
  document.getElementById('addModal').classList.remove('show');
}

function resetForm(){
  document.getElementById('laptopForm').reset();
  const baseFields = document.getElementById('baseFields');
  if(baseFields){
    baseFields.style.display = '';
    baseFields.querySelectorAll('input, select, textarea, button').forEach((el) => {
      el.disabled = false;
    });
  }
  const extra = document.getElementById('editOnlyFields');
  if(extra) extra.remove();
  const locationOnly = document.getElementById('locationOnlyFields');
  if(locationOnly) locationOnly.remove();
  document.getElementById('editId').value = '';
  currentEditId = null;
  currentEditMode = 'full';
}

function ensureSoldPriceField(){
  const grid = document.getElementById('editOnlyFields')?.querySelector('.form-grid');
  if(!grid) return null;

  let wrap = document.getElementById('soldPriceWrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'soldPriceWrap';
    wrap.innerHTML = '<label>Ціна продажу, ₴</label><input id="sold_price" type="number" min="0" step="0.01" />';
    grid.appendChild(wrap);
  }
  return wrap;
}

function toggleSoldPriceField(){
  const statusEl = document.getElementById('status');
  const wrap = document.getElementById('soldPriceWrap');
  if(!statusEl || !wrap) return;
  wrap.style.display = statusEl.value === 'sold' ? 'block' : 'none';
  if(statusEl.value !== 'sold'){
    const input = document.getElementById('sold_price');
    if(input) input.value = '';
  }
}

function ensureLocationOnlyFields(){
  let wrap = document.getElementById('locationOnlyFields');
  if(wrap) return wrap;

  const actions = document.querySelector('#laptopForm .row-actions');
  if(!actions) return null;

  wrap = document.createElement('div');
  wrap.id = 'locationOnlyFields';
  wrap.className = 'span-3';
  wrap.innerHTML = `
    <div class="form-grid" style="margin-top:12px">
      <div>
        <label>Локація</label>
        <select id="location">
          <option value="Кладовка верх">Кладовка верх</option>
          <option value="Кладовка низ">Кладовка низ</option>
          <option value="Спальня верх">Спальня верх</option>
          <option value="Спальня низ">Спальня низ</option>
        </select>
      </div>
      <div>
        <label>Стан</label>
        <select id="location_state">
          <option value="">Нічого</option>
          <option value="На гравіювання">На гравіювання</option>
          <option value="На ремонт">На ремонт</option>
        </select>
      </div>
    </div>`;
  actions.parentNode.insertBefore(wrap, actions);
  return wrap;
}

function setBaseFieldsEnabled(enabled){
  const baseFields = document.getElementById('baseFields');
  if(!baseFields) return;
  baseFields.style.display = enabled ? '' : 'none';
  baseFields.querySelectorAll('input, select, textarea, button').forEach((el) => {
    el.disabled = !enabled;
  });
}

function openEditModal(id, mode = 'full'){
  const item = laptops.find((x) => x.id === id);
  if(!item) return;

  currentEditId = id;
  currentEditMode = mode;
  document.getElementById('modalTitle').textContent = mode === 'location' ? 'Оновити локацію' : 'Редагувати ноутбук';
  const delBtn = document.getElementById('deleteBtn');
  if(delBtn) delBtn.style.display = 'none';
  document.getElementById('editId').value = id;
  const locationOnly = document.getElementById('locationOnlyFields');
  if(locationOnly) locationOnly.remove();

  if(mode === 'location'){
    setBaseFieldsEnabled(false);
    const extraFields = document.getElementById('editOnlyFields');
    if(extraFields) extraFields.remove();
    ensureLocationOnlyFields();
    const locationInput = document.getElementById('location');
    if(locationInput) locationInput.value = item.location || 'Кладовка верх';
    const locationStateInput = document.getElementById('location_state');
    if(locationStateInput) locationStateInput.value = normalizeLocationState(item.location_state);
    document.getElementById('addModal').classList.add('show');
    return;
  }

  setBaseFieldsEnabled(true);
  document.getElementById('number').value = item.number || '';
  document.getElementById('ebay_price').value = item.ebay_price || '';
  document.getElementById('ebay_link').value = item.ebay_link || '';

  let extra = document.getElementById('editOnlyFields');
  if(!extra){
    const actions = document.querySelector('#laptopForm .row-actions');
    extra = document.createElement('div');
    extra.id = 'editOnlyFields';
    extra.className = 'span-3';
    extra.innerHTML = `
      <div class="form-grid" style="margin-top:12px">
        <div><label>Доставка, ₴</label><input id="delivery_cost" type="number" min="0" step="0.01" /></div>
        <div><label>Зарядний, ₴</label><input id="charger_cost" type="number" min="0" step="0.01" /></div>
        <div><label>Мито, ₴</label><input id="duty_cost" type="number" min="0" step="0.01" /></div>
        <div><label>Реклама OLX, ₴</label><input id="olx_ad_cost" type="number" min="0" step="0.01" value="300" readonly /></div>
        <div><label>Гравіювання, ₴</label><input id="engraving_cost" type="number" min="0" step="0.01" value="200" readonly /></div>
        <div><label>SSD, ₴</label><input id="ssd" type="number" min="0" step="0.01" /></div>
        <div><label>RAM, ₴</label><input id="ram" type="number" min="0" step="0.01" /></div>
        <div><label>Статус</label>
          <select id="status">
            <option value="in_transit">В дорозі</option>
            <option value="received">Отримав</option>
            <option value="sold">Продано</option>
          </select>
        </div>
        <div><label>Серійний номер</label><input id="serial_number" /></div>
        <div><label>Собівартість, ₴</label><input id="cost_display" disabled /></div>
        <div class="span-2"><label>Посилання OLX</label><div style="display:flex;gap:8px;align-items:center"><input id="olx_link" placeholder="https://www.olx.ua/..." /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('olx_link')">Вставити</button></div></div>
        <div class="span-2"><label>Посилання Telegram</label><div style="display:flex;gap:8px;align-items:center"><input id="telegram_link" placeholder="https://t.me/..." /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('telegram_link')">Вставити</button></div></div>
      </div>`;
    actions.parentNode.insertBefore(extra, actions);
  }

  applyStatusOptions(item.status || 'in_transit');
  document.getElementById('serial_number').value = item.serial_number || '';
  document.getElementById('delivery_cost').value = item.delivery_cost || '';
  document.getElementById('charger_cost').value = item.charger_cost || '';
  document.getElementById('duty_cost').value = item.duty_cost || '';
  document.getElementById('olx_ad_cost').value = 300;
  document.getElementById('engraving_cost').value = 200;
  document.getElementById('ssd').value = item.ssd || '';
  document.getElementById('ram').value = item.ram || '';
  document.getElementById('olx_link').value = item.olx_link || '';
  document.getElementById('telegram_link').value = item.telegram_link || '';
  document.getElementById('cost_display').value = calcCost(item);

  const wrap = ensureSoldPriceField();
  if(wrap){
    const soldInput = document.getElementById('sold_price');
    if(soldInput) soldInput.value = item.sold_price || '';
  }

  toggleSoldPriceField();

  const statusEl = document.getElementById('status');
  if(statusEl && !statusEl.dataset.boundSoldPrice){
    statusEl.addEventListener('change', toggleSoldPriceField);
    statusEl.dataset.boundSoldPrice = '1';
  }

  document.getElementById('addModal').classList.add('show');
}

function applyStatusOptions(currentStatus){
  const select = document.getElementById('status');
  if(!select) return;

  const allowedNext = {
    in_transit: ['in_transit', 'received'],
    received: ['received', 'sold'],
    sold: ['sold', 'received']
  };

  [...select.options].forEach((opt) => {
    opt.disabled = !allowedNext[currentStatus]?.includes(opt.value);
  });
  select.value = currentStatus || 'in_transit';
}

async function loadLaptops(){
  const { data, error } = await supabaseClient.from(TABLE).select('*').order('created_at', { ascending: false });
  if(error){
    hasSupabaseConnection = false;
    updateNetwork();
    console.error(error);
    setBaseStatus('Помилка читання', false);
    setBanner('Помилка читання з бази', false);
    return;
  }
  hasSupabaseConnection = true;
  updateNetwork();
  laptops = (data || []).map((item) => ({
    ...item,
    status: normalizeStatus(item.status),
    location: normalizeLocation(item.location),
    location_state: normalizeLocationState(item.location_state)
  }));
  clearBanner();
  renderAll();
}

async function saveLaptop(event){
  event.preventDefault();

  if(currentEditMode === 'location' && currentEditId){
    const locationState = normalizeLocationState(document.getElementById('location_state')?.value);
    const payload = {
      location: document.getElementById('location')?.value || 'Кладовка верх',
      location_state: locationState || null
    };
    const response = await supabaseClient.from(TABLE).update(payload).eq('id', currentEditId);
    if(response.error){
      console.error(response.error);
      alert('Помилка збереження локації');
      return;
    }
    closeAddModal();
    resetForm();
    await loadLaptops();
    return;
  }

  const payload = {
    number: document.getElementById('number').value.trim(),
    ebay_price: toNum(document.getElementById('ebay_price').value),
    ebay_link: document.getElementById('ebay_link').value.trim(),
    status: document.getElementById('status') ? document.getElementById('status').value : 'in_transit',
    serial_number: document.getElementById('serial_number') ? document.getElementById('serial_number').value.trim() : '',
    delivery_cost: document.getElementById('delivery_cost') ? toNum(document.getElementById('delivery_cost').value) : 0,
    charger_cost: document.getElementById('charger_cost') ? toNum(document.getElementById('charger_cost').value) : 0,
    duty_cost: document.getElementById('duty_cost') ? toNum(document.getElementById('duty_cost').value) : 0,
    olx_ad_cost: 300,
    engraving_cost: 200,
    ssd: document.getElementById('ssd') ? toNum(document.getElementById('ssd').value) : 0,
    ram: document.getElementById('ram') ? toNum(document.getElementById('ram').value) : 0,
    sold_price: (document.getElementById('status') && document.getElementById('status').value === 'sold' && document.getElementById('sold_price'))
      ? toNum(document.getElementById('sold_price').value)
      : 0,
    olx_link: document.getElementById('olx_link') ? document.getElementById('olx_link').value.trim() : '',
    telegram_link: document.getElementById('telegram_link') ? document.getElementById('telegram_link').value.trim() : '',
    sold_at: null
  };

  if(!payload.number){
    alert('Введи номер ноутбука');
    return;
  }

  if(currentEditId){
    const currentItem = laptops.find((x) => x.id === currentEditId);
    const allowed = {
      in_transit: ['in_transit', 'received'],
      received: ['received', 'sold'],
      sold: ['sold', 'received']
    };

    if(currentItem && !allowed[currentItem.status]?.includes(payload.status)){
      alert('Недозволена зміна статусу');
      return;
    }

    if(payload.status === 'sold' && (!payload.sold_price || Number(payload.sold_price) <= 0)){
      alert('Введи ціну продажу перед статусом Продано');
      return;
    }

    if(payload.serial_number && payload.serial_number.trim() !== '' && payload.status !== 'sold'){
      payload.status = 'received';
    }

    if(currentItem && payload.status === 'sold' && currentItem.status !== 'sold'){
      payload.sold_at = new Date().toISOString();
    } else if(payload.status === 'received' || payload.status === 'in_transit'){
      payload.sold_at = null;
    } else {
      payload.sold_at = currentItem?.sold_at || new Date().toISOString();
    }
  } else {
    payload.status = 'in_transit';
    payload.sold_at = null;
  }

  const response = currentEditId
    ? await supabaseClient.from(TABLE).update(payload).eq('id', currentEditId)
    : await supabaseClient.from(TABLE).insert([payload]);

  if(response.error){
    console.error(response.error);
    alert('Помилка збереження в базу');
    return;
  }

  closeAddModal();
  resetForm();
  await loadLaptops();
}

async function quickStatus(id, status){
  const item = laptops.find((x) => x.id === id);
  if(!item) return;

  const allowed = {
    in_transit: ['received'],
    received: ['sold'],
    sold: ['sold', 'received']
  };

  if(!allowed[item.status]?.includes(status)){
    alert('Недозволена зміна статусу');
    return;
  }

  const payload = { status };
  payload.sold_at = status === 'sold' ? new Date().toISOString() : null;

  const { error } = await supabaseClient.from(TABLE).update(payload).eq('id', id);
  if(error){
    console.error(error);
    alert('Не вдалося змінити статус');
    return;
  }

  await loadLaptops();
}

async function removeLaptop(id){
  if(!confirm('Видалити ноутбук?')) return;
  const { error } = await supabaseClient.from(TABLE).delete().eq('id', id);
  if(error){
    console.error(error);
    alert('Не вдалося видалити');
    return;
  }
  closeAddModal();
  await loadLaptops();
}

async function deleteCurrent(){}

async function duplicateLaptop(id){
  const item = laptops.find((x) => x.id === id);
  if(!item) return;

  const copy = {
    number: (item.number || 'copy') + '-copy',
    ebay_price: item.ebay_price,
    ebay_link: item.ebay_link,
    delivery_cost: item.delivery_cost,
    charger_cost: item.charger_cost,
    duty_cost: item.duty_cost,
    olx_ad_cost: item.olx_ad_cost,
    engraving_cost: item.engraving_cost,
    serial_number: item.serial_number,
    olx_link: item.olx_link,
    telegram_link: item.telegram_link,
    sold_price: item.sold_price,
    status: 'in_transit',
    sold_at: null
  };

  const { error } = await supabaseClient.from(TABLE).insert([copy]);
  if(error){
    console.error(error);
    alert('Не вдалося дублювати');
    return;
  }

  await loadLaptops();
}

function subscribeRealtime(){
  if(realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = supabaseClient
    .channel('laptops-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, async () => {
      await loadLaptops();
    })
    .subscribe();
}

async function init(){
  loadTheme();
  updateNetwork();
  initAuthUI();

  if(!SUPABASE_URL || SUPABASE_URL.includes('PASTE_') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('PASTE_')){
    hasSupabaseConnection = false;
    updateNetwork();
    const msg = document.getElementById('simpleLoginMsg');
    if(msg) msg.textContent = 'Встав URL і KEY у код';
    setBaseStatus('Не налаштовано', false);
    setBanner('Встав URL і KEY у код', false);
    showAuthScreen();
    return;
  }

  try{
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    hasSupabaseConnection = true;
    updateNetwork();
    setBaseStatus('Підключено', true);
    const { data: { session } } = await supabaseClient.auth.getSession();
    await handleAuthSession(session);

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      await handleAuthSession(session);
    });
  } catch (error){
    hasSupabaseConnection = false;
    updateNetwork();
    console.error(error);
    const msg = document.getElementById('simpleLoginMsg');
    if(msg) msg.textContent = 'Не вдалося підключитися до Supabase';
    setBaseStatus('Помилка підключення', false);
    setBanner('Не вдалося підключитися до Supabase', false);
    showAuthScreen();
  }
}

function bindUI(){
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('laptopForm')?.addEventListener('submit', saveLaptop);

  window.addEventListener('online', updateNetwork);
  window.addEventListener('offline', updateNetwork);
  window.addEventListener('click', (event) => {
    if(event.target.id === 'addModal') closeAddModal();
  });

  document.addEventListener('change', (event) => {
    if(event.target.id === 'filterStatus' || event.target.id === 'filterMarket'){
      renderActive();
    }
    if(event.target.id === 'filterLocation'){
      renderLocation();
    }
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.log('SW register failed:', error);
      });
    });
  }
}

bindUI();
init();
