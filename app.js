const icons = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M21 15.5A8.5 8.5 0 1 1 8.5 3a6.7 6.7 0 0 0 12.5 12.5Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  bar: '<svg viewBox="0 0 24 24"><path d="M6 20V10M12 20V4M18 20v-7"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88V9c.12.58.76 1 1.56 1H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><path d="M12 12h.01M19 12h.01M5 12h.01"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24"><path d="M6 7v10M18 7v10M2 9v6M22 9v6M6 12h12"/></svg>',
  ban: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 3 7.7 7 10 4-2.3 7-5.5 7-10V6l-7-3Z"/><path d="M12 8v5"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M20 4c-8 0-13 4.5-13 11a5 5 0 0 0 5 5c6.5 0 8-8 8-16Z"/><path d="M4 20c3-6 8-9 14-11"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

const defaults = [
  { id: crypto.randomUUID(), type: 'goals', title: 'Заробляти 3000$ в місяць', color: 'purple', icon: 'target' },
  { id: crypto.randomUUID(), type: 'goals', title: 'Вага 88 кг', color: 'green', icon: 'dumbbell' },
  { id: crypto.randomUUID(), type: 'goals', title: 'Не їсти солодке і мучне', color: 'amber', icon: 'ban' },
  { id: crypto.randomUUID(), type: 'rules', title: 'Не пропускати тренування', color: 'purple', icon: 'shield' },
  { id: crypto.randomUUID(), type: 'rules', title: 'Не їсти сміття', color: 'green', icon: 'leaf' },
  { id: crypto.randomUUID(), type: 'rules', title: 'Працювати кожен день', color: 'orange', icon: 'calendar' },
  { id: crypto.randomUUID(), type: 'rules', title: 'Не витрачати час даремно', color: 'blue', icon: 'clock' },
];

const copy = {
  appTitle: 'Мої цілі',
  board: 'Борда',
  goals: 'Цілі',
  rules: 'Правила',
  strategy: 'Стратегія',
  alcohol: 'Алкоголь',
  nicotine: 'Нікотин',
  calories: 'Калорії',
  list: 'Список',
  stats: 'Статистика',
  insights: 'Крипта',
  settings: 'Налаштування',
  readDone: 'Прочитано',
  mainNav: 'Основна навігація',
  tabsNav: 'Тип списку',
  lightTheme: 'Світла тема',
  themeHint: 'Перемикай вигляд одним натисканням',
  fontSize: 'Розмір шрифту',
  fontSizeGoals: 'Розмір шрифту: Цілі',
  fontSizeRules: 'Розмір шрифту: Правила',
  fontSizeStrategy: 'Розмір шрифту: Стратегія',
  fontSizeBoard: 'Розмір шрифту: Борда',
  fontSizeHint: 'Від меншого до більшого',
  sleepPoints: 'днів підряд',
  syncLocal: 'Локальне збереження',
  syncReady: 'Синхронізація увімкнена',
  syncSaved: 'Збережено в Supabase',
  syncLoading: 'Завантажую з Supabase',
  syncError: 'Supabase недоступний',
  syncNeedsLogin: 'Увійди, щоб синхронізувати',
  syncLoggedIn: 'Вхід активний',
  syncInvalidRedirect: 'Додай localhost у Redirect URLs в Supabase',
  syncEmailDisabled: 'Увімкни Email auth у Supabase',
  syncBadRequest: 'Перевір налаштування Supabase',
  syncNeedHttp: 'Відкрий додаток через localhost, не через file://',
  authNeedCredentials: 'Введи email і пароль',
  authLoginError: 'Помилка входу',
  installIos: 'На iPhone: Поділитися -> На екран Додому',
  installUnavailable: 'Відкрий сайт через HTTPS у Chrome або Safari',
  installOpen: 'Додаток вже встановлено',
  installReady: 'Можна встановити як додаток',
  installAndroidSteps: 'На Android відкрий меню браузера і вибери "Install app" або "Додати на головний екран".',
  item: 'Пункт',
  title: 'Назва',
  position: 'Позиція',
  section: 'Розділ',
  color: 'Колір',
  delete: 'Видалити',
  save: 'Зберегти',
  add: 'Додати пункт',
  theme: 'Змінити тему',
  close: 'Закрити',
  logout: 'Вийти',
  plusDays: 'Плюс',
  minusDays: 'Мінус',
  colors: ['Фіолетовий', 'Зелений', 'Жовтий', 'Помаранчевий', 'Синій'],
};

const storageKey = 'goals-pwa-state';
const savedStateAtBoot = readSavedStateAtBoot();
const shouldPreferRemoteStateAtBoot = !savedStateAtBoot || isStarterLocalState(savedStateAtBoot);
const state = loadState(savedStateAtBoot);
state.activeView = 'board';
maybeResetBoardCycle();
const els = {
  list: document.querySelector('.list'),
  readButton: document.querySelector('.read-button'),
  boardView: document.querySelector('.board-view'),
  boardHead: document.querySelector('.board-head'),
  boardBody: document.querySelector('.board-body'),
  boardAdd: document.querySelector('.board-add'),
  boardManage: document.querySelector('.board-manage'),
  boardShortcuts: document.querySelectorAll('[data-board-shortcut]'),
  appShell: document.getElementById('appShell'),
  authScreen: document.getElementById('authScreen'),
  listTabs: document.querySelector('.tabs-list'),
  statsTabs: document.querySelector('.tabs-stats'),
  tabButtons: document.querySelectorAll('.tab'),
  statsTabButtons: document.querySelectorAll('[data-stats-tab]'),
  navButtons: document.querySelectorAll('.nav-item'),
  add: document.querySelector('.add-button'),
  dialog: document.querySelector('.editor'),
  form: document.querySelector('.editor-card'),
  delete: document.querySelector('.delete-item'),
  themeToggle: document.querySelector('.theme-toggle'),
  themeSwitch: document.querySelector('.theme-switch'),
  fontSizeButtons: document.querySelectorAll('[data-font-size]'),
  sleepCalendars: document.querySelectorAll('.sleep-calendar'),
  sleepMonths: document.querySelectorAll('.sleep-month'),
  sleepStreakNumbers: document.querySelectorAll('.sleep-streak-number'),
  sleepStreakTexts: document.querySelectorAll('.sleep-streak-text'),
  cryptoView: document.querySelector('.crypto-view'),
  cryptoPlusButton: document.querySelector('[data-crypto-action="plus"]'),
  cryptoMinusButton: document.querySelector('[data-crypto-action="minus"]'),
  cryptoPlusCount: document.querySelector('.crypto-plus-count'),
  cryptoMinusCount: document.querySelector('.crypto-minus-count'),
  cryptoSummaryTexts: document.querySelectorAll('.crypto-summary-text'),
  authForm: document.querySelector('.auth-form'),
  authEmail: document.getElementById('simpleLogin'),
  authPassword: document.getElementById('simplePassword'),
  authMessage: document.getElementById('simpleLoginMsg'),
  authLogout: document.querySelector('.header-logout'),
  statsView: document.querySelector('.stats-view'),
  statsReadButton: document.querySelector('.stats-read-button'),
  statsAlcoholActions: document.querySelector('.stats-alcohol-actions'),
  alcoholDrinkButton: document.querySelector('[data-alcohol-action="drank"]'),
  alcoholCleanButton: document.querySelector('[data-alcohol-action="clean"]'),
  settingsView: document.querySelector('.settings-view'),
};

