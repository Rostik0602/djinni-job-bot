const { buildMessage, formatPublishedAt } = require('../buildMessage');

// Даты зимние: зимой Киев всегда UTC+2, тесты не зависят от перехода на летнее время
const NOW = new Date('2026-01-15T13:00:00.000Z'); // 15:00 по Киеву

const vacancy = {
  id: '852334',
  title: 'Front-end Developer (React)',
  url: 'https://djinni.co/jobs/852334-front-end-developer-react/',
  published_at: '2026-01-15T12:01:00.000Z', // 14:01 по Киеву
  ai_score: null,
  ai_summary: null,
};

describe('buildMessage', () => {
  test('без оценки ИИ: название, время и ссылка', () => {
    expect(buildMessage(vacancy, { now: NOW })).toBe([
      '🆕 <b>Front-end Developer (React)</b>',
      '🕒 сьогодні, 14:01',
      '🔗 https://djinni.co/jobs/852334-front-end-developer-react/',
    ].join('\n'));
  });

  test('с оценкой ИИ: все строки в формате из ТЗ', () => {
    const withAi = {
      ...vacancy,
      ai_score: 8,
      ai_summary: {
        score: 8,
        stack: ['React', 'TypeScript', 'Next.js'],
        english: 'Intermediate',
        salary: '$800–1200',
        summary: 'Продуктова компанія, B2B SaaS, команда з 5 фронтендерів',
      },
    };
    expect(buildMessage(withAi, { now: NOW })).toBe([
      '🆕 <b>Front-end Developer (React)</b>',
      '🎯 Підходить: 8/10',
      '🧩 React, TypeScript, Next.js',
      '🇬🇧 Intermediate',
      '💰 $800–1200',
      '📝 Продуктова компанія, B2B SaaS, команда з 5 фронтендерів',
      '🕒 сьогодні, 14:01',
      '🔗 https://djinni.co/jobs/852334-front-end-developer-react/',
    ].join('\n'));
  });

  test('экранирует < > & в тексте со стороны', () => {
    const text = buildMessage({
      ...vacancy,
      title: 'Junior <React> & Node',
      ai_score: 6,
      ai_summary: { summary: 'Стек: <script> & Co' },
    }, { now: NOW });
    expect(text).toContain('🆕 <b>Junior &lt;React&gt; &amp; Node</b>');
    expect(text).toContain('📝 Стек: &lt;script&gt; &amp; Co');
  });

  test('понимает ai_summary строкой JSON и stack строкой', () => {
    const text = buildMessage({ ...vacancy, ai_score: 7, ai_summary: '{"english":"B1","stack":"Vue"}' }, { now: NOW });
    expect(text).toContain('🎯 Підходить: 7/10');
    expect(text).toContain('🧩 Vue');
    expect(text).toContain('🇬🇧 B1');
  });

  test('битый ai_summary не роняет функцию', () => {
    const text = buildMessage({ ...vacancy, ai_score: 7, ai_summary: '{не json' }, { now: NOW });
    expect(text).toContain('🎯 Підходить: 7/10');
    expect(text).not.toContain('🧩');
    expect(text).toContain('🔗');
  });

  test('пустые поля ИИ не выводит', () => {
    const text = buildMessage({ ...vacancy, ai_score: 5, ai_summary: { stack: [], salary: '' } }, { now: NOW });
    expect(text).toContain('🎯 Підходить: 5/10');
    expect(text).not.toContain('🧩');
    expect(text).not.toContain('💰');
  });

  test('обрезает слишком длинное описание до 300 символов', () => {
    const text = buildMessage({ ...vacancy, ai_score: 6, ai_summary: { summary: 'а'.repeat(500) } }, { now: NOW });
    const summary = text.split('\n').find((line) => line.startsWith('📝')).replace('📝 ', '');
    expect(summary).toHaveLength(300);
    expect(summary.endsWith('…')).toBe(true);
  });

  test('без даты или с битой датой строки 🕒 нет', () => {
    expect(buildMessage({ ...vacancy, published_at: null }, { now: NOW })).not.toContain('🕒');
    expect(buildMessage({ ...vacancy, published_at: 'вчора' }, { now: NOW })).not.toContain('🕒');
  });
});

