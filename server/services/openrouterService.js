const OPENROUTER_CHAT_COMPLETIONS_URL =
  'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_FREE_MODEL = 'google/gemma-4-31b-it:free';
const FREE_MODEL_PATTERN = /^(?:openrouter\/free|[\w.-]+\/[\w.-]+:free)$/;
const MAX_INPUT_LENGTH = 2000;

function getFreeModel() {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_FREE_MODEL;
  if (!FREE_MODEL_PATTERN.test(model)) {
    throw new Error(
      'OPENROUTER_MODEL must be the free router or a model ID ending in :free.',
    );
  }
  return model;
}

function validateParsedRecord(value, input) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || typeof value.title !== 'string'
    || !value.title.trim()
    || value.title.length > 120
    || !(value.date_text === null || typeof value.date_text === 'string')
    || !(value.time_text === null || typeof value.time_text === 'string')
    || typeof value.is_all_day !== 'boolean'
    || !(value.content === null || typeof value.content === 'string')
  ) {
    throw new Error('OpenRouter returned data that does not match the expected JSON fields.');
  }

  if (
    (value.date_text && value.date_text.length > 80)
    || (value.time_text && value.time_text.length > 60)
    || (value.content && value.content.length > 500)
  ) {
    throw new Error('OpenRouter returned a field that exceeds the expected length.');
  }

  const dateText = value.date_text?.trim() || null;
  const timeText = value.time_text?.trim() || null;
  return {
    title: value.title.trim(),
    date_text: dateText && input.includes(dateText) ? dateText : null,
    time_text: timeText && input.includes(timeText) ? timeText : null,
    is_all_day: value.is_all_day,
    content: value.content?.trim() || null,
  };
}

async function parseCalendarInput(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new TypeError('Calendar input must be a non-empty string.');
  }
  if (input.length > MAX_INPUT_LENGTH) {
    throw new RangeError(`Calendar input must be ${MAX_INPUT_LENGTH} characters or fewer.`);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in the environment.');
  }

  const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Family Calendar Dev Test',
    },
    body: JSON.stringify({
      model: getFreeModel(),
      temperature: 0,
      max_tokens: 350,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Extract a calendar item from the user text and return only one JSON object.',
            'Use exactly these fields: title (string), date_text (string or null), time_text (string or null), is_all_day (boolean), content (string or null).',
            'date_text and time_text must each be copied as an exact substring from the user text; never normalize them or guess a year, date, time, person, or other missing information. Use null if no exact phrase is present.',
            'Use a short title. Put additional event details in content. Use null when date, time, or additional details are absent.',
          ].join(' '),
        },
        { role: 'user', content: input.trim() },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    if (!response.ok) {
      throw new Error(
        `OpenRouter request failed (${response.status}) with a non-JSON response.`,
      );
    }
    throw new Error('OpenRouter returned an invalid HTTP response.');
  }

  if (!response.ok) {
    const apiMessage = typeof result?.error?.message === 'string'
      ? result.error.message
        .replace(/[\r\n\t]/g, ' ')
        .replaceAll(apiKey, '[redacted]')
        .slice(0, 240)
      : 'No error details provided.';
    throw new Error(`OpenRouter request failed (${response.status}): ${apiMessage}`);
  }

  const content = result?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenRouter response did not contain a JSON message.');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const objectStart = content.indexOf('{');
    const objectEnd = content.lastIndexOf('}');
    if (objectStart < 0 || objectEnd <= objectStart) {
      throw new Error('OpenRouter returned a message that is not valid JSON.');
    }
    try {
      parsed = JSON.parse(content.slice(objectStart, objectEnd + 1));
    } catch {
      throw new Error('OpenRouter returned a message that is not valid JSON.');
    }
  }

  return validateParsedRecord(parsed, input.trim());
}

module.exports = { parseCalendarInput };
