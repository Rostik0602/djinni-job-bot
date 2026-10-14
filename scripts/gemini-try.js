// Пробный прогон нашего промпта на настоящих вакансиях из базы — напрямую через Gemini API, без n8n.
// Запуск:  npm run ai:try                  — две последние вакансии
//          npm run ai:try -- 3 --show-prompt — три вакансии и показать промпт
// Ключ берётся из .env (GEMINI_API_KEY), в коде и в git его нет. Модель меняется через GEMINI_MODEL.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { buildAiPrompt } = require('../src/buildAiPrompt');
const { parseAiResponse } = require('../src/parseAiResponse');

const ROOT = path.join(__dirname, '..');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const args = process.argv.slice(2);
const SHOW_PROMPT = args.includes('--show-prompt');
const COUNT = Math.min(Math.max(Number.parseInt(args.find((arg) => /^\d+$/.test(arg)), 10) || 2, 1), 5);

const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY };

// Последние вакансии из нашей базы: psql внутри контейнера postgres отдаёт их одним JSON
function latestVacancies(count) {
  const sql = `SELECT json_agg(v) FROM (SELECT id, title, description FROM vacancies ORDER BY published_at DESC LIMIT ${count}) v;`;
  const output = execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'jobbot', '-d', 'jobbot', '-t', '-A', '-c', sql],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return JSON.parse(output.trim() || 'null') ?? [];
}

// Какие Flash-Lite модели доступны твоему ключу (точные названия для API)
async function listLiteModels() {
  const list = await fetch(`${API}/models?pageSize=1000`, { headers }).then((r) => r.json());
  return (list.models ?? [])
    .filter((m) => m.name.includes('flash-lite') && m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace('models/', ''));
}

// Только промпт, без JSON-режима: так же будет спрашивать нода Gemini в n8n
async function ask(prompt) {
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const started = Date.now();
  const response = await fetch(`${API}/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, ms: Date.now() - started, data: await response.json() };
}

function isPureJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!API_KEY) {
    console.error('Нет GEMINI_API_KEY. Добавь его в .env и запускай через npm run ai:try');
    process.exit(1);
  }

  console.log('Flash-Lite модели для твоего ключа:', await listLiteModels());

  const vacancies = latestVacancies(COUNT);
  if (vacancies.length === 0) console.log('В базе нет вакансий');

  for (const [index, vacancy] of vacancies.entries()) {
    const prompt = buildAiPrompt(vacancy);
    console.log(`\n=== ${vacancy.id}: ${vacancy.title}`);
    if (SHOW_PROMPT && index === 0) console.log(`--- промпт ---\n${prompt}\n--- конец промпта ---`);

    const { status, ms, data } = await ask(prompt);
    console.log(`HTTP ${status}, ${ms} мс, модель ${MODEL}`);
    if (status !== 200) {
      console.log('Ошибка:', JSON.stringify(data.error ?? data, null, 2));
      continue;
    }

    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map((part) => part.text ?? '').join('');
    console.log('finishReason:', candidate?.finishReason);
    console.log(`Ответ как есть:\n${text}`);
    console.log('Чистый JSON?', isPureJson(text) ? 'да' : 'нет');
    console.log('После parseAiResponse:', parseAiResponse(text));
    console.log('Токены:', data.usageMetadata);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});