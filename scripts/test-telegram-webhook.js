const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const {
  FICTIONAL_SCHEDULE_INPUT,
  parseTelegramScheduleInput,
} = require('../server/services/telegramScheduleParser');

process.env.NODE_ENV = 'development';
process.env.TELEGRAM_DEV_MODE = 'true';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token-never-real';
process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret-never-real-123456';
process.env.TELEGRAM_TEST_CHAT_ID = '123456789';

const telegramCalls = [];
global.fetch = async (url, options) => {
  telegramCalls.push({ url: String(url), body: JSON.parse(options.body) });
  return new Response(
    JSON.stringify({ ok: true, result: { message_id: 99 } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

const telegramRouter = require('../server/routes/telegram');
const app = express();
app.use(express.json());
app.use(telegramRouter);

function postJson(server, body, secret = process.env.TELEGRAM_WEBHOOK_SECRET) {
  const address = server.address();
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path: '/api/telegram/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-Telegram-Bot-Api-Secret-Token': secret,
      },
    }, (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { responseBody += chunk; });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, body: JSON.parse(responseBody) });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.end(payload);
  });
}

async function main() {
  assert.deepEqual(
    parseTelegramScheduleInput(FICTIONAL_SCHEDULE_INPUT),
    {
      title: '開會',
      date_text: '星期五',
      time_text: '下午 3 點',
      is_all_day: false,
      content: null,
    },
  );
  assert.equal(parseTelegramScheduleInput('真實家庭行程'), null);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const unauthorized = await postJson(
      server,
      { update_id: 1 },
      'incorrect-secret',
    );
    assert.equal(unauthorized.status, 401);
    assert.equal(telegramCalls.length, 0);

    const realLikeInput = await postJson(server, {
      update_id: 2,
      message: {
        chat: { id: 123456789 },
        text: '小朋友星期五下午三點看醫生',
      },
    });
    assert.equal(realLikeInput.status, 200);
    assert.equal(realLikeInput.body.data.processed, false);
    assert.equal(telegramCalls.length, 0);

    const wrongChat = await postJson(server, {
      update_id: 3,
      message: {
        chat: { id: 987654321 },
        text: FICTIONAL_SCHEDULE_INPUT,
      },
    });
    assert.equal(wrongChat.body.data.processed, false);
    assert.equal(telegramCalls.length, 0);

    const preview = await postJson(server, {
      update_id: 4,
      message: {
        message_id: 44,
        chat: { id: 123456789 },
        text: FICTIONAL_SCHEDULE_INPUT,
      },
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.data.processed, true);
    assert.match(preview.body.data.preview, /Fictional schedule preview \(not saved\)/);
    assert.equal(telegramCalls.length, 1);
    assert.equal(telegramCalls[0].body.chat_id, 123456789);
    assert.equal(
      telegramCalls[0].body.reply_markup.inline_keyboard[0][0].callback_data,
      'fictional_preview_confirm',
    );

    const confirmation = await postJson(server, {
      update_id: 5,
      callback_query: {
        id: 'fictional-callback-id',
        data: 'fictional_preview_confirm',
        message: { message_id: 99, chat: { id: 123456789 } },
      },
    });
    assert.equal(confirmation.body.data.processed, true);
    assert.equal(telegramCalls.length, 3);
    assert.equal(telegramCalls[1].body.callback_query_id, 'fictional-callback-id');
    assert.match(telegramCalls[2].body.text, /Nothing was saved/);

    console.log(
      'Telegram webhook tests passed: secret validation, chat allowlist, strict fictional input, preview, callback confirmation, and no persistence.',
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

main().catch((error) => {
  console.error('Telegram webhook tests failed:', error.message);
  process.exitCode = 1;
});
