const SUPABASE_MODULE_URL =
  'https://esm.sh/@supabase/supabase-js@2.118.0';
import {
  hasWeeklyScheduleMarkers,
  hongKongDateTimeFromLocalValue,
  hongKongDateTimeLocalValue,
  parseRecurringSchedule,
} from './recurring-schedule.mjs';
const GOOGLE_ICON =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6c4.51-4.18 7.07-10.33 7.07-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

const translations = {
  zh: {
    brand: '家庭日曆',
    tagline: '一家人的生活記錄',
    footer: 'Family Calendar MVP',
    loading: '正在載入…',
    configError: '無法載入應用程式設定，請聯絡管理員。',
    signedOutTitle: '記錄一家人的每一天',
    signedOutDescription: '使用 Google 帳戶登入家庭日曆。',
    signIn: '使用 Google 登入',
    profileMissing: '帳戶資料尚未準備好，請稍後再試或聯絡管理員。',
    applicationTitle: '申請家庭成員身份',
    applicationDescription: '選擇申請角色。管理員批准前，帳戶不會取得系統權限。',
    roleLabel: '申請角色',
    roleMaster: 'Master（家庭管理者）',
    roleWorker: 'Worker（Helper）',
    roleGuest: 'Guest（訪客）',
    submitApplication: '提交申請',
    signingOut: '正在登出…',
    signOut: '登出',
    pendingTitle: '申請處理中',
    pendingDescription: '你的角色申請已送出。獲批前無法使用家庭日曆功能。',
    checkStatus: '重新檢查申請狀態',
    disabledTitle: '帳戶未獲啟用',
    disabledDescription: '此帳戶目前無法使用家庭日曆功能。請聯絡家庭管理員。',
    invalidMembership: '帳戶角色狀態無效，請聯絡管理員。',
    activeTitle: '登入成功',
    activeDescription: '帳戶已啟用。家庭日曆功能會按你的角色及權限提供。',
    roleValue: '目前角色',
    adminQueueTitle: '待處理角色申請',
    adminQueueDescription: '批准申請會啟用所申請角色；拒絕會將帳戶設為 disabled。',
    masterReadOnly: '你可以查看申請；根據權限規則，只有 Admin 可以批准或拒絕。',
    noApplications: '目前沒有待處理申請。',
    approve: '批准',
    reject: '拒絕',
    requestSubmitted: '申請已提交。',
    requestUpdated: '申請狀態已更新。',
    roleNames: {
      admin: 'Admin',
      master: 'Master',
      worker: 'Worker',
      guest: 'Guest',
    },
    requestForRole: {
      master: 'Master',
      worker: 'Worker',
      guest: 'Guest',
    },
    noFamilyConfigured: '家庭設定尚未完成，請聯絡管理員。',
    loadProfileFailed: '無法讀取帳戶資料。',
    loadMembershipFailed: '無法讀取家庭成員狀態。',
    loadApplicationsFailed: '無法載入待處理申請。',
    actionFailed: '操作失敗，請重試。',
    signOutFailed: '登出失敗，請重試。',
    applicationChanged: '申請已被其他管理員處理，請重新載入。',
    submitFailed: '提交申請失敗，請稍後重試。',
    googleFailed: 'Google 登入失敗，請重試。',
    requestDate: '申請時間',
    pendingBadge: '待處理',
    account: '登入帳戶',
    recordsTitle: '家庭記錄',
    recordsDescription: '只會顯示你目前有權查看的記錄。',
    recordsViewSwitch: '記錄顯示方式',
    listView: '一般動態列表',
    futureSevenDaysView: '未來 7 日',
    futureSevenDaysDescription: '只顯示你目前有權查看、未來七日內仍有效的計劃。',
    futureSevenDaysEmpty: '未來七日沒有有效行程。',
    futureSevenDayHeader: '未來 7 日行程',
    today: '今天',
    tomorrow: '明天',
    weeklyTimetableView: '每週課程表',
    monthlyCalendarView: '月曆',
    monthlyCalendarDescription: '按記錄的實際日期查看計劃；點選日期可預覽當日記錄。',
    calendarPreviousMonth: '上個月',
    calendarNextMonth: '下個月',
    calendarToday: '今天',
    calendarNoEvents: '當日沒有計劃。',
    calendarSelectedDate: '當日計劃',
    calendarAllDay: '全日',
    calendarNoTitle: '未命名計劃',
    calendarCancelled: '已取消',
    weeklyTimetableDescription: '按星期查看可辨識的課程；卡片標示來源記錄，課程文字會保留原樣。',
    weeklyTimetableEmpty: '沒有可顯示的行程記錄。',
    weeklyNoClasses: '沒有識別到課程。',
    weeklyUnassignedTitle: '未能分類到星期的行程',
    weeklyTimeUnspecified: '時間未標示',
    weeklyClassCount: '項',
    noRecords: '目前沒有可查看的記錄。',
    loadRecordsFailed: '無法載入家庭記錄。',
    recordFormTitle: '新增記錄',
    editRecordTitle: '編輯記錄',
    recordFormDescription: '計劃與實際經歷分開保存；Worker 只可新增生活日記或相片記錄。',
    chatTitle: '寫低一件事',
    chatHint: '直接輸入行程或生活片段，也可以貼上文字、加入相片或拖入檔案。',
    chatPlaceholder: '例如：呢個星期六全家去銅鑼灣食飯',
    editChatPlaceholder: '輸入要更新的內容，或加入附件。',
    saveDraftLocally: '確認內容非私人後，才在此瀏覽器保存草稿（未加密）',
    draftStorageFailed: '無法保存本機草稿；請先複製內容，以免遺失。',
    chatSend: '整理預覽',
    chatParsing: '正在解析本機規則…',
    recurringImportTitle: '每週課表展開設定',
    recurringFirstMonday: '首週星期一',
    recurringWeeks: '展開週數（最多 4 週）',
    recurringReviewWarning: '以下課堂時間按香港時間及課堂語境推定；請逐項核對日期、時間及參與者後再確認。只會生成所選週數內的具體行程。',
    recurringImportUnavailable: '只有 Master 或 Admin 可以匯入行程表。',
    recurringPreviewCount: '筆課堂已展開，請逐項核對。',
    quickChipsLabel: '快速範例',
    quickChipOne: '🗓️ 呢個星期六全家去食飯',
    quickChipTwo: '📝 明天下午2點開會',
    quickChipThree: '🌙 心情記事',
    chatInputLabel: '輸入記錄內容',
    chatDropTitle: '加入相片或附件',
    chatDropHint: '可點擊選擇，或將檔案拖到這裏；每個檔案上限 10 MB。',
    chatFilesSelected: '個檔案已選取',
    localParserNotice: '本機規則式示範解析，不會呼叫 AI 或傳送內容到外部服務；請先核對預覽。',
    previewTitle: '請核對這張記錄卡',
    previewKind: '類別',
    previewTitleLabel: '標題',
    previewContent: '內容',
    previewTime: '時間',
    previewNoEnd: '未提供結束時間',
    previewAllDay: '全天',
    previewVisibility: '可見範圍',
    previewAttachments: '附件',
    previewNoAttachments: '沒有附件',
    previewDateFallback: '內容未能辨識日期；預覽暫以現在時間建立，請確認是否正確。',
    previewStartRequired: '請設定有效的開始日期及時間。',
    previewEndBeforeStart: '結束時間不可早於開始時間。',
    multipleEventsWithFiles: '請先移除附件，或將每個活動分開整理預覽。',
    previewPartialSave: '部分行程已儲存；',
    previewSavedCount: '筆行程已儲存。',
    previewSavedRefreshFailed: '行程已儲存，但畫面更新失敗，請重新載入記錄。',
    previewConfirm: '確認並儲存',
    previewCancel: '返回修改',
    previewPrivateNotice: '私人記錄只限建立者查看。私人日記加密方案仍待確認。',
    chatInputRequired: '請輸入一些內容或加入檔案。',
    chatParseFailed: '無法整理預覽，請修改內容後再試。',
    previewDateInvalid: '解析出的日期無效，請修改輸入內容。',
    previewConfirmFailed: '儲存記錄失敗。',
    previewConfirming: '正在儲存…',
    previewDiscarded: '預覽已清除。',
    fileRemove: '移除',
    localToday: '今天',
    fileUploadPartial: '記錄已儲存，但部分附件上載失敗。',
    recordKind: '記錄類別',
    plan: '計劃',
    experience: '經歷',
    recordType: '記錄類型',
    schedule: '行程',
    diary: '日記',
    photo: '相片',
    receipt: '收據',
    notice: '通知',
    title: '標題',
    content: '內容',
    eventStart: '開始時間',
    eventEnd: '結束時間',
    allDay: '全天',
    allDayHint: '全天記錄的結束時間是不包含的界線。',
    visibility: '可見範圍',
    familyVisibility: '家庭',
    privateVisibility: '私人（只限本人）',
    linkedPlan: '關聯計劃（選填）',
    noLinkedPlan: '不關聯計劃',
    noPlans: '沒有可選的計劃',
    chooseFiles: '選擇附件',
    fileHint: '每個附件上限 10 MB；檔案會存放在 private bucket。',
    createRecord: '新增記錄',
    saveRecord: '儲存修改',
    cancelEdit: '取消編輯',
    edit: '編輯',
    delete: '刪除',
    confirmDelete: '確定刪除此記錄及其附件？此操作無法還原。',
    recordCreated: '記錄已新增。',
    recordUpdated: '記錄已更新。',
    recordDeleted: '記錄及附件已刪除。',
    attachmentsUploaded: '已上載附件',
    attachmentsFailed: '個附件上載失敗。',
    createRecordFailed: '無法新增記錄，請檢查資料或權限。',
    updateRecordFailed: '無法更新記錄，請檢查資料或權限。',
    deleteRecordFailed: '無法刪除記錄，請檢查權限後重試。',
    uploadFailed: '附件上載失敗。',
    plansLoadFailed: '無法載入可關聯的計劃。',
    recordPrivateNotice: '私人記錄只限建立者查看。私人日記加密方案仍待確認。',
    fileList: '附件',
    status: '狀態',
    requestScheduleChange: '申請修改行程',
    scheduleRequestDescription: '只會送出你勾選的欄位；送出時會記錄目前版本，計劃更新後的舊請求不可審批。',
    requestVersion: '目前版本',
    includeField: '申請修改',
    planStatusActive: '計劃中',
    planStatusCancelled: '已取消',
    submitScheduleRequest: '提交修改申請',
    scheduleRequestSubmitted: '行程修改申請已提交。',
    scheduleRequestFailed: '無法提交修改申請。',
    scheduleRequestNoChanges: '請至少勾選一個要修改的欄位。',
    scheduleRequestBadDate: '請輸入有效的開始及結束時間。',
    scheduleRequestBadRange: '結束時間不可早於開始時間。',
    scheduleQueueTitle: '待處理行程修改申請',
    scheduleQueueDescription: '審批會經資料庫函式執行；版本不符或目標不再有效時，資料庫會拒絕。',
    noScheduleRequests: '目前沒有待處理的行程修改申請。',
    scheduleRequester: '申請人',
    scheduleRequestVersion: '申請版本',
    currentRecordVersion: '目前版本',
    requestedChanges: '申請修改內容',
    decisionNote: '審批備註（選填）',
    approveScheduleRequest: '批准修改',
    rejectScheduleRequest: '拒絕修改',
    scheduleRequestApproved: '行程修改已批准並套用。',
    scheduleRequestRejected: '行程修改申請已拒絕。',
    scheduleQueueLoadFailed: '無法載入行程修改申請。',
    scheduleDecisionFailed: '審批失敗；請檢查版本或權限後重試。',
    staleScheduleRequest: '申請提交後計劃已更新；版本鎖定會拒絕處理，請按最新版本重新提出。',
    scheduleTargetUnavailable: '目標計劃目前無法讀取。',
    refreshScheduleQueue: '重新載入申請',
    statusActive: '計劃中',
    statusCancelled: '已取消',
    notAllDay: '非全天',
    recordTypes: {
      schedule: '行程',
      diary: '日記',
      photo: '相片',
      receipt: '收據',
      notice: '通知',
    },
  },
  en: {
    brand: 'Family Calendar',
    tagline: 'A shared family life journal',
    footer: 'Family Calendar MVP',
    loading: 'Loading…',
    configError: 'Could not load app configuration. Please contact an administrator.',
    signedOutTitle: 'Keep your family connected',
    signedOutDescription: 'Sign in to Family Calendar with your Google account.',
    signIn: 'Sign in with Google',
    profileMissing: 'Your account profile is not ready. Try again later or contact an administrator.',
    applicationTitle: 'Request family access',
    applicationDescription: 'Choose a role. Your account has no access until an administrator approves it.',
    roleLabel: 'Requested role',
    roleMaster: 'Master',
    roleWorker: 'Worker',
    roleGuest: 'Guest',
    submitApplication: 'Submit request',
    signingOut: 'Signing out…',
    signOut: 'Sign out',
    pendingTitle: 'Request pending',
    pendingDescription: 'Your role request has been submitted. Family Calendar remains unavailable until approval.',
    checkStatus: 'Check request status',
    disabledTitle: 'Account not enabled',
    disabledDescription: 'This account cannot access Family Calendar. Please contact a family administrator.',
    invalidMembership: 'Your account role is invalid. Please contact an administrator.',
    activeTitle: 'Signed in',
    activeDescription: 'Your account is active. Available features depend on your role and permissions.',
    roleValue: 'Current role',
    adminQueueTitle: 'Pending role requests',
    adminQueueDescription: 'Approving enables the requested role. Rejecting disables the account.',
    masterReadOnly: 'You can view requests. Only an Admin can approve or reject them.',
    noApplications: 'There are no pending requests.',
    approve: 'Approve',
    reject: 'Reject',
    requestSubmitted: 'Your request was submitted.',
    requestUpdated: 'The request status was updated.',
    roleNames: {
      admin: 'Admin',
      master: 'Master',
      worker: 'Worker',
      guest: 'Guest',
    },
    requestForRole: {
      master: 'Master',
      worker: 'Worker',
      guest: 'Guest',
    },
    noFamilyConfigured: 'Family configuration is incomplete. Please contact an administrator.',
    loadProfileFailed: 'Could not load your account profile.',
    loadMembershipFailed: 'Could not load your family membership.',
    loadApplicationsFailed: 'Could not load pending requests.',
    actionFailed: 'The action failed. Please try again.',
    signOutFailed: 'Sign out failed. Please try again.',
    applicationChanged: 'Another administrator has already handled this request. Refresh and try again.',
    submitFailed: 'Could not submit your request. Please try again.',
    googleFailed: 'Google sign-in failed. Please try again.',
    requestDate: 'Requested',
    pendingBadge: 'Pending',
    account: 'Signed-in account',
    recordsTitle: 'Family records',
    recordsDescription: 'Only records you are allowed to access are shown.',
    recordsViewSwitch: 'Record display mode',
    listView: 'Activity list',
    futureSevenDaysView: 'Next 7 days',
    futureSevenDaysDescription: 'Active plans you are allowed to view over the next seven days.',
    futureSevenDaysEmpty: 'There are no active plans in the next seven days.',
    futureSevenDayHeader: 'Plans for the next 7 days',
    today: 'Today',
    tomorrow: 'Tomorrow',
    weeklyTimetableView: 'Weekly timetable',
    monthlyCalendarView: 'Calendar',
    monthlyCalendarDescription: 'View plans on their recorded dates. Select a day to preview its records.',
    calendarPreviousMonth: 'Previous month',
    calendarNextMonth: 'Next month',
    calendarToday: 'Today',
    calendarNoEvents: 'No plans on this day.',
    calendarSelectedDate: 'Plans for this day',
    calendarAllDay: 'All day',
    calendarNoTitle: 'Untitled plan',
    calendarCancelled: 'Cancelled',
    weeklyTimetableDescription: 'Browse recognized classes by weekday. Each card shows its source record and preserves the original class text.',
    weeklyTimetableEmpty: 'There are no schedule records to display.',
    weeklyNoClasses: 'No classes identified.',
    weeklyUnassignedTitle: 'Schedule lines without a recognized weekday',
    weeklyTimeUnspecified: 'Time not specified',
    weeklyClassCount: 'items',
    noRecords: 'There are no records you can view yet.',
    loadRecordsFailed: 'Could not load family records.',
    recordFormTitle: 'Create a record',
    editRecordTitle: 'Edit record',
    recordFormDescription: 'Plans and experiences are stored separately. Workers can create diary and photo experiences only.',
    chatTitle: 'Capture a moment',
    chatHint: 'Describe a plan or memory, paste text, add photos, or drop files here.',
    chatPlaceholder: 'For example: Family dinner in Causeway Bay this Saturday',
    editChatPlaceholder: 'Describe what to update or add attachments.',
    saveDraftLocally: 'Save this draft in this browser only after confirming it is non-private (unencrypted)',
    draftStorageFailed: 'Could not save the local draft. Copy your text to avoid losing it.',
    chatSend: 'Prepare preview',
    chatParsing: 'Parsing with local rules…',
    recurringImportTitle: 'Weekly timetable expansion',
    recurringFirstMonday: 'First Monday',
    recurringWeeks: 'Weeks to expand (up to 4)',
    recurringReviewWarning: 'Times were inferred from the class context in Hong Kong time. Review every date, time, and participant before confirming. Only concrete events within the selected weeks will be created.',
    recurringImportUnavailable: 'Only a Master or Admin can import schedules.',
    recurringPreviewCount: 'classes expanded. Review each one.',
    quickChipsLabel: 'Quick examples',
    quickChipOne: '🗓️ Family dinner this Saturday',
    quickChipTwo: '📝 Meeting tomorrow at 2pm',
    quickChipThree: '🌙 Mood note',
    chatInputLabel: 'Describe your record',
    chatDropTitle: 'Add photos or attachments',
    chatDropHint: 'Choose files or drop them here. Maximum 10 MB per file.',
    chatFilesSelected: 'file(s) selected',
    localParserNotice: 'Local rule-based demo parsing only. No AI service is called and no content is sent externally. Review the preview first.',
    previewTitle: 'Review this record card',
    previewKind: 'Type',
    previewTitleLabel: 'Title',
    previewContent: 'Content',
    previewTime: 'When',
    previewNoEnd: 'No end time provided',
    previewAllDay: 'All day',
    previewVisibility: 'Visibility',
    previewAttachments: 'Attachments',
    previewNoAttachments: 'No attachments',
    previewDateFallback: 'No date was detected. The preview uses the current time; please verify it.',
    previewStartRequired: 'Enter a valid start date and time.',
    previewEndBeforeStart: 'The end time cannot be earlier than the start time.',
    multipleEventsWithFiles: 'Remove attachments or prepare each activity separately.',
    previewPartialSave: 'Some activities were saved;',
    previewSavedCount: 'activities saved.',
    previewSavedRefreshFailed: 'Activities were saved, but the view could not refresh. Reload your records.',
    previewConfirm: 'Confirm and save',
    previewCancel: 'Edit message',
    previewPrivateNotice: 'Private records are visible only to their creator. Private diary encryption is still undecided.',
    chatInputRequired: 'Enter some text or add a file.',
    chatParseFailed: 'Could not prepare a preview. Edit the message and try again.',
    previewDateInvalid: 'The parsed date is invalid. Please edit the message.',
    previewConfirmFailed: 'Could not save the record.',
    previewConfirming: 'Saving…',
    previewDiscarded: 'Preview cleared.',
    fileRemove: 'Remove',
    localToday: 'Today',
    fileUploadPartial: 'Record saved, but some attachments failed to upload.',
    recordKind: 'Record kind',
    plan: 'Plan',
    experience: 'Experience',
    recordType: 'Record type',
    schedule: 'Schedule',
    diary: 'Diary',
    photo: 'Photo',
    receipt: 'Receipt',
    notice: 'Notice',
    title: 'Title',
    content: 'Content',
    eventStart: 'Start time',
    eventEnd: 'End time',
    allDay: 'All day',
    allDayHint: 'For all-day records, the end time is exclusive.',
    visibility: 'Visibility',
    familyVisibility: 'Family',
    privateVisibility: 'Private (only me)',
    linkedPlan: 'Link to plan (optional)',
    noLinkedPlan: 'No linked plan',
    noPlans: 'No available plans',
    chooseFiles: 'Choose attachments',
    fileHint: 'Maximum 10 MB per file. Files are stored in a private bucket.',
    createRecord: 'Create record',
    saveRecord: 'Save changes',
    cancelEdit: 'Cancel edit',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Delete this record and its attachments? This cannot be undone.',
    recordCreated: 'Record created.',
    recordUpdated: 'Record updated.',
    recordDeleted: 'Record and attachments deleted.',
    attachmentsUploaded: 'Attachments uploaded',
    attachmentsFailed: 'attachment upload(s) failed.',
    createRecordFailed: 'Could not create the record. Check the details or your permissions.',
    updateRecordFailed: 'Could not update the record. Check the details or your permissions.',
    deleteRecordFailed: 'Could not delete the record. Check your permissions and try again.',
    uploadFailed: 'Attachment upload failed.',
    plansLoadFailed: 'Could not load plans to link.',
    recordPrivateNotice: 'Private records are visible only to their creator. Private diary encryption is still undecided.',
    fileList: 'Attachments',
    status: 'Status',
    requestScheduleChange: 'Request a schedule change',
    scheduleRequestDescription: 'Only checked fields are submitted. The current record version is captured; requests for an updated plan cannot be approved.',
    requestVersion: 'Current version',
    includeField: 'Request change',
    planStatusActive: 'Active',
    planStatusCancelled: 'Cancelled',
    submitScheduleRequest: 'Submit change request',
    scheduleRequestSubmitted: 'Schedule change request submitted.',
    scheduleRequestFailed: 'Could not submit the schedule change request.',
    scheduleRequestNoChanges: 'Select at least one field to change.',
    scheduleRequestBadDate: 'Enter a valid start and end time.',
    scheduleRequestBadRange: 'The end time cannot be earlier than the start time.',
    scheduleQueueTitle: 'Pending schedule change requests',
    scheduleQueueDescription: 'Decisions run through the database function. The database rejects stale versions or invalid targets.',
    noScheduleRequests: 'There are no pending schedule change requests.',
    scheduleRequester: 'Requested by',
    scheduleRequestVersion: 'Requested version',
    currentRecordVersion: 'Current version',
    requestedChanges: 'Requested changes',
    decisionNote: 'Decision note (optional)',
    approveScheduleRequest: 'Approve change',
    rejectScheduleRequest: 'Reject change',
    scheduleRequestApproved: 'Schedule change approved and applied.',
    scheduleRequestRejected: 'Schedule change request rejected.',
    scheduleQueueLoadFailed: 'Could not load schedule change requests.',
    scheduleDecisionFailed: 'Decision failed. Check the record version or your permissions and try again.',
    staleScheduleRequest: 'The plan changed after this request. Version locking will reject the decision; submit a new request against the latest version.',
    scheduleTargetUnavailable: 'The target plan is currently unavailable.',
    refreshScheduleQueue: 'Refresh requests',
    statusActive: 'Active',
    statusCancelled: 'Cancelled',
    notAllDay: 'Not all day',
    recordTypes: {
      schedule: 'Schedule',
      diary: 'Diary',
      photo: 'Photo',
      receipt: 'Receipt',
      notice: 'Notice',
    },
  },
};

