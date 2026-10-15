const fs = require('node:fs');
const path = require('node:path');
const { n8n, ROOT } = require('./n8n-cli');

const WORKFLOWS_DIR = path.join(ROOT, 'workflows');
const jsonFiles = () => fs.readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.json'));

for (const file of jsonFiles()) fs.unlinkSync(path.join(WORKFLOWS_DIR, file));

n8n('export:workflow', '--all', '--separate', '--pretty', '--output=/workflows');

for (const file of jsonFiles()) {
  const fullPath = path.join(WORKFLOWS_DIR, file);
  const workflow = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  if (workflow.isArchived) {
    fs.unlinkSync(fullPath);
    console.log(`${file}: «${workflow.name}» в архиве, файл удалён`);
    continue;
  }

  delete workflow.shared;

  fs.writeFileSync(fullPath, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log(`${file}: «${workflow.name}»${workflow.active ? ' (опубликован)' : ''}`);
}