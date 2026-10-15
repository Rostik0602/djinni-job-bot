function parseVacancy(item, { now = new Date(), maxAgeHours = 24 } = {}) {
  if (!item || typeof item !== 'object') return null;
  const url = String(item.link || item.guid || '').trim();

  const match = url.match(/\/jobs\/(\d+)/);
  if (!match) return null;

  const publishedAt = new Date(item.isoDate || item.pubDate);
  if (Number.isNaN(publishedAt.getTime())) return null;

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

function toPlainText(text) {
  return String(text ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { parseVacancy, toPlainText };