const appRoot = document.querySelector('#app');
let supabase;
let appConfig;
let currentMembership;
let currentUserId;
let currentLanguage = 'zh';
let routeVersion = 0;
let isSubmitting = false;
let recordsCache = [];
let recordsView = 'list';
let calendarMonth = null;
let selectedCalendarDate = null;
let pendingRecordPreview = null;
let draftStorageWarningShown = false;
const LOCAL_DRAFT_KEY_PREFIX = 'family-calendar:non-private-draft:v1';

function text(key) {
  return translations[currentLanguage][key];
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}

function setLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'zh';
  document.documentElement.lang = currentLanguage === 'en' ? 'en' : 'zh-HK';
  document.title = currentLanguage === 'en' ? 'Family Calendar' : '家庭日曆';

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    const value = translations[currentLanguage][key];

    if (typeof value === 'string') {
      element.textContent = value;
    }
  });
}

function showNotice(message, kind = '') {
  const notice = document.querySelector('#notice');
  if (!notice) {
    return;
  }

  notice.textContent = message;
  notice.className = `notice${kind ? ` notice-${kind}` : ''}`;
  notice.hidden = false;
}

function showLoading(message = translations[currentLanguage].loading) {
  appRoot.classList.remove('dashboard-app');
  appRoot.setAttribute('aria-busy', 'true');
  appRoot.innerHTML = `<p class="loading-message">${escapeHtml(message)}</p>`;
}

function renderSignIn(message = '') {
  appRoot.classList.remove('dashboard-app');
  appRoot.setAttribute('aria-busy', 'false');
  setLanguage('zh');
  appRoot.innerHTML = `
    <div class="auth-panel">
      <span class="auth-icon" aria-hidden="true">${GOOGLE_ICON}</span>
      <p class="eyebrow">FR001 · FR002</p>
      <h1>${text('signedOutTitle')}</h1>
      <p class="description">${text('signedOutDescription')}</p>
      <button id="google-sign-in" class="button button-google" type="button">
        ${GOOGLE_ICON}
        <span>${text('signIn')}</span>
      </button>
      ${message ? `<p class="notice notice-error" role="status">${escapeHtml(message)}</p>` : ''}
    </div>
  `;

  document.querySelector('#google-sign-in').addEventListener('click', signInWithGoogle);
}

function renderRoleApplication(user, profile, message = '', languageOverride) {
  appRoot.classList.remove('dashboard-app');
  appRoot.setAttribute('aria-busy', 'false');
  const language = languageOverride ?? 'zh';
  setLanguage(language);
  appRoot.innerHTML = `
    <p class="eyebrow">FR001</p>
    <h1>${text('applicationTitle')}</h1>
    <p class="description">${text('applicationDescription')}</p>
    <form id="role-application-form">
      <label class="field" for="requested-role">
        <span>${text('roleLabel')}</span>
        <select id="requested-role" name="requested_role" required>
          <option value="master">${text('roleMaster')}</option>
          <option value="worker">${text('roleWorker')}</option>
          <option value="guest">${text('roleGuest')}</option>
        </select>
      </label>
      <div class="button-row">
        <button id="submit-application" class="button" type="submit">${text('submitApplication')}</button>
        <button class="button button-secondary" type="button" data-action="sign-out">${text('signOut')}</button>
      </div>
    </form>
    <p id="notice" class="notice notice-error" role="status" hidden></p>
    <p class="account-line">${text('account')}: ${escapeHtml(user.email)}</p>
  `;

  document.querySelector('#role-application-form').addEventListener('submit', (event) => {
    event.preventDefault();
    submitRoleApplication(user, profile);
  });
  document.querySelector('#requested-role').addEventListener('change', (event) => {
    const requestedRole = event.target.value;
    const languageForRole = requestedRole === 'worker' ? 'en' : 'zh';
    renderRoleApplication(user, profile, '', languageForRole);
    document.querySelector('#requested-role').value = requestedRole;
  });
  document.querySelector('[data-action="sign-out"]').addEventListener('click', signOut);

  if (message) {
    showNotice(message, 'error');
  }
}

function renderPending(user, membership) {
  appRoot.classList.remove('dashboard-app');
  appRoot.setAttribute('aria-busy', 'false');
  const language = membership.requested_role === 'worker' ? 'en' : 'zh';
  setLanguage(language);
  const roleLabel =
    translations[currentLanguage].requestForRole[membership.requested_role] ?? '';

  appRoot.innerHTML = `
    <p class="eyebrow">FR001</p>
    <h1>${text('pendingTitle')}</h1>
    <p class="description">${text('pendingDescription')}</p>
    <p class="notice">${escapeHtml(roleLabel)}</p>
    <div class="button-row">
      <button class="button" type="button" data-action="refresh-status">${text('checkStatus')}</button>
      <button class="button button-secondary" type="button" data-action="sign-out">${text('signOut')}</button>
    </div>
    <p class="account-line">${text('account')}: ${escapeHtml(user.email)}</p>
  `;
  document.querySelector('[data-action="refresh-status"]').addEventListener('click', () => {
    routeUser(user);
  });
  document.querySelector('[data-action="sign-out"]').addEventListener('click', signOut);
}

function renderDisabled(user, membership) {
  appRoot.classList.remove('dashboard-app');
  appRoot.setAttribute('aria-busy', 'false');
  setLanguage(membership.requested_role === 'worker' ? 'en' : 'zh');
  appRoot.innerHTML = `
    <p class="eyebrow">FR001</p>
    <h1>${text('disabledTitle')}</h1>
    <p class="description">${text('disabledDescription')}</p>
    <div class="button-row">
      <button class="button button-secondary" type="button" data-action="sign-out">${text('signOut')}</button>
    </div>
    <p class="account-line">${text('account')}: ${escapeHtml(user.email)}</p>
  `;
  document.querySelector('[data-action="sign-out"]').addEventListener('click', signOut);
}

function renderInvalidMembership(user, membership) {
  appRoot.classList.remove('dashboard-app');
  appRoot.setAttribute('aria-busy', 'false');
  setLanguage(
    membership?.role === 'worker'
      || membership?.requested_role === 'worker'
      ? 'en'
      : 'zh',
  );
  appRoot.innerHTML = `
    <h1>${text('invalidMembership')}</h1>
    <div class="button-row">
      <button class="button button-secondary" type="button" data-action="sign-out">${text('signOut')}</button>
    </div>
    <p class="account-line">${text('account')}: ${escapeHtml(user.email)}</p>
  `;
  document.querySelector('[data-action="sign-out"]').addEventListener('click', signOut);
}

