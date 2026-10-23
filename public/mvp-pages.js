const SUPABASE_MODULE_URL = 'https://esm.sh/@supabase/supabase-js@2.118.0';
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const MVP_ROUTES = ['/login', '/today', '/record/new', '/approve'];
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
  loadTodayRecords();
}

function localMidnightUtc(timeZone) {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const date = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const targetWallTime = Date.UTC(Number(date.year), Number(date.month) - 1, Number(date.day));
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
    const { data, error } = await supabase
      .from('records')
      .select('id, family_id, record_kind, record_type, title, content, event_start, event_end, status, visibility, created_by, row_version')
      .eq('family_id', membership.family_id)
      .gte('event_start', startOfToday)
      .order('event_start', { ascending: true });
    if (error) {
      throw error;
    }

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
    const { data: record, error } = await supabase
      .from('records')
      .insert({
        family_id: membership.family_id,
        record_kind: recordType === 'schedule' ? 'plan' : 'experience',
        record_type: recordType,
        title: String(formData.get('title')).trim(),
        event_start: new Date(String(formData.get('event_start'))).toISOString(),
        visibility: String(formData.get('visibility')),
        created_by: currentUser.id,
      })
      .select('id')
      .single();
    if (error) {
      throw new Error(errorMessage(t('createFailed'), error));
    }

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

    if (route === '/today') {
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
