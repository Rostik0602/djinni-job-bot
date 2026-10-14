const { buildAiPrompt, PROFILE, MAX_DESCRIPTION_LENGTH } = require('../buildAiPrompt');

const vacancy = {
  id: '852334',
  title: 'Junior React Developer',
  description: 'Product company, B2B SaaS. React, TypeScript, Redux. English Intermediate.',
};

describe('buildAiPrompt', () => {
  test('в промпте есть профиль, правила, вакансия и формат ответа', () => {
    const prompt = buildAiPrompt(vacancy);
    expect(prompt).toContain(PROFILE);
    expect(prompt).toContain('HOW TO SCORE (1-10):');
    expect(prompt).toContain('Title: Junior React Developer');
    expect(prompt).toContain('Product company, B2B SaaS.');
    for (const field of ['"score"', '"stack"', '"english"', '"salary"', '"summary"']) {
      expect(prompt).toContain(field);
    }
  });

  test('длинное описание обрезает до лимита', () => {
    const prompt = buildAiPrompt({ ...vacancy, description: 'а'.repeat(5000) });
    expect(prompt).toContain(`${'а'.repeat(MAX_DESCRIPTION_LENGTH - 1)}…`);
    expect(prompt).not.toContain('а'.repeat(MAX_DESCRIPTION_LENGTH));
  });

  test('без описания подставляет заглушку', () => {
    expect(buildAiPrompt({ ...vacancy, description: null })).toContain('(no description)');
    expect(buildAiPrompt({ ...vacancy, description: '   ' })).toContain('(no description)');
  });

  test('профиль можно подменить', () => {
    const prompt = buildAiPrompt(vacancy, { profile: 'Senior Java developer' });
    expect(prompt).toContain('Senior Java developer');
    expect(prompt).not.toContain(PROFILE);
  });

  test('не падает на пустой вакансии', () => {
    expect(buildAiPrompt({})).toContain('Title: \n(no description)');
    expect(buildAiPrompt(null)).toContain('(no description)');
  });

  test('в профиле нет личных данных: почты, телефонов, ссылок', () => {
    expect(PROFILE).not.toMatch(/@|https?:|www\.|github|linkedin|t\.me|\+\d{2}/i);
  });

  test('название обрезается по краям пробелов', () => {
    expect(buildAiPrompt({ ...vacancy, title: '  QA  ' })).toContain('Title: QA\n');
  });

  test('описание ровно по лимиту не обрезается', () => {
    const prompt = buildAiPrompt({ ...vacancy, description: 'б'.repeat(MAX_DESCRIPTION_LENGTH) });
    expect(prompt).toContain('б'.repeat(MAX_DESCRIPTION_LENGTH));
    expect(prompt).not.toContain('…');
  });

  test('не режет эмодзи посередине', () => {
    const prompt = buildAiPrompt({ ...vacancy, description: '😀'.repeat(MAX_DESCRIPTION_LENGTH + 10) });
    expect(prompt).toContain(`${'😀'.repeat(MAX_DESCRIPTION_LENGTH - 1)}…`);
  });

  test('undefined, не-строки и пробелы вместо полей', () => {
    expect(buildAiPrompt(undefined)).toContain('(no description)');
    expect(buildAiPrompt({ title: 123, description: 456 })).toContain('Title: 123\n456');
    expect(buildAiPrompt({ title: '   ', description: '' })).toContain('Title: \n(no description)');
  });

  test('вакансия идёт после профиля и правил', () => {
    const prompt = buildAiPrompt(vacancy);
    expect(prompt.indexOf('CANDIDATE:')).toBeLessThan(prompt.indexOf('HOW TO SCORE'));
    expect(prompt.indexOf('HOW TO SCORE')).toBeLessThan(prompt.indexOf('VACANCY:'));
  });
});