function renderActive(user, membership) {
  appRoot.classList.add('dashboard-app');
  appRoot.setAttribute('aria-busy', 'false');
  const isWorker = membership.role === 'worker';
  const canCreateRecords = ['admin', 'master', 'worker'].includes(membership.role);
  setLanguage(isWorker ? 'en' : 'zh');
  const roleLabel =
    translations[currentLanguage].roleNames[membership.role] ?? membership.role;

  appRoot.innerHTML = `
    <header class="dashboard-header">
      <div class="dashboard-heading">
        <p class="eyebrow">${isWorker ? 'FR011 · HELPER WORKFLOW' : 'FAMILY CALENDAR · MVP'}</p>
        <h1>${text('activeTitle')}</h1>
        <p class="dashboard-subtitle">${text('activeDescription')}</p>
      </div>
      <div class="account-panel">
        <span class="avatar-mark" aria-hidden="true">${escapeHtml((user.email || 'F').slice(0, 1).toUpperCase())}</span>
        <span class="account-details">
          <span class="account-label">${escapeHtml(text('account'))}</span>
          <span class="account-email">${escapeHtml(user.email)}</span>
        </span>
        <span class="badge badge-role badge-${escapeHtml(membership.role)}">${escapeHtml(roleLabel)}</span>
        <button class="button button-secondary sign-out-button" type="button" data-action="sign-out">${text('signOut')}</button>
      </div>
    </header>
    <div class="dashboard-grid">
      <div class="dashboard-main">
        ${canCreateRecords ? '<section id="record-editor" class="dashboard-section dashboard-editor"></section>' : ''}
        <section id="records-list" class="dashboard-section dashboard-records"></section>
      </div>
      ${['admin', 'master'].includes(membership.role) ? `
        <aside class="dashboard-sidebar" aria-label="${escapeHtml(text('scheduleQueueTitle'))}">
          <section id="schedule-change-queue" class="dashboard-section dashboard-queue"></section>
          <section id="approval-queue" class="dashboard-section dashboard-queue"></section>
        </aside>
      ` : ''}
      <p id="notice" class="notice dashboard-notice" role="status" hidden></p>
    </div>
  `;

  document.querySelector('[data-action="sign-out"]').addEventListener('click', signOut);
  recordsCache = [];
  if (canCreateRecords) {
    renderRecordEditor(membership.role);
  }
  loadRecords(membership.role);
  if (['admin', 'master'].includes(membership.role)) {
    loadScheduleChangeQueue(membership.role);
    loadApprovalQueue(membership.role);
  }
}

function localDateTimeValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function getNextMondayDateValue() {
  const date = new Date();
  const daysUntilMonday = (8 - date.getDay()) % 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function recordTypeOptions(kind) {
  const types = kind === 'plan' ? ['schedule'] : ['diary', 'photo', 'receipt', 'notice'];
  return types.map((type) => (
    `<option value="${type}">${escapeHtml(translations[currentLanguage][type])}</option>`
  )).join('');
}

function getLocalDraftKey() {
  const userId = currentUserId;
  const familyId = currentMembership?.family_id;
  if (!userId || !familyId) {
    return null;
  }
  return `${LOCAL_DRAFT_KEY_PREFIX}:${userId}:${familyId}`;
}

function reportLocalDraftStorageError(error) {
  console.error('Could not access local draft storage:', error);
  if (!draftStorageWarningShown) {
    draftStorageWarningShown = true;
    showNotice(text('draftStorageFailed'), 'error');
  }
}

function loadLocalDraft() {
  const key = getLocalDraftKey();
  if (!key) {
    return null;
  }

  try {
    const storedDraft = window.localStorage.getItem(key);
    if (!storedDraft) {
      return null;
    }

    const draft = JSON.parse(storedDraft);
    if (
      draft.version !== 1
      || draft.userId !== currentUserId
      || draft.familyId !== currentMembership.family_id
      || draft.nonPrivate !== true
      || typeof draft.content !== 'string'
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch (error) {
    reportLocalDraftStorageError(error);
    return null;
  }
}

function saveLocalDraft(form) {
  const key = getLocalDraftKey();
  if (!key) {
    return;
  }

  try {
    const consent = form.querySelector('#save-draft-locally');
    if (!consent?.checked) {
      window.localStorage.removeItem(key);
      return;
    }

    const content = form.querySelector('#record-content').value;
    if (!content.trim()) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      userId: currentUserId,
      familyId: currentMembership.family_id,
      nonPrivate: true,
      content,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    reportLocalDraftStorageError(error);
  }
}

function clearLocalDraft() {
  const key = getLocalDraftKey();
  if (!key) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    reportLocalDraftStorageError(error);
  }
}

function renderRecordEditor(role, record = null) {
  const editor = document.querySelector('#record-editor');
  if (!editor) {
    return;
  }

  const isWorker = role === 'worker';
  const initialKind = record?.record_kind || (isWorker ? 'experience' : '');
  const initialType = record?.record_type || (isWorker ? 'diary' : '');
  const localDraft = record ? null : loadLocalDraft();
  pendingRecordPreview = null;

  editor.innerHTML = `
    <div class="chat-heading">
      <div>
        <p class="eyebrow">${isWorker ? 'HELPER WORKFLOW' : 'QUICK CAPTURE'}</p>
        <h2>${escapeHtml(text(record ? 'editRecordTitle' : 'chatTitle'))}</h2>
        <p class="description">${escapeHtml(text('chatHint'))}</p>
      </div>
      <span class="chat-mode-badge">${isWorker ? 'EN' : 'MVP'}</span>
    </div>
    <form id="record-form" data-record-id="${escapeHtml(record?.id || '')}">
      <input id="record-kind" name="record_kind" type="hidden" value="${escapeHtml(initialKind)}">
      <input id="record-type" name="record_type" type="hidden" value="${escapeHtml(initialType)}">
      <input id="record-title" name="title" type="hidden" value="${escapeHtml(record?.title || '')}">
      <input id="event-start" name="event_start" type="hidden" value="${escapeHtml(record?.event_start || '')}">
      <input id="event-end" name="event_end" type="hidden" value="${escapeHtml(record?.event_end || '')}">
      <input id="record-all-day" name="is_all_day" type="checkbox" hidden ${record?.is_all_day ? 'checked' : ''}>
      <input id="record-visibility" name="visibility" type="hidden" value="${escapeHtml(record?.visibility || 'family')}">
      <div id="linked-plan-field" hidden>
        <input id="linked-plan" name="linked_plan_id" type="hidden" value="${escapeHtml(record?.linked_plan_id || '')}">
      </div>
      <div class="chat-composer">
        <label class="sr-only" for="record-content">${escapeHtml(text('chatInputLabel'))}</label>
        ${record ? '' : `<div id="quick-chips" class="quick-chips" role="group" aria-label="${escapeHtml(text('quickChipsLabel'))}"></div>`}
        <textarea
          id="record-content"
          name="content"
          rows="3"
          placeholder="${escapeHtml(text(record ? 'editChatPlaceholder' : 'chatPlaceholder'))}"
          aria-describedby="chat-local-parser-note"
        >${escapeHtml(record?.content || localDraft?.content || '')}</textarea>
        ${record ? '' : `
          <fieldset id="recurring-schedule-options" class="recurring-schedule-options" hidden>
            <legend>${escapeHtml(text('recurringImportTitle'))}</legend>
            <label>
              <span>${escapeHtml(text('recurringFirstMonday'))}</span>
              <input id="recurring-start-date" type="date" value="${getNextMondayDateValue()}" required>
            </label>
            <label>
              <span>${escapeHtml(text('recurringWeeks'))}</span>
              <input id="recurring-weeks" type="number" min="1" max="4" value="4" required>
            </label>
          </fieldset>
        `}
        ${record ? '' : `
          <label class="draft-storage-opt-in">
            <input id="save-draft-locally" type="checkbox" ${localDraft ? 'checked' : ''}>
            <span>${escapeHtml(text('saveDraftLocally'))}</span>
          </label>
        `}
        <div class="chat-compose-footer">
          <div id="chat-drop-zone" class="chat-drop-zone">
            <label class="chat-file-picker" for="record-files">
              <span class="chat-attach-icon" aria-hidden="true">＋</span>
              <span>${escapeHtml(text('chatDropTitle'))}</span>
              <input id="record-files" name="files" type="file" multiple>
            </label>
            <span class="chat-drop-hint">${escapeHtml(text('chatDropHint'))}</span>
          </div>
          <button class="button chat-send-button" type="submit" data-chat-submit>
            <span data-chat-submit-label>${escapeHtml(text('chatSend'))}</span>
            <span class="chat-submit-spinner" data-chat-submit-spinner aria-hidden="true" hidden></span>
            <span data-chat-submit-icon aria-hidden="true">↗</span>
          </button>
        </div>
        <ul id="chat-selected-files" class="chat-selected-files" aria-live="polite"></ul>
      </div>
    </form>
    <p id="chat-local-parser-note" class="chat-privacy-note">${escapeHtml(text('localParserNotice'))}</p>
    <section id="record-preview" class="smart-preview" aria-live="polite" hidden></section>
    ${record ? `<button class="button button-secondary chat-cancel-edit" type="button" data-action="cancel-record-edit">${escapeHtml(text('cancelEdit'))}</button>` : ''}
  `;

  const form = editor.querySelector('#record-form');
  form.addEventListener('submit', (event) => handleRecordSubmit(event, role));
  const recurringOptions = form.querySelector('#recurring-schedule-options');
  const messageInput = form.querySelector('#record-content');
  if (recurringOptions) {
    const updateRecurringOptions = () => {
      const scheduleDetected = hasWeeklyScheduleMarkers(messageInput.value);
      recurringOptions.hidden = !scheduleDetected;
      recurringOptions.disabled = !scheduleDetected;
    };
    messageInput.addEventListener('input', updateRecurringOptions);
    updateRecurringOptions();
  }
  const quickChips = editor.querySelector('#quick-chips');
  if (quickChips) {
    const template = document.querySelector('#quick-chip-template');
    ['quickChipOne', 'quickChipTwo', 'quickChipThree'].forEach((key) => {
      const chip = template.content.firstElementChild.cloneNode(true);
      chip.textContent = text(key);
      chip.addEventListener('click', () => {
        const input = form.querySelector('#record-content');
        input.value = text(key);
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      quickChips.append(chip);
    });
  }
  messageInput.addEventListener('keydown', (event) => {
    if (
      event.key === 'Enter'
      && !event.shiftKey
      && !event.isComposing
      && !event.repeat
    ) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  const fileInput = form.querySelector('#record-files');
  const draftConsent = form.querySelector('#save-draft-locally');
  if (draftConsent) {
    draftConsent.addEventListener('change', () => saveLocalDraft(form));
  }
  const invalidatePreview = () => {
    if (!pendingRecordPreview) {
      return;
    }
    pendingRecordPreview = null;
    editor.querySelector('#record-preview').hidden = true;
  };
  messageInput.addEventListener('input', () => {
    invalidatePreview();
    if (!record) {
      saveLocalDraft(form);
    }
  });
  fileInput.addEventListener('change', () => {
    invalidatePreview();
    renderSelectedFiles(form);
  });
  const dropZone = form.querySelector('#chat-drop-zone');
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave', (event) => {
    if (!dropZone.contains(event.relatedTarget)) {
      dropZone.classList.remove('is-dragging');
    }
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    appendDroppedFiles(fileInput, event.dataTransfer?.files);
    invalidatePreview();
    renderSelectedFiles(form);
  });
  editor.querySelector('#chat-selected-files').addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-file]');
    if (removeButton) {
      removeSelectedFile(fileInput, Number(removeButton.dataset.removeFile));
      invalidatePreview();
      renderSelectedFiles(form);
    }
  });

  const cancelButton = editor.querySelector('[data-action="cancel-record-edit"]');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      renderRecordEditor(role);
    });
  }
}

function appendDroppedFiles(input, droppedFiles) {
  if (!droppedFiles || !droppedFiles.length) {
    return;
  }

  const transfer = new DataTransfer();
  for (const file of input.files) {
    transfer.items.add(file);
  }
  for (const file of droppedFiles) {
    transfer.items.add(file);
  }
  input.files = transfer.files;
}

function removeSelectedFile(input, fileIndex) {
  const transfer = new DataTransfer();
  Array.from(input.files).forEach((file, index) => {
    if (index !== fileIndex) {
      transfer.items.add(file);
    }
  });
  input.files = transfer.files;
}

function renderSelectedFiles(form) {
  const input = form.querySelector('#record-files');
  const list = form.querySelector('#chat-selected-files');
  const files = Array.from(input.files || []);

  list.innerHTML = files.map((file, index) => `
    <li class="chat-file-chip">
      <span class="chat-file-name">${escapeHtml(file.name)}</span>
      <span class="chat-file-size">${escapeHtml(formatFileSize(file.size))}</span>
      <button type="button" class="chat-file-remove" data-remove-file="${index}" aria-label="${escapeHtml(text('fileRemove'))} ${escapeHtml(file.name)}">${escapeHtml(text('fileRemove'))}</button>
    </li>
  `).join('');
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function canEditRecordInUi(record, role, userId) {
  if (record.visibility === 'private') {
    return record.created_by === userId;
  }
  if (['admin', 'master'].includes(role)) {
    return true;
  }
  return role === 'worker'
    && record.created_by === userId
    && record.record_kind === 'experience'
    && ['diary', 'photo'].includes(record.record_type);
}

function renderScheduleChangeRequestForm(record) {
  const statusOptions = [
    `<option value="active" ${record.status === 'active' ? 'selected' : ''}>${escapeHtml(text('planStatusActive'))}</option>`,
    `<option value="cancelled" ${record.status === 'cancelled' ? 'selected' : ''}>${escapeHtml(text('planStatusCancelled'))}</option>`,
  ].join('');

  return `
    <details class="schedule-request">
      <summary>${escapeHtml(text('requestScheduleChange'))}</summary>
      <p class="field-hint">${escapeHtml(text('scheduleRequestDescription'))}</p>
      <p class="field-hint">${escapeHtml(text('requestVersion'))}: ${escapeHtml(record.row_version)}</p>
      <form class="schedule-request-form" data-record-id="${escapeHtml(record.id)}" data-record-version="${escapeHtml(record.row_version)}">
        <label class="change-toggle" for="include-title-${escapeHtml(record.id)}">
          <input id="include-title-${escapeHtml(record.id)}" name="include_title" type="checkbox">
          <span>${escapeHtml(text('includeField'))}: ${escapeHtml(text('title'))}</span>
        </label>
        <input class="change-input" name="title" type="text" value="${escapeHtml(record.title || '')}">
        <label class="change-toggle" for="include-content-${escapeHtml(record.id)}">
          <input id="include-content-${escapeHtml(record.id)}" name="include_content" type="checkbox">
          <span>${escapeHtml(text('includeField'))}: ${escapeHtml(text('content'))}</span>
        </label>
        <textarea class="change-input" name="content" rows="3">${escapeHtml(record.content || '')}</textarea>
        <label class="change-toggle" for="include-start-${escapeHtml(record.id)}">
          <input id="include-start-${escapeHtml(record.id)}" name="include_event_start" type="checkbox">
          <span>${escapeHtml(text('includeField'))}: ${escapeHtml(text('eventStart'))}</span>
        </label>
        <input class="change-input" name="event_start" type="datetime-local" value="${escapeHtml(localDateTimeValue(record.event_start))}">
        <label class="change-toggle" for="include-end-${escapeHtml(record.id)}">
          <input id="include-end-${escapeHtml(record.id)}" name="include_event_end" type="checkbox">
          <span>${escapeHtml(text('includeField'))}: ${escapeHtml(text('eventEnd'))}</span>
        </label>
        <input class="change-input" name="event_end" type="datetime-local" value="${escapeHtml(localDateTimeValue(record.event_end))}">
        <p class="field-hint">${escapeHtml(text('allDayHint'))}</p>
        <label class="change-toggle" for="include-all-day-${escapeHtml(record.id)}">
          <input id="include-all-day-${escapeHtml(record.id)}" name="include_is_all_day" type="checkbox">
          <span>${escapeHtml(text('includeField'))}: ${escapeHtml(text('allDay'))}</span>
        </label>
        <label class="checkbox-field change-value" for="all-day-value-${escapeHtml(record.id)}">
          <input id="all-day-value-${escapeHtml(record.id)}" name="is_all_day" type="checkbox" ${record.is_all_day ? 'checked' : ''}>
          <span>${escapeHtml(text('allDay'))}</span>
        </label>
        <label class="change-toggle" for="include-status-${escapeHtml(record.id)}">
          <input id="include-status-${escapeHtml(record.id)}" name="include_status" type="checkbox">
          <span>${escapeHtml(text('includeField'))}: ${escapeHtml(text('status'))}</span>
        </label>
        <select class="change-input" name="status">${statusOptions}</select>
        <div class="button-row">
          <button class="button" type="submit">${escapeHtml(text('submitScheduleRequest'))}</button>
        </div>
      </form>
    </details>
  `;
}

function getScheduleWeekday(line) {
  const chineseDay = line.match(/(?:星期|週|周|禮拜)\s*([一二三四五六日天])/u);
  if (chineseDay) {
    const dayMap = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 };
    return {
      index: dayMap[chineseDay[1]],
      token: chineseDay[0],
      start: chineseDay.index,
      end: chineseDay.index + chineseDay[0].length,
    };
  }

  const englishDay = line.match(/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i);
  if (!englishDay) {
    return null;
  }

  const dayMap = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
  const index = dayMap[englishDay[1].slice(0, 3).toLowerCase()];
  return {
    index,
    token: englishDay[0],
    start: englishDay.index,
    end: englishDay.index + englishDay[0].length,
  };
}