let editingId = null;
let supabaseClient = null;
let syncTimer = null;
let isHydratingRemote = false;
let currentUser = null;
let lastRemoteUpdatedAt = null;
let cryptoTapState = { key: '', count: 0, ts: 0 };
let boardTapState = { key: '', count: 0, ts: 0 };
let sleepTapState = { key: '', count: 0, ts: 0 };
let editorMode = 'list';

document.querySelectorAll('[data-icon]').forEach((node) => {
  node.innerHTML = icons[node.dataset.icon] || '';
});

applyTheme();
applyCopy();
applyFontSize();
finalizeReadStatuses();
render();
initSupabaseSync();

els.tabButtons.forEach((button) => {
  if (!button.dataset.tab) return;
  button.addEventListener('click', () => {
    state.activeTab = button.dataset.tab;
    saveState();
    render();
  });
});

els.statsTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.statsTab = button.dataset.statsTab;
    saveState();
    render();
  });
});

els.navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.activeView = button.dataset.view;
    if (button.dataset.view === 'list') {
      state.activeTab = 'goals';
    }
    if (button.dataset.view === 'stats') {
      state.statsTab = 'goals';
    }
    saveState();
    render();
  });
});

els.boardShortcuts.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.boardShortcut;
    if (target === 'crypto') {
      state.activeView = 'insights';
    } else {
      state.activeView = 'stats';
      state.statsTab = target;
    }
    saveState();
    render();
  });
});

els.add.addEventListener('click', () => openEditor());
els.boardAdd?.addEventListener('click', () => {
  openBoardEditor();
});
els.boardManage?.addEventListener('click', () => {
  const firstBoardItem = state.boardItems[0];
  openBoardEditor(firstBoardItem?.id);
});
els.themeToggle.addEventListener('click', toggleTheme);
els.themeSwitch.addEventListener('click', toggleTheme);

els.fontSizeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const scope = button.dataset.fontScope || 'goals';
    state.fontSizes = {
      ...getNormalizedFontSizes(state.fontSizes),
      [scope]: button.dataset.fontSize,
    };
    saveState();
    applyFontSize();
  });
});

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await authLogin();
});

els.authLogout.addEventListener('click', async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
});

els.cryptoPlusButton?.addEventListener('click', () => {
  setCryptoDayResult('plus');
});

els.cryptoMinusButton?.addEventListener('click', () => {
  setCryptoDayResult('minus');
});

els.readButton?.addEventListener('click', () => {
  if (state.activeView === 'stats' && state.statsTab === 'goals') {
    markTodayAsRead();
  }
});

els.statsReadButton?.addEventListener('click', () => {
  markTodayAsRead();
});

els.alcoholDrinkButton?.addEventListener('click', () => {
  markTodayBinaryStatus('missed');
});

els.alcoholCleanButton?.addEventListener('click', () => {
  markTodayBinaryStatus('done');
});

els.form.addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'save') return;
  const data = Object.fromEntries(new FormData(els.form));
  const icon = iconForType(data.type, data.title);
  const requestedPosition = Math.max(1, Number.parseInt(data.position, 10) || 1);

  if (editorMode === 'board') {
    const boardItem = {
      id: editingId || crypto.randomUUID(),
      title: data.title,
      type: 'board',
      color: data.color || 'purple',
      icon: iconForType('board', data.title),
    };

    state.boardItems = upsertAtPosition(state.boardItems, boardItem, requestedPosition);
  } else if (editingId) {
    const nextItem = { ...state.items.find((item) => item.id === editingId), ...data, icon };
    state.items = upsertAtPosition(
      state.items,
      nextItem,
      requestedPosition,
      (item) => item.type === data.type,
    );
  } else {
    state.items = upsertAtPosition(
      state.items,
      { id: crypto.randomUUID(), title: data.title, type: data.type, color: data.color, icon },
      requestedPosition,
      (item) => item.type === data.type,
    );
    state.activeTab = data.type;
    state.activeView = 'list';
  }

  editingId = null;
  saveState();
  render();
});

els.delete.addEventListener('click', () => {
  if (!editingId) return;
  if (editorMode === 'board') {
    state.boardItems = normalizeScopedOrder(state.boardItems.filter((item) => item.id !== editingId));
    delete state.boardChecks[editingId];
  } else {
    const deletingItem = state.items.find((item) => item.id === editingId);
    state.items = normalizeScopedOrder(
      state.items.filter((item) => item.id !== editingId),
      (item) => item.type === deletingItem?.type,
    );
  }
  editingId = null;
  editorMode = 'list';
  els.dialog.close();
  saveState();
  render();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  });
}

window.addEventListener('focus', () => {
  maybeResetBoardCycle();
  finalizeReadStatuses();
  if (state.activeView === 'board') renderBoard();
  renderStats();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    maybeResetBoardCycle();
    finalizeReadStatuses();
    if (state.activeView === 'board') renderBoard();
    renderStats();
  }
});

