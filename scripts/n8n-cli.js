const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function docker(...args) {
  console.log(`> docker ${args.join(' ')}`);
  execFileSync('docker', args, { cwd: ROOT, stdio: 'inherit' });
}

function n8n(...args) {
  docker('compose', 'exec', '-T', 'n8n', 'n8n', ...args);
}

module.exports = { docker, n8n, ROOT };