function parseWeeklyTimetable(records) {
  const days = Array.from({ length: 7 }, () => []);
  const unassigned = [];

  for (const record of records.filter((item) => (
    item.record_kind === 'plan' && item.record_type === 'schedule'
  ))) {
    const lines = (record.content || '').split(/\r?\n/);
    if (lines[0]?.trim() === (record.title || '').trim()) {
      lines.shift();
    }

    let activeDay = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const weekday = getScheduleWeekday(line);
      if (weekday) {
        activeDay = weekday.index;
      }
      if (activeDay === null) {
        unassigned.push({ record, text: line });
        continue;
      }

      const timeMatch = parseTimeMatches(line)
        .map(parseTimeMatch)
        .find((match) => !match.error);
      const personMatch = line.match(/^\s*([\p{L}][^:：]{0,23})[:：]\s*/u);
      const personLabel = personMatch && !getScheduleWeekday(personMatch[1])
        ? personMatch
        : null;
      const removals = [];
      if (personLabel) {
        removals.push({
          start: personLabel.index,
          end: personLabel.index + personLabel[0].length,
        });
      }
      if (weekday) {
        removals.push({ start: weekday.start, end: weekday.end });
      }
      if (timeMatch) {
        removals.push({ start: timeMatch.index, end: timeMatch.end });
      }

      let description = line;
      for (const range of removals.sort((left, right) => right.start - left.start)) {
        description = `${description.slice(0, range.start)} ${description.slice(range.end)}`;
      }
      description = description
        .replace(/^[\s,，、。;；:：\-–—]+|[\s,，、。;；:：\-–—]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (!description && !timeMatch) {
        continue;
      }

      days[activeDay].push({
        record,
        description: description || record.title || text('schedule'),
        person: personLabel?.[1].trim() || null,
        time: timeMatch
          ? { hour: timeMatch.hour, minute: timeMatch.minute }
          : null,
      });
    }
  }

  for (const day of days) {
    day.sort((left, right) => {
      if (!left.time) {
        return right.time ? 1 : 0;
      }
      if (!right.time) {
        return -1;
      }
      return left.time.hour * 60 + left.time.minute
        - (right.time.hour * 60 + right.time.minute);
    });
  }

  return { days, unassigned };
}

function formatScheduleTime(time) {
  if (!time) {
    return text('weeklyTimeUnspecified');
  }
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

function getFutureSevenDayPlans(records, today = new Date()) {
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfWindow = new Date(
    startOfToday.getFullYear(),
    startOfToday.getMonth(),
    startOfToday.getDate() + 7,
  );

  return records
    .filter((record) => {
      if (
        record.record_kind !== 'plan'
        || record.record_type !== 'schedule'
        || record.status !== 'active'
      ) {
        return false;
      }
      const eventStart = new Date(record.event_start);
      return !Number.isNaN(eventStart.getTime())
        && eventStart >= startOfToday
        && eventStart < endOfWindow;
    })
    .sort((left, right) => (
      new Date(left.event_start).getTime() - new Date(right.event_start).getTime()
    ));
}

function renderFutureSevenDays(records, container, role, userId) {
  const upcomingPlans = getFutureSevenDayPlans(records);
  if (!upcomingPlans.length) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(text('futureSevenDaysEmpty'))}</p>`;
    return;
  }

  const today = new Date();
  const dayGroups = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset,
    );
    return {
      date,
      key: calendarDateKey(date),
      records: [],
    };
  });
  const groupsByDate = new Map(dayGroups.map((group) => [group.key, group]));
  for (const record of upcomingPlans) {
    const eventStart = new Date(record.event_start);
    groupsByDate.get(calendarDateKey(eventStart))?.records.push(record);
  }

  const locale = currentLanguage === 'en' ? 'en' : 'zh-HK';
  const todayKey = calendarDateKey(today);
  const tomorrowKey = calendarDateKey(new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  ));
  const dayMarkup = dayGroups.map((group) => {
    const dateLabel = group.key === todayKey
      ? text('today')
      : group.key === tomorrowKey
        ? text('tomorrow')
        : group.date.toLocaleDateString(locale, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
    const recordsMarkup = group.records.length
      ? group.records.map((record) => {
        const canEdit = canEditRecordInUi(record, role, userId);
        const canRequestChange = role === 'worker' && record.visibility !== 'private';
        const people = calendarPersonLabels(record);
        const time = formatCalendarRecordTime(record);
        return `
          <li class="future-plan-item">
            <time class="future-plan-time" datetime="${escapeHtml(record.event_start)}">${escapeHtml(time)}</time>
            <div class="future-plan-details">
              <strong>${escapeHtml(record.title || text('calendarNoTitle'))}</strong>
              ${people.length
                ? `<div class="future-plan-people">${people.map((person) => `<span class="weekly-person-label">${escapeHtml(person)}</span>`).join('')}</div>`
                : ''}
              ${record.content ? `<p>${escapeHtml(record.content)}</p>` : ''}
              ${canRequestChange ? renderScheduleChangeRequestForm(record) : ''}
            </div>
            ${canEdit
              ? `<button class="button button-secondary future-plan-edit" type="button" data-future-edit="${escapeHtml(record.id)}">${escapeHtml(text('edit'))}</button>`
              : ''}
          </li>
        `;
      }).join('')
      : `<li class="future-day-empty">${escapeHtml(text('calendarNoEvents'))}</li>`;

    return `
      <section class="future-day-card${group.key === todayKey ? ' future-day-today' : ''}">
        <header class="future-day-heading">
          <h3>${escapeHtml(dateLabel)}</h3>
          <time datetime="${escapeHtml(group.key)}">${escapeHtml(group.date.toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
          }))}</time>
          <span class="weekly-day-count">${group.records.length}</span>
        </header>
        <ol class="future-day-events">${recordsMarkup}</ol>
      </section>
    `;
  }).join('');

  container.innerHTML = `
    <section class="future-seven-days" aria-label="${escapeHtml(text('futureSevenDayHeader'))}">
      <h3 class="visually-hidden">${escapeHtml(text('futureSevenDayHeader'))}</h3>
      <div class="future-seven-days-grid">${dayMarkup}</div>
    </section>
  `;

  container.querySelectorAll('[data-future-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const record = records.find((item) => item.id === button.dataset.futureEdit);
      if (record) {
        renderRecordEditor(role, record);
        document.querySelector('#record-editor')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  container.querySelectorAll('.schedule-request-form').forEach((form) => {
    form.addEventListener('submit', (event) => submitScheduleChangeRequest(event));
  });
}

function renderWeeklyTimetable(records, container) {
  const scheduleRecords = records.filter((record) => (
    record.record_kind === 'plan' && record.record_type === 'schedule'
  ));
  if (!scheduleRecords.length) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(text('weeklyTimetableEmpty'))}</p>`;
    return;
  }

  const { days, unassigned } = parseWeeklyTimetable(scheduleRecords);
  const grid = document.createElement('div');
  grid.className = 'weekly-timetable-grid';
  grid.setAttribute('aria-label', text('weeklyTimetableView'));

  const dayLabels = currentLanguage === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const template = document.querySelector('#weekly-day-template');

  days.forEach((entries, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector('[data-weekday]').textContent = dayLabels[index];
    card.querySelector('[data-day-count]').textContent =
      `${entries.length} ${text('weeklyClassCount')}`;
    const list = card.querySelector('[data-schedule-items]');
    const empty = card.querySelector('[data-empty-day]');
    if (!entries.length) {
      empty.textContent = text('weeklyNoClasses');
      empty.hidden = false;
    } else {
      list.innerHTML = entries.map((entry) => `
        <li class="weekly-event">
          <time class="weekly-event-time">${escapeHtml(formatScheduleTime(entry.time))}</time>
          <div class="weekly-event-details">
            ${entry.person ? `<span class="weekly-person-label">${escapeHtml(entry.person)}</span>` : ''}
            <strong>${escapeHtml(entry.description)}</strong>
            <span>${escapeHtml(entry.record.title || text('schedule'))}</span>
          </div>
        </li>
      `).join('');
    }
    grid.append(card);
  });

  container.replaceChildren(grid);
  if (unassigned.length) {
    const section = document.createElement('section');
    section.className = 'weekly-unassigned';
    const heading = document.createElement('h3');
    heading.textContent = text('weeklyUnassignedTitle');
    section.append(heading);
    const list = document.createElement('ul');
    list.className = 'weekly-unassigned-list';
    list.innerHTML = unassigned.map((entry) => `
      <li>
        <strong>${escapeHtml(entry.text)}</strong>
        <span>${escapeHtml(entry.record.title || text('schedule'))}</span>
      </li>
    `).join('');
    section.append(list);
    container.append(section);
  }
}

function calendarDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarRecordsForDate(records, date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  return records.filter((record) => {
    if (record.record_kind !== 'plan' || record.record_type !== 'schedule') {
      return false;
    }

    const start = new Date(record.event_start);
    if (Number.isNaN(start.getTime())) {
      return false;
    }
    const end = record.event_end ? new Date(record.event_end) : start;
    if (Number.isNaN(end.getTime())) {
      return calendarDateKey(start) === calendarDateKey(date);
    }
    if (start.getTime() === end.getTime()) {
      return calendarDateKey(start) === calendarDateKey(date);
    }
    return start < dayEnd && end > dayStart;
  });
}

function calendarPersonLabels(record) {
  const labels = new Set();
  for (const line of (record.content || '').split(/\r?\n/)) {
    const match = line.match(/^\s*([\p{L}][\p{L}\p{N} _-]{0,22})\s*[:：]\s*\S/u);
    if (!match) {
      continue;
    }
    const label = match[1].trim();
    if (
      !/^(?:星期|週|周|禮拜|備註|註|note|notes)$/iu.test(label)
      && !getScheduleWeekday(label)
    ) {
      labels.add(label);
    }
  }
  return Array.from(labels);
}

function formatCalendarRecordTime(record) {
  if (record.is_all_day) {
    return text('calendarAllDay');
  }

  const start = new Date(record.event_start);
  if (Number.isNaN(start.getTime())) {
    return '';
  }
  const locale = currentLanguage === 'en' ? 'en' : 'zh-HK';
  const formatTime = (date) => date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const startTime = formatTime(start);
  if (!record.event_end) {
    return startTime;
  }

  const end = new Date(record.event_end);
  if (Number.isNaN(end.getTime()) || calendarDateKey(end) !== calendarDateKey(start)) {
    return startTime;
  }
  return `${startTime}–${formatTime(end)}`;
}

function renderMonthlyCalendar(records, container, role, userId) {
  const now = new Date();
  if (!calendarMonth) {
    calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const currentMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const firstVisibleDate = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1 - currentMonth.getDay(),
  );
  const todayKey = calendarDateKey(now);
  if (!selectedCalendarDate) {
    selectedCalendarDate = todayKey;
  }
  const selectedDate = new Date(`${selectedCalendarDate}T00:00:00`);
  const locale = currentLanguage === 'en' ? 'en' : 'zh-HK';
  const monthTitle = currentMonth.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  const dayLabels = currentLanguage === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['日', '一', '二', '三', '四', '五', '六'];

  container.innerHTML = `
    <section class="monthly-calendar" aria-label="${escapeHtml(text('monthlyCalendarView'))}">
      <header class="calendar-toolbar">
        <button class="button button-secondary" type="button" data-calendar-nav="-1" aria-label="${escapeHtml(text('calendarPreviousMonth'))}">‹</button>
        <h3 class="calendar-month-title" aria-live="polite">${escapeHtml(monthTitle)}</h3>
        <button class="button button-secondary" type="button" data-calendar-nav="1" aria-label="${escapeHtml(text('calendarNextMonth'))}">›</button>
        <button class="button button-secondary calendar-today-button" type="button" data-calendar-today>${escapeHtml(text('calendarToday'))}</button>
      </header>
      <div class="calendar-grid-scroll">
        <div class="calendar-weekday-row" role="row">
          ${dayLabels.map((label) => `<span role="columnheader">${escapeHtml(label)}</span>`).join('')}
        </div>
        <div class="monthly-calendar-grid" role="grid" aria-label="${escapeHtml(monthTitle)}"></div>
      </div>
      <section class="calendar-day-details" aria-live="polite"></section>
    </section>
  `;

  const grid = container.querySelector('.monthly-calendar-grid');
  const template = document.querySelector('#monthly-day-template');
  for (let index = 0; index < 42; index += 1) {
    if (index % 7 === 0) {
      const row = document.createElement('div');
      row.className = 'calendar-week-row';
      row.setAttribute('role', 'row');
      grid.append(row);
    }
    const date = new Date(
      firstVisibleDate.getFullYear(),
      firstVisibleDate.getMonth(),
      firstVisibleDate.getDate() + index,
    );
    const dateKey = calendarDateKey(date);
    const dayRecords = calendarRecordsForDate(records, date);
    const cell = template.content.firstElementChild.cloneNode(true);
    const button = cell.querySelector('[data-calendar-date]');
    button.dataset.calendarDate = dateKey;
    button.setAttribute(
      'aria-label',
      `${date.toLocaleDateString(locale, { dateStyle: 'full' })}, ${dayRecords.length}`,
    );
    button.setAttribute('aria-pressed', String(dateKey === selectedCalendarDate));
    button.querySelector('[data-calendar-day-number]').textContent = String(date.getDate());
    button.querySelector('[data-calendar-day-count]').textContent =
      dayRecords.length ? String(dayRecords.length) : '';
    cell.classList.toggle('calendar-day-outside', date.getMonth() !== currentMonth.getMonth());
    cell.classList.toggle('calendar-day-today', dateKey === todayKey);

    const summaries = button.querySelector('[data-calendar-events]');
    summaries.innerHTML = dayRecords.slice(0, 3).map((record) => {
      const people = calendarPersonLabels(record).join(' / ');
      const time = formatCalendarRecordTime(record);
      const title = record.title || text('calendarNoTitle');
      const summary = [people, time, title].filter(Boolean).join(' ');
      return `<span class="calendar-event-summary">${escapeHtml(summary)}</span>`;
    }).join('');
    if (dayRecords.length > 3) {
      const more = document.createElement('span');
      more.className = 'calendar-event-more';
      more.textContent = `+${dayRecords.length - 3}`;
      summaries.append(more);
    }
    grid.lastElementChild.append(cell);
  }

  const details = container.querySelector('.calendar-day-details');
  const renderSelectedDay = () => {
    const date = new Date(`${selectedCalendarDate}T00:00:00`);
    const dayRecords = calendarRecordsForDate(records, date);
    details.innerHTML = `
      <h4>${escapeHtml(text('calendarSelectedDate'))} · ${escapeHtml(date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }))}</h4>
      ${dayRecords.length ? `
        <ul class="calendar-detail-list">
          ${dayRecords.map((record) => {
            const canEdit = canEditRecordInUi(record, role, userId);
            const people = calendarPersonLabels(record);
            return `
              <li class="calendar-detail-item">
                <div class="calendar-detail-copy">
                  <strong>${escapeHtml(record.title || text('calendarNoTitle'))}</strong>
                  <div class="record-meta">
                    <span class="record-time">${escapeHtml(formatCalendarRecordTime(record))}</span>
                    ${record.status === 'cancelled' ? `<span class="badge badge-status-cancelled">${escapeHtml(text('calendarCancelled'))}</span>` : ''}
                    ${people.map((person) => `<span class="weekly-person-label">${escapeHtml(person)}</span>`).join('')}
                  </div>
                  ${record.content ? `<p>${escapeHtml(record.content)}</p>` : ''}
                </div>
                ${canEdit ? `<button class="button button-secondary" type="button" data-calendar-edit="${escapeHtml(record.id)}">${escapeHtml(text('edit'))}</button>` : ''}
              </li>
            `;
          }).join('')}
        </ul>
      ` : `<p class="calendar-no-events">${escapeHtml(text('calendarNoEvents'))}</p>`}
    `;
    details.querySelectorAll('[data-calendar-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const record = records.find((item) => item.id === button.dataset.calendarEdit);
        if (record) {
          renderRecordEditor(role, record);
          document.querySelector('#record-editor')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  };
  renderSelectedDay();

  grid.querySelectorAll('[data-calendar-date]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCalendarDate = button.dataset.calendarDate;
      const selectedDate = new Date(`${selectedCalendarDate}T00:00:00`);
      if (selectedDate.getMonth() !== calendarMonth.getMonth()) {
        calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        renderMonthlyCalendar(records, container, role, userId);
        return;
      }
      grid.querySelectorAll('[data-calendar-date]').forEach((dayButton) => {
        dayButton.setAttribute('aria-pressed', String(dayButton === button));
      });
      renderSelectedDay();
    });
  });
  container.querySelectorAll('[data-calendar-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      calendarMonth = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + Number(button.dataset.calendarNav),
        1,
      );
      selectedCalendarDate = calendarDateKey(calendarMonth);
      renderMonthlyCalendar(records, container, role, userId);
    });
  });
  container.querySelector('[data-calendar-today]').addEventListener('click', () => {
    calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    selectedCalendarDate = todayKey;
    renderMonthlyCalendar(records, container, role, userId);
  });
}

