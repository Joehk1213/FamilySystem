const SUPABASE_MODULE_URL = 'https://esm.sh/@supabase/supabase-js@2.118.0';
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const MVP_ROUTES = ['/login', '/today', '/record/new', '/approve', '/chat'];
const root = document.querySelector('#app');

const labels = {
  zh: {
    account: '登入帳戶',
    approve: '審批請求',
    approveAction: '批准',
    approveFailed: '批准失敗',
    approveTitle: '待處理行程修改',
    attachment: '附件',
    attachmentLimit: '每個附件上限 10 MB。',
    backToday: '返回今日行程',
    cancel: '取消',
    changeTitle: '申請修改標題',
    chooseFile: '選擇附件',
    create: '新增記錄',
    createFailed: '無法新增記錄',
    created: '記錄已新增。',
    creating: '正在儲存…',
    date: '開始日期及時間',
    emptyRequests: '目前沒有待處理的修改請求。',
    emptyToday: '今天起沒有可查看的行程。',
    family: '家庭',
    familyScope: '家庭成員',
    fileTooLarge: '附件不可大於 10 MB。',
    helper: 'Worker',
    login: '登入',
    loginFailed: '登入失敗',
    loginIntro: '使用家庭測試帳戶登入。',
    loginPassword: '密碼',
    loginSubmit: '登入',
    loginEmail: '電郵',
    loginPasswordHint: '請使用本機測試帳戶設定的密碼。',
    loading: '正在載入…',
    noMembership: '此帳戶未有家庭成員身份。',
    notAllowed: '此頁面只供 Admin 或 Master 使用。',
    pending: '待批准',
    privateScope: '私人（只限建立者）',
    recordType: '記錄類型',
    reject: '拒絕',
    rejectFailed: '拒絕失敗',
    rejectNote: '拒絕原因（可選）',
    rejected: '修改請求已拒絕。',
    requestChange: '提交修改請求',
    requestFailed: '修改請求未能提交',
    requestSubmitted: '修改請求已提交。',
    role: '角色',
    save: '儲存',
    signOut: '登出',
    signedOut: '未登入',
    statusDisabled: '帳戶已停用',
    statusPending: '帳戶待批准',
    submit: '儲存記錄',
    title: '標題',
    today: '今日行程',
    typeDiary: '生活日記',
    typePhoto: '相片記錄',
    typeSchedule: '行程',
    visibility: '可見範圍',
    visibleRecord: '記錄',
    familyNameFallback: '家庭日曆',
    dateUnavailable: '日期未設定',
    changedBy: '申請人',
    version: '版本',
    staleRequest: '記錄版本已更新，請核對最新記錄後再決定。',
    recordNotFound: '原記錄目前無法查看。',
    changeRequestTitle: '修改標題',
    requestInputHint: '輸入建議的新標題',
    uploadFailed: '記錄已新增，但附件上載失敗',
    statusActive: '已登入',
    permissionDenied: '權限遭拒（可能由 RLS 規則阻止）',
    requestLoading: '正在提交…',
    navToday: '今日',
    navCreate: '新增記錄',
    navChat: '家庭記憶',
    note: '審批備註',
  },
  en: {
    account: 'Account',
    approve: 'Approvals',
    approveAction: 'Approve',
    approveFailed: 'Approval failed',
    approveTitle: 'Pending schedule changes',
    attachment: 'Attachments',
    attachmentLimit: 'Maximum size per file: 10 MB.',
    backToday: 'Back to today',
    cancel: 'Cancel',
    changeTitle: 'Request a title change',
    chooseFile: 'Choose attachments',
    create: 'Create record',
    createFailed: 'Could not create the record',
    created: 'Record created.',
    creating: 'Saving…',
    date: 'Start date and time',
    emptyRequests: 'There are no pending change requests.',
    emptyToday: 'No readable events from today onward.',
    family: 'Family',
    familyScope: 'Family',
    fileTooLarge: 'Each attachment must be 10 MB or smaller.',
    helper: 'Worker',
    login: 'Sign in',
    loginFailed: 'Sign-in failed',
    loginIntro: 'Sign in with a fictional family test account.',
    loginPassword: 'Password',
    loginSubmit: 'Sign in',
    loginEmail: 'Email',
    loginPasswordHint: 'Use the password configured for local test accounts.',
    loading: 'Loading…',
    noMembership: 'This account does not have a family membership.',
    notAllowed: 'This page is only available to Admin and Master members.',
    pending: 'Pending',
    privateScope: 'Private (creator only)',
    recordType: 'Record type',
    reject: 'Reject',
    rejectFailed: 'Rejection failed',
    rejectNote: 'Rejection note (optional)',
    rejected: 'The change request was rejected.',
    requestChange: 'Submit change request',
    requestFailed: 'Could not submit the change request',
    requestSubmitted: 'Change request submitted.',
    role: 'Role',
    save: 'Save',
    signOut: 'Sign out',
    signedOut: 'Signed out',
    statusDisabled: 'Account disabled',
    statusPending: 'Membership pending',
    submit: 'Save record',
    title: 'Title',
    today: 'Today',
    typeDiary: 'Diary',
    typePhoto: 'Photo',
    typeSchedule: 'Schedule',
    visibility: 'Visibility',
    visibleRecord: 'Record',
    familyNameFallback: 'Family Calendar',
    dateUnavailable: 'Date unavailable',
    changedBy: 'Requested by',
    version: 'Version',
    staleRequest: 'The record has changed. Review the latest record before deciding.',
    recordNotFound: 'The original record is not currently readable.',
    changeRequestTitle: 'Title change',
    requestInputHint: 'Enter the suggested title',
    uploadFailed: 'Record created, but an attachment upload failed',
    statusActive: 'Signed in',
    requestLoading: 'Submitting…',
    navToday: 'Today',
    navCreate: 'New record',
    navChat: 'Family Memory',
    note: 'Decision note',
  },
};

let supabase;
let appConfig;
let currentUser;
let membership;
let family;
let language = 'zh';

