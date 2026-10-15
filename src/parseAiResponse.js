const MAX_STACK_ITEMS = 6;
const MAX_FIELD_LENGTH = 100;
const MAX_SUMMARY_LENGTH = 300;

const EMPTY_VALUES = new Set([
  '', 'null', 'none', 'n/a', 'na', '-', 'unknown', 'not stated', 'not specified',
  'не вказано', 'не указано',
]);

function parseAiResponse(text) {
  const data = extractJsonObject(text);
  if (!data) return null;

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

function cleanStack(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(',');
  const result = [];
  for (const item of items) {
    const text = cleanText(item, MAX_FIELD_LENGTH);
    if (text && !result.includes(text)) result.push(text);
  }
  return result.slice(0, MAX_STACK_ITEMS);
}

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