function renderRecordsList(records, role, userId) {
  const list = document.querySelector('#records-list');
  if (!list) {
    return;
  }

  list.innerHTML = `
    <div class="records-view-heading">
      <div>
        <h2>${escapeHtml(text('recordsTitle'))}</h2>
        <p class="description">${escapeHtml(text('recordsDescription'))}</p>
      </div>
      <div class="records-view-switch" role="group" aria-label="${escapeHtml(text('recordsViewSwitch'))}">
        <button class="button button-secondary" type="button" data-records-view="list" aria-pressed="${recordsView === 'list'}">${escapeHtml(text('listView'))}</button>
        <button class="button button-secondary" type="button" data-records-view="future-seven-days" aria-pressed="${recordsView === 'future-seven-days'}">${escapeHtml(text('futureSevenDaysView'))}</button>
        <button class="button button-secondary" type="button" data-records-view="weekly" aria-pressed="${recordsView === 'weekly'}">${escapeHtml(text('weeklyTimetableView'))}</button>
        <button class="button button-secondary" type="button" data-records-view="monthly" aria-pressed="${recordsView === 'monthly'}">${escapeHtml(text('monthlyCalendarView'))}</button>
      </div>
    </div>
    <p class="weekly-timetable-description" ${recordsView === 'weekly' ? '' : 'hidden'}>${escapeHtml(text('weeklyTimetableDescription'))}</p>
    <p class="weekly-timetable-description" ${recordsView === 'future-seven-days' ? '' : 'hidden'}>${escapeHtml(text('futureSevenDaysDescription'))}</p>
    <p class="weekly-timetable-description" ${recordsView === 'monthly' ? '' : 'hidden'}>${escapeHtml(text('monthlyCalendarDescription'))}</p>
    <div id="records-view-content" class="${recordsView === 'weekly' ? 'records-view-content-weekly' : ''}"></div>
  `;

  list.querySelectorAll('[data-records-view]').forEach((button) => {
    button.addEventListener('click', () => {
      recordsView = button.dataset.recordsView;
      renderRecordsList(recordsCache, role, userId);
    });
  });

  const content = list.querySelector('#records-view-content');
  if (recordsView === 'future-seven-days') {
    renderFutureSevenDays(records, content, role, userId);
    return;
  }
  if (recordsView === 'weekly') {
    renderWeeklyTimetable(records, content);
    return;
  }
  if (recordsView === 'monthly') {
    renderMonthlyCalendar(records, content, role, userId);
    return;
  }

  if (!records.length) {
    content.innerHTML = `<p class="empty-state">${escapeHtml(text('noRecords'))}</p>`;
    return;
  }

  const items = records.map((record) => {
    const canEdit = canEditRecordInUi(record, role, userId);
    const canRequestScheduleChange =
      role === 'worker'
      && record.record_kind === 'plan'
      && record.visibility !== 'private';
    const typeLabel = translations[currentLanguage].recordTypes[record.record_type]
      || record.record_type;
    const eventDate = new Date(record.event_start).toLocaleString(
      currentLanguage === 'en' ? 'en' : 'zh-HK',
    );
    const attachmentNames = record.attachments.map((attachment) => (
      `<li>${escapeHtml(attachment.file_name || attachment.storage_path)}</li>`
    )).join('');
    const attachmentList = attachmentNames
      ? `<div class="record-attachments"><strong>${escapeHtml(text('fileList'))}</strong><ul>${attachmentNames}</ul></div>`
      : '';
    const kindLabel = record.record_kind === 'plan'
      ? text('plan')
      : text('experience');
    const visibilityLabel = record.visibility === 'private'
      ? text('privateVisibility')
      : text('familyVisibility');

    return `
      <li class="record-item">
        <div class="record-details">
          <strong>${escapeHtml(record.title || typeLabel)}</strong>
          <div class="record-meta">
            <span class="badge badge-kind-${escapeHtml(record.record_kind)}">${escapeHtml(kindLabel)}</span>
            <span class="badge badge-type">${escapeHtml(typeLabel)}</span>
            <span class="badge badge-visibility-${escapeHtml(record.visibility)}">${escapeHtml(visibilityLabel)}</span>
            <span class="record-time">${escapeHtml(eventDate)}</span>
          </div>
          ${record.content ? `<p>${escapeHtml(record.content)}</p>` : ''}
          ${attachmentList}
        </div>
        ${canEdit ? `
          <div class="request-actions">
            <button class="button" type="button" data-action="edit-record" data-id="${escapeHtml(record.id)}">${escapeHtml(text('edit'))}</button>
            <button class="button button-danger" type="button" data-action="delete-record" data-id="${escapeHtml(record.id)}">${escapeHtml(text('delete'))}</button>
          </div>
        ` : ''}
        ${canRequestScheduleChange ? renderScheduleChangeRequestForm(record) : ''}
      </li>
    `;
  }).join('');

  content.innerHTML = `<ul class="request-list">${items}</ul>`;

  content.querySelectorAll('[data-action="edit-record"]').forEach((button) => {
    button.addEventListener('click', () => {
      const record = recordsCache.find((item) => item.id === button.dataset.id);
      if (record) {
        renderRecordEditor(role, record);
        document.querySelector('#record-editor')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  content.querySelectorAll('[data-action="delete-record"]').forEach((button) => {
    button.addEventListener('click', () => deleteRecord(button.dataset.id, role));
  });
  content.querySelectorAll('.schedule-request-form').forEach((form) => {
    form.addEventListener('submit', (event) => submitScheduleChangeRequest(event));
  });
}

function makeScheduleChangePayload(form, record) {
  const changes = {};
  const formData = new FormData(form);
  const include = (field) => formData.has(`include_${field}`);

  if (include('title')) {
    changes.title = formData.get('title') || null;
  }
  if (include('content')) {
    changes.content = formData.get('content') || null;
  }
  if (include('event_start')) {
    const value = formData.get('event_start');
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return { error: text('scheduleRequestBadDate') };
    }
    changes.event_start = parsed.toISOString();
  }
  if (include('event_end')) {
    const value = formData.get('event_end');
    if (!value) {
      changes.event_end = null;
    } else {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return { error: text('scheduleRequestBadDate') };
      }
      changes.event_end = parsed.toISOString();
    }
  }
  if (include('is_all_day')) {
    changes.is_all_day = formData.has('is_all_day');
  }
  if (include('status')) {
    const status = formData.get('status');
    if (!['active', 'cancelled'].includes(status)) {
      return { error: text('scheduleRequestFailed') };
    }
    changes.status = status;
  }

  if (!Object.keys(changes).length) {
    return { error: text('scheduleRequestNoChanges') };
  }

  const start = new Date(changes.event_start ?? record.event_start);
  const endValue = Object.hasOwn(changes, 'event_end')
    ? changes.event_end
    : record.event_end;
  const end = endValue === null ? null : new Date(endValue);
  if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
    return { error: text('scheduleRequestBadDate') };
  }
  if (end && end < start) {
    return { error: text('scheduleRequestBadRange') };
  }

  return { changes };
}

async function submitScheduleChangeRequest(event) {
  event.preventDefault();
  if (isSubmitting) {
    return;
  }
  const requestedUserId = currentUserId;
  if (!requestedUserId || currentMembership?.role !== 'worker') {
    return;
  }

  const form = event.currentTarget;
  const record = recordsCache.find((item) => item.id === form.dataset.recordId);
  if (!record || record.record_kind !== 'plan' || record.visibility === 'private') {
    showNotice(text('scheduleRequestFailed'), 'error');
    return;
  }

  const version = Number(form.dataset.recordVersion);
  if (!Number.isInteger(version) || version < 1) {
    showNotice(text('scheduleRequestFailed'), 'error');
    return;
  }

  const requested = makeScheduleChangePayload(form, record);
  if (requested.error) {
    showNotice(requested.error, 'error');
    return;
  }

  isSubmitting = true;
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;

  try {
    const { error } = await supabase
      .from('schedule_change_requests')
      .insert({
        family_id: record.family_id,
        record_id: record.id,
        record_version: version,
        requested_changes: requested.changes,
        requested_by: requestedUserId,
        status: 'pending',
      });

    if (error) {
      throw error;
    }
    if (currentUserId !== requestedUserId || currentMembership?.role !== 'worker') {
      return;
    }

    showNotice(text('scheduleRequestSubmitted'), 'success');
    await loadRecords('worker');
  } catch (error) {
    if (currentUserId !== requestedUserId || currentMembership?.role !== 'worker') {
      return;
    }
    console.error('Failed to submit schedule change request:', error);
    showNotice(`${text('scheduleRequestFailed')} ${error.message}`, 'error');
  } finally {
    isSubmitting = false;
    const currentForm = Array.from(
      document.querySelectorAll('.schedule-request-form'),
    ).find((candidate) => candidate.dataset.recordId === record.id);
    const currentButton = currentForm?.querySelector('[type="submit"]');
    if (currentButton) {
      currentButton.disabled = false;
    }
  }
}

async function apiRequest(path, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error(text('signIn'));
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  let body;
  if (options.file) {
    headers['Content-Type'] = 'application/octet-stream';
    headers['X-File-Name'] = encodeURIComponent(options.file.name);
    headers['X-File-Type'] = options.file.type || 'application/octet-stream';
    body = options.file;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body,
  });
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(text('actionFailed'));
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || text('actionFailed'));
  }
  return result.data;
}

async function loadRecords(role) {
  const requestedUserId = currentUserId;
  let loadSucceeded = false;
  const list = document.querySelector('#records-list');
  if (list) {
    list.innerHTML = `<p class="loading-message">${escapeHtml(text('loading'))}</p>`;
  }

  try {
    const records = await apiRequest('/api/records');
    if (currentUserId !== requestedUserId || currentMembership?.role !== role) {
      return null;
    }
    recordsCache = records;
    renderRecordsList(recordsCache, role, currentUserId);
    loadSucceeded = true;
  } catch (error) {
    if (currentUserId !== requestedUserId || currentMembership?.role !== role) {
      return null;
    }
    console.error('Failed to load family records:', error);
    recordsCache = [];
    if (list) {
      list.innerHTML = `
        <h2>${escapeHtml(text('recordsTitle'))}</h2>
        <p class="notice notice-error" role="status">${escapeHtml(text('loadRecordsFailed'))} ${escapeHtml(error.message)}</p>
      `;
    }
  }

  if (document.querySelector('#record-editor')) {
    const currentEditId = document.querySelector('#record-form')?.dataset.recordId;
    const editingRecord = currentEditId
      ? recordsCache.find((record) => record.id === currentEditId)
      : null;
    renderRecordEditor(role, editingRecord || null);
  }
  return loadSucceeded;
}

