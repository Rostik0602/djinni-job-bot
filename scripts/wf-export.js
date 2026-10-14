// Выгружает все workflow из n8n в папку workflows/ и готовит файлы для git.
const fs = require('node:fs');
const path = require('node:path');
const { n8n, ROOT } = require('./n8n-cli');

const WORKFLOWS_DIR = path.join(ROOT, 'workflows');
const jsonFiles = () => fs.readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.json'));

// Старые файлы удаляем, чтобы в папке не оставались workflow, которых уже нет в n8n
for (const file of jsonFiles()) fs.unlinkSync(path.join(WORKFLOWS_DIR, file));

n8n('export:workflow', '--all', '--separate', '--pretty', '--output=/workflows');

for (const file of jsonFiles()) {
  const fullPath = path.join(WORKFLOWS_DIR, file);
  const workflow = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  // Архивные workflow (например, error-test) в репозитории не нужны
  if (workflow.isArchived) {
    fs.unlinkSync(fullPath);
    console.log(`${file}: «${workflow.name}» в архиве, файл удалён`);
    continue;
  }

  // В shared лежат имя и email владельца: в публичный репозиторий это не кладём
  delete workflow.shared;

  fs.writeFileSync(fullPath, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log(`${file}: «${workflow.name}»${workflow.active ? ' (опубликован)' : ''}`);
}