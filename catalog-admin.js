// Authenticated CRM controls. This file is never loaded by the public catalog.
let catalogMetadata = new Map();
let catalogBusyIds = new Set();
let catalogBatchBusy = false;
let catalogLoaded = false;
let catalogLoadBusy = false;
let catalogAttempts = new Set();
const catalogConditions = ['7/10', '8/10', '9/10', 'Як новий'];

function catalogEligibleLaptops(){
  return laptops.filter(item => normalizeStatus(item.status) === 'received'
    && normalizeLocationState(item.location_state) !== 'Ремонт' && !isTestLaptop(item));
}

function catalogMessage(message){
  document.getElementById('catalogAdminStatus').textContent = message;
}

function renderCatalogAdmin(){
  const list = document.getElementById('catalogAdminList');
  if(!list || !document.getElementById('view-catalog-admin').classList.contains('active')) return;
  const items = catalogEligibleLaptops();
  document.getElementById('catalogAdminCount').textContent = String(items.length);
  document.getElementById('catalogRefreshAll').disabled = catalogBatchBusy || !catalogLoaded || !items.length;
  if(!catalogLoaded){ list.replaceChildren(); return; }
  list.innerHTML = items.length ? items.map(item => {
    const meta = catalogMetadata.get(String(item.id)) || {};
    const current = meta.source_url === (item.ebay_link || '');
    const busy = catalogBusyIds.has(String(item.id));
    return `<article class="catalog-admin-card" data-catalog-id="${safe(item.id)}">
      <div class="catalog-admin-heading"><span class="muted">Ноутбук № ${safe(item.number)}</span><span class="catalog-available">Отримано</span></div>
      <h3>${safe(current && meta.title ? meta.title : 'Назва уточнюється')}</h3>
      <dl class="catalog-admin-specs"><div><dt>Оперативна пам’ять</dt><dd>${safe(current && meta.ram ? meta.ram : 'Уточнюється')}</dd></div><div><dt>SSD</dt><dd>${safe(current && meta.ssd ? meta.ssd : 'Уточнюється')}</dd></div></dl>
      <label class="catalog-condition-label">Стан для покупця
        <select data-catalog-condition aria-label="Стан ноутбука ${safe(item.number)}" ${busy ? 'disabled' : ''}>
          <option value="">Не вказано</option>${catalogConditions.map(value => `<option value="${value}" ${meta.condition === value ? 'selected' : ''}>${value}</option>`).join('')}
        </select>
      </label>
      <button class="ghost" type="button" data-catalog-refresh ${busy || !item.ebay_link ? 'disabled' : ''}>${busy ? 'Збереження…' : 'Оновити з eBay'}</button>
      <p class="muted catalog-row-status" role="status">${!item.ebay_link ? 'Додай посилання eBay у картці ноутбука.' : current && meta.title && (!meta.ram || !meta.ssd) ? 'В оголошенні не вдалося визначити всі характеристики.' : ''}</p>
    </article>`;
  }).join('') : '<div class="empty">Немає отриманих ноутбуків без ремонту.</div>';
}

async function loadCatalogAdmin(){
  if(catalogLoadBusy) return;
  catalogLoadBusy = true;
  catalogLoaded = false;
  renderCatalogAdmin();
  catalogMessage('Завантаження каталогу…');
  try {
    const { data, error } = await supabaseClient.from('laptop_catalog').select('*')
      .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS));
    if(error) throw new Error('Не вдалося завантажити каталог. Перевір підключення та налаштування каталогу в Supabase.');
    catalogMetadata = new Map((data || []).map(row => [String(row.laptop_id), row]));
    catalogLoaded = true;
    catalogMessage('Стан зберігається автоматично після вибору.');
  } catch(error){ catalogMessage(error.message); }
  finally { catalogLoadBusy = false; renderCatalogAdmin(); }
  if(catalogLoaded) refreshCatalogBatch(false);
}

async function saveCatalogMetadata(id, patch){
  const { data, error } = await supabaseClient.from('laptop_catalog')
    .upsert({ laptop_id: String(id), ...patch }, { onConflict: 'laptop_id' }).select('*')
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS));
  if(error || !data?.length) throw new Error('Не вдалося зберегти в Supabase. Повтори спробу.');
  catalogMetadata.set(String(id), data[0]);
}