function parseDatePhrase(message) {
  const today = new Date();
  const normalizeDate = (year, month, day, token) => {
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return { error: true, token };
    }
    return { date, token };
  };

  const isoDate = message.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoDate) {
    return normalizeDate(
      Number(isoDate[1]),
      Number(isoDate[2]),
      Number(isoDate[3]),
      isoDate[0],
    );
  }

  const monthDate = message.match(/(?:(\d{4})年\s*)?(\d{1,2})月\s*(\d{1,2})(?:日|號|号)/);
  if (monthDate) {
    return normalizeDate(
      Number(monthDate[1] || today.getFullYear()),
      Number(monthDate[2]),
      Number(monthDate[3]),
      monthDate[0],
    );
  }

  const relativeDate = message.match(
    /day after tomorrow|明天|聽日|后天|後天|今日|今天|tomorrow|today/i,
  );
  if (relativeDate) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const phrase = relativeDate[0].toLowerCase();
    const offset = ['day after tomorrow', '后天', '後天'].includes(phrase)
      ? 2
      : ['明天', '聽日', 'tomorrow'].includes(phrase)
        ? 1
        : 0;
    date.setDate(date.getDate() + offset);
    return { date, token: relativeDate[0] };
  }

  const chineseWeekday = message.match(
    /(下(?:個)?(?:星期|週|周|禮拜)|(?:本|今|這|呢個)(?:個)?(?:星期|週|周|禮拜)|星期|週|周|禮拜)\s*(日|天|一|二|三|四|五|六)/u,
  );
  if (chineseWeekday) {
    const weekdayMap = {
      日: 0,
      天: 0,
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
    };
    const targetDay = weekdayMap[chineseWeekday[2]];
    const daysUntil = (targetDay - today.getDay() + 7) % 7;
    const isNextWeek = chineseWeekday[1].startsWith('下');
    const offset = daysUntil + (isNextWeek ? 7 : 0);
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    date.setDate(date.getDate() + offset);
    return { date, token: chineseWeekday[0] };
  }

  const englishWeekday = message.match(
    /\b(?:(this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  );
  if (englishWeekday) {
    const weekdayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const targetDay = weekdayMap[englishWeekday[2].toLowerCase()];
    const daysUntil = (targetDay - today.getDay() + 7) % 7;
    const isNextWeek = englishWeekday[1]?.toLowerCase() === 'next';
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    date.setDate(date.getDate() + daysUntil + (isNextWeek ? 7 : 0));
    return { date, token: englishWeekday[0] };
  }

  return null;
}

function parseTimeMatches(message) {
  const pattern =
    /(凌晨|清晨|早上|上午|中午|下午|晚上)?\s*(\d{1,2}|十二|十一|十[一二三四五六七八九]?|[一二三四五六七八九])(?:\s*(?:(?:[:：](\d{2}))|(?:點|点|時|时)(半)?))?\s*(am|pm)?/gi;
  const candidates = Array.from(message.matchAll(pattern));
  return candidates.filter((candidate) => (
    candidate[1] || candidate[3] || candidate[4] || candidate[5]
  ));
}

function parseTimeMatch(match) {
  const chineseNumber = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    十一: 11,
    十二: 12,
  };
  let hour = /^\d+$/.test(match[2]) ? Number(match[2]) : chineseNumber[match[2]];
  const minute = match[3]
    ? Number(match[3])
    : match[4]
      ? 30
      : 0;
  const period = match[1] || '';
  const meridiem = (match[5] || '').toLowerCase();

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { error: true, token: match[0], index: match.index, end: match.index + match[0].length };
  }
  if (meridiem === 'pm' || ['下午', '晚上'].includes(period)) {
    if (hour < 12) {
      hour += 12;
    }
  } else if (meridiem === 'am' || ['凌晨', '清晨', '早上', '上午'].includes(period)) {
    if (hour === 12) {
      hour = 0;
    }
  } else if (period === '中午' && hour < 11) {
    hour += 12;
  }

  if (hour > 23) {
    return { error: true, token: match[0], index: match.index, end: match.index + match[0].length };
  }
  return {
    hour,
    minute,
    token: match[0],
    index: match.index,
    end: match.index + match[0].length,
  };
}

function parseTimePhrase(message) {
  const match = parseTimeMatches(message)[0];
  return match ? parseTimeMatch(match) : null;
}

function parseScheduleDocument(message) {
  const lines = message.split(/\r?\n/);
  const firstContentLine = lines.findIndex((line) => line.trim());
  if (firstContentLine < 0) {
    return null;
  }

  const title = lines[firstContentLine].trim();
  const content = lines.slice(firstContentLine + 1).join('\n').trim();
  if (
    !content
    || !/(?:課程表|時間表|行程表|schedule|timetable)\s*$/i.test(title)
  ) {
    return null;
  }

  return { title, content };
}

function splitTimedActivities(message) {
  const matches = parseTimeMatches(message).map(parseTimeMatch);
  if (matches.length < 2) {
    return null;
  }
  if (matches.some((match) => match.error)) {
    return { error: text('previewDateInvalid') };
  }

  const firstTimeIndex = matches[0].index;
  const datePrefix = message.slice(0, firstTimeIndex);
  const dateResult = parseDatePhrase(datePrefix);
  if (!dateResult || dateResult.error) {
    return null;
  }

  const dateToken = dateResult.token;
  const descriptions = matches.map((match, index) => {
    const nextIndex = matches[index + 1]?.index ?? message.length;
    return message
      .slice(match.end, nextIndex)
      .replace(/^[\s,，、。;；]+|[\s,，、。;；]+$/g, '')
      .trim();
  });
  if (descriptions.some((description) => !description)) {
    return { error: text('chatParseFailed') };
  }

  const activities = matches.map((match, index) => {
    const startPhrase = index === 0 ? datePrefix : '';
    return `${startPhrase}${match.token} ${descriptions[index]}`.trim();
  });

  return {
    activities: activities.map((activity, index) => (
      index === 0
        ? activity
        : `${dateToken} ${activity}`
    )),
  };
}

function dateToIso(date) {
  return date.toISOString();
}

