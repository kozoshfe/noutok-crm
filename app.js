let authBootstrapped = false;

const SUPABASE_URL = 'https://qzcapeempzzdhicsweqz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nXxnpG6C_RO9mVqcYEt1mg_Z9Z-dpDr';
const TABLE = 'laptops';
const SETTINGS_TABLE = 'app_settings';
const STOCK_TABLE = 'stock_inventory';

let supabaseClient = null;
let laptops = [];
let currentEditId = null;
let currentEditMode = 'full';
let realtimeChannel = null;
let hasSupabaseConnection = false;
let logoTapCount = 0;
let logoTapTimer = null;
let versionTapCount = 0;
let versionTapTimer = null;
let dashboardDeliveryNoteValue = [];
let stockParts = {};
let stockPrices = {};
let isSavingLaptop = false;
let lockedScrollY = 0;
// Змінюй номер тут під час кожного оновлення застосунку.
const APP_VERSION = '1.11.52';
const APP_VERSION_KEY = 'notebook-crm-app-version';
const THEME_KEY = 'notebook-crm-theme';
const DASHBOARD_DELIVERY_NOTE_KEY = 'notebook-crm-dashboard-delivery-note';
const DASHBOARD_DELIVERY_NOTE_SETTING_KEY = 'dashboard_delivery_note';
const STOCK_PARTS_KEY = 'notebook-crm-stock-parts';
const STOCK_PRICES_KEY = 'notebook-crm-stock-prices';
const STOCK_PARTS_SETTING_KEY = 'stock_parts';
const STOCK_REMINDER_DATE_KEY = 'notebook-crm-stock-reminder-date';
const PENDING_SAVE_QUEUE_KEY = 'notebook-crm-pending-save-queue';
const REQUEST_TIMEOUT_MS = 8000;
const AUTH_TIMEOUT_MS = 3000;
const SAVE_UI_TIMEOUT_MS = 10000;
const HISTORICAL_SOLD_COUNT = 187;
const DELIVERY_ESTIMATE_PER_LAPTOP = 900;
const DUTY_FREE_LIMIT_EUR = 150;
const DUTY_RATE = 0.3;
let isSyncingPendingSaves = false;

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
  if(value === 'На ремонт' || value === 'Ремонт' || value === 'repair' || value.startsWith('Ремонт:')) return 'Ремонт';
  if(value === 'На чистку' || value === 'Чистка' || value === 'cleaning') return 'На чистку';
  if(value === 'На фото' || value === 'Фото' || value === 'photo') return 'На фото';
  return '';
}

function getRepairType(state){
  const match = String(state || '').trim().match(/^Ремонт:\s*(.+)$/);
  return match ? match[1].trim() : '';
}

const repairTypeIcons = {
  'Екран': '🖥️',
  'ССД': '💾',
  'ОЗУ': '🧠',
  'Батарея': '🔋',
  'Клавіатура': '⌨️',
  'USB': '🔌',
  'Камера': '📷'
};

function repairTypeIconsTemplate(state){
  return getRepairType(state).split(', ').filter(Boolean).map((type) => {
    const icon = repairTypeIcons[type] || '🛠️';
    return `<span class="repair-type-icon" title="${safe(type)}" aria-label="${safe(type)}">${icon}</span>`;
  }).join('');
}