function t(key) {
  return labels[language][key] || key;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function setLanguage() {
  language = membership?.role === 'worker' || membership?.requested_role === 'worker'
    ? 'en'
    : 'zh';
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-HK';
  document.title = language === 'en' ? 'Family Calendar' : '家庭日曆';
}

function roleLabel() {
  if (!membership) {
    return currentUser ? t('pending') : t('signedOut');
  }
  if (membership.status === 'pending') {
    return t('statusPending');
  }
  if (membership.status === 'disabled') {
    return t('statusDisabled');
  }
  return membership.role
    ? membership.role.charAt(0).toUpperCase() + membership.role.slice(1)
    : t('pending');
}

function errorMessage(operation, error) {
  const code = String(error?.code || error?.status || '');
  const isPermissionError = ['42501', '401', '403', 'PGRST301'].includes(code);
  const detail = error?.message || String(error);
  return `${operation}: ${isPermissionError ? `${t('permissionDenied')}: ${detail}` : detail}`;
}

function renderShell(content, { page = '', showNav = true, notice = '' } = {}) {
  setLanguage();
  root.className = 'mvp-app';
  root.setAttribute('aria-busy', 'false');
  document.body.classList.add('mvp-pages-active');

  const role = membership?.role;
  const canCreate = ['admin', 'master', 'worker'].includes(role);
  const canApprove = ['admin', 'master'].includes(role);
  const nav = showNav && membership?.status === 'active'
    ? `
      <nav class="mvp-nav" aria-label="${language === 'en' ? 'Main navigation' : '主要導覽'}">
        <a href="/today" ${page === '/today' ? 'aria-current="page"' : ''}>${t('navToday')}</a>
        <a href="/chat" ${page === '/chat' ? 'aria-current="page"' : ''}>${t('navChat')}</a>
        ${canCreate ? `<a href="/record/new" ${page === '/record/new' ? 'aria-current="page"' : ''}>${t('navCreate')}</a>` : ''}
        ${canApprove ? `<a href="/approve" ${page === '/approve' ? 'aria-current="page"' : ''}>${t('approve')}</a>` : ''}
      </nav>
    `
    : '';

  root.innerHTML = `
    <header class="mvp-header">
      <div class="mvp-family-heading">
        <p class="mvp-eyebrow">FAMILY CALENDAR · MVP 1.0</p>
        <h1>${escapeHtml(family?.name || t('familyNameFallback'))}</h1>
        ${currentUser ? `<p>${escapeHtml(currentUser.email || '')}</p>` : ''}
      </div>
      <div class="mvp-user-heading">
        <span class="mvp-role-badge mvp-role-${escapeHtml(role || 'signed-out')}">${escapeHtml(roleLabel())}</span>
        ${currentUser ? `<button class="mvp-button mvp-button-secondary" type="button" data-action="sign-out">${t('signOut')}</button>` : ''}
      </div>
    </header>
    ${nav}
    <div class="mvp-content">
      ${notice ? `<p class="mvp-alert" role="alert">${escapeHtml(notice)}</p>` : ''}
      ${content}
    </div>
  `;

  root.querySelector('[data-action="sign-out"]')?.addEventListener('click', handleSignOut);
}

function renderFatal(error) {
  renderShell(`
    <h2>${language === 'en' ? 'Unable to load this page' : '無法載入頁面'}</h2>
    <p class="mvp-alert" role="alert">${escapeHtml(error.message || String(error))}</p>
    ${currentUser ? '' : `<a class="mvp-button" href="/login">${t('login')}</a>`}
  `, { showNav: false });
}

function renderLogin(notice = '') {
  const accounts = [
    'test.dad@family-calendar.test',
    'test.mom@family-calendar.test',
    'test.helper@family-calendar.test',
    'test.pending@family-calendar.test',
  ];

  if (currentUser) {
    const statusNotice = notice || (
      membership?.status === 'pending'
        ? t('statusPending')
        : membership?.status === 'disabled'
          ? t('statusDisabled')
          : t('noMembership')
    );
    renderShell(`
      <section class="mvp-panel mvp-login-panel">
        <h2>${t('login')}</h2>
        <p>${escapeHtml(statusNotice)}</p>
      </section>
    `, { page: '/login', showNav: false });
    return;
  }

  renderShell(`
    <section class="mvp-panel mvp-login-panel">
      <h2>${t('login')}</h2>
      <p>${t('loginIntro')}</p>
      <form id="login-form" class="mvp-form">
        <label class="mvp-field">
          <span>${t('loginEmail')}</span>
          <input name="email" type="email" autocomplete="username" required>
        </label>
        <label class="mvp-field">
          <span>${t('loginPassword')}</span>
          <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <p class="mvp-hint">${t('loginPasswordHint')}</p>
        <button class="mvp-button" type="submit">${t('loginSubmit')}</button>
      </form>
      <div class="mvp-account-list">
        <strong>${language === 'en' ? 'Test accounts' : '測試帳戶'}</strong>
        ${accounts.map((email) => `
          <button class="mvp-account-chip" type="button" data-email="${email}">${email}</button>
        `).join('')}
      </div>
      <p id="login-message" class="mvp-alert" role="alert" ${notice ? '' : 'hidden'}>${escapeHtml(notice)}</p>
    </section>
  `, { page: '/login', showNav: false });

  root.querySelectorAll('[data-email]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = root.querySelector('[name="email"]');
      input.value = button.dataset.email;
      root.querySelector('[name="password"]').focus();
    });
  });
  root.querySelector('#login-form').addEventListener('submit', handleSignIn);
}

async function handleSignIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const message = root.querySelector('#login-message');
  submitButton.disabled = true;
  submitButton.textContent = language === 'en' ? 'Signing in…' : '正在登入…';
  message.hidden = true;

  try {
    const formData = new FormData(form);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get('email')).trim(),
      password: String(formData.get('password')),
    });
    if (error) {
      throw error;
    }
    window.location.assign('/today');
  } catch (error) {
    message.textContent = errorMessage(t('loginFailed'), error);
    message.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t('loginSubmit');
  }
}

async function handleSignOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    currentUser = null;
    membership = null;
    family = null;
    window.history.replaceState(null, '', '/login');
    renderLogin();
  } catch (error) {
    renderShell('', { notice: errorMessage(t('signOut'), error) });
  }
}

function renderPageLoading(message = t('loading')) {
  renderShell(`<p class="mvp-loading">${escapeHtml(message)}</p>`);
}

function renderTodayPage() {
  renderShell(`
    <section class="family-overview">
      <div class="family-overview-heading">
        <h2>${overviewText('title')}</h2>
        <p>${overviewText('description')}</p>
      </div>
      <div class="family-overview-grid">
        <article class="family-overview-card">
          <h3>${overviewText('events')}</h3>
          <div data-overview-events><p class="mvp-loading">${t('loading')}</p></div>
        </article>
        <article class="family-overview-card">
          <h3>${overviewText('reminders')}</h3>
          <div data-overview-reminders><p class="mvp-loading">${t('loading')}</p></div>
          <form class="family-overview-reminder-form" data-reminder-form>
            <label class="mvp-field">
              <span>${overviewText('reminderTitle')}</span>
              <input name="title" type="text" maxlength="500" required>
            </label>
            <label class="mvp-field">
              <span>${overviewText('dueAt')}</span>
              <input name="dueAt" type="datetime-local" required>
            </label>
            <label class="mvp-field">
              <span>${overviewText('sourceMemory')}</span>
              <select name="sourceMemoryId" data-reminder-source>
                <option value="">${overviewText('noMemory')}</option>
              </select>
            </label>
            <button class="mvp-button" type="submit" data-action="save-reminder">${overviewText('saveReminder')}</button>
            <p class="family-overview-message" data-reminder-message role="status" hidden></p>
          </form>
        </article>
        <article class="family-overview-card">
          <h3>${overviewText('memories')}</h3>
          <div data-overview-memories><p class="mvp-loading">${t('loading')}</p></div>
        </article>
      </div>
    </section>
    <section class="mvp-page-heading">
      <div>
        <h2>${t('today')}</h2>
        <p>${language === 'en'
    ? 'Events from today onward are filtered by your signed-in account and row-level security.'
    : '顯示今日起你有權查看的行程；記錄會按登入身份及資料列權限過濾。'}</p>
      </div>
      ${['admin', 'master', 'worker'].includes(membership.role)
    ? `<a class="mvp-button" href="/record/new">${t('navCreate')}</a>`
    : ''}
    </section>
    <section id="today-records" class="mvp-record-list" aria-live="polite">
      <p class="mvp-loading">${t('loading')}</p>
    </section>
  `, { page: '/today' });
  root.querySelector('[data-reminder-form]')
    .addEventListener('submit', handleReminderSave);
  root.querySelector('[data-overview-reminders]')
    .addEventListener('click', handleReminderToggle);
  loadFamilyOverview();
  loadTodayRecords();
}