function parseSingleChatInput(message, files, role, existingRecord = null) {
  const trimmedMessage = message.trim();
  if (!trimmedMessage && files.length === 0) {
    return { error: text('chatInputRequired') };
  }
  const oversizedFile = files.find((file) => file.size > 10 * 1024 * 1024);
  if (oversizedFile) {
    return {
      error: `${oversizedFile.name}: ${text('fileHint')}`,
    };
  }

  const scheduleDocument = existingRecord
    ? null
    : parseScheduleDocument(trimmedMessage);
  const dateResult = scheduleDocument ? null : parseDatePhrase(trimmedMessage);
  if (dateResult?.error) {
    return { error: text('previewDateInvalid') };
  }
  const timeResult = scheduleDocument ? null : parseTimePhrase(trimmedMessage);
  if (timeResult?.error) {
    return { error: text('previewDateInvalid') };
  }

  const now = new Date();
  const existingStart = existingRecord?.event_start
    ? new Date(existingRecord.event_start)
    : null;
  const start = dateResult?.date
    ? new Date(dateResult.date.getTime())
    : existingStart || new Date(now.getTime());
  const isAllDay = scheduleDocument
    ? true
    : dateResult
      ? !timeResult
      : Boolean(existingRecord?.is_all_day);
  if (timeResult) {
    start.setHours(timeResult.hour, timeResult.minute, 0, 0);
  } else if (dateResult || scheduleDocument) {
    start.setHours(0, 0, 0, 0);
  }

  const end = isAllDay ? new Date(start.getTime()) : null;
  if (end) {
    end.setDate(end.getDate() + 1);
  }

  const explicitPlanIntent = Boolean(scheduleDocument)
    || /(安排|計劃|計畫|預約|約咗|行程|打算|活動|測驗|默書|appointment|booking|schedule|plan|will\s+go|going\s+to)/i
      .test(trimmedMessage);
  const dateIsTodayOrFuture = dateResult
    && new Date(dateResult.date.getFullYear(), dateResult.date.getMonth(), dateResult.date.getDate())
      >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isPlan = existingRecord
    ? existingRecord.record_kind === 'plan'
    : role !== 'worker' && Boolean(dateIsTodayOrFuture || explicitPlanIntent);
  const recordKind = existingRecord?.record_kind || (isPlan ? 'plan' : 'experience');

  let recordType;
  if (existingRecord) {
    recordType = existingRecord.record_type;
  } else if (recordKind === 'plan') {
    recordType = 'schedule';
  } else if (role === 'worker') {
    recordType = files.length ? 'photo' : 'diary';
  } else if (/收據|receipt/i.test(trimmedMessage)) {
    recordType = 'receipt';
  } else if (/通告|通知|notice/i.test(trimmedMessage)) {
    recordType = 'notice';
  } else {
    recordType = files.length ? 'photo' : 'diary';
  }

  let titleSource = trimmedMessage;
  if (dateResult?.token) {
    titleSource = titleSource.replace(dateResult.token, ' ');
  }
  if (timeResult?.token) {
    titleSource = titleSource.replace(timeResult.token, ' ');
  }
  titleSource = titleSource
    .replace(/\b(?:today|tomorrow|day after tomorrow|this|next)\b/gi, ' ')
    .replace(/(?:私人|私密|private)/gi, ' ')
    .replace(/^[\s,，。.!！?？:：\-]+|[\s,，。.!！?？:：\-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const fallbackTitle = files.length
    ? (currentLanguage === 'en' ? 'Photo memory' : '相片記錄')
    : trimmedMessage;
  const title = existingRecord && !trimmedMessage
    ? existingRecord.title
    : scheduleDocument?.title || titleSource || fallbackTitle || null;
  // TODO: Finalize and validate private diary encryption before production use.
  const visibility = existingRecord
    ? existingRecord.visibility
    : /私人|私密|private/i.test(trimmedMessage)
      ? 'private'
      : 'family';

  return {
    record: {
      record_kind: recordKind,
      record_type: recordType,
      title,
      content: scheduleDocument?.content || trimmedMessage || existingRecord?.content || null,
      event_start: dateToIso(start),
      event_end: end ? dateToIso(end) : existingRecord?.event_end || null,
      is_all_day: isAllDay,
      visibility,
      linked_plan_id: existingRecord?.linked_plan_id || null,
      status: existingRecord?.status || 'active',
    },
    dateFallback: !dateResult && !existingRecord,
    files,
  };
}

function parseChatInput(message, files, role, existingRecord = null, options = {}) {
  if (existingRecord) {
    const parsed = parseSingleChatInput(message, files, role, existingRecord);
    return parsed.error ? parsed : { ...parsed, records: [parsed.record] };
  }

  const recurringSchedule = parseRecurringSchedule(message, options);
  if (recurringSchedule) {
    if (recurringSchedule.error) {
      return recurringSchedule;
    }
    if (role === 'worker') {
      return { error: text('recurringImportUnavailable') };
    }
    if (files.length) {
      return { error: text('multipleEventsWithFiles') };
    }
    return recurringSchedule;
  }

  if (parseScheduleDocument(message.trim())) {
    const parsed = parseSingleChatInput(message, files, role);
    return parsed.error ? parsed : { ...parsed, records: [parsed.record] };
  }

  const splitResult = splitTimedActivities(message.trim());
  if (splitResult?.error) {
    return splitResult;
  }
  if (!splitResult) {
    const parsed = parseSingleChatInput(message, files, role);
    return parsed.error ? parsed : { ...parsed, records: [parsed.record] };
  }
  if (files.length) {
    return { error: text('multipleEventsWithFiles') };
  }

  const invalidTime = splitResult.activities
    .flatMap((activity) => parseTimeMatches(activity))
    .map(parseTimeMatch)
    .find((time) => time.error);
  if (invalidTime) {
    return { error: text('previewDateInvalid') };
  }

  const records = splitResult.activities.map((activity) => (
    parseSingleChatInput(activity, [], role)
  ));
  const failedRecord = records.find((parsed) => parsed.error);
  if (failedRecord) {
    return failedRecord;
  }

  return {
    records: records.map((parsed) => parsed.record),
    dateFallback: false,
    files: [],
  };
}

function setRecordFormValues(form, record) {
  form.querySelector('#record-kind').value = record.record_kind;
  form.querySelector('#record-type').value = record.record_type;
  form.querySelector('#record-title').value = record.title || '';
  form.querySelector('#event-start').value = record.event_start || '';
  form.querySelector('#event-end').value = record.event_end || '';
  form.querySelector('#record-all-day').checked = Boolean(record.is_all_day);
  form.querySelector('#record-visibility').value = record.visibility;
  form.querySelector('#linked-plan').value = record.linked_plan_id || '';
}

function renderRecordPreview(form, parsed, role) {
  const preview = form.parentElement.querySelector('#record-preview');
  const records = parsed.records || [parsed.record];
  const files = parsed.files || [];
  preview.innerHTML = `
      ${parsed.recurring ? `
        <p class="notice notice-warning recurring-review-warning">
          ${escapeHtml(records.length)} ${escapeHtml(text('recurringPreviewCount'))}
          ${escapeHtml(text('recurringReviewWarning'))}
        </p>
        ${parsed.warnings?.length ? `
          <ul class="notice notice-warning recurring-parse-warnings">
            ${parsed.warnings.map((warning) => `<li>${escapeHtml(warning.message)}</li>`).join('')}
          </ul>
        ` : ''}
      ` : ''}
      ${records.map((record, index) => {
        const typeLabel = translations[currentLanguage].recordTypes[record.record_type]
          || record.record_type;
        const kindLabel = record.record_kind === 'plan'
          ? text('plan')
          : text('experience');
        const visibilityLabel = record.visibility === 'private'
          ? text('privateVisibility')
          : text('familyVisibility');
        const fileItems = index === 0 && files.length
          ? files.map((file) => `
              <li class="preview-file">
                <span class="preview-file-icon" aria-hidden="true">${file.type.startsWith('image/') ? '▧' : '↳'}</span>
                <span>${escapeHtml(file.name)}</span>
                <small>${escapeHtml(formatFileSize(file.size))}</small>
              </li>
            `).join('')
          : `<li class="preview-no-files">${escapeHtml(text('previewNoAttachments'))}</li>`;
        const fieldId = `preview-record-${index}`;

        return `
          <article class="smart-preview-card" data-preview-index="${index}" data-time-zone="${escapeHtml(record.time_zone || '')}">
            <div class="preview-heading">
              <span class="preview-avatar" aria-hidden="true">✦</span>
              <div>
                <strong>${escapeHtml(text('previewTitle'))}${records.length > 1 ? ` · ${index + 1}/${records.length}` : ''}</strong>
                <span>${escapeHtml(text('localParserNotice'))}</span>
              </div>
            </div>
            ${parsed.dateFallback ? `<p class="notice notice-warning">${escapeHtml(text('previewDateFallback'))}</p>` : ''}
            <dl class="preview-fields">
              <div class="preview-field">
                <dt>${escapeHtml(text('previewKind'))}</dt>
                <dd><span class="badge badge-kind-${escapeHtml(record.record_kind)}">${escapeHtml(kindLabel)} · ${escapeHtml(typeLabel)}</span></dd>
              </div>
              <div class="preview-field">
                <dt>${escapeHtml(text('previewTitleLabel'))}</dt>
                <dd><input class="preview-input" name="preview_title" type="text" value="${escapeHtml(record.title || '')}" aria-label="${escapeHtml(text('previewTitleLabel'))}"></dd>
              </div>
              <div class="preview-field">
                <dt>${escapeHtml(text('previewContent'))}</dt>
                <dd><textarea class="preview-input preview-textarea" name="preview_content" rows="3" aria-label="${escapeHtml(text('previewContent'))}">${escapeHtml(record.content || '')}</textarea></dd>
              </div>
              <div class="preview-field">
                <dt>${escapeHtml(text('previewTime'))}</dt>
                <dd class="preview-datetime-fields">
                  <label class="preview-control-label" for="${fieldId}-start">${escapeHtml(text('eventStart'))}</label>
                  <input id="${fieldId}-start" class="preview-input" name="preview_event_start" type="datetime-local" value="${escapeHtml(record.time_zone === 'Asia/Hong_Kong' ? hongKongDateTimeLocalValue(record.event_start) : localDateTimeValue(record.event_start))}" required>
                  <label class="preview-control-label" for="${fieldId}-end">${escapeHtml(text('eventEnd'))}</label>
                  <input id="${fieldId}-end" class="preview-input" name="preview_event_end" type="datetime-local" value="${escapeHtml(record.time_zone === 'Asia/Hong_Kong' ? hongKongDateTimeLocalValue(record.event_end) : localDateTimeValue(record.event_end))}">
                  <label class="preview-all-day" for="${fieldId}-all-day">
                    <input id="${fieldId}-all-day" name="preview_is_all_day" type="checkbox" ${record.is_all_day ? 'checked' : ''}>
                    <span>${escapeHtml(text('allDay'))}</span>
                  </label>
                  <span class="preview-all-day-hint" ${record.is_all_day ? '' : 'hidden'}>${escapeHtml(text('allDayHint'))}</span>
                </dd>
              </div>
              <div class="preview-field">
                <dt>${escapeHtml(text('previewVisibility'))}</dt>
                <dd><span class="badge badge-visibility-${escapeHtml(record.visibility)}">${escapeHtml(visibilityLabel)}</span></dd>
              </div>
              <div class="preview-field">
                <dt>${escapeHtml(text('previewAttachments'))}</dt>
                <dd><ul class="preview-file-list">${fileItems}</ul></dd>
              </div>
            </dl>
            ${record.visibility === 'private' ? `<p class="notice notice-warning">${escapeHtml(text('previewPrivateNotice'))}</p>` : ''}
          </article>
        `;
      }).join('')}
      <div class="preview-actions">
        <button class="button" type="button" data-action="confirm-record">${escapeHtml(text('previewConfirm'))}</button>
        <button class="button button-secondary" type="button" data-action="cancel-record-preview">${escapeHtml(text('previewCancel'))}</button>
      </div>
  `;
  preview.hidden = false;

  preview.querySelectorAll('.smart-preview-card').forEach((card) => {
    card.querySelector('[name="preview_event_start"]')
      .addEventListener('input', () => {
        const fallbackNotice = card.querySelector('.notice-warning');
        if (fallbackNotice && parsed.dateFallback) {
          fallbackNotice.remove();
        }
        syncAllDayPreviewRange(card);
      });
    card.querySelector('[name="preview_event_end"]')
      .addEventListener('change', () => syncAllDayPreviewRange(card));
    card.querySelector('[name="preview_is_all_day"]')
      .addEventListener('change', (event) => {
        const allDay = event.currentTarget.checked;
        const hint = card.querySelector('.preview-all-day-hint');
        hint.hidden = !allDay;
        syncAllDayPreviewRange(card);
      });
  });
  preview.querySelector('[data-action="confirm-record"]')
    .addEventListener('click', (event) => confirmRecordPreview(event.currentTarget, role));
  preview.querySelector('[data-action="cancel-record-preview"]')
    .addEventListener('click', () => {
      pendingRecordPreview = null;
      preview.hidden = true;
      showNotice(text('previewDiscarded'));
    });
}

function syncAllDayPreviewRange(preview) {
  if (!preview.querySelector('[name="preview_is_all_day"]').checked) {
    return;
  }

  const startInput = preview.querySelector('[name="preview_event_start"]');
  const start = new Date(startInput.value);
  if (Number.isNaN(start.getTime())) {
    return;
  }
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  startInput.value = localDateTimeValue(start.toISOString());
  preview.querySelector('[name="preview_event_end"]').value =
    localDateTimeValue(end.toISOString());
}

function syncInlinePreviewValues(preview, form) {
  const cards = Array.from(preview.querySelectorAll('.smart-preview-card'));
  const records = pendingRecordPreview.records || [pendingRecordPreview.record];

  for (const card of cards) {
    syncAllDayPreviewRange(card);
    const index = Number(card.dataset.previewIndex);
    const record = records[index];
    const startValue = card.querySelector('[name="preview_event_start"]').value;
    const endValue = card.querySelector('[name="preview_event_end"]').value;
    const usesHongKongTime = card.dataset.timeZone === 'Asia/Hong_Kong';
    const start = usesHongKongTime
      ? hongKongDateTimeFromLocalValue(startValue)
      : new Date(startValue);
    const end = endValue
      ? usesHongKongTime
        ? hongKongDateTimeFromLocalValue(endValue)
        : new Date(endValue)
      : null;

    if (!startValue || Number.isNaN(start.getTime())) {
      showNotice(text('previewStartRequired'), 'error');
      card.querySelector('[name="preview_event_start"]').focus();
      return false;
    }
    if (endValue && (!end || Number.isNaN(end.getTime()) || end < start)) {
      showNotice(text('previewEndBeforeStart'), 'error');
      card.querySelector('[name="preview_event_end"]').focus();
      return false;
    }

    record.title = card.querySelector('[name="preview_title"]').value.trim() || null;
    record.content = card.querySelector('[name="preview_content"]').value.trim() || null;
    record.event_start = start.toISOString();
    record.event_end = end ? end.toISOString() : null;
    record.is_all_day = card.querySelector('[name="preview_is_all_day"]').checked;
  }

  pendingRecordPreview.record = records[0];
  pendingRecordPreview.records = records;
  setRecordFormValues(form, records[0]);
  form.querySelector('#record-content').value = records[0].content || '';
  return true;
}

async function handleRecordSubmit(event, role) {
  event.preventDefault();
  if (isSubmitting) {
    return;
  }

  const form = event.currentTarget;
  const submitButton = form.querySelector('[data-chat-submit]');
  const submitLabel = submitButton.querySelector('[data-chat-submit-label]');
  const spinner = submitButton.querySelector('[data-chat-submit-spinner]');
  const icon = submitButton.querySelector('[data-chat-submit-icon]');

  submitButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  submitLabel.textContent = text('chatParsing');
  spinner.hidden = false;
  icon.hidden = true;

  try {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const existingRecord = form.dataset.recordId
      ? recordsCache.find((record) => record.id === form.dataset.recordId)
      : null;
    const message = form.querySelector('#record-content').value;
    const files = Array.from(form.querySelector('#record-files').files || []);
    const recurringOptions = {
      startDate: form.querySelector('#recurring-start-date')?.value,
      weeks: Number(form.querySelector('#recurring-weeks')?.value),
      language: currentLanguage,
    };
    const parsed = parseChatInput(
      message,
      files,
      role,
      existingRecord,
      recurringOptions,
    );

    if (parsed.error) {
      for (const warning of parsed.warnings || []) {
        console.warn('Skipped recurring schedule row:', {
          lineNumber: warning.lineNumber,
          reason: warning.message,
        });
      }
      showNotice(parsed.error, 'error');
      return;
    }

    const parsedRecords = parsed.records || [parsed.record];
    const record = parsedRecords[0];
    setRecordFormValues(form, record);
    pendingRecordPreview = {
      record,
      records: parsedRecords,
      files,
      role,
      recurring: Boolean(parsed.recurring),
      recordId: form.dataset.recordId || null,
      isEditing: Boolean(form.dataset.recordId),
    };
    renderRecordPreview(form, parsed, role);
    form.parentElement.querySelector('#record-preview')
      .scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    showNotice(`${text('chatParseFailed')} ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute('aria-busy');
    submitLabel.textContent = text('chatSend');
    spinner.hidden = true;
    icon.hidden = false;
  }
}

function recordFormPayload(role, isEditing, record) {
  const payload = {
    title: record.title || null,
    content: record.content,
    event_start: record.event_start,
    event_end: record.event_end,
    is_all_day: record.is_all_day,
  };

  if (!isEditing) {
    payload.record_kind = record.record_kind;
    payload.record_type = record.record_type;
    payload.visibility = record.visibility;
    payload.linked_plan_id = record.linked_plan_id;
    if (Array.isArray(record.participant_names) && record.participant_names.length) {
      payload.participant_names = record.participant_names;
    }
  } else if (['admin', 'master'].includes(role)) {
    payload.record_type = record.record_type;
    payload.visibility = record.visibility;
    payload.linked_plan_id = record.linked_plan_id;
  }

  return payload;
}

async function confirmRecordPreview(button, role) {
  if (isSubmitting || !pendingRecordPreview) {
    return;
  }

  const previewState = pendingRecordPreview;
  const form = document.querySelector('#record-form');
  if (!form || previewState.role !== role) {
    return;
  }

  const preview = form.parentElement.querySelector('#record-preview');
  if (!syncInlinePreviewValues(preview, form)) {
    return;
  }

  isSubmitting = true;
  button.disabled = true;
  button.textContent = text('previewConfirming');
  const composer = form.querySelector('#record-content');
  const fileInput = form.querySelector('#record-files');
  const cancelButton = form.parentElement.querySelector(
    '[data-action="cancel-record-preview"]',
  );
  const previewInputs = preview.querySelectorAll('input, textarea');
  composer.disabled = true;
  fileInput.disabled = true;
  previewInputs.forEach((input) => {
    input.disabled = true;
  });
  if (cancelButton) {
    cancelButton.disabled = true;
  }
  form.querySelectorAll('.chat-file-remove').forEach((removeButton) => {
    removeButton.disabled = true;
  });

  const savedRecords = [];
  const recordsToSave = previewState.records || [previewState.record];
  try {
    if (previewState.recurring) {
      const savedBatch = await apiRequest('/api/records/batch', {
        method: 'POST',
        body: {
          records: recordsToSave.map((record) => (
            recordFormPayload(role, false, record)
          )),
        },
      });
      savedRecords.push(...savedBatch);
    } else {
      for (const record of recordsToSave) {
        const payload = recordFormPayload(
          role,
          previewState.isEditing,
          record,
        );
        const savedRecord = await apiRequest(
          previewState.isEditing
            ? `/api/records/${encodeURIComponent(previewState.recordId)}`
            : '/api/records',
          {
            method: previewState.isEditing ? 'PATCH' : 'POST',
            body: payload,
          },
        );
        savedRecords.push(savedRecord);
      }
    }

    let uploadedCount = 0;
    let failedCount = 0;
    for (const file of previewState.files) {
      try {
        await apiRequest(
          `/api/records/${encodeURIComponent(savedRecords[0].id)}/attachments`,
          {
            method: 'POST',
            file,
          },
        );
        uploadedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error(`Could not upload attachment ${file.name}:`, error);
      }
    }

    pendingRecordPreview = null;
    const recordsRefreshed = await loadRecords(role);
    if (recordsRefreshed === null) {
      return;
    }
    if (!recordsRefreshed) {
      clearLocalDraft();
      showNotice(text('previewSavedRefreshFailed'), 'error');
      return;
    }
    const savedMessage = previewState.isEditing
      ? text('recordUpdated')
      : text('recordCreated');
    if (failedCount) {
      showNotice(
        `${text('fileUploadPartial')} ${uploadedCount} ${text('attachmentsUploaded')}; ${failedCount} ${text('attachmentsFailed')}`,
        'error',
      );
    } else if (uploadedCount) {
      showNotice(`${savedMessage} ${uploadedCount} ${text('attachmentsUploaded')}.`, 'success');
    } else {
      showNotice(
        recordsToSave.length > 1
          ? `${recordsToSave.length} ${text('previewSavedCount')}`
          : savedMessage,
        'success',
      );
    }
    clearLocalDraft();
    renderRecordEditor(role);
  } catch (error) {
    console.error('Failed to save confirmed family record:', error);
    if (savedRecords.length && savedRecords.length < recordsToSave.length) {
      const remainingRecords = recordsToSave.slice(savedRecords.length);
      previewState.records = remainingRecords;
      previewState.record = remainingRecords[0];
      renderRecordPreview(form, {
        records: remainingRecords,
        files: [],
        dateFallback: false,
      }, role);
      showNotice(
        `${text('previewPartialSave')} ${savedRecords.length}/${recordsToSave.length}. ${error.message}`,
        'error',
      );
    } else if (savedRecords.length === recordsToSave.length) {
      pendingRecordPreview = null;
      clearLocalDraft();
      showNotice(text('previewSavedRefreshFailed'), 'error');
      renderRecordEditor(role);
    } else {
      showNotice(`${text('previewConfirmFailed')} ${error.message}`, 'error');
    }
  } finally {
    isSubmitting = false;
    const currentButton = document.querySelector(
      '#record-preview [data-action="confirm-record"]',
    );
    if (currentButton && pendingRecordPreview === previewState) {
      currentButton.disabled = false;
      currentButton.textContent = text('previewConfirm');
      composer.disabled = false;
      fileInput.disabled = false;
      const currentCancelButton = form.parentElement.querySelector(
        '[data-action="cancel-record-preview"]',
      );
      if (currentCancelButton) {
        currentCancelButton.disabled = false;
      }
      preview.querySelectorAll('input, textarea').forEach((input) => {
        input.disabled = false;
      });
      form.querySelectorAll('.chat-file-remove').forEach((removeButton) => {
        removeButton.disabled = false;
      });
    }
  }
}

async function deleteRecord(recordId, role) {
  if (isSubmitting || !window.confirm(text('confirmDelete'))) {
    return;
  }

  isSubmitting = true;
  try {
    await apiRequest(`/api/records/${encodeURIComponent(recordId)}`, {
      method: 'DELETE',
    });
    await loadRecords(role);
    showNotice(text('recordDeleted'), 'success');
  } catch (error) {
    console.error('Failed to delete family record:', error);
    showNotice(`${text('deleteRecordFailed')} ${error.message}`, 'error');
  } finally {
    isSubmitting = false;
  }
}

async function loadApprovalQueue(role) {
  const queue = document.querySelector('#approval-queue');
  if (!queue) {
    return;
  }

  queue.innerHTML = `
    <h2>${text('adminQueueTitle')}</h2>
    <p class="description">${text('adminQueueDescription')}</p>
    ${role === 'master' ? `<p class="notice">${text('masterReadOnly')}</p>` : ''}
    <p class="loading-message">${text('loading')}</p>
  `;

  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, display_name, requested_role, created_at')
      .eq('family_id', appConfig.familyId)
      .eq('status', 'pending')
      .not('profile_id', 'is', 'null')
      .not('requested_role', 'is', 'null')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    if (role === 'master') {
      queue.innerHTML = `
        <h2>${text('adminQueueTitle')}</h2>
        <p class="description">${text('adminQueueDescription')}</p>
        <p class="notice">${text('masterReadOnly')}</p>
        ${renderRequestList(data, false)}
      `;
      return;
    }

    queue.innerHTML = `
      <h2>${text('adminQueueTitle')}</h2>
      <p class="description">${text('adminQueueDescription')}</p>
      ${renderRequestList(data, true)}
    `;
    attachApprovalActions(queue);
  } catch (error) {
    console.error('Failed to load pending family applications:', error);
    queue.innerHTML = `
      <h2>${text('adminQueueTitle')}</h2>
      <p class="notice notice-error" role="status">${text('loadApplicationsFailed')}</p>
    `;
  }
}

function scheduleQueueHeading() {
  return `
    <div class="schedule-queue-heading">
      <div>
        <h2>${escapeHtml(text('scheduleQueueTitle'))}</h2>
        <p class="description">${escapeHtml(text('scheduleQueueDescription'))}</p>
      </div>
      <button class="button button-secondary" type="button" data-action="refresh-schedule-queue">${escapeHtml(text('refreshScheduleQueue'))}</button>
    </div>
  `;
}

function attachScheduleQueueRefresh(queue, role) {
  queue.querySelector('[data-action="refresh-schedule-queue"]')
    ?.addEventListener('click', () => loadScheduleChangeQueue(role));
}

async function loadScheduleChangeQueue(role) {
  const requestedUserId = currentUserId;
  const queue = document.querySelector('#schedule-change-queue');
  if (!queue || !requestedUserId) {
    return;
  }

  queue.innerHTML = `${scheduleQueueHeading()}<p class="loading-message">${escapeHtml(text('loading'))}</p>`;
  attachScheduleQueueRefresh(queue, role);

  try {
    const { data: requests, error: requestError } = await supabase
      .from('schedule_change_requests')
      .select('id, family_id, record_id, record_version, requested_changes, requested_by, status, decision_note, created_at')
      .eq('family_id', appConfig.familyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (requestError) {
      throw requestError;
    }
    if (currentUserId !== requestedUserId || currentMembership?.role !== role) {
      return;
    }

    if (!requests.length) {
      queue.innerHTML = `
        ${scheduleQueueHeading()}
        <p class="empty-state">${escapeHtml(text('noScheduleRequests'))}</p>
      `;
      attachScheduleQueueRefresh(queue, role);
      return;
    }

    const recordIds = [...new Set(requests.map((request) => request.record_id))];
    const requesterIds = [...new Set(requests.map((request) => request.requested_by))];
    const [recordResult, profileResult] = await Promise.all([
      supabase
        .from('records')
        .select('id, title, record_kind, status, row_version')
        .in('id', recordIds),
      supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', requesterIds),
    ]);

    if (recordResult.error) {
      throw recordResult.error;
    }
    if (profileResult.error) {
      throw profileResult.error;
    }
    if (currentUserId !== requestedUserId || currentMembership?.role !== role) {
      return;
    }

    const recordsById = new Map(recordResult.data.map((record) => [record.id, record]));
    const profilesById = new Map(profileResult.data.map((profile) => [profile.id, profile]));
    const cards = requests.map((request) => {
      const record = recordsById.get(request.record_id);
      const requester = profilesById.get(request.requested_by);
      const currentVersion = record?.row_version;

      return `
        <li class="schedule-request-item" data-schedule-request-id="${escapeHtml(request.id)}">
          <div class="record-details">
            <span class="badge badge-status-pending">${escapeHtml(text('pendingBadge'))}</span>
            <strong>${escapeHtml(record?.title || text('scheduleTargetUnavailable'))}</strong>
            <span class="request-role">${escapeHtml(text('scheduleRequester'))}: ${escapeHtml(requester?.display_name || request.requested_by)}</span>
            <span class="request-role">${escapeHtml(text('scheduleRequestVersion'))}: ${escapeHtml(request.record_version)} · ${escapeHtml(text('currentRecordVersion'))}: ${currentVersion === undefined ? '—' : escapeHtml(currentVersion)}</span>
            <span class="request-role">${escapeHtml(new Date(request.created_at).toLocaleString(currentLanguage === 'en' ? 'en' : 'zh-HK'))}</span>
            ${renderRequestedChanges(request.requested_changes)}
            ${currentVersion !== undefined && currentVersion !== request.record_version
              ? `<p class="notice notice-error">${escapeHtml(text('staleScheduleRequest'))}</p>`
              : ''}
            ${!record ? `<p class="notice notice-error">${escapeHtml(text('scheduleTargetUnavailable'))}</p>` : ''}
          </div>
          <label class="field schedule-decision-note">
            <span>${escapeHtml(text('decisionNote'))}</span>
            <textarea name="decision_note" rows="2"></textarea>
          </label>
          <div class="request-actions">
            <button class="button" type="button" data-action="approve-schedule-change" data-id="${escapeHtml(request.id)}">${escapeHtml(text('approveScheduleRequest'))}</button>
            <button class="button button-danger" type="button" data-action="reject-schedule-change" data-id="${escapeHtml(request.id)}">${escapeHtml(text('rejectScheduleRequest'))}</button>
          </div>
        </li>
      `;
    }).join('');

    queue.innerHTML = `
      ${scheduleQueueHeading()}
      <ul class="schedule-request-list">${cards}</ul>
    `;
    attachScheduleQueueRefresh(queue, role);
    queue.querySelectorAll(
      '[data-action="approve-schedule-change"], [data-action="reject-schedule-change"]',
    ).forEach((button) => {
      button.addEventListener('click', () => decideScheduleChange(button));
    });
  } catch (error) {
    if (currentUserId !== requestedUserId || currentMembership?.role !== role) {
      return;
    }
    console.error('Failed to load pending schedule change requests:', error);
    queue.innerHTML = `
      ${scheduleQueueHeading()}
      <p class="notice notice-error" role="status">${escapeHtml(text('scheduleQueueLoadFailed'))} ${escapeHtml(error.message)}</p>
    `;
    attachScheduleQueueRefresh(queue, role);
  }
}

function renderRequestedChanges(changes) {
  const allowedFields = {
    title: text('title'),
    content: text('content'),
    event_start: text('eventStart'),
    event_end: text('eventEnd'),
    is_all_day: text('allDay'),
    status: text('status'),
  };

  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return `<p class="notice notice-error">${escapeHtml(text('scheduleRequestFailed'))}</p>`;
  }

  const rows = Object.entries(changes)
    .filter(([field]) => Object.hasOwn(allowedFields, field))
    .map(([field, value]) => {
      let displayValue;
      if (field === 'event_start' || field === 'event_end') {
        displayValue = value === null
          ? '—'
          : new Date(value).toLocaleString(currentLanguage === 'en' ? 'en' : 'zh-HK');
      } else if (field === 'is_all_day') {
        displayValue = value ? text('allDay') : text('notAllDay');
      } else if (field === 'status') {
        displayValue = value === 'active'
          ? text('statusActive')
          : value === 'cancelled'
            ? text('statusCancelled')
            : String(value);
      } else {
        displayValue = value === null ? '—' : String(value);
      }

      return `
        <div class="requested-change">
          <dt>${escapeHtml(allowedFields[field])}</dt>
          <dd>${escapeHtml(displayValue)}</dd>
        </div>
      `;
    }).join('');

  return `
    <div class="requested-changes">
      <strong>${escapeHtml(text('requestedChanges'))}</strong>
      <dl>${rows || `<dd>${escapeHtml(text('scheduleRequestFailed'))}</dd>`}</dl>
    </div>
  `;
}

async function decideScheduleChange(button) {
  if (isSubmitting) {
    return;
  }
  const requestedUserId = currentUserId;
  const role = currentMembership?.role;
  if (!requestedUserId || !['admin', 'master'].includes(role)) {
    return;
  }

  const card = button.closest('[data-schedule-request-id]');
  const requestId = button.dataset.id;
  const approve = button.dataset.action === 'approve-schedule-change';
  const note = card?.querySelector('[name="decision_note"]')?.value.trim() || null;
  const actionButtons = card?.querySelectorAll('button') || [];
  isSubmitting = true;
  actionButtons.forEach((actionButton) => {
    actionButton.disabled = true;
  });

  try {
    const { error } = await supabase.rpc('approve_schedule_change', {
      request_id: requestId,
      approve,
      note,
    });
    if (error) {
      throw error;
    }
    if (currentUserId !== requestedUserId || currentMembership?.role !== role) {
      return;
    }

    showNotice(
      approve ? text('scheduleRequestApproved') : text('scheduleRequestRejected'),
      'success',
    );
    await Promise.all([
      loadScheduleChangeQueue(role),
      loadRecords(role),
    ]);
  } catch (error) {
    if (currentUserId !== requestedUserId || currentMembership?.role !== role) {
      return;
    }
    console.error('Failed to decide schedule change request:', error);
    showNotice(`${text('scheduleDecisionFailed')} ${error.message}`, 'error');
    await loadScheduleChangeQueue(role);
  } finally {
    isSubmitting = false;
  }
}

function renderRequestList(requests, canDecide) {
  if (!requests.length) {
    return `<p class="empty-state">${text('noApplications')}</p>`;
  }

  const items = requests.map((request) => {
    const requestedRole =
      translations[currentLanguage].requestForRole[request.requested_role]
      ?? request.requested_role;
    const date = new Date(request.created_at).toLocaleString(
      currentLanguage === 'en' ? 'en' : 'zh-HK',
    );

    return `
      <li class="request-item">
        <div class="request-details">
          <strong>${escapeHtml(request.display_name)}</strong>
          <div class="record-meta">
            <span class="badge badge-role badge-${escapeHtml(request.requested_role)}">${escapeHtml(requestedRole)}</span>
            <span class="badge badge-status-pending">${escapeHtml(text('pendingBadge'))}</span>
          </div>
          <span class="request-role">${text('requestDate')}: ${escapeHtml(date)}</span>
        </div>
        ${canDecide ? `
          <div class="request-actions">
            <button class="button" type="button" data-action="approve" data-id="${escapeHtml(request.id)}">${text('approve')}</button>
            <button class="button button-danger" type="button" data-action="reject" data-id="${escapeHtml(request.id)}">${text('reject')}</button>
          </div>
        ` : ''}
      </li>
    `;
  });

  return `<ul class="request-list">${items.join('')}</ul>`;
}

function attachApprovalActions(queue) {
  queue.querySelectorAll('[data-action="approve"], [data-action="reject"]').forEach((button) => {
    button.addEventListener('click', () => decideApplication(button));
  });
}

async function decideApplication(button) {
  if (isSubmitting) {
    return;
  }

  const requestId = button.dataset.id;
  const application = await supabase
    .from('family_members')
    .select('id, requested_role')
    .eq('id', requestId)
    .eq('family_id', appConfig.familyId)
    .eq('status', 'pending')
    .maybeSingle();

  if (application.error) {
    console.error('Failed to load family application:', application.error);
    showNotice(text('actionFailed'), 'error');
    return;
  }

  if (!application.data) {
    showNotice(text('applicationChanged'), 'error');
    await loadApprovalQueue(currentMembership.role);
    return;
  }

  const isApproval = button.dataset.action === 'approve';
  const update = isApproval
    ? {
        role: application.data.requested_role,
        status: 'active',
      }
    : {
        role: null,
        status: 'disabled',
      };

  isSubmitting = true;
  button.disabled = true;
  try {
    const { data, error } = await supabase
      .from('family_members')
      .update(update)
      .eq('id', requestId)
      .eq('family_id', appConfig.familyId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      showNotice(text('applicationChanged'), 'error');
    } else {
      showNotice(text('requestUpdated'), 'success');
    }
    await loadApprovalQueue(currentMembership.role);
  } catch (error) {
    console.error('Failed to decide family application:', error);
    showNotice(text('actionFailed'), 'error');
  } finally {
    isSubmitting = false;
  }
}

async function routeUser(user) {
  const currentRoute = ++routeVersion;
  const nextUserId = user?.id || null;
  if (currentUserId && currentUserId !== nextUserId) {
    clearLocalDraft();
  }
  currentUserId = nextUserId;

  if (!user) {
    currentMembership = null;
    renderSignIn();
    return;
  }

  currentMembership = null;
  setLanguage('zh');
  showLoading();

  try {
    const [profileResult, membershipResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, locale')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('family_members')
        .select('id, family_id, display_name, requested_role, role, status')
        .eq('profile_id', user.id)
        .maybeSingle(),
    ]);

    if (currentRoute !== routeVersion) {
      return;
    }

    if (membershipResult.error) {
      throw new Error(`${text('loadMembershipFailed')} ${membershipResult.error.message}`);
    }

    const membership = membershipResult.data;
    currentMembership = membership;

    if (profileResult.error) {
      throw new Error(`${text('loadProfileFailed')} ${profileResult.error.message}`);
    }

    if (!profileResult.data) {
      throw new Error(text('profileMissing'));
    }

    const profile = profileResult.data;

    if (!membership) {
      if (!appConfig.familyId) {
        throw new Error(text('noFamilyConfigured'));
      }

      renderRoleApplication(user, profile);
      return;
    }

    if (membership.family_id !== appConfig.familyId) {
      throw new Error(text('invalidMembership'));
    }

    if (membership.status === 'pending') {
      renderPending(user, membership);
      return;
    }

    if (membership.status === 'disabled') {
      renderDisabled(user, membership);
      return;
    }

    if (membership.status !== 'active' || !membership.role) {
      renderInvalidMembership(user, membership);
      return;
    }

    renderActive(user, membership);
  } catch (error) {
    console.error('Failed to resolve authenticated user access:', error);
    setLanguage(
      currentMembership?.role === 'worker'
        || currentMembership?.requested_role === 'worker'
        ? 'en'
        : 'zh',
    );
    appRoot.innerHTML = `
      <h1>${escapeHtml(error.message || text('actionFailed'))}</h1>
      <div class="button-row">
        <button class="button button-secondary" type="button" data-action="sign-out">${text('signOut')}</button>
      </div>
    `;
    document.querySelector('[data-action="sign-out"]').addEventListener('click', signOut);
  }
}

async function submitRoleApplication(user, profile) {
  if (isSubmitting) {
    return;
  }

  const requestedRole = document.querySelector('#requested-role').value;
  const allowedRoles = ['master', 'worker', 'guest'];
  if (!allowedRoles.includes(requestedRole)) {
    showNotice(text('submitFailed'), 'error');
    return;
  }

  if (!appConfig.familyId) {
    showNotice(text('noFamilyConfigured'), 'error');
    return;
  }

  isSubmitting = true;
  const submitButton = document.querySelector('#submit-application');
  submitButton.disabled = true;

  try {
    const { error } = await supabase.from('family_members').insert({
      family_id: appConfig.familyId,
      profile_id: user.id,
      display_name: profile.display_name,
      requested_role: requestedRole,
      role: null,
      status: 'pending',
    });

    if (error) {
      throw error;
    }

    await routeUser(user);
    showNotice(text('requestSubmitted'), 'success');
  } catch (error) {
    console.error('Failed to submit family role application:', error);
    showNotice(text('submitFailed'), 'error');
  } finally {
    isSubmitting = false;
    const button = document.querySelector('#submit-application');
    if (button) {
      button.disabled = false;
    }
  }
}

async function signInWithGoogle() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Google sign-in failed:', error);
    renderSignIn(`${text('googleFailed')} ${error.message}`);
  }
}

async function signOut() {
  if (!supabase) {
    window.location.assign('/');
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }

    clearLocalDraft();
    currentMembership = null;
    window.location.assign('/');
  } catch (error) {
    console.error('Sign-out failed:', error);
    showNotice(text('signOutFailed'), 'error');
  }
}

async function loadApplication() {
  try {
    const response = await fetch('/api/config', {
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || translations.zh.configError);
    }

    appConfig = result.data;
    if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey || !appConfig.familyId) {
      throw new Error(translations.zh.configError);
    }

    const { createClient } = await import(SUPABASE_MODULE_URL);
    supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        window.setTimeout(() => {
          routeUser(session?.user ?? null);
        }, 0);
      }
    });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    await routeUser(data.session?.user ?? null);
  } catch (error) {
    console.error('Failed to initialize Family Calendar:', error);
    setLanguage('zh');
    appRoot.innerHTML = `
      <h1>${text('configError')}</h1>
      <p class="notice notice-error" role="status">${escapeHtml(error.message)}</p>
      <button class="button button-secondary" type="button" data-action="reload">重新載入</button>
    `;
    document.querySelector('[data-action="reload"]').addEventListener('click', () => {
      window.location.reload();
    });
  }
}

setLanguage('zh');
if (['/login', '/today', '/record/new', '/approve'].includes(window.location.pathname)) {
  import('./mvp-pages.js')
    .then(({ startMvpPages }) => startMvpPages())
    .catch((error) => {
      console.error('Failed to load MVP pages:', error);
      appRoot.innerHTML = `
        <h1>無法載入應用程式</h1>
        <p class="notice notice-error" role="alert">${escapeHtml(error.message)}</p>
      `;
    });
} else {
  loadApplication();
}