function normalizeLocationStateValue(state){
  const normalizedState = normalizeLocationState(state);
  const repairType = getRepairType(state);
  return normalizedState === 'Ремонт' && repairType ? `Ремонт: ${repairType}` : normalizedState;
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

const stockPartDefinitions = [
  { key: 'ssd256', label: 'ССД 256 GB', icon: '💾' },
  { key: 'ssd512', label: 'ССД 512 GB', icon: '💾' },
  { key: 'ram8', label: 'Оперативна пам’ять 8 GB', icon: '🧠' },
  { key: 'ram16', label: 'Оперативна пам’ять 16 GB', icon: '🧠' },
  { key: 'charger65', label: 'Блоки живлення 65W', icon: '🔌' },
  { key: 'charger150', label: 'Блоки живлення 150W', icon: '⚡' },
  { key: 'powerCables', label: 'Кабелі живлення', icon: '🔗' }
];

const stockPriceDefinitions = [
  ...stockPartDefinitions.filter((part) => part.key !== 'powerCables').map((part) => ({ ...part, description: 'ціна, грн', unit: 'грн' })),
  { key: 'olxAd', label: 'Реклама OLX', icon: '📣', description: 'вартість реклами', unit: 'грн', min: 0 },
  { key: 'engraving', label: 'Гравіювання', icon: '✍️', description: 'вартість гравіювання', unit: 'грн', min: 0 },
  { key: 'euroRate', label: 'Курс євро для мита', icon: '💶', description: 'курс, гривень за €', unit: 'грн/€' }
];

function normalizeStockParts(value){
  return window.StockLogic.normalizeStockParts(value);
}

function normalizeStockPrices(value){
  return window.StockLogic.normalizeStockPrices(value);
}

function stockPartsFromDatabase(row){
  return normalizeStockParts({
    ssd256: row?.ssd_256,
    ssd512: row?.ssd_512,
    ram8: row?.ram_8,
    ram16: row?.ram_16,
    charger65: row?.charger_65w,
    charger150: row?.charger_150w,
    powerCables: row?.power_cables
  });
}

function stockPricesFromDatabase(row){
  return normalizeStockPrices({
    ssd256: row?.price_ssd_256,
    ssd512: row?.price_ssd_512,
    ram8: row?.price_ram_8,
    ram16: row?.price_ram_16,
    charger65: row?.price_charger_65w,
    charger150: row?.price_charger_150w,
    olxAd: row?.price_olx_ad,
    engraving: row?.price_engraving,
    euroRate: row?.duty_euro_rate
  });
}

function stockPartsToDatabase(){
  const normalized = normalizeStockParts(stockParts);
  const normalizedPrices = normalizeStockPrices(stockPrices);
  return {
    id: 1,
    ssd_256: normalized.ssd256,
    ssd_512: normalized.ssd512,
    ram_8: normalized.ram8,
    ram_16: normalized.ram16,
    charger_65w: normalized.charger65,
    charger_150w: normalized.charger150,
    power_cables: normalized.powerCables,
    price_ssd_256: normalizedPrices.ssd256,
    price_ssd_512: normalizedPrices.ssd512,
    price_ram_8: normalizedPrices.ram8,
    price_ram_16: normalizedPrices.ram16,
    price_charger_65w: normalizedPrices.charger65,
    price_charger_150w: normalizedPrices.charger150,
    price_olx_ad: normalizedPrices.olxAd,
    price_engraving: normalizedPrices.engraving,
    duty_euro_rate: normalizedPrices.euroRate
  };
}

function renderStockParts(){
  const wrap = document.getElementById('stockParts');
  if(!wrap) return;
  stockParts = normalizeStockParts(stockParts);
  wrap.innerHTML = stockPartDefinitions.map((part) => `
    <label class="stock-part-card" for="stock-${part.key}">
      <span class="stock-part-icon" aria-hidden="true">${part.icon}</span>
      <span class="stock-part-copy"><b>${part.label}</b><small>шт. на складі</small></span>
      <input id="stock-${part.key}" class="stock-part-input stock-part-input-locked" type="number" min="0" step="1" inputmode="numeric" value="${stockParts[part.key]}" aria-label="${safe(part.label)}: кількість на складі. Натисни двічі для редагування" data-stock-key="${part.key}" readonly />
    </label>
  `).join('');
}

function formatStockPrice(value){
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function getStockPrice(key){
  return normalizeStockPrices(stockPrices)[key];
}

function partCostOptionTemplate(fieldId, cost, label, description, partKey = ''){
  const normalizedCost = Number(cost);
  return `<button class="part-cost-option" type="button" data-cost="${normalizedCost}" ${partKey ? `data-stock-part="${partKey}"` : ''} onclick="selectPartCost('${fieldId}', ${normalizedCost})"><b>${safe(label)}</b><small>${safe(description)}</small></button>`;
}

function chargerCostOptionsTemplate(){
  const charger65 = getStockPrice('charger65');
  const charger150 = getStockPrice('charger150');
  return [
    partCostOptionTemplate('charger_cost', 0, '0', 'у комплекті'),
    partCostOptionTemplate('charger_cost', charger65, '65W', `${formatStockPrice(charger65)} ₴`, 'charger65'),
    partCostOptionTemplate('charger_cost', charger150, '150W', `${formatStockPrice(charger150)} ₴`, 'charger150')
  ].join('');
}

function ssdCostOptionsTemplate(){
  const ssd256 = getStockPrice('ssd256');
  const ssd512 = getStockPrice('ssd512');
  return [
    partCostOptionTemplate('ssd', 0, '0', 'не ставили'),
    partCostOptionTemplate('ssd', ssd256, '256 GB', `${formatStockPrice(ssd256)} ₴`, 'ssd256'),
    partCostOptionTemplate('ssd', ssd512, '512 GB', `${formatStockPrice(ssd512)} ₴`, 'ssd512')
  ].join('');
}

function ramCostOptionsTemplate(){
  const ram8 = getStockPrice('ram8');
  const ram16 = getStockPrice('ram16');
  return [
    partCostOptionTemplate('ram', 0, '0', 'не ставили'),
    partCostOptionTemplate('ram', ram8, '8 GB', `${formatStockPrice(ram8)} ₴`, 'ram8'),
    partCostOptionTemplate('ram', ram16, '16 GB', `${formatStockPrice(ram16)} ₴`, 'ram16')
  ].join('');
}

function renderStockPrices(){
  const wrap = document.getElementById('stockPrices');
  if(!wrap) return;
  stockPrices = normalizeStockPrices(stockPrices);
  wrap.innerHTML = stockPriceDefinitions.map((part) => `
    <label class="stock-price-card" for="stock-price-${part.key}">
      <span class="stock-part-icon" aria-hidden="true">${part.icon}</span>
      <span class="stock-part-copy"><b>${part.label}</b><small>${part.description}</small></span>
      <span class="stock-price-input-wrap">
        <input id="stock-price-${part.key}" class="stock-price-input" type="number" min="${part.min ?? 1}" step="0.01" inputmode="decimal" value="${stockPrices[part.key]}" data-stock-price-key="${part.key}" aria-label="${safe(part.label)}: ціна" />
        <span>${part.unit}</span>
      </span>
    </label>
  `).join('');
}

function switchStockTab(name){
  const selectedName = name === 'prices' ? 'prices' : 'inventory';
  document.querySelectorAll('[data-stock-tab]').forEach((button) => {
    const selected = button.dataset.stockTab === selectedName;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  const inventoryPanel = document.getElementById('stockInventoryPanel');
  const pricesPanel = document.getElementById('stockPricesPanel');
  if(inventoryPanel) inventoryPanel.hidden = selectedName !== 'inventory';
  if(pricesPanel) pricesPanel.hidden = selectedName !== 'prices';
}

async function loadStockParts(){
  let value = localStorage.getItem(STOCK_PARTS_KEY) || '';
  let priceValue = localStorage.getItem(STOCK_PRICES_KEY) || '';
  if(supabaseClient){
    const { data: stockRow, error: stockError } = await supabaseClient.from(STOCK_TABLE).select('*').eq('id', 1).maybeSingle();
    if(!stockError && stockRow){
      stockParts = stockPartsFromDatabase(stockRow);
      stockPrices = stockPricesFromDatabase(stockRow);
      localStorage.setItem(STOCK_PARTS_KEY, JSON.stringify(stockParts));
      localStorage.setItem(STOCK_PRICES_KEY, JSON.stringify(stockPrices));
      renderStockParts();
      renderStockPrices();
      return;
    }

    const { data, error } = await supabaseClient.from(SETTINGS_TABLE).select('value').eq('key', STOCK_PARTS_SETTING_KEY).maybeSingle();
    if(!error && data?.value) value = data.value;
  }
  try{ stockParts = normalizeStockParts(JSON.parse(value || '{}')); }
  catch(error){ stockParts = normalizeStockParts({}); }
  try{ stockPrices = normalizeStockPrices(JSON.parse(priceValue || '{}')); }
  catch(error){ stockPrices = normalizeStockPrices({}); }
  localStorage.setItem(STOCK_PARTS_KEY, JSON.stringify(stockParts));
  localStorage.setItem(STOCK_PRICES_KEY, JSON.stringify(stockPrices));
  renderStockParts();
  renderStockPrices();
}

function closeStockReminder(){
  document.getElementById('stockReminderModal')?.classList.remove('show');
}

function showDailyStockReminder(force = false){
  const today = new Date().toLocaleDateString('en-CA');
  if(!force && localStorage.getItem(STOCK_REMINDER_DATE_KEY) === today) return;

  const emptyParts = stockPartDefinitions.filter((part) => !stockParts[part.key]);
  if(!emptyParts.length) return;

  const list = document.getElementById('stockReminderList');
  if(!list) return;
  list.innerHTML = emptyParts.map((part) => `<li><span>${part.icon}</span>${safe(part.label)}</li>`).join('');
  localStorage.setItem(STOCK_REMINDER_DATE_KEY, today);
  document.getElementById('stockReminderModal')?.classList.add('show');
}

async function saveStockParts(){
  stockParts = normalizeStockParts(stockParts);
  stockPrices = normalizeStockPrices(stockPrices);
  const value = JSON.stringify(stockParts);
  localStorage.setItem(STOCK_PARTS_KEY, value);
  localStorage.setItem(STOCK_PRICES_KEY, JSON.stringify(stockPrices));
  if(!supabaseClient) return;

  const { error: stockError } = await supabaseClient.from(STOCK_TABLE).upsert(stockPartsToDatabase(), { onConflict: 'id' });
  if(!stockError) return;

  await supabaseClient.from(SETTINGS_TABLE).upsert({ key: STOCK_PARTS_SETTING_KEY, value }, { onConflict: 'key' });
}

function isZbook(item){
  return (item?.model_type || item?.charger_type) === 'Zbook';
}

async function deductZbookStock(){
  const result = window.StockLogic.deductForSale('Zbook', stockParts);
  stockParts = result.stock;
  await saveStockParts();
  renderStockParts();
  return result.becameEmpty;
}

async function deductElitebookStock(){
  const result = window.StockLogic.deductForSale('Elitebook', stockParts);
  stockParts = result.stock;
  await saveStockParts();
  renderStockParts();
  return result.becameEmpty;
}

async function addReceivedChargerToStock(modelType){
  const result = window.StockLogic.addChargerForReceipt(modelType, stockParts);
  stockParts = result.stock;
  await saveStockParts();
  renderStockParts();
}

async function deductReceivedPartsStock(ssdCost, ramCost){
  const result = window.StockLogic.deductPartsForReceipt(ssdCost, ramCost, stockParts, stockPrices);
  const labels = {
    ssd256: 'ССД 256 GB',
    ssd512: 'ССД 512 GB',
    ram8: 'Оперативна пам’ять 8 GB',
    ram16: 'Оперативна пам’ять 16 GB'
  };
  const deductions = result.deductions.map((key) => labels[key]);
  if(!deductions.length) return { deductions, becameEmpty: result.becameEmpty };
  stockParts = result.stock;
  await saveStockParts();
  renderStockParts();
  return { deductions, becameEmpty: result.becameEmpty };
}

function handleVersionTap(){
  if(versionTapTimer) clearTimeout(versionTapTimer);
  versionTapCount += 1;
  if(versionTapCount >= 3){
    versionTapCount = 0;
    versionTapTimer = null;
    switchView('stock');
    return;
  }
  versionTapTimer = setTimeout(() => { versionTapCount = 0; versionTapTimer = null; }, 700);
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
  if(app) app.style.display = 'flex';
}

function showAuthScreen(){
  const auth = document.getElementById('authScreen');
  const app = document.getElementById('appShell');
  if(auth) auth.style.display = 'flex';
  if(app) app.style.display = 'none';
}

function lockBodyScroll(){
  if(document.body.classList.contains('modal-open')) return;
  lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('modal-open');
  document.body.style.position = 'fixed';
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
}

function unlockBodyScroll(){
  if(!document.body.classList.contains('modal-open')) return;
  document.body.classList.remove('modal-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  window.scrollTo(0, lockedScrollY);
  lockedScrollY = 0;
}

function showAddModal(){
  lockBodyScroll();
  document.getElementById('addModal')?.classList.add('show');
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
  valueEl.innerHTML = list.length
    ? list.map((number) => `<button class="dashboard-note-link" type="button" data-laptop-number="${safe(number)}" title="Відкрити ноутбук №${safe(number)} в Активних">${safe(number)}</button>`).join('')
    : '-';

  updateDashboardDeliveryTotal();
}

function updateDashboardDeliveryTotal(){
  const totalEl = document.getElementById('dashboardDeliveryTotal');
  const dutyTotalEl = document.getElementById('dashboardDutyTotal');
  if(!totalEl && !dutyTotalEl) return;

  const laptopsWithoutDelivery = laptops.filter((item) =>
    normalizeStatus(item.status) === 'in_transit' && toNum(item.delivery_cost) === 0
  ).length;
  const total = laptopsWithoutDelivery * DELIVERY_ESTIMATE_PER_LAPTOP;

  if(totalEl){
    totalEl.textContent = `${new Intl.NumberFormat('uk-UA').format(total)} грн`;
    totalEl.title = `${laptopsWithoutDelivery} × ${DELIVERY_ESTIMATE_PER_LAPTOP} грн`;
  }

  const dutyTotal = laptops.reduce((sum, item) => {
    if(normalizeStatus(item.status) !== 'in_transit' || toNum(item.duty_cost) !== 0) return sum;

    const euroRate = getStockPrice('euroRate');
    const ebayPriceEur = toNum(item.ebay_price) / euroRate;
    const taxableAmountEur = Math.max(0, ebayPriceEur - DUTY_FREE_LIMIT_EUR);
    return sum + taxableAmountEur * DUTY_RATE * euroRate;
  }, 0);

  if(dutyTotalEl){
    const euroRate = getStockPrice('euroRate');
    dutyTotalEl.textContent = `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(dutyTotal)} грн`;
    dutyTotalEl.title = `30% від частини ціни понад €150 за курсом ${formatStockPrice(euroRate)} грн/€`;
  }
}

function openDashboardDeliveryLaptop(number){
  const item = laptops.find((laptop) => normalizeStatus(laptop.status) !== 'sold' && String(laptop.number || '').trim() === String(number || '').trim());
  if(!item) return;

  switchView('active');
  resetFilters();
  renderActive();

  requestAnimationFrame(() => {
    const card = document.querySelector(`#activeCards [data-laptop-id="${CSS.escape(String(item.id))}"]`);
    if(!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('active-card-highlight');
    void card.offsetWidth;
    card.classList.add('active-card-highlight');
    window.setTimeout(() => card.classList.remove('active-card-highlight'), 3000);
  });
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

  if(!supabaseClient?.auth){
    if(msg) msg.textContent = 'Підключення ще не готове. Онови сторінку або перевір інтернет.';
    return;
  }

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
    await loadStockParts();
    showDailyStockReminder();
    if(!authBootstrapped){
      await loadLaptops();
      subscribeRealtime();
      processPendingSaves();
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

function timeoutAfter(ms, message){
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms);
  });
}

async function withTimeout(label, task, ms = REQUEST_TIMEOUT_MS){
  return await Promise.race([
    task(),
    timeoutAfter(ms, `${label} timed out after ${ms / 1000}s`)
  ]);
}

async function ensureFreshSession(){
  if(!supabaseClient?.auth) return;

  try{
    const { data: { session } } = await withTimeout(
      'Get session',
      () => supabaseClient.auth.getSession(),
      AUTH_TIMEOUT_MS
    );
    const expiresAtMs = Number(session?.expires_at || 0) * 1000;
    const needsRefresh = session && expiresAtMs && (expiresAtMs - Date.now() < 2 * 60 * 1000);
    if(needsRefresh){
      await withTimeout(
        'Refresh session',
        () => supabaseClient.auth.refreshSession(),
        AUTH_TIMEOUT_MS
      );
    }
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
    message.includes('timed out') ||
    message.includes('fetch')
  );
}

function isMissingModelTypeColumnError(error){
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return Boolean(
    code === 'pgrst204' ||
    message.includes('model_type') ||
    details.includes('model_type') ||
    hint.includes('model_type')
  );
}

function errorSummary(error){
  const status = error?.status ? `HTTP ${error.status}: ` : '';
  const code = error?.code ? `[${error.code}] ` : '';
  return `${status}${code}${error?.message || 'невідома помилка'}`;
}

async function runWithReconnect(label, task, options = {}){
  let response;
  try{
    response = await withRequestTimeout(label, task);
  }catch(error){
    if(!options.retryThrown || !isRetryableNetworkError(error)) throw error;

    try{
      await ensureFreshSession();
      if(supabaseClient) subscribeRealtime();
    }catch(reconnectError){
      console.error(`Reconnect prep failed for ${label}:`, reconnectError);
    }

    return await withRequestTimeout(`${label} retry`, task);
  }

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

function attachAbortSignal(query, signal){
  if(signal && query && typeof query.abortSignal === 'function'){
    return query.abortSignal(signal);
  }
  return query;
}

function resetSaveButton(saveBtn, saveWatchdog){
  if(saveWatchdog) window.clearTimeout(saveWatchdog);
  isSavingLaptop = false;
  if(saveBtn){
    saveBtn.disabled = false;
    saveBtn.textContent = 'Зберегти';
  }
}

function setModalSaveMessage(text){
  const el = document.getElementById('modalSaveMsg');
  if(!el) return;
  el.textContent = text || '';
  el.hidden = !text;
  if(text) localStorage.setItem('notebook-crm-last-save-error', `${new Date().toISOString()} ${text}`);
}

async function withRequestTimeout(label, task){
  await ensureFreshSession();
  const controller = new AbortController();
  let timer = null;

  try{
    return await Promise.race([
      task(controller.signal),
      new Promise((_, reject) => {
        timer = window.setTimeout(() => {
          controller.abort();
          reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
        }, REQUEST_TIMEOUT_MS);
      })
    ]);
  }finally{
    if(timer) window.clearTimeout(timer);
  }
}

async function getAuthToken(){
  if(!supabaseClient?.auth) return SUPABASE_ANON_KEY;
  const { data: { session } } = await withTimeout(
    'Get auth token',
    () => supabaseClient.auth.getSession(),
    AUTH_TIMEOUT_MS
  );
  return session?.access_token || SUPABASE_ANON_KEY;
}

async function updateLaptopDirect(id, payload, label = 'Save laptop direct'){
  const token = await getAuthToken();
  const controller = new AbortController();
  let timer = null;

  try{
    const response = await Promise.race([
      fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }),
      new Promise((_, reject) => {
        timer = window.setTimeout(() => {
          controller.abort();
          reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
        }, REQUEST_TIMEOUT_MS);
      })
    ]);

    if(!response.ok){
      let errorText = '';
      try{
        errorText = await response.text();
      }catch(error){}
      let parsed = null;
      try{
        parsed = errorText ? JSON.parse(errorText) : null;
      }catch(error){}
      return {
        error: {
          status: response.status,
          message: parsed?.message || errorText || response.statusText,
          details: parsed?.details,
          hint: parsed?.hint,
          code: parsed?.code
        }
      };
    }

    return { data: null, error: null };
  }finally{
    if(timer) window.clearTimeout(timer);
  }
}

function getPendingSaveQueue(){
  try{
    const parsed = JSON.parse(localStorage.getItem(PENDING_SAVE_QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  }catch(error){
    return [];
  }
}

function setPendingSaveQueue(queue){
  localStorage.setItem(PENDING_SAVE_QUEUE_KEY, JSON.stringify(queue));
}

function queueLaptopPatch(id, payload){
  if(!id) return;
  const queue = getPendingSaveQueue();
  const index = queue.findIndex((item) => item.id === id);
  const entry = {
    id,
    payload: { ...(index >= 0 ? queue[index].payload : {}), ...payload },
    attempts: index >= 0 ? queue[index].attempts : 0,
    updated_at: new Date().toISOString()
  };
  if(index >= 0) queue[index] = entry;
  else queue.push(entry);
  setPendingSaveQueue(queue);
}

function removePendingSave(id){
  if(!id) return;
  setPendingSaveQueue(getPendingSaveQueue().filter((item) => item.id !== id));
}

async function saveLaptopPatchToDatabase(id, payload, label = 'Save laptop direct'){
  let savedPayload = payload;
  let savedWithoutModelType = false;
  let response = await updateLaptopDirect(id, savedPayload, label);

  if(response.error && isMissingModelTypeColumnError(response.error) && Object.prototype.hasOwnProperty.call(savedPayload, 'model_type')){
    savedPayload = { ...savedPayload };
    delete savedPayload.model_type;
    savedWithoutModelType = true;
    response = await updateLaptopDirect(id, savedPayload, `${label} without model type`);
  }

  if(!response.error) removePendingSave(id);
  return { response, savedPayload, savedWithoutModelType };
}

async function processPendingSaves(){
  if(isSyncingPendingSaves || !supabaseClient) return;
  let queue = getPendingSaveQueue();
  if(!queue.length) return;

  isSyncingPendingSaves = true;
  try{
    const remaining = [];
    for(const item of queue){
      let payload = item.payload || {};
      let response = await updateLaptopDirect(item.id, payload, 'Sync pending laptop');
      if(response.error && isMissingModelTypeColumnError(response.error) && Object.prototype.hasOwnProperty.call(payload, 'model_type')){
        payload = { ...payload };
        delete payload.model_type;
        response = await updateLaptopDirect(item.id, payload, 'Sync pending laptop without model type');
      }

      if(response.error){
        remaining.push({
          ...item,
          attempts: (item.attempts || 0) + 1,
          last_error: errorSummary(response.error),
          updated_at: new Date().toISOString()
        });
      }
    }

    setPendingSaveQueue(remaining);
    if(remaining.length){
      setBanner(`Є ${remaining.length} незбережена зміна. CRM повторить синхронізацію автоматично.`, false);
    } else {
      setBanner('Зміни синхронізовано з базою.');
      refreshLaptopsInBackground();
    }
  }catch(error){
    const queueNow = getPendingSaveQueue();
    if(queueNow.length) setBanner(`Синхронізація ще не пройшла: ${errorSummary(error)}`, false);
  }finally{
    isSyncingPendingSaves = false;
  }
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
  const filterModelType = document.getElementById('filterModelType');
  const filterCostSort = document.getElementById('filterCostSort');
  const filterTracking = document.getElementById('filterTracking');
  const filterLocation = document.getElementById('filterLocation');
  const filterLocationState = document.getElementById('filterLocationState');

  if(filterStatus) filterStatus.value = '';
  if(filterMarket) filterMarket.value = '';
  if(filterModelType) filterModelType.value = '';
  if(filterCostSort) filterCostSort.value = '';
  if(filterTracking) filterTracking.value = '';
  if(filterLocation) filterLocation.value = '';
  if(filterLocationState) filterLocationState.value = '';
  setActiveFiltersOpen(false);
  syncActiveFilterButtons();
  updateActiveFiltersToggle();
  renderActive();
  renderLocation();
}

function clearLocationFilters(){
  const location = document.getElementById('filterLocation');
  const state = document.getElementById('filterLocationState');
  if(location) location.value = '';
  if(state) state.value = '';
  renderLocation();
}

function clearActiveFilters(){
  const filterStatus = document.getElementById('filterStatus');
  const filterMarket = document.getElementById('filterMarket');
  const filterModelType = document.getElementById('filterModelType');
  const filterCostSort = document.getElementById('filterCostSort');
  if(filterStatus) filterStatus.value = '';
  if(filterMarket) filterMarket.value = '';
  if(filterModelType) filterModelType.value = '';
  if(filterCostSort) filterCostSort.value = '';
  syncActiveFilterButtons();
  renderActive();
}

function getActiveFiltersCount(){
  return [
    document.getElementById('filterStatus')?.value,
    document.getElementById('filterMarket')?.value,
    document.getElementById('filterModelType')?.value,
    document.getElementById('filterCostSort')?.value
  ].filter(Boolean).length;
}

function setActiveFiltersOpen(open){
  const panel = document.getElementById('activeFiltersPanel');
  const toggle = document.getElementById('activeFiltersToggle');
  if(panel) panel.hidden = !open;
  if(toggle) toggle.setAttribute('aria-expanded', String(open));
}

function toggleActiveFilters(){
  const panel = document.getElementById('activeFiltersPanel');
  setActiveFiltersOpen(Boolean(panel?.hidden));
}

function updateActiveFiltersToggle(){
  const count = getActiveFiltersCount();
  const countEl = document.getElementById('activeFiltersCount');
  if(!countEl) return;
  countEl.textContent = String(count);
  countEl.hidden = count === 0;
}

function syncActiveFilterButtons(){
  document.querySelectorAll('.filter-button-group').forEach((group) => {
    const targetId = group.querySelector('.filter-option')?.dataset.filterTarget;
    const currentValue = document.getElementById(targetId)?.value || '';
    group.querySelectorAll('.filter-option').forEach((button) => {
      const active = (button.dataset.filterValue || '') === currentValue;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  });
}

function handleActiveFilterButtonClick(button){
  const targetId = button.dataset.filterTarget;
  const target = document.getElementById(targetId);
  if(!target) return;
  const nextValue = button.dataset.filterValue || '';
  target.value = target.value === nextValue ? '' : nextValue;
  syncActiveFilterButtons();
  renderActive();
}

function updateAppFooterVisibility(viewName){
  const footer = document.querySelector('.app-footer');
  if(footer) footer.hidden = viewName !== 'dashboard';
}

function switchView(name, direction = ''){
  const nextView = document.getElementById('view-' + name);
  const currentView = document.querySelector('.view.active');
  if(!nextView || currentView === nextView) return;

  resetFilters();
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.remove('active', 'view-slide-next', 'view-slide-prev');
  });
  nextView.classList.add('active');
  if(direction){
    // Restart the CSS animation even when the same direction is used repeatedly.
    void nextView.offsetWidth;
    nextView.classList.add(`view-slide-${direction}`);
  }
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
  document.querySelector(`.nav-btn[data-view="${name}"]`)?.classList.add('active');
  if(name === 'stock') switchStockTab('inventory');
  updateAppFooterVisibility(name);
  // A swipe should move only the tab content. Resetting the page scroll here
  // makes the whole mobile viewport jump while the transition is running.
  if(!direction) window.scrollTo({ top: 0, behavior: 'auto' });
}

function bindMobileTabSwipe(){
  const appShell = document.getElementById('appShell');
  if(!appShell || appShell.dataset.swipeTabsBound) return;

  let swipe = null;
  const ignoredSelector = 'input, textarea, select, [contenteditable="true"]';
  let suppressClickUntil = 0;

  appShell.addEventListener('touchstart', (event) => {
    if(!window.matchMedia('(max-width: 768px)').matches || event.touches.length !== 1) return;
    if(event.target.closest(ignoredSelector)) return;

    const touch = event.touches[0];
    swipe = { x: touch.clientX, y: touch.clientY, isHorizontal: false };
  }, { passive: true });

  appShell.addEventListener('touchmove', (event) => {
    if(!swipe || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - swipe.x;
    const deltaY = touch.clientY - swipe.y;
    if(Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)){
      swipe.isHorizontal = true;
      // Keep the browser from treating a deliberate tab swipe as page movement.
      event.preventDefault();
    }
  }, { passive: false });

  appShell.addEventListener('touchend', (event) => {
    if(!swipe || event.changedTouches.length !== 1) {
      swipe = null;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipe.x;
    const deltaY = touch.clientY - swipe.y;
    const isHorizontal = swipe.isHorizontal;
    swipe = null;

    // Require a deliberate horizontal gesture, so vertical page scrolling is unaffected.
    if(!isHorizontal || Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;

    const tabs = [...document.querySelectorAll('.nav-btn')]
      .filter((button) => button.offsetParent !== null);
    const currentIndex = tabs.findIndex((button) => button.classList.contains('active'));
    if(currentIndex < 0) return;

    const nextIndex = currentIndex + (deltaX < 0 ? 1 : -1);
    if(nextIndex >= 0 && nextIndex < tabs.length){
      suppressClickUntil = Date.now() + 350;
      switchView(tabs[nextIndex].dataset.view, deltaX < 0 ? 'next' : 'prev');
    }
  }, { passive: true });

  appShell.addEventListener('touchcancel', () => { swipe = null; }, { passive: true });
  appShell.addEventListener('click', (event) => {
    if(Date.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  appShell.dataset.swipeTabsBound = '1';
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
  const activeZbookCount = active.filter((x) => (x.model_type || x.charger_type) === 'Zbook').length;
  const activeElitebookCount = active.filter((x) => (x.model_type || x.charger_type) === 'Elitebook').length;

  document.getElementById('statActiveBig').textContent = active.length;
  document.getElementById('statSoldMonthBig').textContent = soldMonth.length;
  document.getElementById('statProfitMonthBig').textContent = money(profitMonth);
  document.getElementById('statProfitTotalBig').textContent = `${activeZbookCount} / ${activeElitebookCount}`;
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
  const modelType = item.model_type || item.charger_type || '';
  const modelDot = modelType === 'Zbook'
    ? '<span class="model-dot model-dot-zbook" title="Zbook" aria-label="Zbook"></span>'
    : modelType === 'Elitebook'
      ? '<span class="model-dot model-dot-elitebook" title="Elitebook" aria-label="Elitebook"></span>'
      : '';
  const cost = calcCost(item);
  const sale = toNum(item.sold_price);
  const profit = sale - cost;
  const soldDays = diffDaysLabel(item.created_at, item.sold_at);
  const soldDate = soldDateLabel(item.sold_at);
  const trackingTail = getTrackingTail(item.tracking_number);
  const hasDelivery = toNum(item.delivery_cost) > 0;
  const isInRepair = normalizeLocationState(item.location_state) === 'Ремонт';
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
              ${olxLink ? `<a href="${safe(olxLink)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(34,197,94,0.15);color:#7df0a3;font-size:14px;display:inline-block;text-decoration:none;">✅ OLX</a>` : ''}
              ${telegramLink ? `<a href="${safe(telegramLink)}" target="_blank" rel="noreferrer" style="padding:8px 12px;border-radius:12px;background:rgba(139,92,246,0.15);color:#d8b4fe;font-size:14px;display:inline-block;text-decoration:none;">✈️ Tel</a>` : ''}
            </div>
            </div>
            <div class="sold-card-side">
              <div class="sold-card-sale-row">
                ${item.serial_number ? `<div class="sold-serial-badge">🔢 ${safe(item.serial_number)}</div>` : ''}
                ${soldDays ? `<div class="sold-days-badge">⏱ ${safe(soldDays)}</div>` : ''}
              </div>
              <div class="sold-profit ${profit >= 0 ? 'sold-profit-pos' : 'sold-profit-neg'}">📈 ${sale ? money(profit) : '—'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="item" data-laptop-id="${safe(item.id)}">
      <div class="active-card-body">
        <div class="active-card-heading">
          <div class="item-title">${safe(item.number || 'Без номера')}</div>
          ${modelDot}
          <button class="edit-mini active-card-edit" onclick="openEditModal('${item.id}')" title="Редагувати">✏️</button>
          ${trackingTail ? `<div class="tracking-badge" title="Трекінг номер">📦 ${safe(trackingTail)}</div>` : ''}
          ${hasDelivery ? `<div class="delivery-indicator" title="Доставка: ${safe(money(item.delivery_cost))}" aria-label="Є доставка">🚚</div>` : ''}
          ${isInRepair ? '<div class="repair-indicator" title="Ноутбук у ремонті" aria-label="Ноутбук у ремонті">🔨</div>' : ''}
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
  const modelTypeF = document.getElementById('filterModelType')?.value;
  const costSortF = document.getElementById('filterCostSort')?.value;
  const trackingF = String(document.getElementById('filterTracking')?.value || '').trim();

  let data = laptops.filter((x) => normalizeStatus(x.status) !== 'sold');

  if(statusF) data = data.filter((x) => normalizeStatus(x.status) === statusF);
  if(marketF === 'no_olx') data = data.filter((x) => !x.olx_link);
  if(marketF === 'no_telegram') data = data.filter((x) => !x.telegram_link);
  if(modelTypeF) data = data.filter((x) => (x.model_type || x.charger_type) === modelTypeF);
  if(trackingF) data = data.filter((x) => getTrackingTail(x.tracking_number).includes(trackingF));
  if(costSortF === 'cost_asc') data = [...data].sort((a, b) => calcCost(a) - calcCost(b));
  updateActiveFiltersToggle();

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
    <div class="item" data-laptop-id="${safe(item.id)}">
      <div class="location-card">
        <div class="location-card-header">
          <div class="location-card-meta">
            <div class="location-card-title">${safe(item.number || 'Без номера')}</div>
            ${item.location && normalizeLocationState(item.location_state) !== 'Ремонт' ? `<div class="location-card-badge">${safe(normalizeLocation(item.location))}</div>` : ''}
            ${item.location_state && normalizeLocationState(item.location_state) !== 'Ремонт' ? `<div class="location-card-badge ${getLocationStateBadgeClass(item.location_state)}">${safe(normalizeLocationState(item.location_state))}</div>` : ''}
            ${getRepairType(item.location_state) ? `<div class="repair-type-icons">${repairTypeIconsTemplate(item.location_state)}</div>` : ''}
          </div>
          <button class="edit-mini location-card-edit" onclick="openEditModal('${item.id}', 'location')" title="Редагувати локацію">✏️</button>
        </div>
      </div>
    </div>
  `).join('') : `<div class="empty">${locationF || locationStateF ? 'Немає ноутбуків по вибраних фільтрах' : 'Немає ноутбуків зі статусом "Отримано"'}</div>`;
}

function salesChartTemplate(grouped){
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      count: grouped[key]?.count || 0,
      zbook: grouped[key]?.zbook || 0,
      elitebook: grouped[key]?.elitebook || 0,
      label: date.toLocaleDateString('uk-UA', { month: 'short' }).replace('.', '')
    };
  });
  const maxCount = Math.max(...months.map((month) => month.count), 1);
  const width = 720;
  const height = 254;
  const left = 54;
  const right = 18;
  const top = 22;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const point = (value, index) => ({
    x: left + (plotWidth / (months.length - 1)) * index,
    y: top + plotHeight - (value / maxCount) * plotHeight
  });
  const points = months.map((month, index) => point(month.count, index));
  const zbookPoints = months.map((month, index) => point(month.zbook, index));
  const elitebookPoints = months.map((month, index) => point(month.elitebook, index));
  const pathFor = (chartPoints) => chartPoints.map((item, index) => `${index ? 'L' : 'M'} ${item.x.toFixed(1)} ${item.y.toFixed(1)}`).join(' ');
  const line = pathFor(points);
  const zbookLine = pathFor(zbookPoints);
  const elitebookLine = pathFor(elitebookPoints);
  const area = `${line} L ${points.at(-1).x.toFixed(1)} ${(top + plotHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(top + plotHeight).toFixed(1)} Z`;
  const gridValues = Array.from(new Set([0, Math.ceil(maxCount / 2), maxCount]));
  const zbookTotal = months.reduce((sum, month) => sum + month.zbook, 0);
  const elitebookTotal = months.reduce((sum, month) => sum + month.elitebook, 0);

  return `
    <section class="sales-chart" aria-labelledby="salesChartTitle">
      <div class="sales-chart-header">
        <h2 id="salesChartTitle">Продажі за 12 місяців</h2>
        <div class="sales-chart-legend" aria-label="Легенда графіка">
          <span><i class="sales-chart-legend-dot zbook"></i>Zbook <b>${zbookTotal}</b></span>
          <span><i class="sales-chart-legend-dot elitebook"></i>Elitebook <b>${elitebookTotal}</b></span>
        </div>
      </div>
      <svg class="sales-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Графік кількості проданих ноутбуків за останні 12 місяців">
        <defs>
          <linearGradient id="salesChartArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#4f8cff" stop-opacity=".38" />
            <stop offset="100%" stop-color="#4f8cff" stop-opacity="0" />
          </linearGradient>
        </defs>
        ${gridValues.map((value) => {
          const y = top + plotHeight - (value / maxCount) * plotHeight;
          return `<g><line class="sales-chart-grid" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" /><text class="sales-chart-y-label" x="${left - 10}" y="${y + 4}">${value}</text></g>`;
        }).join('')}
        <path class="sales-chart-area" d="${area}" />
        <path class="sales-chart-line" d="${line}" />
        <path class="sales-chart-model-line sales-chart-zbook-line" d="${zbookLine}" />
        <path class="sales-chart-model-line sales-chart-elitebook-line" d="${elitebookLine}" />
        ${points.map((item, index) => `<g><circle class="sales-chart-point" cx="${item.x}" cy="${item.y}" r="5" /><text class="sales-chart-value" x="${item.x}" y="${item.y - 12}">${months[index].count}</text><circle class="sales-chart-model-point sales-chart-zbook-point" cx="${zbookPoints[index].x}" cy="${zbookPoints[index].y}" r="3.5"><title>Zbook: ${months[index].zbook}</title></circle><circle class="sales-chart-model-point sales-chart-elitebook-point" cx="${elitebookPoints[index].x}" cy="${elitebookPoints[index].y}" r="3.5"><title>Elitebook: ${months[index].elitebook}</title></circle>${index % 2 === 0 || index === months.length - 1 ? `<text class="sales-chart-x-label" x="${item.x}" y="${height - 16}">${safe(months[index].label)}</text>` : ''}</g>`).join('')}
      </svg>
    </section>`;
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
    if(!grouped[key]) grouped[key] = { count: 0, profit: 0, zbook: 0, elitebook: 0 };
    grouped[key].count += 1;
    grouped[key].profit += calcProfit(item);
    const modelType = item.model_type || item.charger_type;
    if(modelType === 'Zbook') grouped[key].zbook += 1;
    if(modelType === 'Elitebook') grouped[key].elitebook += 1;
  });

  const keys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  wrap.innerHTML = salesChartTemplate(grouped) + keys.map((key) => `
    <div class="month-card">
      <div class="muted">Місяць</div>
      <div class="month-title">${safe(monthName(key))}</div>
      <div style="margin-top:10px">Продано ноутбуків: <b>${grouped[key].count}</b></div>
      <div class="month-model-breakdown"><span>Zbook: <b>${grouped[key].zbook}</b></span><span>Elitebook: <b>${grouped[key].elitebook}</b></span></div>
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
    location_state: normalizeLocationStateValue(item.location_state)
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
  document.getElementById('laptopForm')?.classList.remove('completed-fields-collapsed');
  setModalSaveMessage('');
  document.getElementById('modalTitle').textContent = 'Додати ноутбук';
  const delBtn = document.getElementById('deleteBtn');
  if(delBtn) delBtn.style.display = 'none';
  document.getElementById('laptopForm').reset();
  document.getElementById('editId').value = '';
  const baseFields = document.getElementById('baseFields');
  if(baseFields){
    baseFields.style.display = '';
    baseFields.classList.remove('completed-field');
  }
  const extra = document.getElementById('editOnlyFields');
  if(extra) extra.remove();
  const locationOnly = document.getElementById('locationOnlyFields');
  if(locationOnly) locationOnly.remove();
  ensureAddModelTypeFields();
  selectModelType('');
  const numberField = document.getElementById('number');
  const activeNumbers = laptops
    .filter((item) => normalizeStatus(item.status) !== 'sold')
    .map((item) => String(item.number || '').trim())
    .filter((number) => /^\d+$/.test(number))
    .map(Number);
  if(numberField && activeNumbers.length) numberField.value = String(Math.max(...activeNumbers) + 1);
  showAddModal();
}

function closeAddModal(){
  document.getElementById('addModal')?.classList.remove('show');
  unlockBodyScroll();
}

function resetForm(){
  document.getElementById('laptopForm').reset();
  document.getElementById('laptopForm')?.classList.remove('completed-fields-collapsed');
  setModalSaveMessage('');
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

function setSoldPriceInvalid(invalid){
  const input = document.getElementById('sold_price');
  if(!input) return;
  input.classList.toggle('field-invalid', Boolean(invalid));
  input.setAttribute('aria-invalid', String(Boolean(invalid)));
}

function setChargerCostInvalid(invalid){
  const input = document.getElementById('charger_cost');
  if(!input) return;
  input.classList.toggle('field-invalid', Boolean(invalid));
  input.setAttribute('aria-invalid', String(Boolean(invalid)));
  const options = document.getElementById('chargerCostOptions');
  options?.classList.toggle('invalid', Boolean(invalid));
  options?.querySelectorAll('.part-cost-option').forEach((button) => {
    button.setAttribute('aria-invalid', String(Boolean(invalid)));
  });
}

function setAdditionalPartCostInvalid(id, invalid){
  const input = document.getElementById(id);
  if(!input) return;
  input.classList.toggle('field-invalid', Boolean(invalid));
  input.setAttribute('aria-invalid', String(Boolean(invalid)));
  const options = document.getElementById(`${id}Options`);
  options?.classList.toggle('invalid', Boolean(invalid));
  options?.querySelectorAll('.part-cost-option').forEach((button) => {
    button.setAttribute('aria-invalid', String(Boolean(invalid)));
  });
}

function syncPartCostOptions(id){
  const input = document.getElementById(id);
  const optionsId = id === 'charger_cost' ? 'chargerCostOptions' : `${id}Options`;
  const options = document.getElementById(optionsId);
  if(!input || !options) return;
  const value = input.value.trim();
  options.querySelectorAll('.part-cost-option').forEach((button) => {
    const active = value !== '' && Number(button.dataset.cost) === Number(value);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function selectPartCost(id, value){
  const input = document.getElementById(id);
  if(!input) return;
  input.value = String(value);
  syncPartCostOptions(id);
  if(id === 'charger_cost') setChargerCostInvalid(false);
  else setAdditionalPartCostInvalid(id, false);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function focusPartCostOptions(id){
  const optionsId = id === 'charger_cost' ? 'chargerCostOptions' : `${id}Options`;
  document.querySelector(`#${optionsId} .part-cost-option`)?.focus();
}

function isSerialReady(serialInput){
  if(!serialInput) return false;
  const length = serialInput.value.trim().length;
  return length >= 3 || (serialInput.dataset.hadSerial === '1' && length > 0);
}

function updateReceivedPartFieldsVisibility(){
  const serialInput = document.getElementById('serial_number');
  if(!serialInput) return;
  const hasSerial = isSerialReady(serialInput);
  const isFirstSerialEntry = hasSerial && serialInput.dataset.hadSerial !== '1';
  ['chargerField', 'ssdField', 'ramField'].forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if(!field) return;
    field.hidden = !hasSerial;
    if(isFirstSerialEntry) field.classList.remove('completed-field');
  });
}

function updateChargerCostRequirement(){
  const serialInput = document.getElementById('serial_number');
  const label = document.getElementById('chargerCostLabel');
  const input = document.getElementById('charger_cost');
  if(!label || !input) return;
  const required = isSerialReady(serialInput);
  label.textContent = required ? 'Зарядний, ₴ *' : 'Зарядний, ₴';
  input.required = required;
  updateReceivedPartFieldsVisibility();
  if(!required) setChargerCostInvalid(false);
}

function updateAdditionalPartsRequirement(){
  const serial = document.getElementById('serial_number');
  const ssd = document.getElementById('ssd');
  const ram = document.getElementById('ram');
  const ssdLabel = document.getElementById('ssdCostLabel');
  const ramLabel = document.getElementById('ramCostLabel');
  if(!serial || !ssd || !ram || !ssdLabel || !ramLabel) return;
  const required = isSerialReady(serial);
  ssd.required = required;
  ram.required = required;
  ssdLabel.textContent = required ? 'SSD, ₴ *' : 'SSD, ₴';
  ramLabel.textContent = required ? 'RAM, ₴ *' : 'RAM, ₴';
  if(required) setAdditionalCostsVisibility(true);
  updateReceivedPartFieldsVisibility();
  if(!required){
    setAdditionalPartCostInvalid('ssd', false);
    setAdditionalPartCostInvalid('ram', false);
  }
}

function toggleSoldPriceField(){
  const statusEl = document.getElementById('status');
  const wrap = document.getElementById('soldPriceWrap');
  if(!statusEl || !wrap) return;
  wrap.style.display = statusEl.value === 'sold' ? 'block' : 'none';
  if(statusEl.value !== 'sold'){
    const input = document.getElementById('sold_price');
    if(input) input.value = '';
    setSoldPriceInvalid(false);
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
      <div id="repairTypeField" style="display:none">
        <label>Що ремонтувати</label>
        <div class="repair-type-options">
          ${['Екран', 'ССД', 'ОЗУ', 'Батарея', 'Клавіатура', 'USB', 'Камера'].map((type) => `<label><input type="checkbox" name="repair_type" value="${type}"> ${type}</label>`).join('')}
        </div>
      </div>
    </div>`;
  actions.parentNode.insertBefore(wrap, actions);
  document.getElementById('location_state')?.addEventListener('change', toggleRepairTypeField);
  return wrap;
}

function toggleRepairTypeField(){
  const state = document.getElementById('location_state')?.value;
  const field = document.getElementById('repairTypeField');
  if(!field) return;
  const isRepair = state === 'Ремонт';
  field.style.display = isRepair ? '' : 'none';
  if(!isRepair) document.querySelectorAll('input[name="repair_type"]').forEach((input) => { input.checked = false; });
}

function setBaseFieldsEnabled(enabled){
  const baseFields = document.getElementById('baseFields');
  if(!baseFields) return;
  baseFields.style.display = enabled ? '' : 'none';
  baseFields.querySelectorAll('input, select, textarea, button').forEach((el) => {
    el.disabled = !enabled;
  });
}

function setAdditionalCostsVisibility(){
  const wrap = document.getElementById('additionalCostsFields');
  if(wrap) wrap.hidden = false;
}

function setCompletedFieldsCollapsed(collapsed){
  const form = document.getElementById('laptopForm');
  const toggle = document.getElementById('completedFieldsToggle');
  if(!form || !toggle) return;
  form.classList.toggle('completed-fields-collapsed', collapsed);
  toggle.textContent = collapsed ? 'Заповнено ▾' : 'Заповнено ▴';
  toggle.setAttribute('aria-expanded', String(!collapsed));
}

function toggleCompletedFields(){
  const form = document.getElementById('laptopForm');
  if(form) setCompletedFieldsCollapsed(!form.classList.contains('completed-fields-collapsed'));
}

function getSelectedModelType(){
  return document.querySelector('.model-type-btn.active')?.dataset.type || '';
}

function setModelTypeInvalid(invalid){
  const wrap = document.querySelector('.model-type-actions');
  if(wrap) wrap.classList.toggle('invalid', Boolean(invalid));
  document.querySelectorAll('.model-type-btn').forEach((btn) => {
    btn.setAttribute('aria-invalid', String(Boolean(invalid)));
  });
}

function selectModelType(type){
  document.querySelectorAll('.model-type-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  setModelTypeInvalid(false);
}

function showReceiptConfirmDialog(){
  return new Promise((resolve) => {
    const existing = document.getElementById('receiptConfirmOverlay');
    if(existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'receiptConfirmOverlay';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-card" role="dialog" aria-modal="true" aria-labelledby="receiptConfirmTitle">
        <div class="confirm-icon">✓</div>
        <h3 id="receiptConfirmTitle">Чек видано?</h3>
        <div class="confirm-actions">
          <button class="ghost confirm-btn confirm-no" type="button">Ні</button>
          <button class="primary confirm-btn confirm-yes" type="button">Так</button>
        </div>
      </div>`;

    const finish = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector('.confirm-no')?.addEventListener('click', () => finish(false));
    overlay.querySelector('.confirm-yes')?.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (event) => {
      if(event.target === overlay) finish(false);
    });
    overlay.addEventListener('keydown', (event) => {
      if(event.key === 'Escape') finish(false);
    });

    document.body.appendChild(overlay);
    window.setTimeout(() => overlay.querySelector('.confirm-yes')?.focus(), 0);
  });
}

async function confirmReceiptBeforeSold(currentStatus, nextStatus){
  if(normalizeStatus(currentStatus) === 'sold' || normalizeStatus(nextStatus) !== 'sold') return true;
  return showReceiptConfirmDialog();
}

function ensureAddModelTypeFields(){
  const actions = document.querySelector('#laptopForm .row-actions');
  if(!actions || document.getElementById('editOnlyFields')) return;

  const extra = document.createElement('div');
  extra.id = 'editOnlyFields';
  extra.dataset.mode = 'add';
  extra.className = 'span-3';
  extra.innerHTML = `
    <div class="form-grid" style="margin-top:12px">
      <div class="span-3 model-type-field">
        <label>Модель ноутбука</label>
        <div class="model-type-actions" aria-label="Модель ноутбука">
          <button class="ghost inline-field-btn model-type-btn" type="button" data-type="Elitebook" onclick="selectModelType('Elitebook')">Elitebook</button>
          <button class="ghost inline-field-btn model-type-btn" type="button" data-type="Zbook" onclick="selectModelType('Zbook')">Zbook</button>
        </div>
        <input id="charger_cost" type="hidden" value="" />
      </div>
    </div>`;
  actions.parentNode.insertBefore(extra, actions);
}

function openEditModal(id, mode = 'full'){
  const item = laptops.find((x) => x.id === id);
  if(!item) return;

  setModalSaveMessage('');
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
    const repairTypes = getRepairType(item.location_state).split(', ').filter(Boolean);
    document.querySelectorAll('input[name="repair_type"]').forEach((input) => {
      input.checked = repairTypes.includes(input.value);
    });
    toggleRepairTypeField();
    showAddModal();
    return;
  }

  setBaseFieldsEnabled(true);
  document.getElementById('number').value = item.number || '';
  document.getElementById('ebay_price').value = item.ebay_price || '';
  document.getElementById('ebay_link').value = item.ebay_link || '';

  let extra = document.getElementById('editOnlyFields');
  if(extra?.dataset.mode === 'add'){
    extra.remove();
    extra = null;
  }
  if(!extra){
    const actions = document.querySelector('#laptopForm .row-actions');
    extra = document.createElement('div');
    extra.id = 'editOnlyFields';
    extra.className = 'span-3';
    extra.innerHTML = `
      <button id="completedFieldsToggle" class="ghost completed-fields-toggle" type="button" aria-expanded="false">Заповнено ▾</button>
      <div class="form-grid" style="margin-top:12px">
        <div id="trackingField" class="span-2"><label>Трекінг номер</label><div style="display:flex;gap:8px;align-items:center"><input id="tracking_number" placeholder="Наприклад: 1234567890" /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('tracking_number')">Вставити</button></div></div>
        <div id="deliveryField"><label>Доставка, ₴</label><input id="delivery_cost" type="number" min="0" step="0.01" /></div>
        <div id="dutyField"><label>Мито, ₴</label><input id="duty_cost" type="number" min="0" step="0.01" /></div>
        <div id="serialField"><label>Серійний номер</label><input id="serial_number" /></div>
        <div id="chargerField" hidden>
          <label id="chargerCostLabel">Зарядний, ₴</label>
          <div id="chargerCostOptions" class="part-cost-options" role="group" aria-label="Вартість зарядного">
            ${chargerCostOptionsTemplate()}
          </div>
          <input id="charger_cost" type="hidden" value="" />
        </div>
        <div id="ssdField" hidden>
          <label id="ssdCostLabel">SSD, ₴</label>
          <div id="ssdOptions" class="part-cost-options" role="group" aria-label="Встановлений SSD">
            ${ssdCostOptionsTemplate()}
          </div>
          <input id="ssd" type="hidden" value="" />
        </div>
        <div id="ramField" hidden>
          <label id="ramCostLabel">RAM, ₴</label>
          <div id="ramOptions" class="part-cost-options" role="group" aria-label="Встановлена оперативна пам’ять">
            ${ramCostOptionsTemplate()}
          </div>
          <input id="ram" type="hidden" value="" />
        </div>
        <div id="olxLinkField" class="span-2"><label>Посилання OLX</label><div style="display:flex;gap:8px;align-items:center"><input id="olx_link" placeholder="https://www.olx.ua/..." /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('olx_link')">Вставити</button></div></div>
        <div id="telegramLinkField" class="span-2"><label>Посилання Telegram</label><div style="display:flex;gap:8px;align-items:center"><input id="telegram_link" placeholder="https://t.me/..." /><button class="ghost" type="button" style="min-width:90px" onclick="pasteIntoField('telegram_link')">Вставити</button></div></div>
        <div id="statusField"><label>Статус</label>
          <select id="status">
            <option value="in_transit">В дорозі</option>
            <option value="received">Отримав</option>
            <option value="sold">Продано</option>
          </select>
        </div>
        <div class="span-3 model-type-actions completed-field" aria-label="Модель ноутбука">
          <button class="ghost inline-field-btn model-type-btn" type="button" data-type="Elitebook" onclick="selectModelType('Elitebook')">Elitebook</button>
          <button class="ghost inline-field-btn model-type-btn" type="button" data-type="Zbook" onclick="selectModelType('Zbook')">Zbook</button>
        </div>
        <div class="completed-field"><label>Реклама OLX, ₴</label><input id="olx_ad_cost" type="number" min="0" step="0.01" readonly /></div>
        <div class="completed-field"><label>Гравіювання, ₴</label><input id="engraving_cost" type="number" min="0" step="0.01" readonly /></div>
        <div class="completed-field"><label>Собівартість, ₴</label><input id="cost_display" disabled /></div>
      </div>`;
    actions.parentNode.insertBefore(extra, actions);
  }

  const baseFields = document.getElementById('baseFields');
  baseFields?.classList.add('completed-field');
  const completedFieldsToggle = document.getElementById('completedFieldsToggle');
  if(completedFieldsToggle && !completedFieldsToggle.dataset.bound){
    completedFieldsToggle.addEventListener('click', toggleCompletedFields);
    completedFieldsToggle.dataset.bound = '1';
  }
  setCompletedFieldsCollapsed(true);

  setAdditionalCostsVisibility();

  applyStatusOptions(item.status || 'in_transit');
  document.getElementById('serial_number').value = normalizeSerialNumber(item.serial_number);
  document.getElementById('serial_number').dataset.hadSerial = item.serial_number ? '1' : '0';
  document.getElementById('serialField')?.classList.toggle('completed-field', Boolean(item.serial_number));
  const deliveryValue = item.delivery_cost === null || item.delivery_cost === undefined || item.delivery_cost === '' || Number(item.delivery_cost) === 0
    ? ''
    : item.delivery_cost;
  document.getElementById('delivery_cost').value = deliveryValue;
  document.getElementById('deliveryField')?.classList.toggle('completed-field', deliveryValue !== '');
  selectModelType(item.model_type || item.charger_type || '');
  document.getElementById('charger_cost').value = item.charger_cost ?? '';
  syncPartCostOptions('charger_cost');
  document.getElementById('chargerField')?.classList.toggle('completed-field', item.charger_cost !== null && item.charger_cost !== undefined && item.charger_cost !== '');
  updateChargerCostRequirement();
  const hasSerialNumber = Boolean(item.serial_number);
  const dutyValue = !hasSerialNumber && Number(item.duty_cost) === 0 ? '' : item.duty_cost ?? '';
  const ssdValue = !hasSerialNumber && Number(item.ssd) === 0 ? '' : item.ssd ?? '';
  const ramValue = !hasSerialNumber && Number(item.ram) === 0 ? '' : item.ram ?? '';
  document.getElementById('duty_cost').value = dutyValue;
  document.getElementById('dutyField')?.classList.toggle('completed-field', dutyValue !== '');
  document.getElementById('olx_ad_cost').value = item.olx_ad_cost ?? getStockPrice('olxAd');
  document.getElementById('engraving_cost').value = item.engraving_cost ?? getStockPrice('engraving');
  document.getElementById('ssd').value = ssdValue;
  document.getElementById('ram').value = ramValue;
  syncPartCostOptions('ssd');
  syncPartCostOptions('ram');
  document.getElementById('ssdField')?.classList.toggle('completed-field', ssdValue !== '');
  document.getElementById('ramField')?.classList.toggle('completed-field', ramValue !== '');
  updateAdditionalPartsRequirement();
  document.getElementById('tracking_number').value = item.tracking_number || '';
  document.getElementById('trackingField')?.classList.toggle('completed-field', Boolean(item.tracking_number));
  document.getElementById('olx_link').value = item.olx_link || '';
  document.getElementById('telegram_link').value = item.telegram_link || '';
  document.getElementById('olxLinkField')?.classList.toggle('completed-field', Boolean(item.olx_link));
  document.getElementById('telegramLinkField')?.classList.toggle('completed-field', Boolean(item.telegram_link));
  document.getElementById('cost_display').value = calcCost(item);

  const wrap = ensureSoldPriceField();
  if(wrap){
    const soldInput = document.getElementById('sold_price');
    if(soldInput) soldInput.value = item.sold_price || '';
  }

  toggleSoldPriceField();

  const soldInput = document.getElementById('sold_price');
  if(soldInput && !soldInput.dataset.boundSoldPriceInvalid){
    soldInput.addEventListener('input', () => setSoldPriceInvalid(false));
    soldInput.dataset.boundSoldPriceInvalid = '1';
  }

  const chargerCostInput = document.getElementById('charger_cost');
  if(chargerCostInput && !chargerCostInput.dataset.boundRequired){
    chargerCostInput.addEventListener('input', () => setChargerCostInvalid(false));
    chargerCostInput.dataset.boundRequired = '1';
  }

  ['ssd', 'ram'].forEach((id) => {
    const input = document.getElementById(id);
    if(input && !input.dataset.boundRequired){
      input.addEventListener('input', () => setAdditionalPartCostInvalid(id, false));
      input.dataset.boundRequired = '1';
    }
  });

  const statusEl = document.getElementById('status');
  if(statusEl && !statusEl.dataset.boundSoldPrice){
    statusEl.addEventListener('change', toggleSoldPriceField);
    statusEl.dataset.boundSoldPrice = '1';
  }

  showAddModal();
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
  const { data, error } = await withRequestTimeout('Load laptops', (signal) =>
    attachAbortSignal(
      supabaseClient.from(TABLE).select('*').order('created_at', { ascending: false }),
      signal
    )
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
    location_state: normalizeLocationStateValue(item.location_state)
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
    processPendingSaves();
  }catch(error){
    console.error('Wake app connection failed:', error);
  }
}

async function saveLaptop(event){
  event.preventDefault();
  if(isSavingLaptop) return;

  const saveBtn = document.getElementById('saveLaptopBtn');
  let saveWatchdog = null;
  const targetEditId = currentEditId || document.getElementById('editId')?.value || '';
  const editingExistingLaptop = Boolean(targetEditId);
  isSavingLaptop = true;
  if(saveBtn){
    saveBtn.disabled = true;
    saveBtn.textContent = 'Збереження...';
    setModalSaveMessage('');
    if(editingExistingLaptop) saveWatchdog = window.setTimeout(() => {
      if(!isSavingLaptop) return;
      isSavingLaptop = false;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Зберегти';
      const text = 'Збереження зависло за таймаутом. Натисни “Зберегти” ще раз або перевір інтернет.';
      setModalSaveMessage(text);
      setBanner(text, false);
    }, SAVE_UI_TIMEOUT_MS);
  }

  try{
    if(currentEditMode === 'location' && targetEditId){
      const locationState = normalizeLocationState(document.getElementById('location_state')?.value);
      const repairType = [...document.querySelectorAll('input[name="repair_type"]:checked')].map((input) => input.value).join(', ');
      const payload = {
        location: document.getElementById('location')?.value || 'Кладовка верх',
        location_state: locationState === 'Ремонт' && repairType ? `Ремонт: ${repairType}` : locationState || null
      };
      const { response, savedPayload } = await saveLaptopPatchToDatabase(targetEditId, payload, 'Save laptop location');
      if(response.error){
        hasSupabaseConnection = false;
        updateNetwork();
        console.error(response.error);
        const text = `Не вдалося записати в базу: ${errorSummary(response.error)}`;
        setModalSaveMessage(text);
        setBanner(text, false);
        return;
      }

      hasSupabaseConnection = true;
      updateNetwork();
      const currentItem = laptops.find((x) => x.id === targetEditId);
      applyLaptopToState({ ...(currentItem || {}), ...savedPayload, id: targetEditId });
      closeAddModal();
      resetForm();
      resetSaveButton(saveBtn, saveWatchdog);
      setBanner('Збережено в базу.');
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
      model_type: document.getElementById('charger_cost') ? (getSelectedModelType() || null) : null,
      charger_cost: document.getElementById('charger_cost')
        ? (document.getElementById('charger_cost').value.trim() === '' ? null : toNum(document.getElementById('charger_cost').value))
        : 0,
      duty_cost: document.getElementById('duty_cost')
        ? (document.getElementById('duty_cost').value.trim() === '' ? null : toNum(document.getElementById('duty_cost').value))
        : 0,
      olx_ad_cost: document.getElementById('olx_ad_cost')
        ? toNum(document.getElementById('olx_ad_cost').value)
        : getStockPrice('olxAd'),
      engraving_cost: document.getElementById('engraving_cost')
        ? toNum(document.getElementById('engraving_cost').value)
        : getStockPrice('engraving'),
      ssd: document.getElementById('ssd')
        ? (document.getElementById('ssd').value.trim() === '' ? null : toNum(document.getElementById('ssd').value))
        : 0,
      ram: document.getElementById('ram')
        ? (document.getElementById('ram').value.trim() === '' ? null : toNum(document.getElementById('ram').value))
        : 0,
      sold_price: (document.getElementById('status') && document.getElementById('status').value === 'sold' && document.getElementById('sold_price'))
        ? toNum(document.getElementById('sold_price').value)
        : 0,
      tracking_number: document.getElementById('tracking_number') ? document.getElementById('tracking_number').value.trim() : '',
      olx_link: document.getElementById('olx_link') ? sanitizeExternalUrl(document.getElementById('olx_link').value) : '',
      telegram_link: document.getElementById('telegram_link') ? sanitizeExternalUrl(document.getElementById('telegram_link').value) : '',
      sold_at: null
    };

    if(!payload.number){
      setModalSaveMessage('Введи номер ноутбука.');
      return;
    }

    if(document.getElementById('charger_cost') && !payload.model_type){
      setModelTypeInvalid(true);
      setModalSaveMessage('Вибери модель ноутбука: Elitebook або Zbook.');
      document.querySelector('.model-type-btn')?.focus();
      return;
    }

    const serialNumberInput = document.getElementById('serial_number');
    if(serialNumberInput && serialNumberInput.dataset.hadSerial !== '1' && payload.serial_number && payload.serial_number.length < 3){
      setModalSaveMessage('Введи щонайменше 3 символи серійного номера.');
      serialNumberInput.focus();
      return;
    }

    const chargerCostInput = document.getElementById('charger_cost');
    if(payload.serial_number && chargerCostInput && chargerCostInput.value.trim() === ''){
      setChargerCostInvalid(true);
      setModalSaveMessage('Після введення серійного номера заповни поле «Зарядний». Вкажи 0, якщо зарядний прийшов разом із ноутбуком.');
      focusPartCostOptions('charger_cost');
      return;
    }
    setChargerCostInvalid(false);

    const ssdCostInput = document.getElementById('ssd');
    const ramCostInput = document.getElementById('ram');
    if(payload.serial_number && (ssdCostInput?.value.trim() === '' || ramCostInput?.value.trim() === '')){
      setAdditionalPartCostInvalid('ssd', ssdCostInput?.value.trim() === '');
      setAdditionalPartCostInvalid('ram', ramCostInput?.value.trim() === '');
      setModalSaveMessage('Після введення серійного номера заповни поля SSD і RAM. Вкажи 0, якщо запчастину не встановлювали.');
      focusPartCostOptions(ssdCostInput?.value.trim() === '' ? 'ssd' : 'ram');
      return;
    }
    setAdditionalPartCostInvalid('ssd', false);
    setAdditionalPartCostInvalid('ram', false);

    if(targetEditId){
      const currentItem = laptops.find((x) => x.id === targetEditId);
      const allowed = {
        in_transit: ['in_transit', 'received'],
        received: ['received', 'sold'],
        sold: ['sold', 'received']
      };

      if(currentItem && !allowed[currentItem.status]?.includes(payload.status)){
        setModalSaveMessage('Недозволена зміна статусу.');
        return;
      }

      if(payload.status === 'sold' && (!payload.sold_price || Number(payload.sold_price) <= 0)){
        setSoldPriceInvalid(true);
        setModalSaveMessage('Заповни Ціну продажу.');
        document.getElementById('sold_price')?.focus();
        return;
      }

      setSoldPriceInvalid(false);

      if(currentItem && !(await confirmReceiptBeforeSold(currentItem.status, payload.status))){
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

    if(targetEditId){
      const currentItem = laptops.find((x) => x.id === targetEditId);
      const soldNow = Boolean(currentItem && currentItem.status !== 'sold' && payload.status === 'sold');
      const soldModel = { ...currentItem, ...payload };
      const shouldDeductZbookStock = soldNow && isZbook(soldModel);
      const shouldDeductElitebookStock = soldNow && (soldModel.model_type || soldModel.charger_type) === 'Elitebook';
      const receivedChargerModel = soldModel.model_type || soldModel.charger_type;
      const isFirstSerialEntry = Boolean(currentItem && !String(currentItem.serial_number || '').trim() && payload.serial_number);
      const chargerWasNotFree = currentItem && (currentItem.charger_cost === null || currentItem.charger_cost === undefined || currentItem.charger_cost === '' || Number(currentItem.charger_cost) !== 0);
      const hasExplicitZeroCharger = document.getElementById('charger_cost')?.value.trim() === '0';
      const shouldAddReceivedCharger = Boolean(
        currentItem
        && payload.serial_number
        && hasExplicitZeroCharger
        && (isFirstSerialEntry || chargerWasNotFree)
        && (receivedChargerModel === 'Zbook' || receivedChargerModel === 'Elitebook')
      );
      const shouldDeductReceivedParts = Boolean(currentItem && !String(currentItem.serial_number || '').trim() && payload.serial_number);
      const { response, savedPayload, savedWithoutModelType } = await saveLaptopPatchToDatabase(targetEditId, payload, 'Save laptop direct');
      if(response.error){
        hasSupabaseConnection = false;
        updateNetwork();
        console.error(response.error);
        const text = `Не вдалося записати в базу: ${errorSummary(response.error)}`;
        setModalSaveMessage(text);
        setBanner(text, false);
        return;
      }

      hasSupabaseConnection = true;
      updateNetwork();
      applyLaptopToState({ ...(currentItem || {}), ...savedPayload, id: targetEditId });
      const stockBecameEmpty = shouldDeductZbookStock
        ? await deductZbookStock()
        : shouldDeductElitebookStock
          ? await deductElitebookStock()
          : false;
      if(stockBecameEmpty) showDailyStockReminder(true);
      if(shouldAddReceivedCharger) await addReceivedChargerToStock(receivedChargerModel);
      const receivedPartsResult = shouldDeductReceivedParts
        ? await deductReceivedPartsStock(payload.ssd, payload.ram)
        : { deductions: [], becameEmpty: false };
      if(receivedPartsResult.becameEmpty) showDailyStockReminder(true);
      closeAddModal();
      resetForm();
      resetSaveButton(saveBtn, saveWatchdog);
      if(savedWithoutModelType){
        setBanner('Збережено в базу, але модель не записалась: додай колонку model_type у Supabase.', false);
      } else {
        setBanner(receivedPartsResult.deductions.length
          ? `Збережено. Зі складу списано: ${receivedPartsResult.deductions.join(', ')}.`
          : shouldAddReceivedCharger
          ? `Збережено. На склад додано блок живлення ${receivedChargerModel === 'Zbook' ? '150W' : '65W'}.`
          : shouldDeductZbookStock
          ? 'Збережено. Зі складу списано блок 150W і кабель живлення.'
          : shouldDeductElitebookStock
            ? 'Збережено. Зі складу списано блок 65W і кабель живлення.'
            : 'Збережено в базу.');
        refreshLaptopsInBackground();
      }
      return;
    }

    let savedWithoutModelType = false;
    let response = await runWithReconnect(
      'Save laptop',
      (signal) => attachAbortSignal(
        supabaseClient.from(TABLE).insert([payload]).select().single(),
        signal
      ),
      { retryThrown: false }
    );

    if(response.error && isMissingModelTypeColumnError(response.error) && Object.prototype.hasOwnProperty.call(payload, 'model_type')){
      const fallbackPayload = { ...payload };
      delete fallbackPayload.model_type;
      savedWithoutModelType = true;
      response = await runWithReconnect(
        'Save laptop without model type',
        (signal) => attachAbortSignal(
          supabaseClient.from(TABLE).insert([fallbackPayload]).select().single(),
          signal
        ),
        { retryThrown: false }
      );
    }

    if(response.error){
      hasSupabaseConnection = false;
      updateNetwork();
      console.error(response.error);
      const text = `Помилка збереження в базу: ${errorSummary(response.error)}`;
      setModalSaveMessage(text);
      setBanner(text, false);
      return;
    }
    hasSupabaseConnection = true;
    updateNetwork();
    if(targetEditId){
      const currentItem = laptops.find((x) => x.id === targetEditId);
      applyLaptopToState({ ...(currentItem || {}), ...payload, id: targetEditId });
    } else if(response.data) {
      applyLaptopToState(response.data);
    }
    if(savedWithoutModelType){
      setBanner('Збережено, але модель не записалась: додай колонку model_type у Supabase.', false);
    }

    closeAddModal();
    resetForm();
    if(!savedWithoutModelType) refreshLaptopsInBackground();
  }catch(error){
    console.error(error);
    const message = error?.message || 'невідома помилка';
    resetSaveButton(saveBtn, saveWatchdog);
    if(message.includes('timed out')){
      const text = 'Збереження не відповіло за таймаут. Натисни “Зберегти” ще раз.';
      setModalSaveMessage(text);
      setBanner(text, false);
    } else {
      const text = `Помилка збереження: ${errorSummary(error)}`;
      setModalSaveMessage(text);
      setBanner(text, false);
    }
  }finally{
    resetSaveButton(saveBtn, saveWatchdog);
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

  if(!(await confirmReceiptBeforeSold(item.status, status))){
    return;
  }

  const payload = { status };
  if(status === 'received' && item.status !== 'received') payload.location_state = 'На чистку';
  if(status === 'in_transit') payload.location_state = null;
  payload.sold_at = status === 'sold' ? new Date().toISOString() : null;

  const response = await runWithReconnect('Quick status', (signal) =>
    attachAbortSignal(
      supabaseClient.from(TABLE).update(payload).eq('id', id).select().single(),
      signal
    )
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
  if(status === 'sold' && item.status !== 'sold' && isZbook(item)){
    const stockBecameEmpty = await deductZbookStock();
    setBanner('Продано. Зі складу списано блок 150W і кабель живлення.');
    if(stockBecameEmpty) showDailyStockReminder(true);
  }
  if(status === 'sold' && item.status !== 'sold' && (item.model_type || item.charger_type) === 'Elitebook'){
    const stockBecameEmpty = await deductElitebookStock();
    setBanner('Продано. Зі складу списано блок 65W і кабель живлення.');
    if(stockBecameEmpty) showDailyStockReminder(true);
  }
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
    model_type: item.model_type || item.charger_type,
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
  const versionEl = document.getElementById('appVersion');
  if(versionEl) versionEl.textContent = `Версія ${APP_VERSION}`;
  updateAppFooterVisibility('dashboard');
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

  const appVersion = document.getElementById('appVersion');
  if(appVersion && !appVersion.dataset.boundStock){
    appVersion.addEventListener('click', handleVersionTap);
    appVersion.dataset.boundStock = '1';
  }

  const stockReminderOpenStock = document.getElementById('stockReminderOpenStock');
  if(stockReminderOpenStock && !stockReminderOpenStock.dataset.bound){
    stockReminderOpenStock.addEventListener('click', () => {
      closeStockReminder();
      switchView('stock');
    });
    stockReminderOpenStock.dataset.bound = '1';
  }

  const stockTabs = document.querySelector('.stock-tabs');
  if(stockTabs && !stockTabs.dataset.bound){
    stockTabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-stock-tab]');
      if(!button) return;
      switchStockTab(button.dataset.stockTab);
    });
    stockTabs.dataset.bound = '1';
  }

  const stockReminderModal = document.getElementById('stockReminderModal');
  if(stockReminderModal && !stockReminderModal.dataset.bound){
    stockReminderModal.addEventListener('click', (event) => {
      if(event.target === stockReminderModal) closeStockReminder();
    });
    stockReminderModal.dataset.bound = '1';
  }

  const stockPartsWrap = document.getElementById('stockParts');
  if(stockPartsWrap && !stockPartsWrap.dataset.bound){
    stockPartsWrap.addEventListener('click', (event) => {
      const input = event.target;
      if(!(input instanceof HTMLInputElement) || !input.dataset.stockKey || !input.readOnly) return;
      const now = Date.now();
      const previousTap = Number(input.dataset.lastTap || 0);
      input.dataset.lastTap = String(now);
      if(now - previousTap > 550) return;

      input.readOnly = false;
      input.classList.remove('stock-part-input-locked');
      input.removeAttribute('data-last-tap');
      input.focus();
      input.select();
    });

    stockPartsWrap.addEventListener('focusout', (event) => {
      const input = event.target;
      if(!(input instanceof HTMLInputElement) || !input.dataset.stockKey) return;
      input.readOnly = true;
      input.classList.add('stock-part-input-locked');
    });

    stockPartsWrap.addEventListener('change', async (event) => {
      const input = event.target;
      if(!(input instanceof HTMLInputElement) || !input.dataset.stockKey) return;
      stockParts[input.dataset.stockKey] = Math.max(0, Math.floor(Number(input.value) || 0));
      input.value = String(stockParts[input.dataset.stockKey]);
      await saveStockParts();
      input.readOnly = true;
      input.classList.add('stock-part-input-locked');
    });
    stockPartsWrap.dataset.bound = '1';
  }

  const stockPricesWrap = document.getElementById('stockPrices');
  if(stockPricesWrap && !stockPricesWrap.dataset.bound){
    stockPricesWrap.addEventListener('change', async (event) => {
      const input = event.target;
      if(!(input instanceof HTMLInputElement) || !input.dataset.stockPriceKey) return;

      const nextValue = Number(input.value);
      const allowsZero = input.dataset.stockPriceKey === 'olxAd' || input.dataset.stockPriceKey === 'engraving';
      if(!Number.isFinite(nextValue) || (allowsZero ? nextValue < 0 : nextValue <= 0)){
        input.value = String(getStockPrice(input.dataset.stockPriceKey));
        setBanner(allowsZero ? 'Ціна не може бути від’ємною.' : 'Ціна має бути більшою за 0.', false);
        return;
      }

      stockPrices[input.dataset.stockPriceKey] = Math.round(nextValue * 100) / 100;
      input.value = String(stockPrices[input.dataset.stockPriceKey]);
      await saveStockParts();
      clearBanner();
    });
    stockPricesWrap.dataset.bound = '1';
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
  bindMobileTabSwipe();

  const activeFiltersToggle = document.getElementById('activeFiltersToggle');
  if(activeFiltersToggle && !activeFiltersToggle.dataset.bound){
    activeFiltersToggle.addEventListener('click', toggleActiveFilters);
    activeFiltersToggle.dataset.bound = '1';
  }

  const clearLocationFiltersButton = document.getElementById('clearLocationFilters');
  if(clearLocationFiltersButton && !clearLocationFiltersButton.dataset.bound){
    clearLocationFiltersButton.addEventListener('click', clearLocationFilters);
    clearLocationFiltersButton.dataset.bound = '1';
  }

  const clearActiveFiltersButton = document.getElementById('clearActiveFilters');
  if(clearActiveFiltersButton && !clearActiveFiltersButton.dataset.bound){
    clearActiveFiltersButton.addEventListener('click', clearActiveFilters);
    clearActiveFiltersButton.dataset.bound = '1';
  }

  document.addEventListener('input', (event) => {
    if(event.target?.id !== 'serial_number') return;
    const input = event.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = normalizeSerialNumber(input.value);
    if(start !== null && end !== null) input.setSelectionRange(start, end);
    const status = document.getElementById('status');
    const serialReady = isSerialReady(input);
    if(serialReady && status?.value !== 'sold') applyStatusOptions('received');
    else if(!serialReady && input.dataset.hadSerial !== '1' && status?.value !== 'sold') applyStatusOptions('in_transit');
    updateChargerCostRequirement();
    updateAdditionalPartsRequirement();
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

  document.addEventListener('click', (event) => {
    const filterButton = event.target.closest?.('.filter-option');
    if(filterButton) handleActiveFilterButtonClick(filterButton);
  });

  document.addEventListener('click', (event) => {
    const laptopLink = event.target.closest?.('.dashboard-note-link');
    if(laptopLink) openDashboardDeliveryLaptop(laptopLink.dataset.laptopNumber);
  });

  document.addEventListener('change', (event) => {
    if(event.target.id === 'filterStatus' || event.target.id === 'filterMarket' || event.target.id === 'filterModelType' || event.target.id === 'filterCostSort' || event.target.id === 'filterTracking'){
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