setInterval(() => {
  maybeResetBoardCycle();
  finalizeReadStatuses();
  if (state.activeView === 'board') renderBoard();
  renderStats();
}, 60_000);

function render() {
  els.tabButtons.forEach((button) => {
    if (button.dataset.tab) {
      button.classList.toggle('active', button.dataset.tab === state.activeTab);
    }
  });
  els.statsTabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.statsTab === state.statsTab);
  });
  els.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.view === state.activeView));

  const isBoard = state.activeView === 'board';
  const isList = state.activeView === 'list';
  const isStatsLike = state.activeView === 'stats';
  els.boardView.hidden = !isBoard;
  els.list.hidden = !isList;
  if (els.listTabs) els.listTabs.hidden = !isList;
  if (els.statsTabs) els.statsTabs.hidden = !isStatsLike;
  if (els.readButton) {
    els.readButton.hidden = true;
    els.readButton.classList.toggle('is-complete', getReadMap(state.statsTab || 'goals')[dateKey(new Date())] === 'done');
  }
  if (els.statsReadButton) {
    els.statsReadButton.hidden = !(isStatsLike && state.statsTab === 'goals');
    els.statsReadButton.classList.toggle('is-complete', getReadMap(state.statsTab || 'goals')[dateKey(new Date())] === 'done');
  }
  if (els.statsAlcoholActions) {
    els.statsAlcoholActions.hidden = !(isStatsLike && ['alcohol', 'nicotine', 'calories'].includes(state.statsTab));
  }
  els.statsView.hidden = !isStatsLike;
  els.cryptoView.hidden = state.activeView !== 'insights';
  els.settingsView.hidden = state.activeView !== 'settings';

  if (isBoard) renderBoard();
  if (isList) renderList();
  renderStats();
  renderBoardShortcutStatuses();
}

function renderBoardShortcutStatuses() {
  const today = dateKey(new Date());
  els.boardShortcuts.forEach((button) => {
    const target = button.dataset.boardShortcut;
    const value = target === 'crypto'
      ? state.cryptoDays?.[today]
      : getReadMap(target)?.[today];
    const isMarked = Boolean(value && value !== 'reset');

    button.classList.toggle('is-done-today', isMarked);
    button.classList.toggle('is-missed-today', !isMarked);
    button.setAttribute('aria-label', `${button.textContent.trim()}: ${isMarked ? 'сьогодні відмічено' : 'сьогодні не відмічено'}`);
  });
}

function renderBoard() {
  if (!els.boardBody || !els.boardHead) return;
  const weekdays = [
    { key: 'mon', label: 'Пн' },
    { key: 'tue', label: 'Вт' },
    { key: 'wed', label: 'Ср' },
    { key: 'thu', label: 'Чт' },
    { key: 'fri', label: 'Пт' },
    { key: 'sat', label: 'Сб' },
    { key: 'sun', label: 'Нд' },
  ];
  const todayIndex = (new Date().getDay() + 6) % 7;
  const visibleWeekdays = [
    { ...weekdays[(todayIndex + 6) % 7], isToday: false },
    { ...weekdays[todayIndex], isToday: true },
    { ...weekdays[(todayIndex + 1) % 7], isToday: false },
  ];
  const items = sortByOrder(state.boardItems);
  const compactBoard = window.innerWidth <= 430;
  const layout = compactBoard
    ? { index: 42, task: 144, day: 36 }
    : { index: 48, task: 204, day: 40 };
  const boardColumns = `${layout.index}px minmax(${layout.task}px, 1fr) repeat(${visibleWeekdays.length}, ${layout.day}px)`;

  els.boardView?.style.setProperty('--board-index-col', `${layout.index}px`);

  els.boardHead.style.gridTemplateColumns = boardColumns;
  els.boardHead.innerHTML = `
    <span class="board-index">7/7</span>
    <span class="board-title">Таск</span>
    ${visibleWeekdays.map((day) => `<span class="board-day">${day.label}</span>`).join('')}
  `;

  if (!items.length) {
    els.boardBody.innerHTML = `
      <div class="board-row board-empty" style="grid-template-columns:${boardColumns}">
        <span class="board-row-index board-progress">0/7</span>
        <div class="board-task board-task-empty">
          <strong>Борда поки пуста</strong>
          <small>Натисни "Додати пункт", щоб створити перший таск.</small>
        </div>
        ${visibleWeekdays.map(() => '<span class="board-cell board-cell-empty"></span>').join('')}
      </div>
    `;
    return;
  }

  els.boardBody.innerHTML = items.map((item, index) => `
    <div class="board-row" style="grid-template-columns:${boardColumns}">
      <span class="board-row-index board-progress ${countBoardDays(item.id) === 7 ? 'is-complete' : ''}">${countBoardDays(item.id)}/7</span>
      <button class="board-task" type="button" data-id="${item.id}">
        <span class="board-task-copy">
          <strong>${escapeHtml(item.title)}</strong>
        </span>
      </button>
      ${visibleWeekdays.map((day) => {
        const checked = Boolean(state.boardChecks[item.id]?.[day.key]);
        return `<button class="board-cell ${checked ? 'is-done' : ''} ${day.isToday ? 'is-today-cell' : 'is-locked'}" type="button" data-board-key="${item.id}:${day.key}" ${day.isToday ? '' : 'disabled'} aria-label="${escapeHtml(item.title)} ${day.label}"></button>`;
      }).join('')}
    </div>
  `).join('');

  els.boardBody.querySelectorAll('.board-task').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.boardItems.find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      openBoardEditor(button.dataset.id);
    });
  });

  els.boardBody.querySelectorAll('[data-board-key]').forEach((button) => {
    button.addEventListener('click', () => {
      handleBoardCellTap(button.dataset.boardKey);
    });
  });
}

function renderList() {
  const items = sortByOrder(state.items.filter((item) => item.type === state.activeTab));
  els.list.dataset.tab = state.activeTab;
  els.list.innerHTML = items.map((item) => `
    <button class="item-card" type="button" data-id="${item.id}">
      <span class="item-icon ${item.color}">${icons[item.icon] || icons.target}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span class="item-menu">${icons.dots}</span>
    </button>
  `).join('');

  els.list.querySelectorAll('.item-card').forEach((card) => {
    card.addEventListener('click', () => openEditor(card.dataset.id));
  });
}

