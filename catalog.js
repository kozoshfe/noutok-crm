(() => {
  // Publishable key only. The RPC returns display fields, never CRM records.
  const endpoint = 'https://qzcapeempzzdhicsweqz.supabase.co/rest/v1/rpc/get_customer_catalog';
  const apiKey = 'sb_publishable_nXxnpG6C_RO9mVqcYEt1mg_Z9Z-dpDr';
  const list = document.getElementById('catalogList');
  const status = document.getElementById('catalogStatus');
  let sortOrder = 'title-asc';
  let purchaseTrigger = null;
  let selectedPurchase = null;
  const purchaseTelegramUsername = 'noutok_help'; // Seller's public Telegram username.
  const cardKey = row => JSON.stringify([row.number, row.title]);
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
  const sortLabels = { number:'Номер', processor:'Процесор', gpu:'GPU', title:'Модель', ram:'Оперативна пам’ять', ssd:'SSD', condition:'Стан', photo:'Фото', price:'Ціна' };
  let rows = [], loaded = false, busy = false;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const text = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit ? value.trim() : '';
  function render(){
    document.querySelectorAll('[data-sort-field]').forEach(button => {
      const active = sortOrder.startsWith(button.dataset.sortField + '-');
      const descending = sortOrder.endsWith('-desc');
      button.setAttribute('aria-pressed', String(active));
      button.closest('th').setAttribute('aria-sort', active ? (descending ? 'descending' : 'ascending') : 'none');
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
    const shown = rows.filter(row => (!query || `${row.title} ${row.number} ${row.processor} ${row.gpu} ${row.ram} ${row.ssd}`.toLocaleLowerCase('uk').includes(query))
      && (!document.getElementById('filterRam').value || row.ram === document.getElementById('filterRam').value)
      && (!document.getElementById('filterSsd').value || row.ssd === document.getElementById('filterSsd').value)
      && (!document.getElementById('filterCondition').value || row.condition === document.getElementById('filterCondition').value)
      && (!document.getElementById('filterPhoto').checked || row.telegram_link));
    if(sortOrder){
      const [field, direction] = sortOrder.split('-');
      const ranks = { '7/10':7, '8/10':8, '9/10':9, 'Як новий':10 };
      const value = row => field === 'photo' ? Number(Boolean(row.telegram_link)) : ['title','number','processor','gpu'].includes(field) ? (row[field] || null) : field === 'price' ? priceValue(row.price) : field === 'condition' ? (ranks[row.condition] ?? null) : capacityValue(row[field]);
      shown.sort((a, b) => {
        const left = value(a), right = value(b);
        // Keep unspecified values last in either direction and preserve ties.
        if(left === null) return right === null ? 0 : 1;
        if(right === null) return -1;
        const comparison = ['title','number','processor','gpu'].includes(field) ? left.localeCompare(right, 'uk', { numeric:true, sensitivity:'base' }) : left - right;
        return comparison * (direction === 'desc' ? -1 : 1);
      });
    }
    status.textContent = '';
    status.hidden = true;
    const field = value => value ? safe(value) : '<span class="unspecified">Уточнюється</span>';
    document.getElementById('catalogShown').textContent = `Показано ${shown.length} із ${rows.length} ноутбуків`;
    list.innerHTML = shown.length ? shown.map(row => `<tr class="buyer-card product-card" data-card-key="${safe(cardKey(row))}">
      <td class="buyer-number">${safe(row.number || '—')}</td>
      <th scope="row" class="product-heading"><h2>${safe(row.title || 'Назва уточнюється')}</h2></th>
      <td class="buyer-processor product-spec">${field(row.processor)}</td>
      <td class="buyer-gpu product-spec">${field(row.gpu)}</td>
      <td class="product-ram product-spec">${field(row.ram)}</td>
      <td class="product-ssd product-spec">${field(row.ssd)}</td>
      <td class="product-condition">${row.condition ? `<span class="condition">${safe(row.condition)}</span>` : field('')}</td>
      <td class="product-price"><span class="buyer-mobile-price">${priceValue(row.price) !== null ? safe(new Intl.NumberFormat('uk-UA', {maximumFractionDigits:2}).format(priceValue(row.price))) + ' ₴' : field(row.price)}</span></td>
      <td class="product-photo">${row.telegram_link ? `<a class="catalog-photo-link" href="${safe(row.telegram_link)}" target="_blank" rel="noopener noreferrer" aria-label="Фото ${safe(row.title || 'ноутбука')} у Telegram">Фото ↗</a>` : '<span class="unspecified">—</span>'}</td>
      <td><button class="product-buy-button" type="button" aria-label="Купити ${safe(row.title || 'ноутбук')}, №${safe(row.number || '—')}">Купити</button></td>
    </tr>`).join('') : `<tr><td colspan="10" class="catalog-empty">${rows.length ? 'Нічого не знайдено. Змініть пошук або фільтри.' : 'Зараз немає доступних ноутбуків. Завітайте трохи пізніше.'}</td></tr>`;
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
      rows = result.map(row => ({ telegram_link:telegramUrl(row.telegram_link), number:text(row.number,100), title:text(row.title,500), ram:text(row.ram,50), ssd:text(row.ssd,50), processor:text(row.processor,50), gpu:text(row.gpu,100), price:text(row.price,50), condition:['7/10','8/10','9/10','Як новий'].includes(row.condition) ? row.condition : '' }));
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
      document.getElementById('catalogShown').textContent = '';
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
  const purchaseDialog = document.getElementById('purchaseDialog');
  const purchaseForm = document.getElementById('purchaseForm');
  document.getElementById('purchaseClose').addEventListener('click', () => purchaseDialog.close());
  purchaseDialog.addEventListener('click', event => {
    if(event.target !== purchaseDialog) return;
    const box = purchaseDialog.getBoundingClientRect();
    if(event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) purchaseDialog.close();
  });
  purchaseDialog.addEventListener('close', () => {
    document.body.classList.remove('purchase-open');
    purchaseForm.reset();
    const key = selectedPurchase ? cardKey(selectedPurchase) : '';
    selectedPurchase = null;
    const restoredTrigger = purchaseTrigger?.isConnected ? purchaseTrigger : [...list.querySelectorAll('.product-card')].find(card => card.dataset.cardKey === key)?.querySelector('.product-buy-button');
    restoredTrigger?.focus();
  });
  purchaseForm.addEventListener('input', event => {
    if(typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
    document.getElementById('purchaseFeedback').hidden = true;
  });
  purchaseForm.addEventListener('submit', event => {
    event.preventDefault();
    for(const id of ['purchaseName','purchaseCity','purchaseBranch']){
      const input = document.getElementById(id);
      input.value = input.value.trim();
      input.setCustomValidity(input.value ? '' : 'Заповніть це поле.');
    }
    const phone = document.getElementById('purchasePhone');
    const digits = phone.value.replace(/\D/g, '');
    phone.setCustomValidity(/^[+\d\s()-]+$/.test(phone.value) && digits.length >= 10 && digits.length <= 15 ? '' : 'Введіть коректний номер телефона, наприклад +380 67 123 45 67.');
    if(!purchaseForm.reportValidity() || !selectedPurchase) return;
    const feedback = document.getElementById('purchaseFeedback');
    if(!purchaseTelegramUsername){
      feedback.textContent = 'Надсилання заявок ще налаштовується.';
      feedback.hidden = false;
      return;
    }
    const data = new FormData(purchaseForm);
    const message = [
      'Заявка на ноутбук',
      `Модель: ${selectedPurchase.title || 'Уточнюється'}`,
      `Номер: ${selectedPurchase.number || '—'}`,
      `Ціна в каталозі: ${selectedPurchase.price || 'Уточнюється'}`,
      '',
      `ПІБ: ${data.get('fullName')}`,
      `Телефон: ${data.get('phone').trim()}`,
      `Місто: ${data.get('city')}`,
      `Відділення Нової пошти: ${data.get('branch')}`,
      `Пропонована ціна: ${data.get('offerPrice')} грн`
    ].join('\n');
    const destination = new URL(`https://t.me/${purchaseTelegramUsername}`);
    destination.searchParams.set('text', message);
    window.open(destination.href, '_blank', 'noopener,noreferrer');
    feedback.textContent = 'Повідомлення підготовлено. Підтвердьте надсилання в Telegram.';
    feedback.hidden = false;
  });
  list.addEventListener('click', event => {
    const buyButton = event.target.closest('.product-buy-button');
    if(buyButton){
      const key = buyButton.closest('.product-card').dataset.cardKey;
      const row = rows.find(item => cardKey(item) === key);
      if(!row) return;
      selectedPurchase = {...row};
      purchaseTrigger = buyButton;
      purchaseForm.reset();
      purchaseForm.querySelectorAll('input').forEach(input => input.setCustomValidity(''));
      document.getElementById('purchaseFeedback').hidden = true;
      document.getElementById('purchaseProduct').textContent = `${row.title || 'Ноутбук'} · №${row.number || '—'}`;
      document.body.classList.add('purchase-open');
      purchaseDialog.showModal();
      return;
    }

  });
  document.getElementById('catalogFiltersToggle').addEventListener('click', () => {
    const panel = document.getElementById('catalogFilters');
    panel.hidden = !panel.hidden;
    document.getElementById('catalogFiltersToggle').setAttribute('aria-expanded', String(!panel.hidden));
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
