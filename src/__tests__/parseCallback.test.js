const { parseCallback } = require('../parseCallback');

// Так выглядит нажатие кнопки в ответе getUpdates (лишние поля убраны)
function makeUpdate(data, queryOverrides = {}) {
  return {
    update_id: 100500,
    callback_query: {
      id: '4382bfdwdsb323b2d9',
      from: { id: 111222333, first_name: 'Test' },
      message: { message_id: 42, chat: { id: 111222333, type: 'private' } },
      data,
      ...queryOverrides,
    },
  };
}

describe('parseCallback', () => {
  test('нажатие «Відгукнувся»', () => {
    expect(parseCallback(makeUpdate('applied:852334'))).toEqual({
      updateId: 100500,
      callbackQueryId: '4382bfdwdsb323b2d9',
      action: 'applied',
      vacancyId: '852334',
      answerText: '✅ Збережено: відгукнувся',
      chatId: 111222333,
      messageId: 42,
    });
  });

  test('нажатие «Пропустити»', () => {
    const callback = parseCallback(makeUpdate('skipped:618672'));
    expect(callback.action).toBe('skipped');
    expect(callback.vacancyId).toBe('618672');
    expect(callback.answerText).toBe('❌ Вакансію пропущено');
  });

  test('обычное сообщение боту, а не нажатие — null', () => {
    expect(parseCallback({ update_id: 1, message: { text: '/start' } })).toBeNull();
  });

  test.each([
    '',
    'applied',
    'applied:',
    'applied:abc',
    'deleted:852334',
    'applied:852334:extra',
    ' applied:852334',
  ])('чужие или битые данные кнопки «%s» — null', (data) => {
    expect(parseCallback(makeUpdate(data))).toBeNull();
  });

  test('нет data у нажатия — null', () => {
    expect(parseCallback(makeUpdate(undefined))).toBeNull();
  });

  test('пустой update не роняет функцию', () => {
    expect(parseCallback(null)).toBeNull();
    expect(parseCallback(undefined)).toBeNull();
    expect(parseCallback({})).toBeNull();
  });

  test('нет сообщения у нажатия — chatId и messageId null', () => {
    const callback = parseCallback(makeUpdate('applied:852334', { message: undefined }));
    expect(callback.action).toBe('applied');
    expect(callback.chatId).toBeNull();
    expect(callback.messageId).toBeNull();
  });
});