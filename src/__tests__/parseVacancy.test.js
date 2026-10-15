const { parseVacancy, toPlainText } = require('../parseVacancy');

const NOW = new Date('2026-10-14T12:00:00.000Z');

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

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['строка', 'https://djinni.co/jobs/852334/'],
    ['число', 852334],
  ])('item не объект (%s) — null', (_, item) => {
    expect(parseVacancy(item, { now: NOW })).toBeNull();
  });

  test('берёт дату из pubDate, если isoDate нет', () => {
    const result = parseVacancy(makeItem({ isoDate: undefined }), { now: NOW });
    expect(result.published_at).toBe('2026-10-14T09:00:00.000Z');
  });

  test('возвращает null, если дату не удалось разобрать', () => {
    expect(parseVacancy(makeItem({ isoDate: 'вчора', pubDate: undefined }), { now: NOW })).toBeNull();
  });

  test('пропускает вакансии старше maxAgeHours', () => {
    const item = makeItem({ isoDate: '2026-10-13T11:00:00.000Z' });
    expect(parseVacancy(item, { now: NOW, maxAgeHours: 24 })).toBeNull();
    expect(parseVacancy(item, { now: NOW, maxAgeHours: 48 })).not.toBeNull();
  });

  test('по умолчанию окно — 24 часа', () => {
    const fresh = makeItem({ isoDate: '2026-10-13T13:00:00.000Z' });
    const old = makeItem({ isoDate: '2026-10-13T11:00:00.000Z' });
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

  test('пустая и пробельная строка', () => {
    expect(toPlainText('')).toBe('');
    expect(toPlainText('  \n\t ')).toBe('');
  });

  test('число превращает в строку', () => {
    expect(toPlainText(42)).toBe('42');
  });
});

describe('parseVacancy: дополнительные случаи', () => {
  test.each([
    ['пробелы вместо ссылки', '   '],
    ['/jobs/ без цифр', 'https://djinni.co/jobs/abc-123/'],
    ['номер не после /jobs/', 'https://djinni.co/company/852334/'],
  ])('битая ссылка: %s — null', (_, link) => {
    expect(parseVacancy(makeItem({ link, guid: '' }), { now: NOW })).toBeNull();
  });

  test('берёт только номер из ссылки со слагом и параметрами', () => {
    const link = 'https://djinni.co/jobs/618672-trainee-react-2026/?utm=1';
    expect(parseVacancy(makeItem({ link }), { now: NOW }).id).toBe('618672');
  });

  test('пустая строка вместо даты — null', () => {
    expect(parseVacancy(makeItem({ isoDate: '', pubDate: '' }), { now: NOW })).toBeNull();
  });

  test('нет ни isoDate, ни pubDate — null', () => {
    expect(parseVacancy(makeItem({ isoDate: undefined, pubDate: undefined }), { now: NOW })).toBeNull();
  });

  test('ровно maxAgeHours проходит, на минуту больше — нет', () => {
    const edge = makeItem({ isoDate: '2026-10-13T12:00:00.000Z' });
    const over = makeItem({ isoDate: '2026-10-13T11:59:00.000Z' });
    expect(parseVacancy(edge, { now: NOW })).not.toBeNull();
    expect(parseVacancy(over, { now: NOW })).toBeNull();
  });

  test('пустое название — пустая строка', () => {
    expect(parseVacancy(makeItem({ title: undefined }), { now: NOW }).title).toBe('');
    expect(parseVacancy(makeItem({ title: '   ' }), { now: NOW }).title).toBe('');
  });

  test('вызов без опций использует значения по умолчанию', () => {
    const item = makeItem({ isoDate: new Date().toISOString() });
    expect(parseVacancy(item)).not.toBeNull();
  });
});