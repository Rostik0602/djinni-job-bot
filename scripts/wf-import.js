const fs = require('node:fs');
const path = require('node:path');
const { docker, n8n, ROOT } = require('./n8n-cli');

const WORKFLOWS_DIR = path.join(ROOT, 'workflows');
const workflows = fs.readdirSync(WORKFLOWS_DIR)
  .filter((name) => name.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8')));

n8n('import:workflow', '--separate', '--input=/workflows');

for (const workflow of workflows.filter((wf) => wf.active)) {
  console.log(`Публикую «${workflow.name}»`);
  n8n('publish:workflow', `--id=${workflow.id}`);
}

docker('compose', 'restart', 'n8n');
console.log('Готово. Обнови страницу n8n в браузере.');