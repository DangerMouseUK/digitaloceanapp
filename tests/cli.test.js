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
import { join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, selectServices } from '../src/catalog.js';
import { clients } from '../src/clients.js';
import { createBundle } from '../src/bundle.js';
import { validatePath } from '../src/validate.js';
import { diagnose } from '../src/doctor.js';

const cli = fileURLToPath(new URL('bin/digitaloceanapp.js', root));
const temp = await mkdtemp(join(tmpdir(), 'digitaloceanapp tests '));
const run = (args, extra = {}) =>
  spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    timeout: 20000,
    ...extra,
  });

test('each client generates a complete bundle with all nine skills and validates', async () => {
  for (const client of Object.keys(clients))
    for (const mode of clients[client].modes) {
      const target = join(temp, `${client}-${mode}`);
      await createBundle(
        { client, mode, keys: selectServices(), platform: 'win32' },
        target,
      );
      const result = await validatePath(target);
      assert.deepEqual(result.services, selectServices());
      assert.equal(
        (await readdir(join(target, clients[client].skills))).length,
        9,
      );
      assert.ok(
        (await readFile(join(target, 'INSTALL.md'), 'utf8')).includes('Remove'),
      );
      assert.ok(
        (await readFile(join(target, 'LICENSE'), 'utf8')).includes('MIT'),
      );
    }
});

test('setup never overwrites output and fails before writing invalid selections', async () => {
  const existing = join(temp, 'existing');
  await mkdir(existing);
  await writeFile(join(existing, 'sentinel'), 'keep');
  assert.notEqual(
    run(['setup', '--client', 'codex', '--output', existing]).status,
    0,
  );
  assert.equal(await readFile(join(existing, 'sentinel'), 'utf8'), 'keep');
  const invalid = join(temp, 'invalid');
  assert.notEqual(
    run([
      'setup',
      '--client',
      'chatgpt',
      '--mode',
      'local',
      '--output',
      invalid,
    ]).status,
    0,
  );
  await assert.rejects(readdir(invalid));
});

test('CLI setup, validate, services and doctor work from an unrelated directory', async () => {
  const out = join(temp, 'cli bundle spaces');
  const env = {
    ...process.env,
    DIGITALOCEAN_API_TOKEN: 'sentinel-local-secret',
  };
  const setup = run(
    [
      'setup',
      '--client',
      'codex',
      '--services',
      'apps,docs',
      '--mode',
      'local',
      '--output',
      out,
    ],
    { cwd: temp, env },
  );
  assert.equal(setup.status, 0, setup.stderr);
  assert.equal(run(['validate', '--path', out], { cwd: temp }).status, 0);
  const doctor = run(['doctor', '--path', out], { cwd: temp, env });
  assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
  assert.ok(doctor.stdout.includes('unverified'));
  assert.ok(
    !(doctor.stdout + doctor.stderr).includes(env.DIGITALOCEAN_API_TOKEN),
  );
  const missing = await diagnose(
    out,
    {},
    { PATH: '', DIGITALOCEAN_API_TOKEN: '' },
  );
  assert.equal(missing.findings.filter((f) => !f.ok).length, 2);
  const catalog = run(['services', '--json']);
  assert.equal(JSON.parse(catalog.stdout).services.length, 21);
  const userHomeConfig = join(temp, 'personal-settings.json');
  await writeFile(userHomeConfig, 'untouched');
  assert.equal(await readFile(userHomeConfig, 'utf8'), 'untouched');
});

test('CLI missing inputs, invalid options and cancellation return failure without output', async () => {
  for (const args of [
    ['setup'],
    ['setup', '--client', 'codex', '--services', ''],
    ['validate'],
    ['doctor'],
    ['bad'],
    ['services', '--mode', 'local'],
    ['setup', '--token', 'sentinel-sensitive-argument'],
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0, JSON.stringify(args));
    assert.ok(
      !(result.stdout + result.stderr).includes('sentinel-sensitive-argument'),
    );
  }
  const cancelled = run(['setup', '--interactive'], { input: '', cwd: temp });
  assert.equal(cancelled.status, 130, cancelled.stdout + cancelled.stderr);
  await assert.rejects(readdir(join(temp, 'output-digitaloceanapp')));
});

test('interactive setup completes through native prompts', async () => {
  const out = join(temp, 'interactive');
  const answers = [
    'codex',
    'remote-oauth',
    'custom',
    'docs',
    process.platform,
    out,
  ];
  const result = await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [cli, 'setup', '--interactive'], {
      cwd: temp,
    });
    let stdout = '',
      stderr = '',
      pending = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Interactive test timed out'));
    }, 15000);
    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      pending += text;
      if (pending.endsWith(': ') && answers.length) {
        pending = '';
        child.stdin.write(answers.shift() + '\n');
      }
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', reject);
    child.on('close', (status) => {
      clearTimeout(timer);
      resolveResult({ status, stdout, stderr });
    });
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual((await validatePath(out)).services, ['docs']);
});

