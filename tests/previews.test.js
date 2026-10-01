import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root } from '../src/catalog.js';
import { clients } from '../src/clients.js';
import { createBundle } from '../src/bundle.js';

const cli = fileURLToPath(new URL('bin/digitaloceanapp.js', root));
const run = (args, cwd) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, DIGITALOCEAN_API_TOKEN: 'preview-secret-sentinel' },
  });

test('setup previews every client and mode without creating output and matches generated files', async () => {
  const base = await mkdtemp(join(tmpdir(), 'digitaloceanapp preview spaces '));
  for (const [client, adapter] of Object.entries(clients)) {
    for (const mode of adapter.modes) {
      const output = join(base, `${client}-${mode}`);
      const args = [
        'setup',
        '--client',
        client,
        '--mode',
        mode,
        '--platform',
        'win32',
        '--services',
        'docs',
        '--output',
        output,
      ];
      const result = run([...args, '--dry-run', '--json'], base);
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.schemaVersion, 1);
      assert.equal(report.dryRun, true);
      assert.equal(report.authentication, 'unverified');
      assert.deepEqual(report.selection, {
        client,
        mode,
        keys: ['docs'],
        platform: 'win32',
      });
      assert.equal(report.skills.length, 15);
      assert.deepEqual(
        report.tasks.map((task) => task.skill),
        ['documentation-research'],
      );
      assert.equal(
        (result.stdout + result.stderr).includes('preview-secret-sentinel'),
        false,
      );
      assert.equal(result.stdout.includes(output), false);
      await assert.rejects(readdir(output));
      const generated = run(args, base);
      assert.equal(generated.status, 0, generated.stderr);
      for (const file of report.files)
        assert.ok((await readFile(join(output, file))).length);
    }
  }
  const text = run(['setup', '--client', 'codex', '--dry-run'], base);
  assert.equal(text.status, 0);
  assert.equal(text.stdout.includes('deployment-preflight'), true);
  await assert.rejects(readdir(join(base, 'output-digitaloceanapp')));
});

test('preview errors are single redacted JSON reports and never create files or prompt', async () => {
  const base = await mkdtemp(join(tmpdir(), 'digitaloceanapp preview errors '));
  const secret = 'private-argument-sentinel';
  const output = join(base, secret);
  for (const args of [
    ['setup', '--client', secret, '--dry-run'],
    ['setup', '--client', 'chatgpt', '--mode', 'local', '--dry-run'],
    ['setup', '--client', 'claude-desktop', '--platform', 'linux', '--dry-run'],
    ['setup', '--client', 'codex', '--services', secret, '--dry-run'],
    ['setup', '--client', 'codex', '--token', secret, '--dry-run'],
    ['setup', '--client', 'codex'],
    ['setup', '--interactive', '--dry-run'],
    ['setup', '--dry-run'],
    ['upgrade', '--path', output],
    ['upgrade', '--path', output, '--dry-run'],
  ]) {
    const result = run(
      [...args, '--json', ...(args[0] === 'setup' ? ['--output', output] : [])],
      base,
    );
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, false);
    assert.equal(report.authentication, 'unverified');
    assert.equal(report.findings.length, 1);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout.includes(secret), false);
    await assert.rejects(readdir(output));
  }
});

test('upgrade JSON preview suppresses custom content and filenames while preserving the source', async () => {
  const base = await mkdtemp(
    join(tmpdir(), 'digitaloceanapp upgrade preview '),
  );
  const source = join(base, 'old bundle');
  const output = join(base, 'new bundle');
  await createBundle(
    {
      client: 'cursor',
      mode: 'remote-oauth',
      keys: ['apps', 'docs'],
      platform: 'win32',
    },
    source,
  );
  const secret = 'private-customization-sentinel';
  await writeFile(join(source, 'INSTALL.md'), secret);
  await writeFile(join(source, `${secret}.txt`), secret);
  const result = run(
    ['upgrade', '--path', source, '--output', output, '--dry-run', '--json'],
    base,
  );
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.extraFileCount, 1);
  assert.equal(
    report.changes.find((item) => item.file === 'INSTALL.md').status,
    'customized',
  );
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stdout.includes(source), false);
  assert.equal(await readFile(join(source, 'INSTALL.md'), 'utf8'), secret);
  await assert.rejects(readdir(output));
});
