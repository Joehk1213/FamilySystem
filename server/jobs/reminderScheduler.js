const REMINDER_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

async function checkUpcomingReminders(supabaseAdmin, now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('The reminder check time must be a valid Date.');
  }

  const upperBound = new Date(now.getTime() + REMINDER_WINDOW_MS).toISOString();
  const [remindersResult, membershipsResult] = await Promise.all([
    supabaseAdmin
      .from('reminders')
      .select('id, family_id, created_by, title, due_at')
      .eq('is_done', false)
      .not('due_at', 'is', null)
      .lte('due_at', upperBound)
      .order('due_at', { ascending: true }),
    supabaseAdmin
      .from('family_members')
      .select('family_id, profile_id')
      .eq('status', 'active')
      .not('role', 'is', null),
  ]);

  if (remindersResult.error) {
    throw remindersResult.error;
  }
  if (membershipsResult.error) {
    throw membershipsResult.error;
  }
  if (!Array.isArray(remindersResult.data) || !Array.isArray(membershipsResult.data)) {
    throw new TypeError('The reminder scheduler received an invalid Supabase response.');
  }

  const activeFamilyIds = new Set(
    membershipsResult.data
      .filter((membership) => membership.family_id && membership.profile_id)
      .map((membership) => membership.family_id),
  );
  const upcomingReminders = remindersResult.data
    .filter((reminder) => activeFamilyIds.has(reminder.family_id));

  for (const reminder of upcomingReminders) {
    console.info('Family reminder due soon:', {
      id: reminder.id,
      familyId: reminder.family_id,
      dueAt: reminder.due_at,
    });
  }

  return upcomingReminders;
}

function startReminderScheduler(supabaseAdmin, { intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
    throw new TypeError('A Supabase admin client is required for the reminder scheduler.');
  }
  if (!Number.isInteger(intervalMs) || intervalMs < 1) {
    throw new RangeError('The reminder scheduler interval must be a positive integer.');
  }

  const timer = setInterval(() => {
    checkUpcomingReminders(supabaseAdmin).catch((error) => {
      console.error('Family reminder scheduler check failed:', error);
    });
  }, intervalMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  console.info(`Family reminder scheduler started (interval: ${intervalMs} ms).`);
  return {
    runOnce: (now) => checkUpcomingReminders(supabaseAdmin, now),
    stop: () => clearInterval(timer),
  };
}

module.exports = { startReminderScheduler };
