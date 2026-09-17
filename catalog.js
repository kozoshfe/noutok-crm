(() => {
  // Publishable key only. The RPC returns display fields, never CRM records.
  const endpoint = 'https://qzcapeempzzdhicsweqz.supabase.co/rest/v1/rpc/get_customer_catalog';
  const apiKey = 'sb_publishable_nXxnpG6C_RO9mVqcYEt1mg_Z9Z-dpDr';
  const list = document.getElementById('catalogList');
  const status = document.getElementById('catalogStatus');
  let sortOrder = '';
  function priceValue(value){
    const normalized = String(value ?? '').trim().replace(/(?:грн\.?|₴|UAH)$/i, '').replace(/\s/g, '').replace(',', '.');
    return /^\d+(?:\.\d{1,2})?$/.test(normalized) && Number.isFinite(Number(normalized)) ? Number(normalized) : null;
  }
  function telegramUrl(value){
    try {
      const url = new URL(String(value ?? '').trim());
      return ['https:', 'http:'].includes(url.protocol) && ['t.me', 'telegram.me', 'telegram.dog'].includes(url.hostname) && !url.username && !url.password && !url.port && url.pathname.length > 1 ? url.href : '';
    } catch { return ''; }
  }
  function capacityValue(value){
    const match = String(value ?? '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(ГБ|GB|ТБ|TB)$/i);
    return match ? Number(match[1].replace(',', '.')) * (/^(ТБ|TB)$/i.test(match[2]) ? 1024 : 1) : null;
  }
  const sortLabels = { title:'Модель', ram:'Оперативна пам’ять', ssd:'SSD', condition:'Стан', price:'Ціна' };
  let rows = [], loaded = false, busy = false;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const text = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit ? value.trim() : '';
  const icon = '<span class="laptop-symbol" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><rect x="8" y="8" width="24" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 26 4 31h32l-4-5M16 31h8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span>';
  function render(){
    document.querySelectorAll('[data-sort-field]').forEach(button => {
      const active = sortOrder.startsWith(button.dataset.sortField + '-');
      const descending = sortOrder.endsWith('-desc');
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('span').textContent = active ? (descending ? '↓' : '↑') : '↕';
      const label = sortLabels[button.dataset.sortField];
      button.setAttribute('aria-label', active ? `${label}: ${descending ? 'за спаданням' : 'за зростанням'}. Змінити напрямок` : `Сортувати: ${label}`);
    });
    if(!loaded) return;
    const shown = [...rows];
    if(sortOrder){
      const [field, direction] = sortOrder.split('-');
      const ranks = { '7/10':7, '8/10':8, '9/10':9, 'Як новий':10 };
      const value = row => field === 'title' ? (row.title || null) : field === 'price' ? priceValue(row.price) : field === 'condition' ? (ranks[row.condition] ?? null) : capacityValue(row[field]);
      shown.sort((a, b) => {
        const left = value(a), right = value(b);
        // Keep unspecified values last in either direction and preserve ties.
        if(left === null) return right === null ? 0 : 1;
        if(right === null) return -1;
        const comparison = field === 'title' ? left.localeCompare(right, 'uk', { numeric:true, sensitivity:'base' }) : left - right;
        return comparison * (direction === 'desc' ? -1 : 1);
      });
    }
    status.textContent = '';
    status.hidden = true;
    const field = value => value ? safe(value) : '<span class="unspecified">Уточнюється</span>';
    list.innerHTML = shown.length ? shown.map(row => `<article class="buyer-card"><div class="buyer-model">${icon}<div><p class="buyer-number">Ноутбук № ${safe(row.number || '—')}</p><h2>${safe(row.title || 'Назва уточнюється')}</h2><p class="buyer-processor">Процесор · ${field(row.processor)}</p></div></div><dl><div><dt>Пам’ять</dt><dd>${field(row.ram)}</dd></div><div><dt>SSD</dt><dd>${field(row.ssd)}</dd></div><div><dt>Стан</dt><dd>${row.condition ? `<span class="condition">${safe(row.condition)}</span>` : '<span class="unspecified">Уточнюється</span>'}</dd></div><div><dt>Фото</dt><dd>${row.telegram_link ? `<a class="catalog-photo-link" href="${safe(row.telegram_link)}" target="_blank" rel="noopener noreferrer" aria-label="Фото ${safe(row.title || 'ноутбука')} у Telegram">Telegram ↗</a>` : '<span class="unspecified">—</span>'}</dd></div><div><dt>Ціна</dt><dd>${field(row.price)}</dd></div></dl></article>`).join('')
      : `<div class="catalog-empty">Зараз немає доступних ноутбуків. Завітайте трохи пізніше.</div>`;
  }
  async function load(){
    if(busy) return;
    busy = true;
    list.setAttribute('aria-busy', 'true');
    status.hidden = loaded;
    status.textContent = loaded ? '' : 'Завантаження ноутбуків…';
    try {
      const response = await fetch(endpoint, { method:'POST', headers:{ apikey:apiKey, 'Content-Type':'application/json' }, body:'{}', cache:'no-store', credentials:'omit', signal:AbortSignal.timeout(15000) });
      if(!response.ok) throw new Error('Unavailable');
      const result = await response.json();
      if(!Array.isArray(result) || result.some(row => !row || typeof row !== 'object')) throw new Error('Invalid catalog');
      rows = result.map(row => ({ telegram_link:telegramUrl(row.telegram_link), number:text(row.number,100), title:text(row.title,500), ram:text(row.ram,50), ssd:text(row.ssd,50), processor:text(row.processor,50), price:text(row.price,50), condition:['7/10','8/10','9/10','Як новий'].includes(row.condition) ? row.condition : '' }));
      loaded = true;
      document.getElementById('catalogTotal').textContent = String(rows.length);
      render();
    } catch {
      rows = [];
      loaded = false;
      list.replaceChildren();
      document.getElementById('catalogTotal').textContent = '—';
      status.hidden = false;
      status.textContent = 'Не вдалося завантажити каталог. Повторна спроба відбудеться автоматично.';
    } finally { busy = false; list.setAttribute('aria-busy', 'false'); }
  }
  document.querySelectorAll('[data-sort-field]').forEach(button => {
    button.addEventListener('click', () => {
      const field = button.dataset.sortField;
      const active = sortOrder.startsWith(field + '-');
      const direction = active ? (sortOrder.endsWith('-asc') ? 'desc' : 'asc') : (field === 'condition' ? 'desc' : 'asc');
      sortOrder = `${field}-${direction}`;
      render();
    });
  });
  document.addEventListener('visibilitychange', () => { if(!document.hidden) load(); });
  window.addEventListener('online', load);
  setInterval(() => { if(!document.hidden) load(); }, 60000);
  load();
})();
