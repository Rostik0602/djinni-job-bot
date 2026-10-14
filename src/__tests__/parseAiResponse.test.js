const { parseAiResponse } = require('../parseAiResponse');

// Настоящий ответ Gemini 3.5 Flash-Lite из npm run ai:try
const REAL_RESPONSE = `{
  "score": 4,
  "stack": [
    "Angular",
    ".NET Core",
    "MS SQL",
    "EF Core",
    "C#"
  ],
  "english": "B1+",
  "salary": null,
  "summary": "SoftPlus Ukraine шукає Trainee/Junior Full Stack розробника для роботи з Angular та .NET Core на віддаленій основі."
}`;

const EXPECTED = {
  score: 4,
  stack: ['Angular', '.NET Core', 'MS SQL', 'EF Core', 'C#'],
  english: 'B1+',
  salary: null,
  summary: 'SoftPlus Ukraine шукає Trainee/Junior Full Stack розробника для роботи з Angular та .NET Core на віддаленій основі.',
};

const json = (overrides) => JSON.stringify({
  score: 8, stack: ['React'], english: 'B1', salary: '$800', summary: 'Опис', ...overrides,
});

describe('parseAiResponse: обёртки и мусор', () => {
  test('настоящий ответ Gemini', () => {
    expect(parseAiResponse(REAL_RESPONSE)).toEqual(EXPECTED);
  });

  test('JSON в блоке ```json', () => {
    expect(parseAiResponse(`\`\`\`json\n${REAL_RESPONSE}\n\`\`\``)).toEqual(EXPECTED);
  });

  test('текст до и после JSON', () => {
    expect(parseAiResponse(`Here is the result:\n${REAL_RESPONSE}\nHope it helps!`)).toEqual(EXPECTED);
  });

  test.each([
    ['битый JSON', '{"score": 8, "stack": ['],
    ['JSON без кавычек у ключей', '{score: 8}'],
    ['просто текст', 'Sorry, I cannot help with that.'],
    ['массив вместо объекта', '[8, "React"]'],
    ['пустая строка', ''],
    ['null', null],
    ['undefined', undefined],
  ])('%s — null', (_, text) => {
    expect(parseAiResponse(text)).toBeNull();
  });
});

describe('parseAiResponse: score', () => {
  test.each([
    [8, 8],
    ['8', 8],
    ['7.5', 8],
    [15, 10],
    [0, 1],
    [-3, 1],
  ])('score %p → %p', (score, expected) => {
    expect(parseAiResponse(json({ score })).score).toBe(expected);
  });

  test.each([null, 'abc', '', true, undefined])('score %p — весь ответ null', (score) => {
    expect(parseAiResponse(json({ score }))).toBeNull();
  });
});

describe('parseAiResponse: остальные поля', () => {
  test('stack строкой через запятую', () => {
    expect(parseAiResponse(json({ stack: 'React, TypeScript , ,Node.js' })).stack)
      .toEqual(['React', 'TypeScript', 'Node.js']);
  });

  test('stack: не больше 6, без дублей и мусора', () => {
    const stack = ['A', 'B', 'A', '', null, { x: 1 }, 'C', 'D', 'E', 'F', 'G'];
    expect(parseAiResponse(json({ stack })).stack).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  test('stack отсутствует — пустой массив', () => {
    expect(parseAiResponse(json({ stack: undefined })).stack).toEqual([]);
  });

  test.each([null, 'null', 'N/A', 'Not specified', 'не вказано', '  '])('english/salary %p → null', (value) => {
    const result = parseAiResponse(json({ english: value, salary: value }));
    expect(result.english).toBeNull();
    expect(result.salary).toBeNull();
  });

  test('salary числом превращается в строку', () => {
    expect(parseAiResponse(json({ salary: 1000 })).salary).toBe('1000');
  });

  test('summary: лишние пробелы и переносы убираются', () => {
    expect(parseAiResponse(json({ summary: '  Продуктова\n компанія,   B2B  ' })).summary).toBe('Продуктова компанія, B2B');
  });

  test('summary длиннее 300 символов обрезается', () => {
    const { summary } = parseAiResponse(json({ summary: 'а'.repeat(500) }));
    expect(Array.from(summary)).toHaveLength(300);
    expect(summary.endsWith('…')).toBe(true);
  });
});