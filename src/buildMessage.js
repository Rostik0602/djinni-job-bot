// Собирает текст сообщения о вакансии для Telegram.
// Нода Telegram отправляет его с Parse Mode = HTML: заголовок выделяем жирным,
// а весь текст со стороны (Djinni, позже Gemini) экранируем, чтобы символы
// < > & не ломали разметку и Telegram не отклонил сообщение.
const TIME_ZONE = 'Europe/Kyiv';
const MAX_SUMMARY_LENGTH = 300;

function buildMessage(vacancy, { now = new Date() } = {}) {
  const lines = [`🆕 <b>${escapeHtml(vacancy.title)}</b>`];

  // Строки от ИИ появятся на этапе 5; пока полей нет, нет и строк
  if (vacancy.ai_score) lines.push(`🎯 Підходить: ${vacancy.ai_score}/10`);
  const ai = readAiSummary(vacancy.ai_summary);
  const stack = Array.isArray(ai.stack) ? ai.stack.join(', ') : ai.stack;
  if (stack) lines.push(`🧩 ${escapeHtml(stack)}`);
  if (ai.english) lines.push(`🇬🇧 ${escapeHtml(ai.english)}`);
  if (ai.salary) lines.push(`💰 ${escapeHtml(ai.salary)}`);
  // Сначала обрезаем, потом экранируем: иначе можно разрезать &amp; посередине
  if (ai.summary) lines.push(`📝 ${escapeHtml(truncate(ai.summary, MAX_SUMMARY_LENGTH))}`);

  const publishedAt = new Date(vacancy.published_at);
  if (vacancy.published_at && !Number.isNaN(publishedAt.getTime())) {
    lines.push(`🕒 ${formatPublishedAt(publishedAt, now)}`);
  }
  lines.push(`🔗 ${escapeHtml(vacancy.url)}`);

  return lines.join('\n');
}

// В режиме HTML Telegram требует заменить три символа.
// & меняем первым, иначе готовые &lt; превратятся в &amp;lt;
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ai_summary — колонка JSONB: из Postgres приходит объектом, строку JSON тоже понимаем.
// Битые данные не роняют отправку: просто не будет строк от ИИ
function readAiSummary(value) {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data && typeof data === 'object' ? data : {};
}

// Array.from режет по символам, а не по половинкам эмодзи (в JS они из двух частей)
function truncate(text, maxLength) {
  const chars = Array.from(String(text).trim());
  if (chars.length <= maxLength) return chars.join('');
  return `${chars.slice(0, maxLength - 1).join('').trimEnd()}…`;
}

// «сьогодні, 14:01» / «вчора, 23:30» / «13.01, 14:46» — по времени Киева
function formatPublishedAt(date, now) {
  const published = kyivParts(date);
  const today = kyivParts(now);
  const time = `${published.hour}:${published.minute}`;
  const daysAgo = dayNumber(today) - dayNumber(published);

  if (daysAgo === 0) return `сьогодні, ${time}`;
  if (daysAgo === 1) return `вчора, ${time}`;
  return `${published.day}.${published.month}, ${time}`;
}

// Части даты по часовому поясу Киева: { year, month, day, hour, minute }.
// Летнее и зимнее время Intl учитывает сам
function kyivParts(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
}

// Номер календарного дня: разница номеров = сколько дней прошло
function dayNumber({ year, month, day }) {
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / (24 * 60 * 60 * 1000);
}

module.exports = { buildMessage, formatPublishedAt };