function overviewText(key) {
  const text = {
    zh: {
      title: '未來 7 日一目了然',
      description: '只顯示登入帳戶按 RLS 可讀取的行程、提醒及家庭記憶。',
      events: '未來 7 日行程',
      noEvents: '未來 7 日沒有可查看的行程。',
      reminders: '管家提醒',
      noReminders: '目前沒有未完成提醒。',
      reminderTitle: '提醒事項',
      dueAt: '到期時間',
      noDueDate: '未設定到期時間',
      dueIn: '剩餘',
      overdue: '已逾期',
      sourceMemory: '關聯 MEMORY（可選）',
      noMemory: '不關聯記憶',
      saveReminder: '儲存提醒',
      savingReminder: '正在儲存…',
      saveFailed: '無法儲存提醒',
      savedReminder: '提醒已儲存。',
      markDone: '標示完成',
      markOpen: '還原未完成',
      memories: '最近 5 條 MEMORY',
      noMemories: '目前沒有家庭記憶。',
      memorySource: '來源',
      citation: '引用',
      distance: '距離',
      created: '建立時間',
    },
    en: {
      title: 'Next 7 Days at a Glance',
      description: 'Only events, reminders, and memories readable by your signed-in account under RLS are shown.',
      events: 'Events in the Next 7 Days',
      noEvents: 'No readable events in the next 7 days.',
      reminders: 'Housekeeper Reminders',
      noReminders: 'There are no open reminders.',
      reminderTitle: 'Reminder',
      dueAt: 'Due date and time',
      noDueDate: 'No due date set',
      dueIn: 'Due in',
      overdue: 'Overdue',
      sourceMemory: 'Link MEMORY (optional)',
      noMemory: 'No linked memory',
      saveReminder: 'Save reminder',
      savingReminder: 'Saving…',
      saveFailed: 'Could not save the reminder',
      savedReminder: 'Reminder saved.',
      markDone: 'Mark done',
      markOpen: 'Reopen',
      memories: '5 Most Recent MEMORY Items',
      noMemories: 'No family memories have been added.',
      memorySource: 'Source',
      citation: 'Citation',
      distance: 'Distance',
      created: 'Created',
    },
  };
  return text[language][key];
}

function formatRemainingTime(value) {
  const difference = Date.parse(value) - Date.now();
  if (!Number.isFinite(difference)) {
    return overviewText('noDueDate');
  }

  const totalMinutes = Math.max(1, Math.ceil(Math.abs(difference) / 60000));
  let amount;
  let unit;
  if (totalMinutes < 60) {
    amount = totalMinutes;
    unit = language === 'en' ? (amount === 1 ? 'minute' : 'minutes') : '分鐘';
  } else if (totalMinutes < 1440) {
    amount = Math.ceil(totalMinutes / 60);
    unit = language === 'en' ? (amount === 1 ? 'hour' : 'hours') : '小時';
  } else {
    amount = Math.ceil(totalMinutes / 1440);
    unit = language === 'en' ? (amount === 1 ? 'day' : 'days') : '日';
  }

  const duration = `${amount} ${unit}`;
  return difference < 0
    ? `${overviewText('overdue')} ${duration}`
    : `${overviewText('dueIn')} ${duration}`;
}

function renderOverviewError(container, error) {
  container.innerHTML = `<p class="mvp-alert" role="alert">${escapeHtml(error.message || String(error))}</p>`;
}

async function loadFamilyOverview() {
  const eventsBox = root.querySelector('[data-overview-events]');
  const remindersBox = root.querySelector('[data-overview-reminders]');
  const memoriesBox = root.querySelector('[data-overview-memories]');
  if (!eventsBox || !remindersBox || !memoriesBox) {
    return;
  }

  try {
    const timeZone = family.timezone || 'Asia/Hong_Kong';
    const start = localMidnightUtc(timeZone);
    const end = localMidnightUtc(timeZone, 7);
    const [eventsResult, reminders, memories] = await Promise.all([
      supabase
        .from('records')
        .select('id, title, event_start, record_type')
        .eq('family_id', membership.family_id)
        .eq('record_kind', 'plan')
        .eq('status', 'active')
        .gte('event_start', start)
        .lt('event_start', end)
        .order('event_start', { ascending: true }),
      authenticatedApiRequest('/api/reminders/list', 'GET'),
      authenticatedApiRequest('/api/memories/list', 'GET'),
    ]);
    if (eventsResult.error) {
      throw eventsResult.error;
    }

    const openReminders = reminders
      .filter((reminder) => !reminder.is_done)
      .sort((left, right) => {
        const leftDueAt = left.due_at ? Date.parse(left.due_at) : Number.POSITIVE_INFINITY;
        const rightDueAt = right.due_at ? Date.parse(right.due_at) : Number.POSITIVE_INFINITY;
        return leftDueAt - rightDueAt;
      });
    const recentMemories = memories.slice(0, 5);
    const memoriesById = new Map(memories.map((memory) => [memory.id, memory]));
    eventsBox.innerHTML = eventsResult.data.length
      ? `<ul class="family-overview-list">${eventsResult.data.map((record) => `
          <li><span>${escapeHtml(record.title || t('visibleRecord'))}</span>
            <time datetime="${escapeHtml(record.event_start)}">${escapeHtml(formatDate(record.event_start))}</time></li>
        `).join('')}</ul>`
      : `<p class="mvp-empty">${overviewText('noEvents')}</p>`;
    remindersBox.innerHTML = openReminders.length
      ? `<ul class="family-overview-list">${openReminders.map((reminder) => {
        const sourceMemory = memoriesById.get(reminder.source_memory_id);
        const sourceName = sourceMemory
          ? sourceMemory.source_file_name || sourceMemory.source_file
          : null;
        const dueDetails = reminder.due_at
          ? `${escapeHtml(formatDate(reminder.due_at))} · ${escapeHtml(formatRemainingTime(reminder.due_at))}`
          : overviewText('noDueDate');
        const citation = sourceName
          ? `<span class="today-citation" data-today-citation>[${overviewText('citation')}: ${escapeHtml(sourceName)}]</span>`
          : '';
        return `
          <li data-reminder-id="${escapeHtml(reminder.id)}">
            <span class="family-overview-reminder-details">${escapeHtml(reminder.title)}
              <small>${dueDetails}</small>
              ${citation}
            </span>
            <button class="mvp-button mvp-button-secondary" type="button"
              data-toggle-reminder="${escapeHtml(reminder.id)}" data-next-done="true">
              ${overviewText('markDone')}
            </button>
          </li>
        `;
      }).join('')}</ul>`
      : `<p class="mvp-empty">${overviewText('noReminders')}</p>`;
    memoriesBox.innerHTML = recentMemories.length
      ? `<ul class="family-overview-list family-overview-memory-list">${recentMemories.map((memory) => `
          <li>
            <span class="family-overview-memory-content">${escapeHtml(memory.content.slice(0, 180))}</span>
            <span class="today-citation" data-today-citation>[${overviewText('citation')}: ${escapeHtml(memory.source_file_name || memory.source_file || overviewText('memories'))}]</span>
            <small>${overviewText('memorySource')}: ${escapeHtml(memory.source_file_name || memory.source_file || overviewText('memories'))}
              · ${overviewText('created')}: ${escapeHtml(formatDate(memory.created_at || memory.metadata?.created_at))}
              ${Number.isFinite(memory.distance) ? ` · ${overviewText('distance')}: ${Number(memory.distance).toFixed(3)}` : ''}</small>
          </li>
        `).join('')}</ul>`
      : `<p class="mvp-empty">${overviewText('noMemories')}</p>`;

    const sourceSelect = root.querySelector('[data-reminder-source]');
    sourceSelect.innerHTML = `<option value="">${overviewText('noMemory')}</option>${recentMemories.map((memory) => `
      <option value="${escapeHtml(memory.id)}">${escapeHtml(memory.source_file_name || memory.content.slice(0, 55))}</option>
    `).join('')}`;
  } catch (error) {
    renderOverviewError(eventsBox, error);
    renderOverviewError(remindersBox, error);
    renderOverviewError(memoriesBox, error);
  }
}

