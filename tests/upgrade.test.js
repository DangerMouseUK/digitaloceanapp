import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  readdir,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createBundle } from '../src/bundle.js';
import { validatePath } from '../src/validate.js';
import { clients } from '../src/clients.js';
import { root, manifest } from '../src/catalog.js';
import { planUpgrade, upgradeBundle, upgradeSummary } from '../src/upgrade.js';

const cli = fileURLToPath(new URL('bin/digitaloceanapp.js', root));
const run = (args) =>
  spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    timeout: 20000,
  });
const baseline = JSON.parse(
  await readFile(
    new URL('./fixtures/v1-cursor-bundle.json', import.meta.url),
    'utf8',
  ),
);

async function fixture() {
  const base = await mkdtemp(join(tmpdir(), 'digitaloceanapp upgrade '));
  const source = join(base, 'old bundle');
  for (const [file, content] of Object.entries(baseline)) {
    const path = join(source, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  return { base, source };
}

test('upgrade reads a genuine V1 bundle and produces a valid replacement while preserving every source file', async () => {
  const { base, source } = await fixture();
  const plan = await planUpgrade(source);
  assert.equal(plan.fromVersion, '1.0.0-rc.1');
  assert.equal(plan.toVersion, manifest.version);
  assert.deepEqual(plan.options.keys, ['apps', 'docs']);
  assert.equal(
    plan.changes.filter(
      (item) => item.status === 'added' && item.file.endsWith('SKILL.md'),
    ).length,
    4,
  );
  const output = join(base, 'new bundle');
  await upgradeBundle(plan, output);
  assert.deepEqual((await validatePath(output)).options, plan.options);
  assert.ok(
    (await readFile(join(output, 'MIGRATE.md'), 'utf8')).includes(
      'Manual migration',
    ),
  );
  for (const [file, content] of Object.entries(baseline))
    assert.equal(await readFile(join(source, file), 'utf8'), content);
});

test('upgrade retains explicit selections for every client/mode without expanding to a preset', async () => {
  const base = await mkdtemp(
    join(tmpdir(), 'digitaloceanapp upgrade adapters '),
  );
  for (const [client, adapter] of Object.entries(clients)) {
    for (const mode of adapter.modes) {
      const source = join(base, `${client}-${mode}`);
      const options = { client, mode, keys: ['docs'], platform: 'win32' };
      await createBundle(options, source);
      const plan = await planUpgrade(source);
      assert.deepEqual(plan.options, options);
      const output = join(base, `${client}-${mode}-new`);
      await upgradeBundle(plan, output);
      assert.deepEqual((await validatePath(output)).options, options);
    }
  }
});

test('upgrade dry run reports customizations without copying or exposing their contents or names', async () => {
  const { base, source } = await fixture();
  const secret = 'dop_v1_' + 'x'.repeat(40);
  const configPath = join(source, '.cursor/mcp.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.mcpServers.personal = {
    command: 'never-execute',
    env: { PASSWORD: secret },
  };
  await writeFile(configPath, JSON.stringify(config));
  await writeFile(join(source, 'INSTALL.md'), 'My personal notes ' + secret);
  await writeFile(join(source, secret + '.txt'), secret);
  const target = join(base, 'dry run output');
  const result = run([
    'upgrade',
    '--path',
    source,
    '--output',
    target,
    '--dry-run',
  ]);
  assert.equal(result.status, 0);
  assert.equal((result.stdout + result.stderr).includes(secret), false);
  assert.ok(result.stdout.includes('REVIEW: .cursor/mcp.json'));
  assert.ok(result.stdout.includes('REVIEW: INSTALL.md'));
  assert.ok(result.stdout.includes('manual review: 1'));
  await assert.rejects(readdir(target));
  const plan = await planUpgrade(source);
  await upgradeBundle(plan, target);
  assert.equal(
    (await readFile(join(target, '.cursor/mcp.json'), 'utf8')).includes(secret),
    false,
  );
  assert.ok(JSON.parse(await readFile(configPath, 'utf8')).mcpServers.personal);
  assert.equal(
    (await readFile(join(target, 'MIGRATE.md'), 'utf8')).includes(secret),
    false,
  );
  await assert.rejects(readFile(join(target, secret + '.txt')));
});

test('upgrade rejects unknown versions, invalid metadata and unsupported combinations without output or sensitive errors', async () => {
  const { base, source } = await fixture();
  const metaPath = join(source, 'bundle.json');
  const original = JSON.parse(await readFile(metaPath, 'utf8'));
  const target = join(base, 'must not exist');
  const secret = 'sensitive-metadata-sentinel';
  for (const meta of [
    null,
    [],
    { ...original, schemaVersion: 2 },
    { ...original, version: secret },
    { ...original, keys: ['apps', secret] },
    { ...original, keys: ['apps', 'apps'] },
    { ...original, keys: [] },
    { ...original, client: secret },
    { ...original, client: ['cursor'] },
    { ...original, client: 'chatgpt', mode: 'local' },
    { ...original, client: 'claude-desktop', platform: 'linux' },
    { ...original, configFile: '../' + secret },
  ]) {
    await writeFile(metaPath, JSON.stringify(meta));
    const result = run(['upgrade', '--path', source, '--output', target]);
    assert.equal(result.status, 1);
    assert.equal((result.stdout + result.stderr).includes(secret), false);
    await assert.rejects(readdir(target));
  }
  await writeFile(metaPath, '{"password":"' + secret);
  const malformed = run(['upgrade', '--path', source, '--output', target]);
  assert.equal(malformed.status, 1);
  assert.equal((malformed.stdout + malformed.stderr).includes(secret), false);
});

test('upgrade refuses existing and nested output directories and preserves original files', async () => {
  const { base, source } = await fixture();
  const plan = await planUpgrade(source);
  const existing = join(base, 'existing');
  await mkdir(existing);
  await writeFile(join(existing, 'sentinel'), 'keep');
  for (const output of [existing, source, join(source, 'nested')])
    await assert.rejects(upgradeBundle(plan, output), /new directory|outside/);
  assert.equal(await readFile(join(existing, 'sentinel'), 'utf8'), 'keep');
  await assert.rejects(readdir(join(source, 'nested')));
  assert.equal(run(['upgrade', '--path', source]).status, 1);
  assert.equal(run(['upgrade', '--path', source, '--dry-run']).status, 0);
});

test('upgrade does not follow source links or write through an output link back into the source', async (t) => {
  const { base, source } = await fixture();
  const outside = join(base, 'outside');
  await mkdir(outside);
  const alias = join(base, 'alias');
  try {
    await symlink(
      source,
      alias,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('Directory links unavailable');
    throw error;
  }
  const plan = await planUpgrade(source);
  await assert.rejects(upgradeBundle(plan, join(alias, 'new')), /outside/);
  await symlink(
    outside,
    join(source, 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(planUpgrade(source), /link/);
  assert.equal(upgradeSummary(plan).includes(outside), false);
});