function renderStats() {
  renderSleepCalendar(els.sleepCalendars[0], els.sleepMonths[0], els.sleepStreakNumbers[0]);
  renderCryptoCalendar();
}

function showAuthScreen() {
  els.appShell.hidden = true;
  els.authScreen.hidden = false;
}

function showAppShell() {
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
}

function openEditor(id) {
  editorMode = 'list';
  const item = state.items.find((entry) => entry.id === id);
  const itemsInType = sortByOrder(state.items.filter((entry) => entry.type === (item?.type || state.activeTab)));
  editingId = item?.id || null;
  els.form.title.value = item?.title || '';
  els.form.type.value = item?.type || state.activeTab;
  els.form.color.value = item?.color || 'purple';
  els.form.position.value = String(item ? Math.max(1, itemsInType.findIndex((entry) => entry.id === item.id) + 1) : itemsInType.length + 1);
  els.form.type.closest('label').hidden = false;
  document.querySelector('[data-color-row]')?.toggleAttribute('hidden', false);
  els.delete.hidden = !item;
  els.dialog.showModal();
  els.form.title.focus();
}

function openBoardEditor(id) {
  editorMode = 'board';
  const item = state.boardItems.find((entry) => entry.id === id);
  const boardItems = sortByOrder(state.boardItems);
  editingId = item?.id || null;
  els.form.title.value = item?.title || '';
  els.form.type.value = 'board';
  els.form.color.value = item?.color || 'purple';
  els.form.position.value = String(item ? Math.max(1, boardItems.findIndex((entry) => entry.id === item.id) + 1) : boardItems.length + 1);
  els.form.type.closest('label').hidden = true;
  document.querySelector('[data-color-row]')?.setAttribute('hidden', '');
  els.delete.hidden = !item;
  els.dialog.showModal();
  els.form.title.focus();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
}

function applyTheme() {
  document.documentElement.classList.toggle('light', state.theme === 'light');
  document.querySelector('.theme-toggle span').innerHTML = icons[state.theme === 'light' ? 'sun' : 'moon'];
  els.themeSwitch.classList.toggle('is-on', state.theme === 'light');
  els.themeSwitch.setAttribute('aria-pressed', String(state.theme === 'light'));
  document.querySelector('meta[name="theme-color"]').setAttribute('content', state.theme === 'light' ? '#f6f6f8' : '#11121b');
}

function applyCopy() {
  document.documentElement.lang = 'uk';
  document.title = t('appTitle');
  document.querySelector('.app-shell').setAttribute('aria-label', t('appTitle'));
  document.querySelector('h1').textContent = t('appTitle');
  document.querySelectorAll('.tabs').forEach((node) => {
    node.setAttribute('aria-label', t('tabsNav'));
  });
  document.querySelector('.bottom-nav').setAttribute('aria-label', t('mainNav'));
  document.querySelectorAll('[data-tab="goals"]').forEach((node) => { node.textContent = t('goals'); });
  document.querySelectorAll('[data-tab="rules"]').forEach((node) => { node.textContent = t('rules'); });
  document.querySelectorAll('[data-tab="strategy"]').forEach((node) => { node.textContent = t('strategy'); });
  document.querySelectorAll('[data-stats-tab="goals"]').forEach((node) => { node.textContent = t('goals'); });
  document.querySelectorAll('[data-stats-tab="alcohol"]').forEach((node) => { node.textContent = t('alcohol'); });
  document.querySelectorAll('[data-stats-tab="nicotine"]').forEach((node) => { node.textContent = t('nicotine'); });
  document.querySelectorAll('[data-stats-tab="calories"]').forEach((node) => { node.textContent = t('calories'); });
  document.querySelector('[data-view="board"] small').textContent = t('board');
  document.querySelector('[data-view="list"] small').textContent = t('list');
  document.querySelector('[data-view="stats"] small').textContent = t('stats');
  document.querySelector('[data-view="insights"] small').textContent = t('insights');
  document.querySelector('[data-view="settings"] small').textContent = t('settings');
  document.querySelector('[data-view="board"]').setAttribute('aria-label', t('board'));
  document.querySelector('[data-view="list"]').setAttribute('aria-label', t('list'));
  document.querySelector('[data-view="stats"]').setAttribute('aria-label', t('stats'));
  document.querySelector('[data-view="insights"]').setAttribute('aria-label', t('insights'));
  document.querySelector('[data-view="settings"]').setAttribute('aria-label', t('settings'));
  document.querySelector('.add-button').setAttribute('aria-label', t('add'));
  document.querySelector('.add-button').setAttribute('title', t('add'));
  if (els.readButton) els.readButton.textContent = t('readDone');
  if (els.statsReadButton) els.statsReadButton.textContent = t('readDone');
  document.querySelector('.theme-toggle').setAttribute('aria-label', t('theme'));
  document.querySelector('.header-logout').textContent = t('logout');
  els.themeSwitch.setAttribute('aria-label', t('lightTheme'));
  document.querySelector('.close-editor').setAttribute('aria-label', t('close'));
  document.querySelector('.editor-card h2').textContent = t('item');
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  els.sleepStreakTexts.forEach((node) => {
    node.textContent = t('sleepPoints');
  });
  if (els.cryptoSummaryTexts[0]) {
    els.cryptoSummaryTexts[0].textContent = `${t('plusDays')} ${countCryptoDays('plus')} днів`;
  }
  if (els.cryptoSummaryTexts[1]) {
    els.cryptoSummaryTexts[1].textContent = `${t('minusDays')} ${countCryptoDays('minus')} днів`;
  }

  document.querySelector('.editor-card label > span')?.replaceChildren(document.createTextNode(t('title')));
  document.querySelector('[data-order-label]')?.replaceChildren(document.createTextNode(t('position')));
  document.querySelector('[data-section-label]')?.replaceChildren(document.createTextNode(t('section')));
  document.querySelector('[data-color-label]')?.replaceChildren(document.createTextNode(t('color')));
  const typeOptions = els.form.type.options;
  typeOptions[0].textContent = t('goals');
  typeOptions[1].textContent = t('rules');
  typeOptions[2].textContent = t('strategy');
  [...els.form.color.options].forEach((option, index) => {
    option.textContent = t('colors')[index];
  });
  els.delete.textContent = t('delete');
  document.querySelector('.editor-card .primary-action').textContent = t('save');
}