async function handleReminderSave(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[data-action="save-reminder"]');
  const message = form.querySelector('[data-reminder-message]');
  const formData = new FormData(form);
  const dueAt = formData.get('dueAt');
  button.disabled = true;
  button.textContent = overviewText('savingReminder');
  message.hidden = true;

  try {
    const parsedDueAt = new Date(dueAt);
    if (!dueAt || !Number.isFinite(parsedDueAt.getTime())) {
      throw new Error(overviewText('dueAt'));
    }
    await authenticatedApiRequest('/api/reminders/save', 'POST', {
      title: formData.get('title'),
      dueAt: parsedDueAt.toISOString(),
      sourceMemoryId: formData.get('sourceMemoryId') || null,
    });
    form.reset();
    message.className = 'mvp-success family-overview-message';
    message.textContent = overviewText('savedReminder');
    message.hidden = false;
    await loadFamilyOverview();
  } catch (error) {
    message.className = 'mvp-alert family-overview-message';
    message.textContent = `${overviewText('saveFailed')}: ${error.message || String(error)}`;
    message.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = overviewText('saveReminder');
  }
}

async function handleReminderToggle(event) {
  const button = event.target.closest('[data-toggle-reminder]');
  if (!button) {
    return;
  }
  button.disabled = true;
  try {
    await authenticatedApiRequest('/api/reminders/toggle', 'POST', {
      id: button.dataset.toggleReminder,
      isDone: button.dataset.nextDone === 'true',
    });
    await loadFamilyOverview();
  } catch (error) {
    const item = button.closest('[data-reminder-id]');
    const alert = document.createElement('p');
    alert.className = 'mvp-alert';
    alert.setAttribute('role', 'alert');
    alert.textContent = error.message || String(error);
    item.prepend(alert);
    button.disabled = false;
  }
}

function memoryText(key) {
  const text = {
    zh: {
      title: '家庭記憶',
      description: '只搜尋明確加入的家庭記憶；日曆記錄及私人日記不會自動匯入。',
      privacy: '內容儲存在家庭資料庫，active 家庭成員可按 RLS 權限讀取；此原型沒有端對端或資料庫加密。只用虛構測試資料。',
      history: '記憶紀錄',
      historyEmpty: '尚未加入家庭記憶。',
      historyLoading: '正在載入記憶…',
      input: '輸入問題或要保存的文字',
      placeholder: '例如：測試家庭的虛構活動安排',
      file: '拖放或選取文字／PDF 檔',
      fileHint: '支援 .txt、.md（最多 64 KB）及 PDF（最多 5 MB）；PDF 只擷取內嵌文字，不做 OCR。',
      search: '搜尋記憶',
      save: '保存為家庭記憶',
      searching: '正在搜尋…',
      saving: '正在保存…',
      resultTitle: '搜尋結果',
      resultEmpty: '沒有找到符合的家庭記憶。',
      searchHint: '模型從伺服器本機載入；模型目錄缺失時會使用 feature-hash placeholder，並非 BGE 語義搜尋。',
      saved: '家庭記憶已保存。',
      searched: '搜尋完成。',
      fileLoaded: '文字檔已在本機讀取。',
      fileIngested: '檔案記憶已完成匯入。',
      fileTypeError: '只可加入 .txt、.md 或 PDF 檔；PDF 只擷取內嵌文字，不做 OCR。',
      fileSizeError: '檔案不可大於 64 KB。',
      pdfSizeError: 'PDF 檔不可大於 5 MB。',
      pdfNoText: 'PDF 沒有可擷取的內嵌文字；不支援 OCR，原檔不會上傳。',
      fileReadError: '無法在本機讀取此檔案。',
      fileEmptyError: '檔案沒有可匯入的文字。',
      emptyError: '請輸入文字或選擇文字檔。',
      calendar: '查看日曆與行程',
      source: '來源',
      citation: '引用 MEMORY',
      distance: '距離',
      creator: '建立者 ID',
      createdAt: '建立時間',
      securitySafe: '安全檢查：安全',
      securityBlocked: '安全檢查：已阻擋',
      securityReason: '原因',
      riskScore: '風險分數',
      finalAnswer: '家庭記憶回答',
      verifiedCitation: '已驗證引用',
      answerBlocked: '回答已阻擋',
    },
    en: {
      title: 'Family Memory',
      description: 'Search only memories added here. Calendar records and private diaries are never imported automatically.',
      privacy: 'Stored in the family database and readable by active family members under RLS. This prototype does not provide end-to-end or database encryption. Use fictional test data only.',
      history: 'Memory history',
      historyEmpty: 'No family memories have been added.',
      historyLoading: 'Loading memories…',
      input: 'Enter a question or text to save',
      placeholder: 'For example: a fictional activity plan for the test family',
      file: 'Drop or choose a text or PDF file',
      fileHint: 'Supported: .txt and .md (up to 64 KB), and PDF (up to 5 MB). PDFs are text-extracted locally without OCR.',
      search: 'Search memories',
      save: 'Save as family memory',
      searching: 'Searching…',
      saving: 'Saving…',
      resultTitle: 'Search results',
      resultEmpty: 'No matching family memories were found.',
      searchHint: 'The model loads from the server filesystem. If it is missing, search uses a feature-hash placeholder, not BGE semantic weights.',
      saved: 'Family memory saved.',
      searched: 'Search complete.',
      fileLoaded: 'Text file read locally.',
      fileIngested: 'File memories have been ingested.',
      fileTypeError: 'Only .txt, .md, and PDF files are supported. PDFs are text-extracted locally without OCR.',
      fileSizeError: 'The file must be 64 KB or smaller.',
      pdfSizeError: 'The PDF must be 5 MB or smaller.',
      pdfNoText: 'No embedded text was found in the PDF. OCR is not supported, and the original file is not uploaded.',
      fileReadError: 'Could not read this file locally.',
      fileEmptyError: 'The file has no text to ingest.',
      emptyError: 'Enter text or choose a text file.',
      calendar: 'Open calendar and schedule',
      source: 'Source',
      citation: 'MEMORY CITATION',
      distance: 'Distance',
      creator: 'Creator ID',
      createdAt: 'Created',
      securitySafe: 'Security check: safe',
      securityBlocked: 'Security check: blocked',
      securityReason: 'Reason',
      riskScore: 'Risk score',
      finalAnswer: 'Family memory answer',
      verifiedCitation: 'Citation verified',
      answerBlocked: 'Answer blocked',
    },
  };
  return text[language][key];
}

