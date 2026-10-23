import assert from 'node:assert/strict';
import {
  hasWeeklyScheduleMarkers,
  parseRecurringSchedule,
} from '../public/recurring-schedule.mjs';

const syntheticTimetable = [
  'Child Alpha',
  '',
  '📅 Mon —',
  '🎨 Class A 3：30 － 4：45',
  '',
  'Class B — 5.30–7.15',
  'Class C 3:25 - 4:10',
  'Class D 12:00-12:45',
  'Tue:',
  '5:15-9:00 Class C',
  'This row has no recognizable time',
  '****',
  'Child Beta',
  '✨ Monday: 6-7:00 Class D',
  'Wed:',
  '2-3:00 Class E',
].join('\n');

assert.equal(hasWeeklyScheduleMarkers(syntheticTimetable), true);

const result = parseRecurringSchedule(syntheticTimetable, {
  startDate: '2026-10-26',
  weeks: 1,
});

assert.equal(result.error, undefined);
assert.equal(result.records.length, 7);
const classA = result.records.find((record) => record.title === 'Child Alpha — Class A');
assert.equal(classA.event_start, '2026-10-26T07:30:00.000Z');
assert.equal(classA.event_end, '2026-10-26T08:45:00.000Z');
const classB = result.records.find((record) => record.title === 'Child Alpha — Class B');
assert.equal(classB.event_start, '2026-10-26T09:30:00.000Z');
assert.equal(classB.event_end, '2026-10-26T11:15:00.000Z');
const spacedRange = result.records.find((record) => record.title === 'Child Alpha — Class C');
assert.equal(spacedRange.event_start, '2026-10-26T07:25:00.000Z');
assert.equal(spacedRange.event_end, '2026-10-26T08:10:00.000Z');
const fourDigitClock = result.records.find((record) => record.title === 'Child Alpha — Class D');
assert.equal(fourDigitClock.event_start, '2026-10-26T04:00:00.000Z');
assert.equal(fourDigitClock.event_end, '2026-10-26T04:45:00.000Z');
const childBetaClass = result.records.find((record) => record.title === 'Child Beta — Class D');
assert.ok(childBetaClass);
assert.equal(childBetaClass.event_start, '2026-10-26T10:00:00.000Z');
assert.equal(result.warnings.length, 1);
assert.equal(result.warnings[0].lineNumber, 11);
assert.match(result.warnings[0].message, /第 11 行/);

const malformedTimetable = [
  'Child Alpha',
  'Mon:',
  '',
  '📌 Dance class 3:99–4:45',
].join('\n');
const errorResult = parseRecurringSchedule(malformedTimetable, {
  startDate: '2026-10-26',
  weeks: 1,
});
assert.match(errorResult.error, /找不到有效的課堂時間/);
assert.equal(errorResult.warnings[0].lineNumber, 4);
assert.match(errorResult.warnings[0].message, /第 4 行/);
assert.match(errorResult.warnings[0].message, /時間範圍/);

const englishErrorResult = parseRecurringSchedule(malformedTimetable, {
  startDate: '2026-10-26',
  weeks: 1,
  language: 'en',
});
assert.match(englishErrorResult.error, /No valid timed classes/);
assert.match(englishErrorResult.warnings[0].message, /Line 4/);
assert.match(englishErrorResult.warnings[0].message, /Invalid time range/);

const unsupportedDay = parseRecurringSchedule(
  'Child Alpha\nMon:\n3:30-4:45 Class A\nMnd:\n2:00-3:00 Class B',
  { startDate: '2026-10-26', weeks: 1 },
);
assert.equal(unsupportedDay.warnings[0].lineNumber, 4);
assert.match(unsupportedDay.warnings[0].message, /第 4 行/);
assert.equal(unsupportedDay.records.length, 1);

console.log('Recurring schedule parser tests passed.');