function applyFontSize() {
  const sizes = getNormalizedFontSizes(state.fontSizes);
  document.documentElement.style.setProperty('--goals-font-size', `${sizes.goals}px`);
  document.documentElement.style.setProperty('--rules-font-size', `${sizes.rules}px`);
  document.documentElement.style.setProperty('--strategy-font-size', `${sizes.strategy}px`);
  document.documentElement.style.setProperty('--board-font-size', `${sizes.board}px`);
  els.fontSizeButtons.forEach((button) => {
    const scope = button.dataset.fontScope || 'goals';
    button.classList.toggle('active', button.dataset.fontSize === String(sizes[scope]));
  });
}

function finalizeReadStatuses() {
  const today = dateKey(new Date());
  let changed = false;
  const start = new Date();
  start.setFullYear(start.getFullYear(), start.getMonth(), 1);
  const tabs = ['goals', 'alcohol', 'nicotine', 'calories'];

  tabs.forEach((tab) => {
    const map = getReadMap(tab);

    for (let cursor = new Date(start); dateKey(cursor) < today; cursor = addDays(cursor, 1)) {
      const key = dateKey(cursor);
      if (!(key in map)) {
        map[key] = 'missed';
        changed = true;
      }
    }

    if (isTodayReadDeadlinePassed() && !(today in map)) {
      map[today] = 'missed';
      changed = true;
    }
  });

  if (changed) saveState();
}

function markTodayAsRead() {
  const today = dateKey(new Date());
  const map = getReadMap(state.statsTab || 'goals');
  if (isTodayReadDeadlinePassed() || map[today] === 'done') return;
  map[today] = 'done';
  sleepTapState = { key: '', count: 0, ts: 0 };
  saveState();
  render();
}

function markTodayBinaryStatus(status) {
  const today = dateKey(new Date());
  const tab = ['alcohol', 'nicotine', 'calories'].includes(state.statsTab) ? state.statsTab : 'alcohol';
  const map = getReadMap(tab);
  if (isTodayReadDeadlinePassed() || !['done', 'missed'].includes(status)) return;
  if (map[today] === 'done' || map[today] === 'missed') return;
  map[today] = status;
  sleepTapState = { key: '', count: 0, ts: 0 };
  saveState();
  render();
}

function renderSleepCalendar(calendarEl, monthEl, streakEl) {
  if (!calendarEl || !monthEl || !streakEl) return;

  finalizeReadStatuses();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = dateKey(now);
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('uk-UA', { month: 'long' }).format(now);
  const headerTitle = document.querySelector('.stats-view .sleep-card header strong');
  const headerSubtitle = document.querySelector('.stats-view .sleep-card header span');
  const binaryPrimary = els.alcoholDrinkButton;
  const binarySecondary = els.alcoholCleanButton;
  const cells = [];

  if (headerTitle && headerSubtitle) {
    if ((state.statsTab || 'goals') === 'alcohol') {
      headerTitle.textContent = 'Ти пив сьогодні?';
      headerSubtitle.textContent = '';
      headerTitle.classList.add('stats-question-title');
      if (binaryPrimary) binaryPrimary.textContent = 'Пив';
      if (binarySecondary) binarySecondary.textContent = 'Не пив';
    } else if ((state.statsTab || 'goals') === 'nicotine') {
      headerTitle.textContent = 'Ти курив сьогодні?';
      headerSubtitle.textContent = '';
      headerTitle.classList.add('stats-question-title');
      if (binaryPrimary) binaryPrimary.textContent = 'Курив';
      if (binarySecondary) binarySecondary.textContent = 'Не курив';
    } else if ((state.statsTab || 'goals') === 'calories') {
      headerTitle.textContent = 'Ти дотримався дефіцита?';
      headerSubtitle.textContent = '';
      headerTitle.classList.add('stats-question-title');
      if (binaryPrimary) binaryPrimary.textContent = 'Профіцит';
      if (binarySecondary) binarySecondary.textContent = 'Дефіцит';
    } else if ((state.statsTab || 'goals') === 'goals') {
      headerTitle.textContent = 'Ти прочитав Цілі?';
      headerSubtitle.textContent = '';
      headerTitle.classList.add('stats-question-title');
    } else {
      headerTitle.textContent = 'Перед сном';
      headerSubtitle.textContent = 'Відкриття з 21:00 до 03:00';
      headerTitle.classList.remove('stats-question-title');
    }
  }

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push('<span class="sleep-day empty"></span>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const statusValue = getReadMap(state.statsTab || 'goals')[key] || '';
    const isDone = statusValue === 'done';
    const isMissed = statusValue === 'missed';
    const isToday = key === todayKey;
    const status = isDone ? 'done' : isMissed ? 'missed' : '';
    const label = isDone ? 'прочитано' : isMissed ? 'не прочитано' : 'сьогодні';
    cells.push(`<button class="sleep-day stats-day ${status} ${isToday ? 'today' : ''}" type="button" data-sleep-date="${key}" title="${day}: ${label}">${day}</button>`);
  }

  monthEl.textContent = monthName;
  calendarEl.innerHTML = cells.join('');
  calendarEl.querySelectorAll('[data-sleep-date]').forEach((button) => {
    button.addEventListener('click', () => {
      handleSleepDateTap(button.dataset.sleepDate);
    });
  });
  streakEl.textContent = countSleepStreak();
}