describe('formatPublishedAt', () => {
  test('сегодня', () => {
    expect(formatPublishedAt(new Date('2026-01-15T12:01:00Z'), NOW)).toBe('сьогодні, 14:01');
  });

  test('учитывает часовой пояс: 22:30 UTC 14-го — это уже 15-е по Киеву', () => {
    expect(formatPublishedAt(new Date('2026-01-14T22:30:00Z'), NOW)).toBe('сьогодні, 00:30');
  });

  test('вчера', () => {
    expect(formatPublishedAt(new Date('2026-01-14T21:30:00Z'), NOW)).toBe('вчора, 23:30');
  });

  test('раньше — дата и время', () => {
    expect(formatPublishedAt(new Date('2026-01-13T12:46:13Z'), NOW)).toBe('13.01, 14:46');
  });

  test('граница суток по Киеву: 21:59 UTC 14-го — вчера, 22:00 UTC — сегодня', () => {
    expect(formatPublishedAt(new Date('2026-01-14T21:59:00Z'), NOW)).toBe('вчора, 23:59');
    expect(formatPublishedAt(new Date('2026-01-14T22:00:00Z'), NOW)).toBe('сьогодні, 00:00');
  });

  test('переход через границу месяца и года', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    expect(formatPublishedAt(new Date('2025-12-31T10:00:00Z'), now)).toBe('вчора, 12:00');
    expect(formatPublishedAt(new Date('2025-12-30T10:00:00Z'), now)).toBe('30.12, 12:00');
  });

  test('дата из будущего показывается датой, а не падает', () => {
    expect(formatPublishedAt(new Date('2026-01-17T10:00:00Z'), NOW)).toBe('17.01, 12:00');
  });
});

describe('buildMessage: дополнительные случаи', () => {
  test('ai_score 0 и ai_summary {} — без строк ИИ', () => {
    const text = buildMessage({ ...vacancy, ai_score: 0, ai_summary: {} }, { now: NOW });
    expect(text).not.toContain('🎯');
    expect(text).not.toContain('📝');
  });

  test.each([
    ['строка "null"', 'null'],
    ['массив', ['a']],
    ['число', 5],
    ['пустая строка', ''],
  ])('ai_summary: %s не роняет функцию', (_, ai_summary) => {
    const text = buildMessage({ ...vacancy, ai_score: 5, ai_summary }, { now: NOW });
    expect(text).toContain('🎯 Підходить: 5/10');
    expect(text).not.toContain('🧩');
  });

  test('экранирует stack, english, salary и url', () => {
    const text = buildMessage({
      ...vacancy,
      url: 'https://djinni.co/jobs/1/?a=1&b=<2>',
      ai_score: 5,
      ai_summary: { stack: ['C<T>', 'R&D'], english: '<B1>', salary: '$1 & more' },
    }, { now: NOW });
    expect(text).toContain('🧩 C&lt;T&gt;, R&amp;D');
    expect(text).toContain('🇬🇧 &lt;B1&gt;');
    expect(text).toContain('💰 $1 &amp; more');
    expect(text).toContain('🔗 https://djinni.co/jobs/1/?a=1&amp;b=&lt;2&gt;');
  });

  test('не режет эмодзи посередине при обрезке', () => {
    const text = buildMessage({ ...vacancy, ai_score: 6, ai_summary: { summary: '😀'.repeat(400) } }, { now: NOW });
    const summary = text.split('\n').find((l) => l.startsWith('📝')).replace('📝 ', '');
    expect(Array.from(summary)).toHaveLength(300);
  });

  test('описание ровно 300 символов не обрезается', () => {
    const text = buildMessage({ ...vacancy, ai_score: 6, ai_summary: { summary: 'б'.repeat(300) } }, { now: NOW });
    expect(text).toContain('б'.repeat(300));
    expect(text).not.toContain('…');
  });

  test('пустая вакансия не роняет функцию', () => {
    expect(buildMessage({}, { now: NOW })).toContain('<b></b>');
  });

  test('без опций использует текущее время', () => {
    const text = buildMessage({ ...vacancy, published_at: new Date().toISOString() });
    expect(text).toContain('сьогодні');
  });
});