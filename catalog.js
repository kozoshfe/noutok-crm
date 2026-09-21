(() => {
  // Publishable key only. The RPC returns display fields, never CRM records.
  const endpoint = 'https://qzcapeempzzdhicsweqz.supabase.co/rest/v1/rpc/get_customer_catalog';
  const apiKey = 'sb_publishable_nXxnpG6C_RO9mVqcYEt1mg_Z9Z-dpDr';
  const list = document.getElementById('catalogList');
  const status = document.getElementById('catalogStatus');
  let sortOrder = '';
  let photoFiles = [];
  const failedPhotos = new Set();
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
  const sortLabels = { title:'Модель', ram:'Оперативна пам’ять', ssd:'SSD', condition:'Стан', photo:'Фото', price:'Ціна' };
  let rows = [], loaded = false, busy = false;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const text = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit ? value.trim() : '';
  const icon = `<div class="product-illustration" role="img" aria-label="Ілюстрація ноутбука"><svg viewBox="0 0 240 180" fill="none" aria-hidden="true"><ellipse cx="120" cy="158" rx="110" ry="9" fill="#213544" opacity=".08"/><rect x="31" y="18" width="178" height="116" rx="7" fill="#29333d"/><rect x="38" y="25" width="164" height="100" rx="2" fill="#d6e5f3"/><path d="M38 109c42-80 83 39 164-59v75H38z" fill="#8bb8dd"/><path d="M38 125c65-58 97 34 164-54v54z" fill="#477dba"/><circle cx="120" cy="21" r="1.5" fill="#8795a2"/><path d="M31 134h178l24 21c1 3-2 6-6 6H13c-4 0-7-3-6-6z" fill="#aeb9c4"/><path d="M42 138h156l12 12H30z" fill="#424d5b"/><path d="M49 142h142M42 147h156M65 138l-3 12M90 138l-1 12M115 138v12M140 138l1 12M165 138l3 12M190 138l5 12" stroke="#929da8" stroke-width="1"/><path d="M95 152h50l4 6H91z" fill="#ccd4dc"/><path d="M8 157h224" stroke="#87939f" stroke-width="2"/></svg></div>`;
  const specIcon = kind => `<span class="spec-icon spec-icon-${kind}" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none">${kind === 'cpu' ? '<rect x="8" y="8" width="16" height="16" rx="2"/><rect x="12" y="12" width="8" height="8" rx="1"/><path d="M11 3v5m5-5v5m5-5v5M11 24v5m5-5v5m5-5v5M3 11h5m-5 5h5m-5 5h5m16-10h5m-5 5h5m-5 5h5"/>' : kind === 'ram' ? '<rect x="3" y="8" width="26" height="16" rx="2"/><path d="M8 13v6m5-6v6m6-6v6m5-6v6M8 24v3m5-3v3m6-3v3m5-3v3"/>' : '<rect x="4" y="7" width="24" height="18" rx="3"/><path d="M9 12h14M9 17h8M9 21h2m4 0h2m4 0h2"/>'}</svg></span>`;
  function modelPhoto(title){
    const normalize = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const name = normalize(title);
    let matches = photoFiles.filter(file => {
      const model = normalize(file.replace(/\.[^.]+$/, ''));
      return name === model || name.startsWith(model + ' ');
    });
    // A family-only catalog name can use its sole available generation image.
    if(!matches.length){
      const generic = name.match(/^hp (elitebook|zbook) g(\d+)(?:$| )/);
      if(generic) matches = photoFiles.filter(file => {
        const model = normalize(file.replace(/\.[^.]+$/, ''));
        return new RegExp(`^hp ${generic[1]}(?: [0-9]+)? g${generic[2]}$`).test(model);
      });
    }
    if(matches.length !== 1 || failedPhotos.has(matches[0])) return '';
    return matches[0];
  }
  function productImage(row){
    const file = modelPhoto(row.title);
    return file ? `<div class="product-illustration product-photo-image"><img src="Photo/${encodeURIComponent(file)}" alt="${safe(row.title)}" data-model-photo="${safe(file)}" loading="lazy" decoding="async" width="800" height="600"></div>` : icon;
  }
  function render(){
    document.querySelectorAll('[data-sort-field]').forEach(button => {
      const active = sortOrder.startsWith(button.dataset.sortField + '-');
      const descending = sortOrder.endsWith('-desc');
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('span').textContent = active ? (descending ? '↓' : '↑') : '↕';
      const label = sortLabels[button.dataset.sortField];
      if(button.dataset.sortField === 'photo'){
        button.setAttribute('aria-label', active ? `Фото: спочатку ${descending ? 'з фото' : 'без фото'}. Змінити напрямок` : 'Сортувати: Фото');
        return;
      }
      button.setAttribute('aria-label', active ? `${label}: ${descending ? 'за спаданням' : 'за зростанням'}. Змінити напрямок` : `Сортувати: ${label}`);
    });
    if(!loaded) return;
    const query = document.getElementById('catalogSearch').value.trim().toLocaleLowerCase('uk');
    const shown = rows.filter(row => (!query || `${row.title} ${row.number}`.toLocaleLowerCase('uk').includes(query))
      && (!document.getElementById('filterRam').value || row.ram === document.getElementById('filterRam').value)
      && (!document.getElementById('filterSsd').value || row.ssd === document.getElementById('filterSsd').value)
      && (!document.getElementById('filterCondition').value || row.condition === document.getElementById('filterCondition').value)
      && (!document.getElementById('filterPhoto').checked || row.telegram_link));
    if(sortOrder){
      const [field, direction] = sortOrder.split('-');
      const ranks = { '7/10':7, '8/10':8, '9/10':9, 'Як новий':10 };
      const value = row => field === 'photo' ? Number(Boolean(row.telegram_link)) : field === 'title' ? (row.title || null) : field === 'price' ? priceValue(row.price) : field === 'condition' ? (ranks[row.condition] ?? null) : capacityValue(row[field]);
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
    list.innerHTML = shown.length ? shown.map(row => `<article class="buyer-card product-card">
      <div class="buyer-model">${productImage(row)}<div class="product-heading"><h2>${safe(row.title || 'Назва уточнюється')}</h2><p class="buyer-number">№${safe(row.number || '—')}</p></div></div>
      <div class="buyer-processor product-spec">${specIcon('cpu')}<strong>${field(row.processor)}</strong><span class="spec-caption">Процесор</span></div>
      <dl>
        <div class="product-spec product-ram">${specIcon('ram')}<dt>Оперативна пам’ять</dt><dd>${field(row.ram)}</dd></div>
        <div class="product-spec product-ssd">${specIcon('ssd')}<dt>Накопичувач</dt><dd>SSD ${field(row.ssd)}</dd></div>
        <div class="product-condition"><dt>Стан</dt><dd>${row.condition ? `<span class="condition">${safe(row.condition)}</span>` : '<span class="unspecified">Уточнюється</span>'}</dd></div>
        <div class="product-photo"><dt>Фото</dt><dd>${row.telegram_link ? `<a class="catalog-photo-link" href="${safe(row.telegram_link)}" target="_blank" rel="noopener noreferrer" aria-label="Фото ${safe(row.title || 'ноутбука')} у Telegram"><span class="photo-mobile-label"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5l1-2h6l1 2h4v15H4V5z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/></svg>Фото</span></a>` : '<span class="unspecified">—</span>'}</dd></div>
        <div class="product-price"><dt>Ціна</dt><dd><span class="buyer-mobile-price">${priceValue(row.price) !== null ? safe(new Intl.NumberFormat('uk-UA', {maximumFractionDigits:2}).format(priceValue(row.price))) + ' ₴' : field(row.price)}</span></dd></div>
      </dl>
    </article>`).join('') : `<div class="catalog-empty">${rows.length ? 'Нічого не знайдено. Змініть пошук або фільтри.' : 'Зараз немає доступних ноутбуків. Завітайте трохи пізніше.'}</div>`;
    list.querySelectorAll('[data-model-photo]').forEach(img => {
      img.addEventListener('error', () => {
        failedPhotos.add(img.dataset.modelPhoto);
        const fallback = document.createElement('template');
        fallback.innerHTML = icon;
        img.parentElement.replaceWith(fallback.content.cloneNode(true));
      }, {once:true});
    });
  }
  async function load(){
    if(busy) return;
    busy = true;
    list.setAttribute('aria-busy', 'true');
    status.hidden = loaded;
    status.textContent = loaded ? '' : 'Завантаження ноутбуків…';
    try {
      const photosRequest = fetch('Photo/index.json', {cache:'no-store', signal:AbortSignal.timeout(5000)}).then(response => response.ok ? response.json() : []).catch(() => []);
      const response = await fetch(endpoint, { method:'POST', headers:{ apikey:apiKey, 'Content-Type':'application/json' }, body:'{}', cache:'no-store', credentials:'omit', signal:AbortSignal.timeout(15000) });
      if(!response.ok) throw new Error('Unavailable');
      const result = await response.json();
      const photos = await photosRequest;
      photoFiles = Array.isArray(photos) ? photos.filter(file => typeof file === 'string' && !/[\\/]/.test(file) && /\.(png|jpe?g|webp|avif)$/i.test(file)) : [];
      if(!Array.isArray(result) || result.some(row => !row || typeof row !== 'object')) throw new Error('Invalid catalog');
      rows = result.map(row => ({ telegram_link:telegramUrl(row.telegram_link), number:text(row.number,100), title:text(row.title,500), ram:text(row.ram,50), ssd:text(row.ssd,50), processor:text(row.processor,50), price:text(row.price,50), condition:['7/10','8/10','9/10','Як новий'].includes(row.condition) ? row.condition : '' }));
      for(const [id, key] of [['filterRam','ram'], ['filterSsd','ssd']]){
        const select = document.getElementById(id), selected = select.value;
        const values = [...new Set(rows.map(row => row[key]).filter(Boolean))];
        if(selected && !values.includes(selected)) values.push(selected);
        select.innerHTML = '<option value="">Усі</option>' + values.map(value => `<option value="${safe(value)}">${safe(value)}</option>`).join('');
        select.value = selected;
      }
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
      const direction = active ? (sortOrder.endsWith('-asc') ? 'desc' : 'asc') : (['condition', 'photo'].includes(field) ? 'desc' : 'asc');
      sortOrder = `${field}-${direction}`;
      render();
    });
  });
  for(const id of ['catalogSearch','filterRam','filterSsd','filterCondition','filterPhoto']) document.getElementById(id).addEventListener('input', render);
  document.getElementById('catalogFiltersToggle').addEventListener('click', () => {
    const panel = document.getElementById('catalogFilters');
    panel.hidden = !panel.hidden;
    document.getElementById('catalogFiltersToggle').setAttribute('aria-expanded', String(!panel.hidden));
    document.querySelector('.catalog-sort-buttons').classList.toggle('filters-expanded', !panel.hidden);
  });
  document.getElementById('resetCatalogFilters').addEventListener('click', () => {
    for(const id of ['catalogSearch','filterRam','filterSsd','filterCondition']) document.getElementById(id).value = '';
    document.getElementById('filterPhoto').checked = false;
    render();
  });
  document.addEventListener('visibilitychange' , () => { if(!document.hidden) load(); });
  window.addEventListener('online', load);
  setInterval(() => { if(!document.hidden) load(); }, 60000);
  load();
})();