function renderCryptoCalendar() {
  const calendarEl = els.sleepCalendars[1];
  const monthEl = els.sleepMonths[1];
  if (!calendarEl || !monthEl) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = dateKey(now);
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('uk-UA', { month: 'long' }).format(now);
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push('<span class="sleep-day empty"></span>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const result = state.cryptoDays[key] || '';
    const isToday = key === todayKey;
    const status = result === 'plus' ? 'done' : result === 'minus' ? 'missed' : '';
    const label = result === 'plus' ? 'плюс' : result === 'minus' ? 'мінус' : 'без позначки';
    cells.push(`<button class="sleep-day crypto-day ${status} ${isToday ? 'today' : ''}" type="button" data-crypto-date="${key}" title="${day}: ${label}">${day}</button>`);
  }

  monthEl.textContent = monthName;
  calendarEl.innerHTML = cells.join('');
  calendarEl.querySelectorAll('[data-crypto-date]').forEach((button) => {
    button.addEventListener('click', () => {
      handleCryptoDateTap(button.dataset.cryptoDate);
    });
  });
  if (els.cryptoPlusCount) els.cryptoPlusCount.textContent = countCryptoDays('plus');
  if (els.cryptoMinusCount) els.cryptoMinusCount.textContent = countCryptoDays('minus');
  if (els.cryptoSummaryTexts[0]) els.cryptoSummaryTexts[0].textContent = `${t('plusDays')} ${countCryptoDays('plus')} днів`;
  if (els.cryptoSummaryTexts[1]) els.cryptoSummaryTexts[1].textContent = `${t('minusDays')} ${countCryptoDays('minus')} днів`;
}

function setCryptoDayResult(result) {
  const key = dateKey(new Date());
  const current = state.cryptoDays[key] || '';
  if (current && current !== result) return;
  state.cryptoDays[key] = result;
  cryptoTapState = { key: '', count: 0, ts: 0 };
  saveState();
  renderStats();
  renderBoardShortcutStatuses();
}

function handleCryptoDateTap(key) {
  if (!state.cryptoDays[key]) return;

  const now = Date.now();
  const isSameKey = cryptoTapState.key === key;
  const isQuickTap = now - cryptoTapState.ts < 1200;

  if (isSameKey && isQuickTap) {
    cryptoTapState.count += 1;
  } else {
    cryptoTapState = { key, count: 1, ts: now };
    return;
  }

  cryptoTapState.ts = now;

  if (cryptoTapState.count >= 3) {
    delete state.cryptoDays[key];
    cryptoTapState = { key: '', count: 0, ts: 0 };
    saveState();
    renderStats();
    renderBoardShortcutStatuses();
  }
}

function handleSleepDateTap(key) {
  const map = getReadMap(state.statsTab || 'goals');
  const current = map[key];
  if (!current || current === 'reset') return;

  const now = Date.now();
  const isSameKey = sleepTapState.key === key;
  const isQuickTap = now - sleepTapState.ts < 1200;

  if (isSameKey && isQuickTap) {
    sleepTapState.count += 1;
  } else {
    sleepTapState = { key, count: 1, ts: now };
    return;
  }

  sleepTapState.ts = now;

  if (sleepTapState.count >= 3) {
    map[key] = 'reset';
    sleepTapState = { key: '', count: 0, ts: 0 };
    saveState();
    renderStats();
  }
}

function handleBoardCellTap(key) {
  const [itemId, day] = key.split(':');
  const checked = Boolean(state.boardChecks[itemId]?.[day]);

  if (!checked) {
    state.boardChecks[itemId] = { ...(state.boardChecks[itemId] || {}), [day]: true };
    boardTapState = { key: '', count: 0, ts: 0 };
    saveState();
    renderBoard();
    return;
  }

  const now = Date.now();
  const isSameKey = boardTapState.key === key;
  const isQuickTap = now - boardTapState.ts < 1200;

  if (isSameKey && isQuickTap) {
    boardTapState.count += 1;
  } else {
    boardTapState = { key, count: 1, ts: now };
    return;
  }

  boardTapState.ts = now;

  if (boardTapState.count >= 3) {
    const next = { ...(state.boardChecks[itemId] || {}) };
    delete next[day];
    if (Object.keys(next).length) {
      state.boardChecks[itemId] = next;
    } else {
      delete state.boardChecks[itemId];
    }
    boardTapState = { key: '', count: 0, ts: 0 };
    saveState();
    renderBoard();
  }
}

function countCryptoDays(result) {
  return Object.values(state.cryptoDays).filter((value) => value === result).length;
}

function countBoardDays(itemId) {
  return Object.values(state.boardChecks[itemId] || {}).filter(Boolean).length;
}

function maybeResetBoardCycle() {
  const cycleId = getBoardCycleId(new Date());
  if (!state.boardCycleId) {
    state.boardCycleId = cycleId;
    return;
  }

  if (state.boardCycleId === cycleId) return;

  state.boardChecks = {};
  state.boardCycleId = cycleId;
  saveState();
}

function getBoardCycleId(date) {
  const now = new Date(date);
  const day = now.getDay();
  const daysSinceSunday = day;
  const currentSunday = new Date(now);
  currentSunday.setHours(23, 50, 0, 0);
  currentSunday.setDate(now.getDate() - daysSinceSunday);

  if (now >= currentSunday) {
    return `cycle-${dateKey(currentSunday)}-2350`;
  }

  const previousSunday = new Date(currentSunday);
  previousSunday.setDate(previousSunday.getDate() - 7);
  return `cycle-${dateKey(previousSunday)}-2350`;
}

