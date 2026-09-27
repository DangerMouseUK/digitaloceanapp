import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { manifest } from '../src/catalog.js';

if (process.env.GITHUB_REF_NAME !== `v${manifest.version}`)
  throw new Error('Tag must exactly match the package and manifest version.');
await mkdir('dist', { recursive: true });
const npm =
  process.env.npm_execpath ?? '/usr/local/lib/node_modules/npm/bin/npm-cli.js';
// Release workflow runs on Linux; use the npm executable when not invoked through npm.
const packed = JSON.parse(
  process.env.npm_execpath
    ? execFileSync(
        process.execPath,
        [npm, 'pack', '--json', '--pack-destination', 'dist'],
        { encoding: 'utf8' },
      )
    : execFileSync('npm', ['pack', '--json', '--pack-destination', 'dist'], {
        encoding: 'utf8',
      }),
)[0];
const archive = `digitaloceanapp-${manifest.version}.zip`;
const paths = [
  'plugin.json',
  'mcp.json',
  '.codex-plugin',
  '.mcp.json',
  'skills',
  'configs',
  'clients',
  'docs',
  'bin',
  'src',
  'data',
  'scripts',
  'tests',
  'schemas',
  '.prettierrc.json',
  '.prettierignore',
  'package.json',
  'package-lock.json',
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
];
execFileSync('zip', ['-r', `dist/${archive}`, ...paths], { stdio: 'ignore' });
const checksums = [];
for (const name of [packed.filename, archive])
  checksums.push(
    `${createHash('sha256')
      .update(await readFile(`dist/${name}`))
      .digest('hex')}  ${name}`,
  );
await writeFile('dist/SHA256SUMS', checksums.join('\n') + '\n');
console.log('Packaged release files and checksums. No npm publication.');
