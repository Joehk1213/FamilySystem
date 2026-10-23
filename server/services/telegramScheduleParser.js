const FICTIONAL_SCHEDULE_INPUT =
  'TEST ONLY: 星期五下午 3 點開會（虛構）';

function parseTelegramScheduleInput(input) {
  if (input !== FICTIONAL_SCHEDULE_INPUT) {
    return null;
  }

  return {
    title: '開會',
    date_text: '星期五',
    time_text: '下午 3 點',
    is_all_day: false,
    content: null,
  };
}

module.exports = {
  FICTIONAL_SCHEDULE_INPUT,
  parseTelegramScheduleInput,
};
