let authBootstrapped = false;

const SUPABASE_URL = 'https://qzcapeempzzdhicsweqz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nXxnpG6C_RO9mVqcYEt1mg_Z9Z-dpDr';
const TABLE = 'laptops';
const SETTINGS_TABLE = 'app_settings';

let supabaseClient = null;
let laptops = [];
let currentEditId = null;
let currentEditMode = 'full';
let realtimeChannel = null;
let hasSupabaseConnection = false;
let logoTapCount = 0;
let logoTapTimer = null;
let dashboardDeliveryNoteValue = [];
let isSavingLaptop = false;
const APP_VERSION = '20260501-2';
const APP_VERSION_KEY = 'notebook-crm-app-version';
const THEME_KEY = 'notebook-crm-theme';
const DASHBOARD_DELIVERY_NOTE_KEY = 'notebook-crm-dashboard-delivery-note';
const DASHBOARD_DELIVERY_NOTE_SETTING_KEY = 'dashboard_delivery_note';
const REQUEST_TIMEOUT_MS = 15000;
const HISTORICAL_SOLD_COUNT = 187;

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
  if(value === 'На гравіювання' || value === 'Гравіювання' || value === 'engraving') return 'Гравіювання';
  if(value === 'На ремонт' || value === 'Ремонт' || value === 'repair') return 'Ремонт';
  if(value === 'На чистку' || value === 'Чистка' || value === 'cleaning') return 'На чистку';
  if(value === 'На фото' || value === 'Фото' || value === 'photo') return 'На фото';
  return '';
}

function getLocationStateBadgeClass(state){
  const normalizedState = normalizeLocationState(state);
  if(normalizedState === 'Ремонт') return 'location-card-badge-repair';
  if(normalizedState === 'Гравіювання') return 'location-card-badge-engraving';
  if(normalizedState === 'На чистку') return 'location-card-badge-cleaning';
  return 'location-card-badge-alt';
}

function getTrackingTail(trackingNumber){
  const value = String(trackingNumber || '').trim();
  if(!value) return '';
  return value.slice(-4);
}

function isTestLaptop(item){
  return /(?:тест|test)/i.test(String(item?.number || '').trim());
}

function getTestLaptopIds(){
  return laptops.filter(isTestLaptop).map((item) => item.id).filter(Boolean);
}

function updateTestTools(){
  const countEl = document.getElementById('testLaptopCount');
  if(countEl) countEl.textContent = String(getTestLaptopIds().length);
}

function toggleTestTools(){
  const wrap = document.getElementById('testTools');
  if(!wrap) return;
  wrap.hidden = !wrap.hidden;
  updateTestTools();
}

function handleLogoTap(){
  if(logoTapTimer) clearTimeout(logoTapTimer);
  logoTapCount += 1;

  if(logoTapCount >= 3){
    logoTapCount = 0;
    logoTapTimer = null;
    toggleTestTools();
    return;
  }

  logoTapTimer = setTimeout(() => {
    logoTapCount = 0;
    logoTapTimer = null;
  }, 700);
}

function ensureAppVersion(){
  const savedVersion = localStorage.getItem(APP_VERSION_KEY);
  const currentUrl = new URL(window.location.href);
  const currentVersionParam = currentUrl.searchParams.get('appv');

  if(savedVersion !== APP_VERSION && currentVersionParam !== APP_VERSION){
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    currentUrl.searchParams.set('appv', APP_VERSION);
    window.location.replace(currentUrl.toString());
    return false;
  }

  localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
  return true;
}

