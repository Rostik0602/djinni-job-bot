const { parseCallback } = require('../parseCallback');

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

  test.each([
    ['пробел после', 'applied:852334 '],
    ['перевод строки после', 'applied:852334\n'],
    ['заглавные', 'APPLIED:852334'],
    ['отрицательный номер', 'applied:-5'],
    ['дробный номер', 'skipped:1.5'],
    ['два двоеточия', 'applied::852334'],
    ['без двоеточия', 'applied852334'],
  ])('битые данные: %s — null', (_, data) => {
    expect(parseCallback(makeUpdate(data))).toBeNull();
  });

  test.each([null, 123, {}, [], true])('data не строка (%p) — null', (data) => {
    expect(parseCallback(makeUpdate(data))).toBeNull();
  });

  test('callback_query null, строка или {} — null', () => {
    expect(parseCallback({ update_id: 1, callback_query: null })).toBeNull();
    expect(parseCallback({ update_id: 1, callback_query: 'x' })).toBeNull();
    expect(parseCallback({ update_id: 1, callback_query: {} })).toBeNull();
  });

  test('не объект на входе не роняет функцию', () => {
    expect(parseCallback('applied:1')).toBeNull();
    expect(parseCallback(42)).toBeNull();
    expect(parseCallback([])).toBeNull();
  });

  test('message без chat — chatId null, messageId сохраняется', () => {
    const cb = parseCallback(makeUpdate('applied:1', { message: { message_id: 7 } }));
    expect(cb.chatId).toBeNull();
    expect(cb.messageId).toBe(7);
  });

  test('номер с ведущими нулями остаётся строкой', () => {
    expect(parseCallback(makeUpdate('skipped:00123')).vacancyId).toBe('00123');
  });
});