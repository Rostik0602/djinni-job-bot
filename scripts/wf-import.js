// Загружает workflow из workflows/ в n8n и возвращает им прежнее состояние публикации.
//
// Почему так сложно:
// 1) CLI-импорт n8n снимает публикацию со всех загруженных workflow;
// 2) публикацию через CLI работающий n8n увидит только после перезапуска.
const fs = require('node:fs');
const path = require('node:path');
const { docker, n8n, ROOT } = require('./n8n-cli');

const WORKFLOWS_DIR = path.join(ROOT, 'workflows');
const workflows = fs.readdirSync(WORKFLOWS_DIR)
  .filter((name) => name.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8')));

// 1. Импорт всех файлов из папки
n8n('import:workflow', '--separate', '--input=/workflows');

// 2. Публикуем заново те, что были опубликованы на момент выгрузки
for (const workflow of workflows.filter((wf) => wf.active)) {
  console.log(`Публикую «${workflow.name}»`);
  n8n('publish:workflow', `--id=${workflow.id}`);
}

// 3. Перезапуск, чтобы n8n подхватил новые версии и расписания
docker('compose', 'restart', 'n8n');
console.log('Готово. Обнови страницу n8n в браузере.');