function renderFamilyChatPage() {
  renderShell(`
    <section class="family-chat-layout">
      <aside class="family-chat-sidebar" aria-label="${language === 'en' ? 'Memory history' : '家庭記憶紀錄'}">
        <div class="family-chat-sidebar-heading">
          <h2>${memoryText('history')}</h2>
          <button class="mvp-button mvp-button-secondary" type="button" data-action="refresh-memories">
            ${language === 'en' ? 'Refresh' : '重新載入'}
          </button>
        </div>
        <div class="family-chat-history" data-memory-history aria-live="polite">
          <p class="mvp-loading">${memoryText('historyLoading')}</p>
        </div>
      </aside>
      <section class="family-chat-main">
        <header class="family-chat-heading">
          <div>
            <h2>${memoryText('title')}</h2>
            <p>${memoryText('description')}</p>
          </div>
          <a class="mvp-button mvp-button-secondary" href="/today">${memoryText('calendar')}</a>
        </header>
        <p class="family-chat-privacy">${memoryText('privacy')}</p>
        <section class="family-chat-results" data-memory-results aria-live="polite">
          <p class="mvp-empty">${memoryText('searchHint')}</p>
        </section>
        <form class="family-chat-composer" data-family-chat-form>
          <label class="mvp-field" for="family-chat-input">
            ${memoryText('input')}
            <textarea id="family-chat-input" data-memory-input maxlength="12000" rows="5"
              placeholder="${memoryText('placeholder')}"></textarea>
          </label>
          <label class="family-chat-drop" data-memory-drop>
            <input type="file" data-memory-file accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf">
            <span class="family-chat-drop-title">${memoryText('file')}</span>
            <span class="family-chat-drop-hint" data-file-hint>${memoryText('fileHint')}</span>
          </label>
          <div class="family-chat-actions">
            <button class="mvp-button" type="submit" data-action="search-memories">${memoryText('search')}</button>
            <button class="mvp-button mvp-button-secondary" type="button" data-action="save-memory">${memoryText('save')}</button>
          </div>
          <p class="family-chat-message" data-memory-message role="status" hidden></p>
        </form>
      </section>
    </section>
  `, { page: '/chat' });

  root.querySelector('[data-action="refresh-memories"]')
    .addEventListener('click', loadMemoryHistory);
  root.querySelector('[data-family-chat-form]')
    .addEventListener('submit', handleMemorySearch);
  root.querySelector('[data-action="save-memory"]')
    .addEventListener('click', handleMemorySave);
  const fileInput = root.querySelector('[data-memory-file]');
  const dropTarget = root.querySelector('[data-memory-drop]');
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
      loadMemoryFile(fileInput.files[0]);
    }
  });
  dropTarget.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropTarget.classList.add('is-dragging');
  });
  dropTarget.addEventListener('dragleave', () => {
    dropTarget.classList.remove('is-dragging');
  });
  dropTarget.addEventListener('drop', (event) => {
    event.preventDefault();
    dropTarget.classList.remove('is-dragging');
    const [file] = event.dataTransfer.files;
    if (file) {
      loadMemoryFile(file);
    }
  });
  loadMemoryHistory();
}

async function authenticatedApiRequest(url, method, body) {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error(t('login'));
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(error.message || 'The family memory service returned an invalid response.');
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'The family memory request failed.');
  }
  return result.data;
}

function showMemoryMessage(message, isError = false) {
  const box = root.querySelector('[data-memory-message]');
  if (!box) {
    return;
  }
  box.className = isError ? 'mvp-alert family-chat-message' : 'mvp-success family-chat-message';
  box.textContent = message;
  box.hidden = false;
}

async function loadMemoryHistory() {
  const history = root.querySelector('[data-memory-history]');
  if (!history) {
    return;
  }
  history.innerHTML = `<p class="mvp-loading">${memoryText('historyLoading')}</p>`;
  try {
    const memories = await authenticatedApiRequest('/api/memories', 'GET');
    if (!memories.length) {
      history.innerHTML = `<p class="mvp-empty">${memoryText('historyEmpty')}</p>`;
      return;
    }
    history.innerHTML = memories.map((memory, index) => `
      <button class="family-memory-item" type="button" data-memory-index="${index}">
        <span>${escapeHtml(memory.source_file_name || memoryText('title'))}</span>
        <span>${escapeHtml(memory.content.slice(0, 110))}</span>
      </button>
    `).join('');
    history.querySelectorAll('[data-memory-index]').forEach((button, index) => {
      button.addEventListener('click', () => {
        root.querySelector('[data-memory-input]').value = memories[index].content;
      });
    });
  } catch (error) {
    history.innerHTML = `<p class="mvp-alert" role="alert">${escapeHtml(error.message)}</p>`;
  }
}

async function extractPdfTextLocally(file) {
  const pdfjs = await import('/vendor/pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: '/vendor/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
    wasmUrl: '/vendor/pdfjs/wasm/',
    isEvalSupported: false,
  });
  try {
    const document = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if (typeof item.str !== 'string') {
            return '';
          }
          return `${item.str}${item.hasEOL ? '\n' : ' '}`;
        })
        .join('')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');
      if (pageText) {
        pages.push(pageText);
      }
      page.cleanup();
    }
    return pages.join('\n');
  } finally {
    await loadingTask.destroy();
  }
}

async function handleMemorySearch(event) {
  event.preventDefault();
  const input = root.querySelector('[data-memory-input]');
  const button = root.querySelector('[data-action="search-memories"]');
  const results = root.querySelector('[data-memory-results]');
  const query = input.value.trim();
  if (!query) {
    showMemoryMessage(memoryText('emptyError'), true);
    return;
  }

  button.disabled = true;
  button.textContent = memoryText('searching');
  results.innerHTML = `<p class="mvp-loading">${memoryText('searching')}</p>`;
  try {
    const data = await authenticatedApiRequest('/api/memories/search', 'POST', {
      query,
    });
    const memories = Array.isArray(data.memories)
      ? data.memories
      : Array.isArray(data.matches) ? data.matches : [];
    const security = data.security || { isSafe: false, reason: 'Missing security result', riskScore: 1 };
    const securityClass = security.isSafe ? 'security-badge-safe' : 'security-badge-blocked';
    const securityLabel = security.isSafe
      ? memoryText('securitySafe')
      : memoryText('securityBlocked');
    const editor = data.editor || { blocked: data.final?.blocked === true };
    const finalAnswer = data.final?.answer
      || editor.final
      || editor.answer
      || memoryText('resultEmpty');
    const finalBlocked = editor.blocked === true;
    const finalBadgeClass = finalBlocked ? 'security-badge-blocked' : 'security-badge-safe';
    const finalBadgeText = finalBlocked
      ? memoryText('answerBlocked')
      : memoryText('verifiedCitation');
    const citations = Array.isArray(data.citations)
      ? data.citations
      : Array.isArray(editor.citations)
        ? editor.citations
        : data.analyst?.citations || [];
    const citationLabels = citations.map((id) => {
      const memory = memories.find((item) => item.id === id);
      return memory?.source_file || memory?.source_file_name || id;
    });
    results.innerHTML = `
        <h3>${memoryText('resultTitle')}</h3>
        <p class="family-chat-search-mode">${escapeHtml(data.embedding?.model || '')} · ${escapeHtml(data.embedding?.mode || '')} · ${escapeHtml(data.embedding?.metric || 'cosine')} · ${escapeHtml(data.embedding?.modelPath || '')}</p>
        <p class="${securityClass}" data-security-status role="status">
          ${securityLabel} · ${memoryText('securityReason')}: ${escapeHtml(security.reason || '')}
          · ${memoryText('riskScore')}: ${Number(security.riskScore || 0).toFixed(2)}
        </p>
        <section class="family-chat-final-answer" aria-label="${memoryText('finalAnswer')}">
          <h4>${memoryText('finalAnswer')}</h4>
          <span class="${finalBadgeClass}">${finalBadgeText}</span>
          <p>${escapeHtml(finalAnswer)}</p>
          ${citationLabels.length ? `<div class="family-chat-final-citations">${citationLabels.map((label) => `
            <span class="memory-citation">${memoryText('citation')}: ${escapeHtml(label)}</span>
          `).join('')}</div>` : ''}
        </section>
        ${memories.length ? memories.slice(0, 5).map((memory) => `
          <article class="family-memory-result" data-memory-citation>
            <div class="family-memory-citation-meta">
              <span class="memory-citation">${memoryText('citation')}</span>
              <span>${memoryText('distance')}: ${Number(memory.distance).toFixed(3)}</span>
            </div>
            <p>${escapeHtml(memory.content)}</p>
            <small>${memoryText('source')}: ${escapeHtml(memory.source_file || memory.source_file_name || memoryText('title'))}
              · ${memoryText('createdAt')}: ${escapeHtml(memory.created_at ? formatDate(memory.created_at) : '')}</small>
          </article>
        `).join('') : `<p class="mvp-empty">${memoryText('resultEmpty')}</p>`}
      `;
    showMemoryMessage(memoryText('searched'));
  } catch (error) {
    results.innerHTML = `<p class="mvp-alert" role="alert">${escapeHtml(error.message)}</p>`;
  } finally {
    button.disabled = false;
    button.textContent = memoryText('search');
  }
}

