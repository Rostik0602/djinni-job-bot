// Разбирает одно обновление из getUpdates — нажатие inline-кнопки под вакансией.
// Кнопки присылают callback_data вида "applied:852334" или "skipped:852334".
// Возвращает всё, что нужно следующим нодам, или null, если это не наше нажатие.
const CALLBACK_DATA = /^(applied|skipped):(\d+)$/;

// Текст всплывающего уведомления после нажатия (answerCallbackQuery, до 200 символов)
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
    // Сообщение с кнопками: из него потом уберём клавиатуру
    chatId: query.message?.chat?.id ?? null,
    messageId: query.message?.message_id ?? null,
  };
}

module.exports = { parseCallback };