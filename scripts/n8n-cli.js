// Обёртка над docker compose для скриптов выгрузки и загрузки workflow.
// execFileSync передаёт аргументы напрямую, без оболочки, поэтому Git Bash
// не превратит путь /workflows в путь внутри своей папки.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function docker(...args) {
  console.log(`> docker ${args.join(' ')}`);
  execFileSync('docker', args, { cwd: ROOT, stdio: 'inherit' });
}

// Команда CLI n8n внутри контейнера: docker compose exec -T n8n n8n <args>
function n8n(...args) {
  docker('compose', 'exec', '-T', 'n8n', 'n8n', ...args);
}

module.exports = { docker, n8n, ROOT };