async function handleMemorySave() {
  const input = root.querySelector('[data-memory-input]');
  const button = root.querySelector('[data-action="save-memory"]');
  const content = input.value.trim();
  if (!content) {
    showMemoryMessage(memoryText('emptyError'), true);
    return;
  }

  button.disabled = true;
  button.textContent = memoryText('saving');
  try {
    await authenticatedApiRequest('/api/memories', 'POST', {
      content,
      sourceFile: root.dataset.memorySource || null,
    });
    root.dataset.memorySource = '';
    root.querySelector('[data-memory-file]').value = '';
    root.querySelector('[data-file-hint]').textContent = memoryText('fileHint');
    input.value = '';
    showMemoryMessage(memoryText('saved'));
    await loadMemoryHistory();
  } catch (error) {
    showMemoryMessage(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = memoryText('save');
  }
}

async function loadMemoryFile(file) {
  if (root.dataset.memoryIngesting === 'true') {
    return;
  }

  const extension = file.name.split('.').pop().toLowerCase();
  const isPdf = extension === 'pdf';
  if (!['txt', 'md', 'pdf'].includes(extension)) {
    showMemoryMessage(memoryText('fileTypeError'), true);
    return;
  }
  const maximumSize = isPdf ? 5 * 1024 * 1024 : 64 * 1024;
  if (file.size > maximumSize) {
    showMemoryMessage(memoryText(isPdf ? 'pdfSizeError' : 'fileSizeError'), true);
    return;
  }

  const fileInput = root.querySelector('[data-memory-file]');
  const fileHint = root.querySelector('[data-file-hint]');
  let chunks = [];
  let ingested = 0;
  root.dataset.memoryIngesting = 'true';
  fileInput.disabled = true;

  try {
    const extractedContent = isPdf
      ? await extractPdfTextLocally(file)
      : await file.text();
    const content = isPdf
      ? extractedContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join('\n')
      : extractedContent;
    const characters = Array.from(content);
    for (let start = 0; start < characters.length; start += 800) {
      const chunk = characters.slice(start, start + 1000).join('').trim();
      if (chunk) {
        chunks.push(chunk);
      }
      if (start + 1000 >= characters.length) {
        break;
      }
    }
    if (!chunks.length) {
      showMemoryMessage(memoryText(isPdf ? 'pdfNoText' : 'fileEmptyError'), true);
      return;
    }

    const localReadMessage = isPdf
      ? language === 'en'
        ? `PDF read locally: ${chunks.length} chunks.`
        : `PDF已在本機讀取 ${chunks.length} 段。`
      : memoryText('fileLoaded');
    fileHint.textContent = `${file.name} · ${localReadMessage}`;
    showMemoryMessage(localReadMessage);

    for (let index = 0; index < chunks.length; index += 1) {
      const result = await authenticatedApiRequest('/api/memories/ingest', 'POST', {
        chunks: [{
          content: chunks[index],
          source_file_name: file.name,
          metadata: {
            chunk_index: index + 1,
            chunk_count: chunks.length,
          },
        }],
      });
      if (result.insertedCount !== 1) {
        throw new Error('The family memory service did not confirm the chunk write.');
      }
      ingested += 1;
      const progress = language === 'en'
        ? `Ingested ${ingested}/${chunks.length} chunks`
        : `已寫入 ${ingested}/${chunks.length} 段`;
      showMemoryMessage(progress);
      fileHint.textContent = `${file.name} · ${progress}`;
    }

    root.dataset.memorySource = '';
    fileInput.value = '';
    showMemoryMessage(`${memoryText('fileIngested')} ${ingested}/${chunks.length}`);
    await loadMemoryHistory();
  } catch (error) {
    console.error('Could not ingest family memory text file:', error);
    const progress = language === 'en'
      ? `Ingested ${ingested}/${chunks.length} chunks before failure.`
      : `失敗前已寫入 ${ingested}/${chunks.length} 段。`;
    showMemoryMessage(`${progress} ${error.message || memoryText('fileReadError')}`, true);
  } finally {
    delete root.dataset.memoryIngesting;
    fileInput.disabled = false;
    fileInput.value = '';
  }
}

function localMidnightUtc(timeZone, dayOffset = 0) {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const date = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const targetWallTime = Date.UTC(
    Number(date.year),
    Number(date.month) - 1,
    Number(date.day) + dayOffset,
  );
  let candidate = targetWallTime;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const localParts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(candidate));
    const local = Object.fromEntries(localParts.map(({ type, value }) => [type, value]));
    const representedWallTime = Date.UTC(
      Number(local.year),
      Number(local.month) - 1,
      Number(local.day),
      Number(local.hour),
      Number(local.minute),
      Number(local.second),
    );
    candidate += targetWallTime - representedWallTime;
  }

  return new Date(candidate).toISOString();
}

async function loadTodayRecords() {
  const list = root.querySelector('#today-records');
  if (!list) {
    return;
  }
  list.innerHTML = `<p class="mvp-loading">${t('loading')}</p>`;

  try {
    const startOfToday = localMidnightUtc(family.timezone || 'Asia/Hong_Kong');
    const records = await authenticatedApiRequest('/api/records', 'GET');
    if (!Array.isArray(records)) {
      throw new Error('The records service returned an invalid response.');
    }
    const data = records
      .filter((record) => new Date(record.event_start) >= new Date(startOfToday))
      .sort((left, right) => new Date(left.event_start) - new Date(right.event_start));

    if (!data.length) {
      list.innerHTML = `<p class="mvp-empty">${t('emptyToday')}</p>`;
      return;
    }

    list.innerHTML = data.map((record) => renderRecordCard(record)).join('');
    attachChangeRequestHandlers(list);
  } catch (error) {
    list.innerHTML = `<p class="mvp-alert" role="alert">${escapeHtml(errorMessage(t('today'), error))}</p>`;
  }
}

function formatDate(value) {
  if (!value) {
    return t('dateUnavailable');
  }
  return new Intl.DateTimeFormat(language === 'en' ? 'en-HK' : 'zh-HK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: family.timezone || 'Asia/Hong_Kong',
  }).format(new Date(value));
}

