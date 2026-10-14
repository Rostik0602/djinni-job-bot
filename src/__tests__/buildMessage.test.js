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
});