// Разбирает ответ Gemini. Модели иногда оборачивают JSON в ```json, пишут текст
// до или после, путают типы полей. Функция достаёт JSON-объект, проверяет и чистит поля.
// При любом сбое возвращает null: тогда вакансия уйдёт в Telegram без блока с оценкой.
const MAX_STACK_ITEMS = 6;
const MAX_FIELD_LENGTH = 100;
const MAX_SUMMARY_LENGTH = 300;

// Так модели иногда пишут «нет данных» вместо null
const EMPTY_VALUES = new Set([
  '', 'null', 'none', 'n/a', 'na', '-', 'unknown', 'not stated', 'not specified',
  'не вказано', 'не указано',
]);

function parseAiResponse(text) {
  const data = extractJsonObject(text);
  if (!data) return null;

  // Без оценки весь ответ бесполезен
  const rawScore = typeof data.score === 'number' ? data.score : Number.parseFloat(data.score);
  if (!Number.isFinite(rawScore)) return null;

  return {
    score: Math.min(Math.max(Math.round(rawScore), 1), 10),
    stack: cleanStack(data.stack),
    english: cleanText(data.english, MAX_FIELD_LENGTH),
    salary: cleanText(data.salary, MAX_FIELD_LENGTH),
    summary: cleanText(data.summary, MAX_SUMMARY_LENGTH),
  };
}

// Сначала ищем блок ```json ... ```, потом берём текст от первой { до последней }
function extractJsonObject(text) {
  const raw = String(text ?? '');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = fenced ? fenced[1] : raw;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    const data = JSON.parse(candidate.slice(start, end + 1));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Стек: массив или строка через запятую → до 6 непустых уникальных названий
function cleanStack(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(',');
  const result = [];
  for (const item of items) {
    const text = cleanText(item, MAX_FIELD_LENGTH);
    if (text && !result.includes(text)) result.push(text);
  }
  return result.slice(0, MAX_STACK_ITEMS);
}

// Строка или число → строка без лишних пробелов; «нет данных» и всё остальное → null
function cleanText(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (EMPTY_VALUES.has(text.toLowerCase())) return null;
  return truncate(text, maxLength);
}

function truncate(text, maxLength) {
  const chars = Array.from(text);
  if (chars.length <= maxLength) return text;
  return `${chars.slice(0, maxLength - 1).join('').trimEnd()}…`;
}

module.exports = { parseAiResponse };