function renderRecordCard(record) {
  const typeLabel = {
    schedule: t('typeSchedule'),
    diary: t('typeDiary'),
    photo: t('typePhoto'),
  }[record.record_type] || record.record_type;
  const canRequestChange = membership.role === 'worker'
    && record.record_kind === 'plan'
    && record.status === 'active'
    && record.visibility !== 'private';

  return `
    <article class="mvp-panel mvp-record-card" data-record-id="${escapeHtml(record.id)}">
      <div class="mvp-card-meta">
        <span class="mvp-type-badge">${escapeHtml(typeLabel)}</span>
        <span>${escapeHtml(formatDate(record.event_start))}</span>
        ${record.visibility === 'private' ? `<span class="mvp-private-badge">${t('privateScope')}</span>` : ''}
      </div>
      <h3>${escapeHtml(record.title || t('visibleRecord'))}</h3>
      ${record.content ? `<p class="mvp-record-content">${escapeHtml(record.content)}</p>` : ''}
      ${canRequestChange ? `
        <form class="mvp-change-form" data-action="request-change">
          <label class="mvp-field">
            <span>${t('changeTitle')}</span>
            <input name="requested_title" type="text" maxlength="200" placeholder="${t('requestInputHint')}" required>
          </label>
          <button class="mvp-button mvp-button-secondary" type="submit">${t('requestChange')}</button>
        </form>
      ` : ''}
    </article>
  `;
}

function attachChangeRequestHandlers(container) {
  container.querySelectorAll('[data-action="request-change"]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const title = form.querySelector('[name="requested_title"]').value.trim();
      const recordId = form.closest('[data-record-id]').dataset.recordId;
      submit.disabled = true;
      submit.textContent = t('requestLoading');

      try {
        const { data: currentRecord, error: recordError } = await supabase
          .from('records')
          .select('row_version')
          .eq('id', recordId)
          .single();
        if (recordError) {
          throw recordError;
        }
        const { error } = await supabase
          .from('schedule_change_requests')
          .insert({
            family_id: membership.family_id,
            record_id: recordId,
            record_version: currentRecord.row_version,
            requested_changes: { title },
            requested_by: currentUser.id,
          });
        if (error) {
          throw error;
        }
        form.innerHTML = `<p class="mvp-success" role="status">${t('requestSubmitted')}</p>`;
      } catch (error) {
        const message = document.createElement('p');
        message.className = 'mvp-alert';
        message.setAttribute('role', 'alert');
        message.textContent = errorMessage(t('requestFailed'), error);
        form.prepend(message);
      } finally {
        if (form.isConnected && form.querySelector('button[type="submit"]')) {
          const currentButton = form.querySelector('button[type="submit"]');
          currentButton.disabled = false;
          currentButton.textContent = t('requestChange');
        }
      }
    });
  });
}

function renderNewRecordPage() {
  const isWorker = membership.role === 'worker';
  const types = isWorker
    ? [['diary', t('typeDiary')], ['photo', t('typePhoto')]]
    : [
      ['schedule', t('typeSchedule')],
      ['diary', t('typeDiary')],
      ['photo', t('typePhoto')],
    ];

  renderShell(`
    <section class="mvp-page-heading">
      <div>
        <h2>${t('create')}</h2>
        <p>${language === 'en'
    ? 'Records and attachments are saved using your authenticated account and family permissions.'
    : '記錄及附件會以目前登入身份儲存，並由家庭權限規則保護。'}</p>
      </div>
    </section>
    <section class="mvp-panel">
      <form id="record-form" class="mvp-form">
        <label class="mvp-field">
          <span>${t('title')}</span>
          <input name="title" type="text" maxlength="200" required>
        </label>
        <label class="mvp-field">
          <span>${t('date')}</span>
          <input name="event_start" type="datetime-local" required>
        </label>
        <label class="mvp-field">
          <span>${t('recordType')}</span>
          <select name="record_type" required>
            ${types.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
          </select>
        </label>
        <label class="mvp-field">
          <span>${t('visibility')}</span>
          <select name="visibility" required>
            <option value="family">${t('familyScope')}</option>
            <option value="private">${t('privateScope')}</option>
          </select>
        </label>
        <label class="mvp-field">
          <span>${t('attachment')}</span>
          <input name="files" type="file" multiple>
          <span class="mvp-hint">${t('attachmentLimit')}</span>
        </label>
        <p id="record-message" class="mvp-alert" role="alert" hidden></p>
        <p id="record-success" class="mvp-success" role="status" hidden></p>
        <div class="mvp-actions">
          <button class="mvp-button" type="submit">${t('submit')}</button>
          <a class="mvp-button mvp-button-secondary" href="/today">${t('backToday')}</a>
        </div>
      </form>
    </section>
  `, { page: '/record/new' });
  root.querySelector('#record-form').addEventListener('submit', handleCreateRecord);
}

async function apiRequest(path, { file } = {}) {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!data.session) {
    throw new Error(t('login'));
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  };
  const options = { method: 'POST', headers };
  if (file) {
    headers['Content-Type'] = 'application/octet-stream';
    headers['X-File-Name'] = encodeURIComponent(file.name);
    headers['X-File-Type'] = file.type || 'application/octet-stream';
    options.body = file;
  }

  const response = await fetch(path, options);
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(`${t('uploadFailed')}: ${error.message}`);
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || t('uploadFailed'));
  }
  return result.data;
}

async function handleCreateRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const errorBox = form.querySelector('#record-message');
  const successBox = form.querySelector('#record-success');
  const formData = new FormData(form);
  const files = Array.from(form.querySelector('[name="files"]').files || []);
  const oversizedFile = files.find((file) => file.size > ATTACHMENT_MAX_BYTES);

  errorBox.hidden = true;
  successBox.hidden = true;
  if (oversizedFile) {
    errorBox.textContent = `${t('fileTooLarge')} ${oversizedFile.name}`;
    errorBox.hidden = false;
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = t('creating');
  try {
    const recordType = String(formData.get('record_type'));
    const record = await authenticatedApiRequest('/api/records', 'POST', {
      record_kind: recordType === 'schedule' ? 'plan' : 'experience',
      record_type: recordType,
      title: String(formData.get('title')).trim(),
      event_start: new Date(String(formData.get('event_start'))).toISOString(),
      visibility: String(formData.get('visibility')),
    });

    for (const file of files) {
      try {
        await apiRequest(`/api/records/${encodeURIComponent(record.id)}/attachments`, { file });
      } catch (error) {
        throw new Error(`${t('uploadFailed')} (${file.name}): ${error.message}`);
      }
    }

    form.reset();
    successBox.textContent = t('created');
    successBox.hidden = false;
  } catch (error) {
    errorBox.textContent = error.message || t('createFailed');
    errorBox.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t('submit');
  }
}

function renderApprovalPage() {
  renderShell(`
    <section class="mvp-page-heading">
      <div>
        <h2>${t('approveTitle')}</h2>
        <p>${language === 'en'
    ? 'Only Admin and Master members can decide schedule change requests.'
    : '只有 Admin 或 Master 可以處理行程修改請求。'}</p>
      </div>
      <button class="mvp-button mvp-button-secondary" type="button" data-action="refresh-approvals">${language === 'en' ? 'Refresh' : '重新載入'}</button>
    </section>
    <section id="approval-list" class="mvp-record-list" aria-live="polite">
      <p class="mvp-loading">${t('loading')}</p>
    </section>
  `, { page: '/approve' });
  root.querySelector('[data-action="refresh-approvals"]')
    .addEventListener('click', loadApprovals);
  loadApprovals();
}

