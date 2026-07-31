const { execSync } = require('node:child_process');

try {
  execSync('husky install', { stdio: 'inherit' });
} catch {
  // continue without failing
}
