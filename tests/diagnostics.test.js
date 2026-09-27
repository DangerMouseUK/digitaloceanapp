import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root } from '../src/catalog.js';
import { createBundle } from '../src/bundle.js';

const cli = fileURLToPath(new URL('bin/digitaloceanapp.js', root));
const run = (args, env = process.env) =>
  spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    timeout: 20000,
    env,
  });

test('diagnostic JSON has a stable envelope and separates offline validity from authentication', async () => {
  const base = await mkdtemp(join(tmpdir(), 'digitaloceanapp report '));
  const path = join(base, 'bundle');
  await createBundle(
    {
      client: 'cursor',
      mode: 'remote-oauth',
      keys: ['apps'],
      platform: process.platform,
    },
    path,
  );
  for (const command of ['validate', 'doctor']) {
    const result = run([command, '--path', path, '--json']);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    const report = JSON.parse(result.stdout);
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.command, command);
    assert.equal(report.ok, true);
    assert.equal(report.authentication, 'unverified');
    assert.deepEqual(report.services, ['apps']);
    assert.equal(report.findings[0].code, 'CONFIGURATION_VALID');
    assert.ok(
      report.findings.every(
        (f) => typeof f.ok === 'boolean' && /^[A-Z_]+$/.test(f.code),
      ),
    );
  }
});

test('doctor JSON reports missing prerequisites with remedies and failure exit status', async () => {
  const base = await mkdtemp(
    join(tmpdir(), 'digitaloceanapp missing prerequisites '),
  );
  const path = join(base, 'bundle');
  await createBundle(
    {
      client: 'cursor',
      mode: 'local',
      keys: ['apps'],
      platform: process.platform,
    },
    path,
  );
  const env = {
    ...process.env,
    PATH: '',
    Path: '',
    DIGITALOCEAN_API_TOKEN: '',
  };
  const result = run(['doctor', '--path', path, '--json'], env);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.deepEqual(
    report.findings.filter((f) => !f.ok).map((f) => f.code),
    ['NPX_AVAILABLE', 'TOKEN_ENVIRONMENT'],
  );
  assert.ok(report.findings.filter((f) => !f.ok).every((f) => f.remedy));
});

test('diagnostic JSON failures suppress credential values, parser data and invalid arguments', async () => {
  const base = await mkdtemp(
    join(tmpdir(), 'digitaloceanapp sensitive report '),
  );
  const path = join(base, 'config.json');
  const secret = 'dop_v1_' + 'q'.repeat(40);
  for (const content of [
    '{"secret":"' + secret,
    JSON.stringify({
      mcpServers: {
        'digitalocean-apps': { headers: { Authorization: secret } },
      },
    }),
  ]) {
    await writeFile(path, content);
    for (const command of ['validate', 'doctor']) {
      const result = run([
        command,
        '--path',
        path,
        '--client',
        'cursor',
        '--json',
      ]);
      assert.equal(result.status, 1);
      assert.equal(result.stderr, '');
      assert.equal((result.stdout + result.stderr).includes(secret), false);
      const report = JSON.parse(result.stdout);
      assert.equal(report.ok, false);
      assert.equal(report.findings[0].code, 'CONFIGURATION_INVALID');
      assert.ok(report.findings[0].remedy);
    }
  }
  for (const command of ['validate', 'doctor']) {
    for (const args of [['--json'], ['--json', '--unknown', secret]]) {
      const result = run([command, ...args]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout.includes(secret), false);
      assert.equal(
        JSON.parse(result.stdout).findings[0].code,
        'INVALID_ARGUMENTS',
      );
    }
    const reordered = run([
      '--json',
      command,
      '--path',
      path,
      '--client',
      'cursor',
    ]);
    assert.equal(reordered.status, 1);
    assert.equal(
      JSON.parse(reordered.stdout).findings[0].code,
      'CONFIGURATION_INVALID',
    );
    const ambiguousArgument = run(['--path', 'validate', command, '--json']);
    assert.equal(ambiguousArgument.status, 1);
    assert.equal(JSON.parse(ambiguousArgument.stdout).command, command);
  }
});

test('diagnostic JSON validates managed entries while preserving unrelated installed configuration', async () => {
  const base = await mkdtemp(
    join(tmpdir(), 'digitaloceanapp installed report '),
  );
  const path = join(base, 'bundle');
  await createBundle(
    {
      client: 'cursor',
      mode: 'remote-oauth',
      keys: ['apps'],
      platform: process.platform,
    },
    path,
  );
  const configPath = join(path, '.cursor/mcp.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.mcpServers.other = { command: 'must-not-run', args: ['--keep'] };
  const before = JSON.stringify(config);
  await writeFile(configPath, before);
  for (const command of ['validate', 'doctor']) {
    const result = run([
      command,
      '--path',
      configPath,
      '--client',
      'cursor',
      '--services',
      'apps',
      '--json',
    ]);
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).ok, true);
    assert.equal(await readFile(configPath, 'utf8'), before);
    assert.equal(result.stdout.includes('must-not-run'), false);
  }
});