async function purgeTestLaptops(){
  const ids = getTestLaptopIds();
  if(!ids.length){
    setBanner('Тестових карток не знайдено.', true);
    return;
  }

  if(!confirm(`Знайдено тестових карток: ${ids.length}. Видалити їх з бази?`)) return;

  const { error } = await supabaseClient.from(TABLE).delete().in('id', ids);
  if(error){
    console.error(error);
    setBanner('Не вдалося видалити тестові картки.', false);
    return;
  }

  setBanner(`Видалено тестових карток: ${ids.length}.`, true);
  await loadLaptops();
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

async function loadDashboardDeliveryNote(){
  const input = document.getElementById('dashboardDeliveryNote');
  if(!input) return;

  if(supabaseClient){
    const { data, error } = await supabaseClient
      .from(SETTINGS_TABLE)
      .select('value')
      .eq('key', DASHBOARD_DELIVERY_NOTE_SETTING_KEY)
      .maybeSingle();

    if(!error){
      const value = String(data?.value || '');
      dashboardDeliveryNoteValue = parseDashboardDeliverySelection(value);
      renderDashboardDeliveryOptions();
      if(value) localStorage.setItem(DASHBOARD_DELIVERY_NOTE_KEY, value);
      else localStorage.removeItem(DASHBOARD_DELIVERY_NOTE_KEY);
      return;
    }
  }

  const localValue = localStorage.getItem(DASHBOARD_DELIVERY_NOTE_KEY) || '';
  dashboardDeliveryNoteValue = parseDashboardDeliverySelection(localValue);
  renderDashboardDeliveryOptions();
}

async function saveDashboardDeliveryNote(){
  const value = JSON.stringify(dashboardDeliveryNoteValue);

  if(supabaseClient){
    const { error } = await supabaseClient
      .from(SETTINGS_TABLE)
      .upsert({ key: DASHBOARD_DELIVERY_NOTE_SETTING_KEY, value }, { onConflict: 'key' });

    if(!error){
      if(value) localStorage.setItem(DASHBOARD_DELIVERY_NOTE_KEY, value);
      else localStorage.removeItem(DASHBOARD_DELIVERY_NOTE_KEY);
      updateDashboardDeliveryNoteValue(getDashboardDeliveryDisplayNumbers());
      setDashboardDeliveryEditorOpen(false);
      clearBanner();
      return;
    }
  }

  if(value) localStorage.setItem(DASHBOARD_DELIVERY_NOTE_KEY, value);
  else localStorage.removeItem(DASHBOARD_DELIVERY_NOTE_KEY);

  updateDashboardDeliveryNoteValue(getDashboardDeliveryDisplayNumbers());
  setDashboardDeliveryEditorOpen(false);
  clearBanner();
}

function updateDashboardDeliveryNoteValue(value){
  const valueEl = document.getElementById('dashboardDeliveryNoteValue');
  if(!valueEl) return;
  const list = Array.isArray(value) ? value.filter(Boolean) : parseDashboardDeliverySelection(value);
  valueEl.textContent = list.length ? list.join(', ') : '-';
}

function parseDashboardDeliverySelection(value){
  const raw = String(value || '').trim();
  if(!raw) return [];

  try{
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean);
  }catch(error){}

  return [raw];
}

function getDashboardDeliveryDisplayNumbers(){
  const autoIncludedNumbers = laptops
    .filter((item) => normalizeStatus(item.status) !== 'sold' && String(item.number || '').trim() && !String(item.tracking_number || '').trim())
    .map((item) => String(item.number || '').trim());

  return Array.from(new Set([...autoIncludedNumbers, ...dashboardDeliveryNoteValue]));
}

