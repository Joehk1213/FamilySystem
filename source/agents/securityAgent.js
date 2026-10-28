const INJECTION_PATTERN = /ignore previous|system prompt|洩漏私鑰/i;
const JAILBREAK_PATTERN = /you are now|DAN|jailbreak/i;
const MAX_INPUT_LENGTH = 2000;
const MAX_LOG_LENGTH = 500;

async function checkInput(text, { familyId, profileId, supabaseClient } = {}) {
  if (typeof text !== 'string') {
    throw new TypeError('Input must be text.');
  }

  const truncated = text.length > MAX_INPUT_LENGTH;
  const inspectedText = text.slice(0, MAX_INPUT_LENGTH);
  const eventType = JAILBREAK_PATTERN.test(inspectedText)
    ? 'jailbreak'
    : INJECTION_PATTERN.test(inspectedText)
      ? 'injection'
      : 'safe';

  if (eventType !== 'safe' && supabaseClient) {
    if (!familyId || !profileId || typeof supabaseClient.from !== 'function') {
      throw new TypeError('Family and profile context are required to record a security event.');
    }

    const { error } = await supabaseClient
      .from('security_logs')
      .insert({
        family_id: familyId,
        user_id: profileId,
        event_type: eventType,
        input_text: text.slice(0, MAX_LOG_LENGTH),
      });

    if (error) {
      console.error('Could not write prompt-injection security log:', {
        code: error.code || null,
        status: error.status || null,
      });
      throw new Error('The security event could not be recorded.', { cause: error });
    }
  }

  return {
    isSafe: eventType === 'safe',
    reason: eventType === 'safe'
      ? truncated ? 'Input was truncated to 2000 characters.' : 'Input passed local checks.'
      : eventType === 'jailbreak'
        ? 'Potential jailbreak phrase detected.'
        : 'Potential prompt injection phrase detected.',
    eventType,
    riskScore: eventType === 'safe' ? 0 : 1,
  };
}

module.exports = { checkInput };
