const crypto = require('crypto');
const express = require('express');
const { parseTelegramScheduleInput } = require('../services/telegramScheduleParser');

const router = express.Router();
const CALLBACK_CONFIRM = 'fictional_preview_confirm';
const CALLBACK_CANCEL = 'fictional_preview_cancel';

function apiFailure(res, status, message) {
  return res.status(status).json({
    success: false,
    data: null,
    message,
  });
}

function apiSuccess(res, status, data, message) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

function isValidSecret(providedSecret, expectedSecret) {
  if (typeof providedSecret !== 'string' || !expectedSecret) {
    return false;
  }
  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);
  return provided.length === expected.length
    && crypto.timingSafeEqual(provided, expected);
}

function isAllowedTestChat(chatId) {
  const configuredChatId = process.env.TELEGRAM_TEST_CHAT_ID;
  return configuredChatId
    && chatId !== undefined
    && String(chatId) === configuredChatId;
}

async function callTelegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    },
  );

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Telegram returned an invalid response.');
  }

  if (!response.ok || result.ok !== true) {
    throw new Error(`Telegram request failed (${response.status}).`);
  }
  return result.result;
}

function isFictionalPreview(update) {
  return update?.message
    && typeof update.message.text === 'string'
    && isAllowedTestChat(update.message.chat?.id);
}

async function processCallbackQuery(callbackQuery) {
  const callbackData = callbackQuery.data;
  if (![CALLBACK_CONFIRM, CALLBACK_CANCEL].includes(callbackData)) {
    return false;
  }
  if (!isAllowedTestChat(callbackQuery.message?.chat?.id)) {
    return false;
  }

  await callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQuery.id,
  });
  await callTelegram('editMessageText', {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    text: callbackData === CALLBACK_CONFIRM
      ? 'Fictional preview confirmed. Nothing was saved.'
      : 'Fictional preview cancelled. Nothing was saved.',
  });
  return true;
}

router.post('/api/telegram/webhook', async (req, res) => {
  try {
    if (
      process.env.NODE_ENV !== 'development'
      || process.env.TELEGRAM_DEV_MODE !== 'true'
    ) {
      return apiFailure(res, 404, 'Telegram development webhook is disabled.');
    }

    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const testChatId = process.env.TELEGRAM_TEST_CHAT_ID;
    if (!webhookSecret || !botToken || !testChatId) {
      console.error('Telegram development webhook configuration is incomplete.');
      return apiFailure(res, 503, 'Telegram development webhook is not configured.');
    }

    if (!isValidSecret(
      req.get('X-Telegram-Bot-Api-Secret-Token'),
      webhookSecret,
    )) {
      return apiFailure(res, 401, 'Telegram webhook authentication failed.');
    }

    const callbackQuery = req.body?.callback_query;
    if (callbackQuery) {
      const processed = await processCallbackQuery(callbackQuery);
      return apiSuccess(
        res,
        200,
        { processed },
        processed ? 'Fictional preview confirmation processed.' : 'Update ignored.',
      );
    }

    if (!isFictionalPreview(req.body)) {
      return apiSuccess(res, 200, { processed: false }, 'Update ignored.');
    }

    const parsed = parseTelegramScheduleInput(req.body.message.text);
    if (!parsed) {
      return apiSuccess(res, 200, { processed: false }, 'Update ignored.');
    }

    const preview = [
      'Fictional schedule preview (not saved)',
      `Title: ${parsed.title}`,
      `Day: ${parsed.date_text}`,
      `Time: ${parsed.time_text}`,
      'No Supabase record will be created.',
      'Confirm this test preview?',
    ].join('\n');

    await callTelegram('sendMessage', {
      chat_id: req.body.message.chat.id,
      text: preview,
      reply_markup: {
        inline_keyboard: [[
          {
            text: 'Confirm (test only)',
            callback_data: CALLBACK_CONFIRM,
          },
          {
            text: 'Cancel',
            callback_data: CALLBACK_CANCEL,
          },
        ]],
      },
    });

    return apiSuccess(
      res,
      200,
      { processed: true, preview },
      'Fictional schedule preview sent.',
    );
  } catch {
    console.error('Telegram development webhook failed.');
    return apiFailure(res, 502, 'Could not process the Telegram test update.');
  }
});

module.exports = router;
