const WEEKDAY_INDEX = new Map([
  ['mon', 0],
  ['monday', 0],
  ['tue', 1],
  ['tues', 1],
  ['tuesday', 1],
  ['wed', 2],
  ['wednesday', 2],
  ['thu', 3],
  ['thur', 3],
  ['thurs', 3],
  ['thursday', 3],
  ['fri', 4],
  ['fir', 4],
  ['friday', 4],
  ['sat', 5],
  ['saturday', 5],
  ['sun', 6],
  ['sunday', 6],
]);
const WEEKDAY_PATTERN =
  /^(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|fir|sat(?:urday)?|sun(?:day)?)\b(.*)$/i;
const WEEKDAY_CANDIDATE_PATTERN = /^([a-z]{2,10})\s*[:\-](.*)$/i;
const TIME_RANGE_PATTERN =
  /(?<!\d)(?:(am|pm)\s*)?(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(am|pm)?\s*-\s*(?:(am|pm)\s*)?(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(am|pm)?(?!\d)/i;
const HONG_KONG_OFFSET_MINUTES = 8 * 60;

function normalizeScheduleLine(line) {
  return line
    .normalize('NFKC')
    .replace(/[‐‑‒–—―−﹣－]/g, '-')
    .replace(/[：﹕]/g, ':')
    .replace(/[，、]/g, ',')
    .replace(/[．。]/g, '.')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function stripDecoration(value) {
  return value
    .replace(/[\p{Extended_Pictographic}\uFE0E\uFE0F\u200D]/gu, '')
    .replace(/^[\s*•·▪◦\-–—_=|/\\]+|[\s*•·▪◦\-–—_=|/\\]+$/gu, '')
    .trim();
}

function isDecorativeSeparator(line) {
  const stripped = stripDecoration(line);
  return !stripped || /^[\p{P}\p{S}\s]+$/u.test(stripped);
}

function lineError(lineNumber, message, language) {
  return language === 'en'
    ? `Line ${lineNumber}: ${message.en}`
    : `第 ${lineNumber} 行：${message.zh}`;
}

function createLineWarning(lineNumber, message, language) {
  return {
    lineNumber,
    message: lineError(lineNumber, message, language),
  };
}

export function hasWeeklyScheduleMarkers(message) {
  const lines = String(message || '').split(/\r?\n/).map(normalizeScheduleLine);
  return lines.some((line) => WEEKDAY_PATTERN.test(stripDecoration(line)))
    && lines.some((line) => TIME_RANGE_PATTERN.test(stripDecoration(line)));
}

function resolveStartMinutes(hourValue, minuteValue, marker) {
  const hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  if (hour > 23 || minute > 59) {
    return null;
  }

  const period = marker?.toLowerCase();
  if (hour === 0 && !minuteValue && !period) {
    return null;
  }
  if (hour > 12 || period) {
    if (hour < 1 || hour > 12) {
      return period ? null : hour * 60 + minute;
    }
  }
  const resolvedHour = period === 'am'
    ? hour % 12
    : period === 'pm'
      ? (hour % 12) + 12
      : hour === 12
        ? 12
        : hour + 12;
  return resolvedHour * 60 + minute;
}

function resolveEndMinutes(hourValue, minuteValue, marker, startMinutes) {
  const hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  if (hour > 23 || minute > 59) {
    return null;
  }

  const period = marker?.toLowerCase();
  if (hour === 0 && !minuteValue && !period) {
    return null;
  }
  if (hour > 12 || period) {
    if (hour < 1 || hour > 12) {
      const explicitMinutes = hour * 60 + minute;
      return explicitMinutes <= startMinutes
        ? explicitMinutes + 24 * 60
        : explicitMinutes;
    }
  }
  const candidates = period === 'am'
    ? [hour % 12]
    : period === 'pm'
      ? [(hour % 12) + 12]
      : [hour % 12, (hour % 12) + 12];

  const validCandidates = candidates
    .map((candidate) => candidate * 60 + minute)
    .map((candidate) => (candidate <= startMinutes ? candidate + 24 * 60 : candidate))
    .filter((candidate) => candidate - startMinutes <= 12 * 60);
  return validCandidates.length
    ? Math.min(...validCandidates)
    : null;
}

function parseTimeRange(line) {
  const normalizedLine = normalizeScheduleLine(line);
  const match = normalizedLine.match(TIME_RANGE_PATTERN);
  if (!match) {
    return null;
  }

  const startMarker = match[1] || match[4] || match[5] || match[8];
  const endMarker = match[5] || match[8] || startMarker;
  const startMinutes = resolveStartMinutes(match[2], match[3], startMarker);
  const endMinutes = startMinutes === null
    ? null
    : resolveEndMinutes(match[6], match[7], endMarker, startMinutes);
  if (
    startMinutes === null
    || endMinutes === null
    || endMinutes <= startMinutes
  ) {
    return null;
  }

  const prefix = stripDecoration(normalizedLine.slice(0, match.index));
  const suffix = stripDecoration(normalizedLine.slice(match.index + match[0].length));
  return {
    startMinutes,
    endMinutes,
    description: [prefix, suffix]
      .filter(Boolean)
      .join(' ')
      .replace(/^[\s,.;:：\-–—]+|[\s,.;:：\-–—]+$/g, '')
      .trim(),
  };
}

function dateKeyAtOffset(startDate, dayOffset) {
  const [year, month, day] = startDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function hongKongTimestamp(dateKey, minutesAfterMidnight) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day, 0, minutesAfterMidnight)
    - HONG_KONG_OFFSET_MINUTES * 60 * 1000;
  return new Date(timestamp).toISOString();
}

function validateStartDate(startDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) {
    return false;
  }
  const [year, month, day] = startDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCDay() === 1;
}

export function parseRecurringSchedule(message, options = {}) {
  const lines = String(message || '').split(/\r?\n/);
  const items = [];
  let participant = null;
  let weekday = null;
  let detectedWeekday = false;
  const warnings = [];
  const language = options.language === 'en' ? 'en' : 'zh';

  for (const [index, rawLine] of lines.entries()) {
    const line = normalizeScheduleLine(rawLine);
    const lineNumber = index + 1;
    if (!line) {
      continue;
    }
    if (isDecorativeSeparator(line)) {
      weekday = null;
      continue;
    }

    const cleanLine = stripDecoration(line);
    let activityLine = cleanLine;
    const weekdayMatch = cleanLine.match(WEEKDAY_PATTERN);
    const weekdayCandidate = !weekdayMatch
      ? cleanLine.match(WEEKDAY_CANDIDATE_PATTERN)
      : null;
    if (weekdayCandidate) {
      weekday = null;
      warnings.push(createLineWarning(
        lineNumber,
        {
          zh: `「${weekdayCandidate[1]}」不是可識別的星期標記，已略過此行。`,
          en: `“${weekdayCandidate[1]}” is not a recognized weekday; this line was skipped.`,
        },
        language,
      ));
      continue;
    }
    if (weekdayMatch) {
      const weekdayIndex = WEEKDAY_INDEX.get(weekdayMatch[1].toLowerCase());
      if (weekdayIndex === undefined) {
        weekday = null;
        warnings.push(createLineWarning(
          lineNumber,
          {
            zh: `「${weekdayMatch[1]}」不是可識別的星期標記，已略過此行。`,
            en: `“${weekdayMatch[1]}” is not a recognized weekday; this line was skipped.`,
          },
          language,
        ));
        continue;
      }
      weekday = weekdayIndex;
      detectedWeekday = true;
      activityLine = stripDecoration(weekdayMatch[2].replace(/^[\s:：\-–—]+/, ''));
      if (!activityLine) {
        continue;
      }
    }

    if (
      !weekdayMatch
      && weekday === null
      && !TIME_RANGE_PATTERN.test(cleanLine)
    ) {
      participant = cleanLine;
      continue;
    }

    if (!weekdayMatch && weekday === null && /:$/.test(cleanLine)) {
      participant = cleanLine.slice(0, -1).trim();
      continue;
    }

    if (!weekdayMatch && !TIME_RANGE_PATTERN.test(cleanLine)) {
      if (weekday !== null) {
        warnings.push(createLineWarning(
          lineNumber,
          {
            zh: '課堂時間格式無法辨識，已略過此行；可使用例如 3:25 - 4:10 或 12:00-12:45。',
            en: 'Time range was not recognized; this line was skipped. Use a format such as 3:25 - 4:10 or 12:00-12:45.',
          },
          language,
        ));
        continue;
      }
      if (detectedWeekday) {
        warnings.push(createLineWarning(
          lineNumber,
          {
            zh: '此行不是有效星期或課堂，已略過。',
            en: 'This is not a valid weekday or class line; it was skipped.',
          },
          language,
        ));
        continue;
      }
      participant = cleanLine;
      continue;
    }

    if (weekday === null) {
      if (detectedWeekday) {
        warnings.push(createLineWarning(
          lineNumber,
          {
            zh: '課堂不在有效星期標題下，已略過此行。',
            en: 'This class is not under a valid weekday heading; it was skipped.',
          },
          language,
        ));
        continue;
      }
      continue;
    }
    if (!participant) {
      warnings.push(createLineWarning(
        lineNumber,
        {
          zh: '找不到參與者名稱，已略過此行。',
          en: 'No participant name was found; this line was skipped.',
        },
        language,
      ));
      continue;
    }

    const timeRange = parseTimeRange(activityLine);
    if (!timeRange) {
      warnings.push(createLineWarning(
        lineNumber,
        {
          zh: '時間範圍無效，已略過此行；請檢查開始／結束時間及分鐘數。',
          en: 'Invalid time range; this line was skipped. Check the start/end times and minutes.',
        },
        language,
      ));
      continue;
    }
    if (!timeRange.description) {
      warnings.push(createLineWarning(
        lineNumber,
        {
          zh: '時間範圍後沒有課堂名稱，已略過此行。',
          en: 'No class name follows the time range; this line was skipped.',
        },
        language,
      ));
      continue;
    }
    items.push({
      participant,
      weekday,
      ...timeRange,
    });
  }

  if (!detectedWeekday) {
    return null;
  }
  if (!items.length) {
    return {
      error: language === 'en'
        ? 'No valid timed classes were found. Review the skipped-line warnings.'
        : '找不到有效的課堂時間，請檢查以下略過行的提示。',
      warnings,
    };
  }

  const startDate = options.startDate;
  const weeks = Number(options.weeks);
  if (!validateStartDate(startDate)) {
    return { error: 'Choose a valid Monday as the first week.' };
  }
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 4) {
    return { error: 'Choose between one and four weeks.' };
  }

  const records = [];
  for (let week = 0; week < weeks; week += 1) {
    for (const item of items) {
      const eventDate = dateKeyAtOffset(startDate, week * 7 + item.weekday);
      const endDayOffset = Math.floor(item.endMinutes / (24 * 60));
      const startMinutes = item.startMinutes % (24 * 60);
      const endMinutes = item.endMinutes % (24 * 60);
      const title = `${item.participant} — ${item.description}`;
      records.push({
        record_kind: 'plan',
        record_type: 'schedule',
        title,
        content: `${item.participant}: ${item.description}`,
        event_start: hongKongTimestamp(eventDate, startMinutes),
        event_end: hongKongTimestamp(
          dateKeyAtOffset(eventDate, endDayOffset),
          endMinutes,
        ),
        is_all_day: false,
        visibility: 'family',
        linked_plan_id: null,
        status: 'active',
        participant_names: [item.participant],
        time_zone: 'Asia/Hong_Kong',
      });
    }
  }
  if (records.length > 100) {
    return { error: 'A single import can contain at most 100 classes.' };
  }

  records.sort((left, right) => (
    new Date(left.event_start).getTime() - new Date(right.event_start).getTime()
  ));
  return {
    records,
    recurring: true,
    timeZone: 'Asia/Hong_Kong',
    warnings,
  };
}

export function hongKongDateTimeLocalValue(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const shifted = new Date(date.getTime() + HONG_KONG_OFFSET_MINUTES * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}T${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`;
}

export function hongKongDateTimeFromLocalValue(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return new Date(Number.NaN);
  }
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  ) - HONG_KONG_OFFSET_MINUTES * 60 * 1000;
  return new Date(timestamp);
}
