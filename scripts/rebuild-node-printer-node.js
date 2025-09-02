const { execSync } = require('child_process');
const path = require('path');

const modDir = path.join(__dirname, '..', 'node_modules', '@grandchef', 'node-printer');

function run(cmd) {
  console.log('[rebuild:native:node]', cmd);
  execSync(cmd, { stdio: 'inherit', cwd: modDir });
}

run('npm rebuild @grandchef/node-printer');