async function loadApprovals() {
  const list = root.querySelector('#approval-list');
  if (!list) {
    return;
  }
  list.innerHTML = `<p class="mvp-loading">${t('loading')}</p>`;

  try {
    const { data: requests, error } = await supabase
      .from('schedule_change_requests')
      .select('id, record_id, record_version, requested_changes, requested_by, created_at')
      .eq('family_id', membership.family_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) {
      throw error;
    }
    if (!requests.length) {
      list.innerHTML = `<p class="mvp-empty">${t('emptyRequests')}</p>`;
      return;
    }

    const recordIds = [...new Set(requests.map(({ record_id: id }) => id))];
    const { data: records, error: recordError } = await supabase
      .from('records')
      .select('id, title, row_version')
      .in('id', recordIds);
    if (recordError) {
      throw recordError;
    }
    const recordsById = new Map(records.map((record) => [record.id, record]));
    list.innerHTML = requests.map((request) => {
      const record = recordsById.get(request.record_id);
      const changes = request.requested_changes || {};
      const requestedTitle = typeof changes.title === 'string' ? changes.title : '';
      const isStale = record && record.row_version !== request.record_version;
      return `
        <article class="mvp-panel mvp-approval-card" data-request-id="${escapeHtml(request.id)}">
          <div class="mvp-card-meta">
            <span class="mvp-type-badge">${t('pending')}</span>
            <span>${t('changedBy')}: ${escapeHtml(request.requested_by)}</span>
          </div>
          <h3>${escapeHtml(record?.title || t('recordNotFound'))}</h3>
          <p>${t('changeRequestTitle')}: <strong>${escapeHtml(requestedTitle)}</strong></p>
          <p>${t('version')}: ${escapeHtml(request.record_version)}${record ? ` · ${language === 'en' ? 'Current' : '目前'}: ${escapeHtml(record.row_version)}` : ''}</p>
          ${isStale ? `<p class="mvp-alert">${t('staleRequest')}</p>` : ''}
          ${!record ? `<p class="mvp-alert">${t('recordNotFound')}</p>` : ''}
          <label class="mvp-field">
            <span>${t('note')}</span>
            <textarea name="decision_note" rows="2"></textarea>
          </label>
          <div class="mvp-actions">
            <button class="mvp-button" type="button" data-action="approve" ${record ? '' : 'disabled'}>${t('approveAction')}</button>
            <button class="mvp-button mvp-button-danger" type="button" data-action="reject" ${record ? '' : 'disabled'}>${t('reject')}</button>
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-action="approve"], [data-action="reject"]')
      .forEach((button) => button.addEventListener('click', handleDecision));
  } catch (error) {
    list.innerHTML = `<p class="mvp-alert" role="alert">${escapeHtml(errorMessage(t('approveTitle'), error))}</p>`;
  }
}

async function handleDecision(event) {
  const button = event.currentTarget;
  const card = button.closest('[data-request-id]');
  const requestId = card.dataset.requestId;
  const isApprove = button.dataset.action === 'approve';
  const note = card.querySelector('[name="decision_note"]').value.trim();
  const siblingButtons = card.querySelectorAll('button[data-action]');
  siblingButtons.forEach((item) => {
    item.disabled = true;
  });
  button.textContent = language === 'en' ? 'Saving…' : '正在處理…';

  try {
    const { error } = isApprove
      ? await supabase.rpc('approve_schedule_change', { p_request_id: requestId })
      : await supabase.rpc('approve_schedule_change', {
        request_id: requestId,
        approve: false,
        note: note || null,
      });
    if (error) {
      throw error;
    }
    if (!isApprove) {
      card.remove();
      const list = root.querySelector('#approval-list');
      if (!list.querySelector('[data-request-id]')) {
        list.innerHTML = `<p class="mvp-success" role="status">${t('rejected')}</p>`;
      }
    } else {
      await loadApprovals();
    }
  } catch (error) {
    const alert = document.createElement('p');
    alert.className = 'mvp-alert';
    alert.setAttribute('role', 'alert');
    alert.textContent = errorMessage(isApprove ? t('approveFailed') : t('rejectFailed'), error);
    card.prepend(alert);
    siblingButtons.forEach((item) => {
      item.disabled = false;
    });
    button.textContent = isApprove ? t('approveAction') : t('reject');
  }
}

async function loadConfig() {
  const response = await fetch('/api/config', {
    headers: { Accept: 'application/json' },
  });
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(`${language === 'en' ? 'Configuration request failed' : '設定載入失敗'}: ${error.message}`);
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || (language === 'en' ? 'Configuration is unavailable.' : '應用程式設定未能載入。'));
  }
  if (!result.data?.supabaseUrl || !result.data?.supabaseAnonKey || !result.data?.familyId) {
    throw new Error(language === 'en' ? 'Supabase configuration is incomplete.' : 'Supabase 設定不完整。');
  }
  appConfig = result.data;
}

async function loadMembership() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  currentUser = sessionData.session?.user || null;
  if (!currentUser) {
    return;
  }

  const { data, error } = await supabase
    .from('family_members')
    .select('family_id, role, status, requested_role')
    .eq('profile_id', currentUser.id)
    .maybeSingle();
  if (error) {
    throw new Error(errorMessage(language === 'en' ? 'Could not load membership' : '無法載入家庭成員資料', error));
  }
  membership = data;

  if (membership?.status === 'active' && membership.role) {
    if (membership.family_id !== appConfig.familyId) {
      throw new Error(language === 'en' ? 'The active membership does not match the configured family.' : '家庭成員資料與目前家庭設定不符。');
    }
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('id, name, timezone')
      .eq('id', membership.family_id)
      .single();
    if (familyError) {
      throw new Error(errorMessage(language === 'en' ? 'Could not load family details' : '無法載入家庭資料', familyError));
    }
    family = familyData;
  }
}

export async function startMvpPages() {
  if (!MVP_ROUTES.includes(window.location.pathname)) {
    return;
  }

  root.className = 'mvp-app';
  document.body.classList.add('mvp-pages-active');
  try {
    await loadConfig();
    const { createClient } = await import(SUPABASE_MODULE_URL);
    supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
    await loadMembership();
    setLanguage();

    const route = window.location.pathname;
    if (!currentUser) {
      if (route !== '/login') {
        window.location.replace('/login');
        return;
      }
      renderLogin();
      return;
    }
    if (!membership || membership.status !== 'active' || !membership.role) {
      if (route !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
      renderLogin();
      return;
    }
    if (route === '/login') {
      window.location.replace('/today');
      return;
    }
    if (route === '/record/new' && !['admin', 'master', 'worker'].includes(membership.role)) {
      renderShell(`<p class="mvp-alert" role="alert">${t('notAllowed')}</p>`, { page: route });
      return;
    }
    if (route === '/approve' && !['admin', 'master'].includes(membership.role)) {
      renderShell(`<p class="mvp-alert" role="alert">${t('notAllowed')}</p>`, { page: route });
      return;
    }

    if (route === '/chat') {
      renderFamilyChatPage();
    } else if (route === '/today') {
      renderTodayPage();
    } else if (route === '/record/new') {
      renderNewRecordPage();
    } else if (route === '/approve') {
      renderApprovalPage();
    } else {
      renderLogin();
    }
  } catch (error) {
    console.error('Could not initialize MVP pages:', error);
    renderFatal(error);
  }
}