function countSleepStreak() {
  const map = getReadMap(state.statsTab || 'goals');
  let cursor = map[dateKey(new Date())] === 'done' ? new Date() : addDays(new Date(), -1);
  let count = 0;

  while (map[dateKey(cursor)] === 'done') {
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

function getReadMap(tab) {
  if (!state.readStatuses || typeof state.readStatuses !== 'object') {
    state.readStatuses = {};
  }

  const hasNestedTabs = ['goals', 'alcohol', 'nicotine', 'calories'].some((key) => {
    const value = state.readStatuses[key];
    return value && typeof value === 'object' && !Array.isArray(value);
  });

  if (!hasNestedTabs) {
    const legacy = state.readStatuses || {};
    state.readStatuses = {
      goals: { ...legacy },
      alcohol: {},
      nicotine: {},
      calories: {},
    };
  }

  if (!state.readStatuses[tab] || typeof state.readStatuses[tab] !== 'object') {
    state.readStatuses[tab] = {};
  }

  return state.readStatuses[tab];
}

function isTodayReadDeadlinePassed() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return hours > 23 || (hours === 23 && minutes >= 59);
}

function readSavedStateAtBoot() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function loadState(savedState = readSavedStateAtBoot()) {
  if (!savedState) {
    return normalizeState();
  }

  return normalizeState(savedState);
}

function isStarterLocalState(value = {}) {
  const items = Array.isArray(value.items) ? value.items : [];
  const boardItems = Array.isArray(value.boardItems) ? value.boardItems : [];
  if (boardItems.length) return false;

  const starterTitles = defaults.map((item) => `${item.type}:${item.title}`).sort();
  const savedTitles = items.map((item) => `${item.type}:${item.title}`).sort();
  return starterTitles.length === savedTitles.length
    && starterTitles.every((title, index) => title === savedTitles[index]);
}

function getNormalizedFontSizes(value = {}) {
  const normalize = (size) => ['10', '12', '14'].includes(String(size)) ? String(size) : '12';
  return {
    goals: normalize(value.goals),
    rules: normalize(value.rules),
    strategy: normalize(value.strategy),
    board: normalize(value.board),
  };
}

function sortByOrder(items) {
  return [...items].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

function upsertAtPosition(items, nextItem, requestedPosition, scopePredicate = null) {
  const withoutCurrent = items.filter((item) => item.id !== nextItem.id);
  const scoped = sortByOrder(withoutCurrent.filter((item) => (scopePredicate ? scopePredicate(item) : true)));
  const unscoped = withoutCurrent.filter((item) => !(scopePredicate ? scopePredicate(item) : true));
  const insertIndex = Math.min(Math.max(requestedPosition - 1, 0), scoped.length);
  const reorderedScoped = [...scoped];
  reorderedScoped.splice(insertIndex, 0, nextItem);
  const normalizedScoped = reorderedScoped.map((item, index) => ({ ...item, order: index + 1 }));
  return [...unscoped, ...normalizedScoped];
}

function normalizeScopedOrder(items, scopePredicate = null) {
  const scoped = sortByOrder(items.filter((item) => (scopePredicate ? scopePredicate(item) : true)));
  const unscoped = items.filter((item) => !(scopePredicate ? scopePredicate(item) : true));
  return [...unscoped, ...scoped.map((item, index) => ({ ...item, order: index + 1 }))];
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(storageKey, JSON.stringify(state));
  scheduleCloudSync();
}

function iconForGoal(title) {
  const text = title.toLowerCase();
  if (text.includes('вага') || text.includes('спорт')) return 'dumbbell';
  if (text.includes('солод') || text.includes('не ')) return 'ban';
  return 'target';
}

function iconForRule(title) {
  const text = title.toLowerCase();
  if (text.includes('трен')) return 'shield';
  if (text.includes('їсти') || text.includes('сміт')) return 'leaf';
  if (text.includes('час')) return 'clock';
  return 'calendar';
}

function iconForStrategy(title) {
  const text = title.toLowerCase();
  if (text.includes('вага') || text.includes('спорт')) return 'dumbbell';
  if (text.includes('час') || text.includes('план')) return 'clock';
  if (text.includes('їсти') || text.includes('не ')) return 'ban';
  return 'target';
}

function iconForType(type, title) {
  if (type === 'board') return 'calendar';
  if (type === 'rules') return iconForRule(title);
  if (type === 'strategy') return iconForStrategy(title);
  return iconForGoal(title);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function t(key) {
  return copy[key] ?? key;
}

function initSupabaseSync() {
  const config = window.TRACKER_SUPABASE || {};
  if (window.location.protocol === 'file:') {
    showAuthScreen();
    setSyncStatus(t('syncNeedHttp'));
    if (els.authMessage) els.authMessage.textContent = t('syncNeedHttp');
    updateAuthUi();
    return;
  }
  if (!config.url || !config.anonKey || !window.supabase?.createClient) {
    showAppShell();
    setSyncStatus(t('syncLocal'));
    updateAuthUi();
    return;
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  setupAuth();
}

async function setupAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    await handleSession(data.session);
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });
  } catch (error) {
    console.warn('Supabase auth init failed', error);
    showAuthScreen();
    setSyncStatus(humanizeSupabaseError(error));
  }
}

async function handleSession(session) {
  currentUser = session?.user || null;
  updateAuthUi();

  if (!currentUser) {
    showAuthScreen();
    setSyncStatus(t('syncNeedsLogin'));
    return;
  }

  showAppShell();
  setSyncStatus(t('syncLoading'));
  await hydrateFromCloud();
}

async function authLogin() {
  if (!supabaseClient) {
    setSyncStatus(t('syncLocal'));
    return;
  }

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (els.authMessage) els.authMessage.textContent = '';

  if (!email || !password) {
    if (els.authMessage) els.authMessage.textContent = t('authNeedCredentials');
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    const message = `${t('authLoginError')}: ${error.message}`;
    if (els.authMessage) els.authMessage.textContent = message;
    setSyncStatus(humanizeSupabaseError(error));
  }
}

async function hydrateFromCloud() {
  const config = getSupabaseConfig();
  if (!supabaseClient || !currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from(config.table)
      .select('state, updated_at')
      .eq('id', config.rowId)
      .maybeSingle();

    if (error) throw error;

    lastRemoteUpdatedAt = data?.state?.updatedAt || data?.updated_at || null;

    const remoteUpdatedAt = data?.state?.updatedAt || data?.updated_at || null;

    if (data?.state && (shouldPreferRemoteStateAtBoot || isRemoteNewer(remoteUpdatedAt))) {
      isHydratingRemote = true;
      Object.assign(state, normalizeState(data.state));
      state.activeView = 'board';
      localStorage.setItem(storageKey, JSON.stringify(state));
      isHydratingRemote = false;
      applyTheme();
      applyCopy();
      applyFontSize();
      render();
    } else if (data?.state && isLocalNewer(remoteUpdatedAt)) {
      await syncToCloud();
    } else if (!data) {
      await syncToCloud();
    }

    await restorePhoneBackupFromUrl();
    setSyncStatus(t('syncReady'));
  } catch (error) {
    isHydratingRemote = false;
    console.warn('Supabase sync failed', error);
    setSyncStatus(humanizeSupabaseError(error));
  }
}

