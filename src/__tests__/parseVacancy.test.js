const { parseVacancy, toPlainText } = require('../parseVacancy');

// Фиксированное «сейчас»: тесты не зависят от того, когда их запускают
const NOW = new Date('2026-10-14T12:00:00.000Z');

// Типичный item из ноды RSS Read; в тестах меняем только нужные поля
function makeItem(overrides = {}) {
  return {
    title: '  Junior Frontend Developer (React)  ',
    link: 'https://djinni.co/jobs/852334-junior-frontend-developer-react/',
    guid: 'https://djinni.co/jobs/852334-junior-frontend-developer-react/',
    isoDate: '2026-10-14T09:00:00.000Z',
    pubDate: 'Wed, 14 Oct 2026 12:00:00 +0300',
    contentSnippet: 'Опис вакансії',
    ...overrides,
  };
}

describe('parseVacancy', () => {
  test('достаёт id, название, ссылку, описание и дату', () => {
    expect(parseVacancy(makeItem(), { now: NOW })).toEqual({
      id: '852334',
      title: 'Junior Frontend Developer (React)',
      url: 'https://djinni.co/jobs/852334-junior-frontend-developer-react/',
      description: 'Опис вакансії',
      published_at: '2026-10-14T09:00:00.000Z',
    });
  });

  test('берёт ссылку из guid, если link пустой', () => {
    expect(parseVacancy(makeItem({ link: '' }), { now: NOW }).id).toBe('852334');
  });

  test('возвращает null, если в ссылке нет номера вакансии', () => {
    expect(parseVacancy(makeItem({ link: 'https://djinni.co/jobs/', guid: '' }), { now: NOW })).toBeNull();
    expect(parseVacancy(makeItem({ link: 'https://example.com/852334', guid: '' }), { now: NOW })).toBeNull();
  });

  test('возвращает null для пустого item', () => {
    expect(parseVacancy({}, { now: NOW })).toBeNull();
  });

  test('берёт дату из pubDate, если isoDate нет', () => {
    const result = parseVacancy(makeItem({ isoDate: undefined }), { now: NOW });
    expect(result.published_at).toBe('2026-10-14T09:00:00.000Z');
  });

  test('возвращает null, если дату не удалось разобрать', () => {
    expect(parseVacancy(makeItem({ isoDate: 'вчора', pubDate: undefined }), { now: NOW })).toBeNull();
  });

  test('пропускает вакансии старше maxAgeHours', () => {
    const item = makeItem({ isoDate: '2026-10-13T11:00:00.000Z' }); // 25 часов назад
    expect(parseVacancy(item, { now: NOW, maxAgeHours: 24 })).toBeNull();
    expect(parseVacancy(item, { now: NOW, maxAgeHours: 48 })).not.toBeNull();
  });

  test('по умолчанию окно — 24 часа', () => {
    const fresh = makeItem({ isoDate: '2026-10-13T13:00:00.000Z' }); // 23 часа назад
    const old = makeItem({ isoDate: '2026-10-13T11:00:00.000Z' });   // 25 часов назад
    expect(parseVacancy(fresh, { now: NOW })).not.toBeNull();
    expect(parseVacancy(old, { now: NOW })).toBeNull();
  });

  test('без описания возвращает пустую строку, а не "undefined"', () => {
    expect(parseVacancy(makeItem({ contentSnippet: undefined }), { now: NOW }).description).toBe('');
  });
});

describe('toPlainText', () => {
  test('убирает неразрывные пробелы, пробелы по краям строк и лишние пустые строки', () => {
    const input = 'Про нас\n\u00a0\n\u00a0\n\u00a0\nВимоги:  \n  React';
    expect(toPlainText(input)).toBe('Про нас\n\nВимоги:\nReact');
  });

  test('null и undefined превращает в пустую строку', () => {
    expect(toPlainText(null)).toBe('');
    expect(toPlainText(undefined)).toBe('');
  });
});