function renderDashboardDeliveryOptions(){
  const listWrap = document.getElementById('dashboardDeliveryNote');
  if(!listWrap) return;

  const activeLaptops = laptops
    .filter((item) => normalizeStatus(item.status) !== 'sold' && String(item.number || '').trim())
    .map((item) => ({
      number: String(item.number || '').trim(),
      autoIncluded: !String(item.tracking_number || '').trim()
    }));
  const activeNumbers = activeLaptops.map((item) => item.number);
  dashboardDeliveryNoteValue = dashboardDeliveryNoteValue.filter((number) => activeNumbers.includes(number));
  if(!activeLaptops.length){
    listWrap.innerHTML = '<div class="dashboard-note-empty">Немає активних ноутбуків для вибору</div>';
    updateDashboardDeliveryNoteValue(getDashboardDeliveryDisplayNumbers());
    return;
  }

  listWrap.innerHTML = activeLaptops.map((item) => `
    <label class="dashboard-note-option ${item.autoIncluded ? 'dashboard-note-option-auto' : ''}">
      <input
        type="checkbox"
        value="${safe(item.number)}"
        ${item.autoIncluded || dashboardDeliveryNoteValue.includes(item.number) ? 'checked' : ''}
        ${item.autoIncluded ? 'disabled' : ''}
      />
      <span>
        ${safe(item.number)}
        ${item.autoIncluded ? '<span class="dashboard-note-option-meta">Без трекінгу, додано автоматично</span>' : ''}
      </span>
    </label>
  `).join('');

  updateDashboardDeliveryNoteValue(getDashboardDeliveryDisplayNumbers());
}

function setDashboardDeliveryEditorOpen(open){
  const editor = document.getElementById('dashboardNoteEditor');
  const editBtn = document.getElementById('dashboardDeliveryNoteEdit');
  if(editor) editor.hidden = !open;
  if(editBtn) editBtn.setAttribute('aria-expanded', String(open));
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
    await loadDashboardDeliveryNote();
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

function sanitizeExternalUrl(value){
  const raw = String(value || '').trim();
  if(!raw) return '';

  try{
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(normalized);
    if(url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  }catch(error){}

  return '';
}

function monthKey(dateStr){
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthName(key){
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
}

function diffDaysLabel(startDate, endDate){
  if(!startDate || !endDate) return '';

  const start = new Date(startDate);
  const end = new Date(endDate);
  if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const diffDays = Math.max(0, Math.floor((endUtc - startUtc) / 86400000));

  const mod10 = diffDays % 10;
  const mod100 = diffDays % 100;
  let unit = 'днів';
  if(mod10 === 1 && mod100 !== 11) unit = 'день';
  else if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) unit = 'дні';

  return `${diffDays} ${unit}`;
}

function soldDateLabel(dateStr){
  if(!dateStr) return '';

  const date = new Date(dateStr);
  if(Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long'
  });
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

async function ensureFreshSession(){
  if(!supabaseClient?.auth) return;

  try{
    const { data: { session } } = await supabaseClient.auth.getSession();
    const expiresAtMs = Number(session?.expires_at || 0) * 1000;
    const needsRefresh = session && expiresAtMs && (expiresAtMs - Date.now() < 2 * 60 * 1000);
    if(needsRefresh) await supabaseClient.auth.refreshSession();
  }catch(error){
    console.error('Session refresh failed:', error);
  }
}

function isRetryableAuthError(error){
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || 0);
  return Boolean(
    status === 401 ||
    status === 403 ||
    code === 'jwt_expired' ||
    code === 'invalid_jwt' ||
    message.includes('jwt') ||
    message.includes('token') ||
    message.includes('session') ||
    message.includes('refresh')
  );
}

function isRetryableNetworkError(error){
  const message = String(error?.message || '').toLowerCase();
  return Boolean(
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('fetch')
  );
}

async function runWithReconnect(label, task){
  let response = await withRequestTimeout(label, task);
  if(!response?.error) return response;

  const retryable = isRetryableAuthError(response.error) || isRetryableNetworkError(response.error);
  if(!retryable) return response;

  try{
    await ensureFreshSession();
    if(supabaseClient) subscribeRealtime();
  }catch(error){
    console.error(`Reconnect prep failed for ${label}:`, error);
  }

  response = await withRequestTimeout(`${label} retry`, task);
  if(!response?.error){
    hasSupabaseConnection = true;
    updateNetwork();
  }
  return response;
}

async function withRequestTimeout(label, task){
  await ensureFreshSession();

  return await Promise.race([
    task(),
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
      }, REQUEST_TIMEOUT_MS);
    })
  ]);
}

