// Вставляет код из src/ в Code-ноды workflow между маркерами:
//   // @include-start parseVacancy.js
//   // @include-end
// Строку module.exports при вставке убирает: она нужна только для Jest.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const WORKFLOWS_DIR = path.join(ROOT, 'workflows');
const BLOCK = /\/\/ @include-start (\S+)\n[\s\S]*?\/\/ @include-end/g;

function readSource(fileName) {
  const filePath = path.join(SRC_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Маркер ссылается на src/${fileName}, но такого файла нет`);
  }
  return fs.readFileSync(filePath, 'utf8')
    .replace(/\r\n/g, '\n')                  // переносы строк Windows -> обычные
    .replace(/^module\.exports\s*=.*$/m, '') // экспорт нужен только тестам
    .trim();
}

const files = fs.readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.json'));

for (const file of files) {
  const fullPath = path.join(WORKFLOWS_DIR, file);
  const workflow = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  let updated = 0;

  for (const node of workflow.nodes) {
    const code = node.parameters?.jsCode;
    if (!code) continue;

    if (code.includes('@include-start') && !code.match(BLOCK)) {
      console.warn(`⚠ ${workflow.name} / ${node.name}: маркер есть, но формат не распознан`);
      continue;
    }

    const next = code.replace(
      BLOCK,
      (_, name) => `// @include-start ${name}\n${readSource(name)}\n// @include-end`,
    );

    if (next !== code) {
      node.parameters.jsCode = next;
      updated += 1;
    }
  }

  // Файл переписываем, только если что-то изменилось: так в git нет лишних правок
  if (updated > 0) fs.writeFileSync(fullPath, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log(`${file} («${workflow.name}»): обновлено нод ${updated}`);
}