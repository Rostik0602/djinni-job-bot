// Разбирает один item из ноды RSS Read в объект вакансии.
// Возвращает null, если вакансию нужно пропустить.
function parseVacancy(item, { now = new Date(), maxAgeHours = 24 } = {}) {
  if (!item || typeof item !== 'object') return null;
  const url = String(item.link || item.guid || '').trim();

  // Номер вакансии из ссылки: /jobs/618672-trainee-... -> "618672"
  const match = url.match(/\/jobs\/(\d+)/);
  if (!match) return null;

  const publishedAt = new Date(item.isoDate || item.pubDate);
  if (Number.isNaN(publishedAt.getTime())) return null;

  // Слишком старые вакансии пропускаем
  const ageHours = (now.getTime() - publishedAt.getTime()) / (60 * 60 * 1000);
  if (ageHours > maxAgeHours) return null;

  return {
    id: match[1],
    title: String(item.title || '').trim(),
    url,
    description: toPlainText(item.contentSnippet),
    published_at: publishedAt.toISOString(),
  };
}

// contentSnippet — уже текст без HTML, убираем только лишние пробелы и пустые строки
function toPlainText(text) {
  return String(text ?? '')
    .replace(/\u00a0/g, ' ')     // неразрывные пробелы (&nbsp;) -> обычные
    .replace(/[ \t]+\n/g, '\n')  // пробелы в конце строк
    .replace(/\n[ \t]+/g, '\n')  // пробелы в начале строк
    .replace(/\n{3,}/g, '\n\n')  // не больше одной пустой строки подряд
    .trim();
}

module.exports = { parseVacancy, toPlainText };