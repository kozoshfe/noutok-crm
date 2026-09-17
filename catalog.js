(() => {
  // Publishable key only. The RPC returns display fields, never CRM records.
  const endpoint = 'https://qzcapeempzzdhicsweqz.supabase.co/rest/v1/rpc/get_customer_catalog';
  const apiKey = 'sb_publishable_nXxnpG6C_RO9mVqcYEt1mg_Z9Z-dpDr';
  const list = document.getElementById('catalogList');
  const status = document.getElementById('catalogStatus');
  const search = document.getElementById('catalogSearch');
  const reload = document.getElementById('catalogReload');
  let rows = [], loaded = false, busy = false;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const text = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit ? value.trim() : '';
  const icon = '<span class="laptop-symbol" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><rect x="8" y="8" width="24" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 26 4 31h32l-4-5M16 31h8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span>';
  function render(){
    if(!loaded) return;
    const query = search.value.trim().toLocaleLowerCase('uk');
    const shown = rows.filter(row => row.title.toLocaleLowerCase('uk').includes(query));
    status.textContent = query ? `Знайдено: ${shown.length}` : `Доступні ноутбуки · ${rows.length}`;
    const field = value => value ? safe(value) : '<span class="unspecified">Уточнюється</span>';
    list.innerHTML = shown.length ? shown.map(row => `<article class="buyer-card"><div class="buyer-model">${icon}<div><p class="buyer-number">Ноутбук № ${safe(row.number || '—')}</p><h2>${safe(row.title || 'Назва уточнюється')}</h2><p class="buyer-processor">Процесор · ${field(row.processor)}</p></div></div><dl><div><dt>Пам’ять</dt><dd>${field(row.ram)}</dd></div><div><dt>SSD</dt><dd>${field(row.ssd)}</dd></div><div><dt>Стан</dt><dd>${row.condition ? `<span class="condition">${safe(row.condition)}</span>` : '<span class="unspecified">Уточнюється</span>'}</dd></div><div><dt>Ціна</dt><dd>${field(row.price)}</dd></div></dl></article>`).join('')
      : `<div class="catalog-empty">${query ? 'За цим запитом ноутбуків не знайдено.' : 'Зараз немає доступних ноутбуків. Завітайте трохи пізніше.'}</div>`;
  }
  async function load(){
    if(busy) return;
    busy = true;
    reload.disabled = true;
    list.setAttribute('aria-busy', 'true');
    status.textContent = 'Оновлення каталогу…';
    try {
      const response = await fetch(endpoint, { method:'POST', headers:{ apikey:apiKey, 'Content-Type':'application/json' }, body:'{}', cache:'no-store', credentials:'omit', signal:AbortSignal.timeout(15000) });
      if(!response.ok) throw new Error('Unavailable');
      const result = await response.json();
      if(!Array.isArray(result) || result.some(row => !row || typeof row !== 'object')) throw new Error('Invalid catalog');
      rows = result.map(row => ({ number:text(row.number,100), title:text(row.title,500), ram:text(row.ram,50), ssd:text(row.ssd,50), processor:text(row.processor,50), price:text(row.price,50), condition:['7/10','8/10','9/10','Як новий'].includes(row.condition) ? row.condition : '' }));
      loaded = true;
      document.getElementById('catalogTotal').textContent = String(rows.length);
      document.getElementById('catalogUpdated').textContent = `Оновлено ${new Date().toLocaleTimeString('uk-UA', { hour:'2-digit', minute:'2-digit' })}`;
      render();
    } catch {
      rows = [];
      loaded = false;
      list.replaceChildren();
      document.getElementById('catalogTotal').textContent = '—';
      document.getElementById('catalogUpdated').textContent = '';
      status.textContent = 'Не вдалося завантажити каталог. Натисніть «Оновити», щоб спробувати ще раз.';
    } finally { busy = false; reload.disabled = false; list.setAttribute('aria-busy', 'false'); }
  }
  search.addEventListener('input', render);
  reload.addEventListener('click', load);
  document.addEventListener('visibilitychange', () => { if(!document.hidden) load(); });
  window.addEventListener('online', load);
  setInterval(() => { if(!document.hidden) load(); }, 60000);
  load();
})();