test('malformed/secret configurations fail without leaking values on stdout or stderr', async () => {
  const path = join(temp, 'sensitive.json');
  const value = 'dop_v1_' + 'b'.repeat(64);
  await writeFile(
    path,
    JSON.stringify({
      mcpServers: {
        'digitalocean-apps': {
          url: 'https://apps.mcp.digitalocean.com/mcp',
          headers: { Authorization: `Bearer ${value}` },
        },
      },
    }),
  );
  for (const command of ['validate', 'doctor']) {
    const result = run([
      command,
      '--path',
      path,
      '--client',
      'cursor',
      '--services',
      'apps',
    ]);
    assert.notEqual(result.status, 0);
    assert.ok(!(result.stdout + result.stderr).includes(value));
  }
});

test('bundle validation rejects tampered metadata and missing skills', async () => {
  const target = join(temp, 'tampered');
  await createBundle(
    {
      client: 'codex',
      mode: 'remote-oauth',
      keys: ['apps'],
      platform: process.platform,
    },
    target,
  );
  const metaPath = join(target, 'bundle.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  await writeFile(
    metaPath,
    JSON.stringify({ ...meta, configFile: '../outside.toml' }),
  );
  await assert.rejects(validatePath(target));
  await writeFile(metaPath, JSON.stringify(meta));
  await writeFile(
    join(target, '.agents/skills/cost-review/SKILL.md'),
    'replaced',
  );
  await assert.rejects(validatePath(target), /supporting files/);
});

test('bundle references cannot escape through directory links', async (t) => {
  const target = join(temp, 'linked');
  await mkdir(target);
  const outside = join(temp, 'outside');
  await mkdir(outside);
  try {
    await symlink(
      outside,
      join(target, '.codex'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch (error) {
    if (error.code === 'EPERM') {
      t.skip('OS does not permit directory links');
      return;
    }
    throw error;
  }
  await writeFile(join(outside, 'config.toml'), '[mcp_servers]');
  await writeFile(
    join(target, 'bundle.json'),
    JSON.stringify({
      schemaVersion: 1,
      client: 'codex',
      mode: 'remote-oauth',
      keys: ['apps'],
      platform: process.platform,
      configFile: '.codex/config.toml',
    }),
  );
  await assert.rejects(validatePath(target), /escapes/);
});

test(
  'packed artifact installs offline and runs independently of the repository',
  { timeout: 60000 },
  async () => {
    const npm = process.env.npm_execpath;
    assert.ok(
      npm,
      'Run the suite using npm test so the npm CLI path is available.',
    );
    const pack = spawnSync(
      process.execPath,
      [npm, 'pack', '--json', '--pack-destination', temp],
      { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 30000 },
    );
    assert.equal(pack.status, 0, pack.stderr);
    const details = JSON.parse(pack.stdout)[0];
    for (const required of [
      'plugin.json',
      'mcp.json',
      '.codex-plugin/plugin.json',
      '.mcp.json',
      'data/services.json',
      'skills/cost-review/SKILL.md',
      'LICENSE',
      'CHANGELOG.md',
    ])
      assert.ok(
        details.files.some((f) => f.path === required),
        required,
      );
    assert.ok(
      !details.files.some(
        (f) =>
          f.path.startsWith('output/') ||
          f.path.includes('.env') ||
          f.path.endsWith('.test.js'),
      ),
    );
    const install = join(temp, 'isolated install');
    await mkdir(install);
    await writeFile(join(install, 'package.json'), '{"private":true}');
    const installed = spawnSync(
      process.execPath,
      [
        npm,
        'install',
        '--offline',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        join(temp, details.filename),
      ],
      { cwd: install, encoding: 'utf8', timeout: 30000 },
    );
    assert.equal(installed.status, 0, installed.stderr);
    const installedCli = resolve(
      install,
      'node_modules/digitaloceanapp/bin/digitaloceanapp.js',
    );
    const output = join(install, 'bundle');
    const execution = spawnSync(
      process.execPath,
      [installedCli, 'setup', '--client', 'plugin', '--output', output],
      { cwd: install, encoding: 'utf8' },
    );
    assert.equal(execution.status, 0, execution.stderr);
    const validate = spawnSync(
      process.execPath,
      [installedCli, 'validate', '--path', output],
      { cwd: install, encoding: 'utf8' },
    );
    assert.equal(validate.status, 0, validate.stderr);
  },
);