async function restorePhoneBackupFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('restore') !== 'phone') return;

  const response = await fetch('restore-phone-state.json?v=41', { cache: 'no-store' });
  if (!response.ok) throw new Error('Restore backup file is unavailable.');

  const restored = normalizeState(await response.json());
  restored.updatedAt = new Date().toISOString();
  Object.assign(state, restored);
  localStorage.setItem(storageKey, JSON.stringify(state));
  applyTheme();
  applyCopy();
  applyFontSize();
  render();
  await syncToCloud();
  setSyncStatus(t('syncSaved'));
}

function scheduleCloudSync() {
  if (!supabaseClient || !currentUser || isHydratingRemote) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToCloud, 600);
}

async function syncToCloud() {
  const config = getSupabaseConfig();
  if (!supabaseClient || !currentUser) return;

  try {
    const { data: remote, error: loadError } = await supabaseClient
      .from(config.table)
      .select('state, updated_at')
      .eq('id', config.rowId)
      .maybeSingle();

    if (loadError) throw loadError;

    const remoteUpdatedAt = remote?.state?.updatedAt || remote?.updated_at || null;
    if (
      remoteUpdatedAt &&
      lastRemoteUpdatedAt &&
      new Date(remoteUpdatedAt).getTime() > new Date(lastRemoteUpdatedAt).getTime()
    ) {
      isHydratingRemote = true;
      Object.assign(state, normalizeState(remote.state));
      state.activeView = 'board';
      lastRemoteUpdatedAt = remoteUpdatedAt;
      localStorage.setItem(storageKey, JSON.stringify(state));
      isHydratingRemote = false;
      applyTheme();
      applyCopy();
      applyFontSize();
      render();
      setSyncStatus(t('syncLoading'));
      return;
    }

    const nextUpdatedAt = new Date().toISOString();
    state.updatedAt = nextUpdatedAt;
    localStorage.setItem(storageKey, JSON.stringify(state));

    const payload = {
      id: config.rowId,
      state: sanitizeStateForCloud(state),
      updated_at: nextUpdatedAt,
    };
    const { error } = await supabaseClient.from(config.table).upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    lastRemoteUpdatedAt = nextUpdatedAt;
    setSyncStatus(t('syncSaved'));
  } catch (error) {
    isHydratingRemote = false;
    console.warn('Supabase save failed', error);
    setSyncStatus(humanizeSupabaseError(error));
  }
}

function getSupabaseConfig() {
  const config = window.TRACKER_SUPABASE || {};
  return {
    table: config.table || 'tracker_state',
    rowId: currentUser?.id || config.rowId || 'main',
  };
}

function updateAuthUi() {
  if (!els.authForm) return;
  const isConfigured = Boolean(supabaseClient);
  els.authScreen.hidden = !isConfigured && !currentUser;
  els.authEmail.disabled = Boolean(currentUser);
  els.authPassword.disabled = Boolean(currentUser);
  els.authLogout.hidden = !currentUser;
  if (currentUser?.email) {
    els.authEmail.value = currentUser.email;
    els.authPassword.value = '';
    if (els.authMessage) els.authMessage.textContent = '';
    setSyncStatus(t('syncLoggedIn'));
  } else {
    if (els.authMessage) els.authMessage.textContent = '';
  }
}

function normalizeState(value = {}) {
  const normalizedItems = structuredClone(value.items || defaults).map((item, index) => ({
    ...item,
    order: item.order ?? index + 1,
  }));
  const normalizedBoardItems = structuredClone(value.boardItems || []).map((item, index) => ({
    ...item,
    order: item.order ?? index + 1,
  }));
  return {
    items: normalizedItems,
    boardItems: normalizedBoardItems,
    activeTab: 'goals',
    statsTab: 'goals',
    activeView: 'board',
    theme: 'dark',
    fontSizes: getNormalizedFontSizes(value.fontSizes || {
      goals: value.fontSize,
      rules: value.fontSize,
      strategy: value.fontSize,
      board: value.fontSize,
    }),
    bedtimeOpens: {},
    readStatuses: value.readStatuses || value.bedtimeOpens || {},
    cryptoDays: {},
    boardChecks: {},
    boardCycleId: '',
    ...value,
  };
}

function sanitizeStateForCloud(value) {
  return {
    items: value.items,
    boardItems: value.boardItems,
    activeTab: value.activeTab,
    statsTab: value.statsTab,
    activeView: value.activeView,
    theme: value.theme,
    fontSizes: getNormalizedFontSizes(value.fontSizes || {
      goals: value.fontSize,
      rules: value.fontSize,
      strategy: value.fontSize,
      board: value.fontSize,
    }),
    bedtimeOpens: value.bedtimeOpens,
    readStatuses: value.readStatuses,
    cryptoDays: value.cryptoDays,
    boardChecks: value.boardChecks,
    boardCycleId: value.boardCycleId,
    updatedAt: value.updatedAt,
  };
}

function isRemoteNewer(remoteUpdatedAt) {
  if (!remoteUpdatedAt) return false;
  if (!state.updatedAt) return true;
  return new Date(remoteUpdatedAt).getTime() > new Date(state.updatedAt).getTime();
}

function isLocalNewer(remoteUpdatedAt) {
  if (!state.updatedAt) return false;
  if (!remoteUpdatedAt) return true;
  return new Date(state.updatedAt).getTime() > new Date(remoteUpdatedAt).getTime();
}

function setSyncStatus(text) {
  if (els.syncStatus) els.syncStatus.textContent = text;
}

function humanizeSupabaseError(error) {
  const message = String(error?.message || error?.error_description || error || '').toLowerCase();
  if (message.includes('redirect') || message.includes('email_redirect_to')) return t('syncInvalidRedirect');
  if (message.includes('email provider') || message.includes('otp') || message.includes('email not confirmed')) return t('syncEmailDisabled');
  if (message.includes('invalid api key') || message.includes('bad request') || message.includes('fetch')) return t('syncBadRequest');
  return t('syncError');
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
