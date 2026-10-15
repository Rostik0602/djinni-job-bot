const CALLBACK_DATA = /^(applied|skipped):(\d+)$/;

const ANSWER_TEXT = {
  applied: '✅ Збережено: відгукнувся',
  skipped: '❌ Вакансію пропущено',
};

function parseCallback(update) {
  const query = update?.callback_query;
  if (!query) return null;

  const match = CALLBACK_DATA.exec(String(query.data ?? ''));
  if (!match) return null;

  const [, action, vacancyId] = match;
  return {
    updateId: update.update_id,
    callbackQueryId: query.id,
    action,
    vacancyId,
    answerText: ANSWER_TEXT[action],
    chatId: query.message?.chat?.id ?? null,
    messageId: query.message?.message_id ?? null,
  };
}

module.exports = { parseCallback };