async function updateCatalogCondition(id, value){
  if(!catalogLoaded || catalogBusyIds.has(id) || (value && !catalogConditions.includes(value))) return;
  catalogBusyIds.add(id);
  renderCatalogAdmin();
  try {
    await saveCatalogMetadata(id, { condition: value || null });
    catalogMessage('Стан збережено в Supabase.');
  } catch(error){ catalogMessage(error.message); }
  finally { catalogBusyIds.delete(id); renderCatalogAdmin(); }
}

async function refreshCatalogLaptop(id){
  const item = catalogEligibleLaptops().find(item => String(item.id) === id);
  if(!catalogLoaded || !item?.ebay_link || catalogBusyIds.has(id)) return false;
  const sourceUrl = item.ebay_link;
  catalogBusyIds.add(id);
  catalogAttempts.add(`${id}:${sourceUrl}`);
  renderCatalogAdmin();
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if(error || !data?.session?.access_token) throw new Error('Увійди в CRM ще раз.');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ebay-title`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ url: sourceUrl }), signal: AbortSignal.timeout(20000),
    });
    if(!response.ok) throw new Error('Не вдалося отримати дані з eBay. Перевір посилання та повтори спробу.');
    const listing = await response.json();
    if(typeof listing.title !== 'string' || !listing.title.trim() || listing.title.length > 500) throw new Error('eBay не повернув назву ноутбука.');
    if(laptops.find(item => String(item.id) === id)?.ebay_link !== sourceUrl) throw new Error('Посилання змінилося. Онови дані ще раз.');
    const spec = value => typeof value === 'string' && value.length <= 50 ? value : null;
    await saveCatalogMetadata(id, { source_url: sourceUrl, title: listing.title.trim(), ram: spec(listing.ram), ssd: spec(listing.ssd), fetched_at: new Date().toISOString() });
    catalogMessage('Дані з eBay збережено в Supabase.');
    return true;
  } catch(error){
    catalogMessage(`Ноутбук № ${item.number}: ${error.message || 'Не вдалося оновити дані.'}`);
    return false;
  } finally { catalogBusyIds.delete(id); renderCatalogAdmin(); }
}

async function refreshCatalogBatch(force = true){
  if(!catalogLoaded || catalogBatchBusy) return;
  const items = catalogEligibleLaptops().filter(item => {
    const meta = catalogMetadata.get(String(item.id));
    return item.ebay_link && (force || ((!meta?.title || meta.source_url !== item.ebay_link) && !catalogAttempts.has(`${item.id}:${item.ebay_link}`)));
  });
  if(!items.length) return;
  catalogBatchBusy = true;
  let completed = 0, failed = 0;
  renderCatalogAdmin();
  try {
    for(const item of items){
      if(!document.getElementById('view-catalog-admin').classList.contains('active') || !catalogLoaded) break;
      catalogMessage(`Оновлення з eBay: ${completed + 1} із ${items.length}…`);
      if(!await refreshCatalogLaptop(String(item.id))) failed++;
      completed++;
    }
    catalogMessage(`Оновлено: ${completed - failed} із ${completed}.${failed ? ' Не всі оголошення доступні. Повтори оновлення для потрібного ноутбука.' : ''}`);
  } finally { catalogBatchBusy = false; renderCatalogAdmin(); }
}

function resetCatalogAdmin(){
  catalogLoaded = false;
  catalogMetadata.clear();
  catalogAttempts.clear();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('catalogAdminOpen').addEventListener('click', () => switchView('catalog-admin'));
  document.getElementById('catalogAdminBack').addEventListener('click', () => switchView('active'));
  document.getElementById('catalogRefreshAll').addEventListener('click', () => refreshCatalogBatch(true));
  document.getElementById('catalogPublicLink').href = new URL('catalog.html', location.href).href;
  document.getElementById('catalogCopyLink').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(new URL('catalog.html', location.href).href); catalogMessage('Посилання для покупців скопійовано.'); }
    catch { catalogMessage('Відкрий каталог і скопіюй посилання з адресного рядка.'); }
  });
  document.getElementById('catalogAdminList').addEventListener('change', event => {
    if(!event.target.matches('[data-catalog-condition]')) return;
    updateCatalogCondition(event.target.closest('[data-catalog-id]').dataset.catalogId, event.target.value);
  });
  document.getElementById('catalogAdminList').addEventListener('click', event => {
    const button = event.target.closest('[data-catalog-refresh]');
    if(button) refreshCatalogLaptop(button.closest('[data-catalog-id]').dataset.catalogId);
  });
});