function normalizeSerialNumber(value){
  return String(value || '').trim().toUpperCase();
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

function syncDisplayModeClass(){
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  document.body.classList.toggle('standalone-mode', Boolean(isStandalone));
}

function resetFilters(){
  const filterStatus = document.getElementById('filterStatus');
  const filterMarket = document.getElementById('filterMarket');
  const filterTracking = document.getElementById('filterTracking');
  const filterLocation = document.getElementById('filterLocation');
  const filterLocationState = document.getElementById('filterLocationState');

  if(filterStatus) filterStatus.value = '';
  if(filterMarket) filterMarket.value = '';
  if(filterTracking) filterTracking.value = '';
  if(filterLocation) filterLocation.value = '';
  if(filterLocationState) filterLocationState.value = '';
}

function switchView(name){
  resetFilters();
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
  document.querySelector(`.nav-btn[data-view="${name}"]`)?.classList.add('active');
  renderActive();
  renderLocation();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStats(){
  const active = laptops.filter((x) => normalizeStatus(x.status) !== 'sold');
  const sold = laptops.filter((x) => normalizeStatus(x.status) === 'sold');
  const totalSoldOverall = HISTORICAL_SOLD_COUNT + sold.length;
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
  const statSoldOverallBig = document.getElementById('statSoldOverallBig');
  if(statSoldOverallBig) statSoldOverallBig.textContent = String(totalSoldOverall);

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
  const soldDays = diffDaysLabel(item.created_at, item.sold_at);
  const soldDate = soldDateLabel(item.sold_at);
  const trackingTail = getTrackingTail(item.tracking_number);
  const ebayLink = sanitizeExternalUrl(item.ebay_link);
  const olxLink = sanitizeExternalUrl(item.olx_link);
  const telegramLink = sanitizeExternalUrl(item.telegram_link);

  if(soldMode){
    return `
      <div class="item">
        <div class="sold-card">
          <div class="sold-card-top">
            <div class="sold-card-header">
              <div class="sold-card-heading">
                <div class="item-title">${safe(item.number || 'Без номера')}</div>
                <button class="edit-mini sold-card-edit" onclick="openEditModal('${item.id}')" title="Редагувати">✏️</button>
                ${soldDate ? `<div class="sold-date-badge sold-date-badge-top">📅 ${safe(soldDate)}</div>` : ''}
              </div>
            <div class="sold-card-links">
              ${ebayLink ? `<a href="${safe(ebayLink)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(138,180,255,0.15);color:#8ab4ff;font-size:14px;text-decoration:none;display:inline-block;">🔗 eBay</a>` : ''}
              ${soldDays ? `<div class="sold-days-badge">⏱ ${safe(soldDays)}</div>` : ''}
              ${item.serial_number ? `<div class="sold-serial-badge">🔢 ${safe(item.serial_number)}</div>` : ''}
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
      <div class="active-card-body">
        <div class="active-card-heading">
          <div class="item-title">${safe(item.number || 'Без номера')}</div>
          <button class="edit-mini active-card-edit" onclick="openEditModal('${item.id}')" title="Редагувати">✏️</button>
          ${trackingTail ? `<div class="tracking-badge" title="Трекінг номер">📦 ${safe(trackingTail)}</div>` : ''}
        </div>
        <div class="active-card-side">
          <span class="cost-badge active-card-price">💰 ${money(calcCost(item))}</span>
          <div class="badge active-card-status st-${safe(normalizedStatus)}">${safe(statusLabels[normalizedStatus] || item.status)}</div>
        </div>
        <div class="active-card-links">
          ${ebayLink ? `<a href="${safe(ebayLink)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(138,180,255,0.15);color:#8ab4ff;font-size:14px;text-decoration:none;display:inline-block;">🔗 eBay</a>` : ''}
          ${olxLink ? `<a href="${safe(olxLink)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(34,197,94,0.15);color:#7df0a3;font-size:14px;display:inline-block;text-decoration:none;">✅ OLX</a>` : ''}
          ${telegramLink ? `<a href="${safe(telegramLink)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(139,92,246,0.15);color:#d8b4fe;font-size:14px;display:inline-block;text-decoration:none;">✈️ Telegram</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderActive(){
  const statusF = document.getElementById('filterStatus')?.value;
  const marketF = document.getElementById('filterMarket')?.value;
  const trackingF = String(document.getElementById('filterTracking')?.value || '').trim();

  let data = laptops.filter((x) => normalizeStatus(x.status) !== 'sold');

  if(statusF) data = data.filter((x) => normalizeStatus(x.status) === statusF);
  if(marketF === 'no_olx') data = data.filter((x) => !x.olx_link);
  if(marketF === 'no_telegram') data = data.filter((x) => !x.telegram_link);
  if(trackingF) data = data.filter((x) => getTrackingTail(x.tracking_number).includes(trackingF));

  const activeCountEl = document.getElementById('activeCount');
  if(activeCountEl) activeCountEl.textContent = data.length;

  document.getElementById('activeCards').innerHTML = data.length
    ? data.map((item) => cardTemplate(item, false)).join('')
    : '<div class="empty">Немає ноутбуків по фільтру</div>';
}

function renderSold(){
  const data = laptops
    .filter((x) => normalizeStatus(x.status) === 'sold')
    .sort((a, b) => {
      const aTime = new Date(a.sold_at || a.created_at || 0).getTime();
      const bTime = new Date(b.sold_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });
  document.getElementById('soldCards').innerHTML = data.length
    ? data.map((item) => cardTemplate(item, true)).join('')
    : '<div class="empty">Ще немає проданих ноутбуків</div>';
}

function renderLocation(){
  const locationF = document.getElementById('filterLocation')?.value;
  const locationStateF = document.getElementById('filterLocationState')?.value;
  let data = laptops.filter((x) => normalizeStatus(x.status) === 'received');
  if(locationF) data = data.filter((x) => normalizeLocation(x.location) === locationF);
  if(locationStateF) data = data.filter((x) => normalizeLocationState(x.location_state) === locationStateF);
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
  `).join('') : `<div class="empty">${locationF || locationStateF ? 'Немає ноутбуків по вибраних фільтрах' : 'Немає ноутбуків зі статусом "Отримано"'}</div>`;
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
  renderDashboardDeliveryOptions();
  renderActive();
  renderSold();
  renderLocation();
  renderMonths();
  updateTestTools();
}

function applyLaptopToState(item){
  if(!item?.id) return;

  const normalizedItem = {
    ...item,
    status: normalizeStatus(item.status),
    location: normalizeLocation(item.location),
    location_state: normalizeLocationState(item.location_state)
  };
  const index = laptops.findIndex((entry) => entry.id === normalizedItem.id);
  if(index >= 0) laptops[index] = { ...laptops[index], ...normalizedItem };
  else laptops.unshift(normalizedItem);
  renderAll();
}

function refreshLaptopsInBackground(){
  loadLaptops().catch((error) => {
    console.error('Background laptops refresh failed:', error);
  });
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
          <option value="Нічого">Нічого</option>
          <option value="Кладовка верх">Кладовка верх</option>
          <option value="Кладовка низ">Кладовка низ</option>
          <option value="Кухня">Кухня</option>
          <option value="Спальня верх">Спальня верх</option>
          <option value="Спальня низ">Спальня низ</option>
        </select>
      </div>
      <div>
        <label>Стан</label>
        <select id="location_state">
          <option value="">Нічого</option>
          <option value="На чистку">На чистку</option>
          <option value="Гравіювання">Гравіювання</option>
          <option value="Ремонт">Ремонт</option>
          <option value="На фото">На фото</option>
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

function setAdditionalCostsVisibility(expanded){
  const wrap = document.getElementById('additionalCostsFields');
  const toggle = document.getElementById('additionalCostsToggle');
  if(!wrap || !toggle) return;
  wrap.hidden = !expanded;
  toggle.textContent = expanded ? 'Сховати додаткові витрати' : 'Додаткові витрати';
  toggle.setAttribute('aria-expanded', String(expanded));
}

function toggleAdditionalCosts(){
  const wrap = document.getElementById('additionalCostsFields');
  if(!wrap) return;
  setAdditionalCostsVisibility(wrap.hidden);
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
        <div class="span-3 additional-costs-toggle-row">
          <button id="additionalCostsToggle" class="ghost inline-field-btn additional-costs-toggle" type="button" aria-expanded="false">Додаткові витрати</button>
        </div>
        <div id="additionalCostsFields" class="span-3 additional-costs-fields" hidden>
          <div class="form-grid additional-costs-grid">
            <div><label>Мито, ₴</label><input id="duty_cost" type="number" min="0" step="0.01" /></div>
            <div><label>Реклама OLX, ₴</label><input id="olx_ad_cost" type="number" min="0" step="0.01" value="300" readonly /></div>
            <div><label>Гравіювання, ₴</label><input id="engraving_cost" type="number" min="0" step="0.01" value="200" readonly /></div>
            <div><label>SSD, ₴</label><input id="ssd" type="number" min="0" step="0.01" /></div>
            <div><label>RAM, ₴</label><input id="ram" type="number" min="0" step="0.01" /></div>
          </div>
        </div>
        <div><label>Статус</label>
          <select id="status">
            <option value="in_transit">В дорозі</option>
            <option value="received">Отримав</option>
            <option value="sold">Продано</option>
          </select>
        </div>
        <div><label>Серійний номер</label><input id="serial_number" /></div>
        <div><label>Собівартість, ₴</label><input id="cost_display" disabled /></div>
        <div class="span-2"><label>Трекінг номер</label><div style="display:flex;gap:8px;align-items:center"><input id="tracking_number" placeholder="Наприклад: 1234567890" /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('tracking_number')">Вставити</button></div></div>
        <div class="span-2"><label>Посилання OLX</label><div style="display:flex;gap:8px;align-items:center"><input id="olx_link" placeholder="https://www.olx.ua/..." /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('olx_link')">Вставити</button></div></div>
        <div class="span-2"><label>Посилання Telegram</label><div style="display:flex;gap:8px;align-items:center"><input id="telegram_link" placeholder="https://t.me/..." /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('telegram_link')">Вставити</button></div></div>
      </div>`;
    actions.parentNode.insertBefore(extra, actions);
  }

  const additionalCostsToggle = document.getElementById('additionalCostsToggle');
  if(additionalCostsToggle && !additionalCostsToggle.dataset.bound){
    additionalCostsToggle.addEventListener('click', toggleAdditionalCosts);
    additionalCostsToggle.dataset.bound = '1';
  }
  setAdditionalCostsVisibility(false);

  applyStatusOptions(item.status || 'in_transit');
  document.getElementById('serial_number').value = normalizeSerialNumber(item.serial_number);
  document.getElementById('delivery_cost').value = item.delivery_cost || '';
  document.getElementById('charger_cost').value = item.charger_cost || '';
  document.getElementById('duty_cost').value = item.duty_cost || '';
  document.getElementById('olx_ad_cost').value = 300;
  document.getElementById('engraving_cost').value = 200;
  document.getElementById('ssd').value = item.ssd || '';
  document.getElementById('ram').value = item.ram || '';
  document.getElementById('tracking_number').value = item.tracking_number || '';
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
  const { data, error } = await withRequestTimeout('Load laptops', () =>
    supabaseClient.from(TABLE).select('*').order('created_at', { ascending: false })
  );
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

async function wakeAppConnection(){
  if(!supabaseClient) return;

  try{
    await ensureFreshSession();
    subscribeRealtime();
    await loadLaptops();
  }catch(error){
    console.error('Wake app connection failed:', error);
  }
}

async function saveLaptop(event){
  event.preventDefault();
  if(isSavingLaptop) return;

  const saveBtn = document.getElementById('saveLaptopBtn');
  isSavingLaptop = true;
  if(saveBtn){
    saveBtn.disabled = true;
    saveBtn.textContent = 'Збереження...';
  }

  try{
    if(currentEditMode === 'location' && currentEditId){
      const locationState = normalizeLocationState(document.getElementById('location_state')?.value);
      const payload = {
        location: document.getElementById('location')?.value || 'Кладовка верх',
        location_state: locationState || null
      };
      const response = await runWithReconnect('Save location', () =>
        supabaseClient.from(TABLE).update(payload).eq('id', currentEditId).select().single()
      );
      if(response.error){
        hasSupabaseConnection = false;
        updateNetwork();
        console.error(response.error);
        alert(`Помилка збереження локації: ${response.error.message || 'невідома помилка'}`);
        return;
      }
      hasSupabaseConnection = true;
      updateNetwork();
      if(response.data) applyLaptopToState(response.data);
      closeAddModal();
      resetForm();
      refreshLaptopsInBackground();
      return;
    }

    const payload = {
      number: document.getElementById('number').value.trim(),
      ebay_price: toNum(document.getElementById('ebay_price').value),
      ebay_link: sanitizeExternalUrl(document.getElementById('ebay_link').value),
      status: document.getElementById('status') ? document.getElementById('status').value : 'in_transit',
      serial_number: document.getElementById('serial_number') ? normalizeSerialNumber(document.getElementById('serial_number').value) : '',
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
      tracking_number: document.getElementById('tracking_number') ? document.getElementById('tracking_number').value.trim() : '',
      olx_link: document.getElementById('olx_link') ? sanitizeExternalUrl(document.getElementById('olx_link').value) : '',
      telegram_link: document.getElementById('telegram_link') ? sanitizeExternalUrl(document.getElementById('telegram_link').value) : '',
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

      if(payload.status === 'received' && currentItem && currentItem.status !== 'received'){
        payload.location_state = 'На чистку';
      } else if(payload.status === 'in_transit'){
        payload.location_state = null;
      }

      if(currentItem && payload.status === 'sold' && currentItem.status !== 'sold'){
        payload.sold_at = new Date().toISOString();
      } else if(payload.status === 'received' || payload.status === 'in_transit'){
        payload.sold_at = null;
      } else {
        payload.sold_at = currentItem?.sold_at || new Date().toISOString();
      }
    } else if(payload.status === 'received' || payload.status === 'in_transit'){
      payload.sold_at = null;
    } else {
      payload.status = 'in_transit';
      payload.location_state = null;
      payload.sold_at = null;
    }

    const response = await runWithReconnect('Save laptop', () =>
      currentEditId
        ? supabaseClient.from(TABLE).update(payload).eq('id', currentEditId).select().single()
        : supabaseClient.from(TABLE).insert([payload]).select().single()
    );

    if(response.error){
      hasSupabaseConnection = false;
      updateNetwork();
      console.error(response.error);
      alert(`Помилка збереження в базу: ${response.error.message || 'невідома помилка'}`);
      return;
    }
    hasSupabaseConnection = true;
    updateNetwork();
    if(response.data) applyLaptopToState(response.data);

    closeAddModal();
    resetForm();
    refreshLaptopsInBackground();
  }catch(error){
    console.error(error);
    const message = error?.message || 'невідома помилка';
    if(message.includes('timed out')){
      alert('Збереження зависло. Спробуй ще раз: CRM уже відпустила кнопку і не зависне назавжди.');
    } else {
      alert(`Помилка збереження: ${message}`);
    }
  }finally{
    isSavingLaptop = false;
    if(saveBtn){
      saveBtn.disabled = false;
      saveBtn.textContent = 'Зберегти';
    }
  }
}

function submitLaptopForm(){
  return saveLaptop({ preventDefault(){} });
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
  if(status === 'received' && item.status !== 'received') payload.location_state = 'На чистку';
  if(status === 'in_transit') payload.location_state = null;
  payload.sold_at = status === 'sold' ? new Date().toISOString() : null;

  const response = await runWithReconnect('Quick status', () =>
    supabaseClient.from(TABLE).update(payload).eq('id', id).select().single()
  );
  if(response.error){
    hasSupabaseConnection = false;
    updateNetwork();
    console.error(response.error);
    alert(`Не вдалося змінити статус: ${response.error.message || 'невідома помилка'}`);
    return;
  }

  hasSupabaseConnection = true;
  updateNetwork();
  if(response.data) applyLaptopToState(response.data);
  refreshLaptopsInBackground();
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
    tracking_number: item.tracking_number,
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
  if(!ensureAppVersion()) return;
  loadTheme();
  syncDisplayModeClass();
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
  const logo = document.querySelector('.logo');
  if(logo && !logo.dataset.boundTestTools){
    logo.addEventListener('click', handleLogoTap);
    logo.dataset.boundTestTools = '1';
  }

  const purgeBtn = document.getElementById('purgeTestLaptopsBtn');
  if(purgeBtn && !purgeBtn.dataset.bound){
    purgeBtn.addEventListener('click', purgeTestLaptops);
    purgeBtn.dataset.bound = '1';
  }

  const dashboardDeliveryNoteEdit = document.getElementById('dashboardDeliveryNoteEdit');
  if(dashboardDeliveryNoteEdit && !dashboardDeliveryNoteEdit.dataset.bound){
    dashboardDeliveryNoteEdit.addEventListener('click', () => {
      const editor = document.getElementById('dashboardNoteEditor');
      setDashboardDeliveryEditorOpen(Boolean(editor?.hidden));
    });
    dashboardDeliveryNoteEdit.dataset.bound = '1';
  }

  const dashboardDeliveryNote = document.getElementById('dashboardDeliveryNote');
  if(dashboardDeliveryNote && !dashboardDeliveryNote.dataset.bound){
    dashboardDeliveryNote.addEventListener('change', async (event) => {
      const target = event.target;
      if(!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;

      const value = String(target.value || '').trim();
      if(!value) return;

      if(target.checked){
        if(!dashboardDeliveryNoteValue.includes(value)) dashboardDeliveryNoteValue.push(value);
      } else {
        dashboardDeliveryNoteValue = dashboardDeliveryNoteValue.filter((item) => item !== value);
      }

      updateDashboardDeliveryNoteValue(dashboardDeliveryNoteValue);
      await saveDashboardDeliveryNote();
      setDashboardDeliveryEditorOpen(true);
    });
    dashboardDeliveryNote.dataset.bound = '1';
  }

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.addEventListener('input', (event) => {
    if(event.target?.id !== 'serial_number') return;
    const input = event.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = normalizeSerialNumber(input.value);
    if(start !== null && end !== null) input.setSelectionRange(start, end);
  });

  window.addEventListener('online', async () => {
    updateNetwork();
    await wakeAppConnection();
  });
  window.addEventListener('offline', updateNetwork);
  document.addEventListener('visibilitychange', async () => {
    if(document.visibilityState === 'visible'){
      await wakeAppConnection();
    }
  });
  window.addEventListener('click', (event) => {
    if(event.target.id === 'addModal') closeAddModal();
  });

  document.addEventListener('change', (event) => {
    if(event.target.id === 'filterStatus' || event.target.id === 'filterMarket' || event.target.id === 'filterTracking'){
      renderActive();
    }
    if(event.target.id === 'filterLocation' || event.target.id === 'filterLocationState'){
      renderLocation();
    }
  });

  document.getElementById('filterTracking')?.addEventListener('input', renderActive);

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
