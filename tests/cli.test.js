import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  readdir,
  symlink,
  rm,
  cp,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative, sep } from 'node:path';
import { getFileInfo } from 'prettier';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, selectServices, manifest } from '../src/catalog.js';
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

test('each client generates a complete bundle with all fifteen skills and validates', async () => {
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
        15,
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
  assert.ok(
    setup.stdout.indexOf('Services: apps, docs') <
      setup.stdout.indexOf('Generated bundle:'),
  );
  assert.ok(setup.stdout.includes('Install: Merge the MCP tables'));
  assert.ok(setup.stdout.includes('Mode: local'));
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

function runInteractive(args, answers, cwd = temp) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [cli, 'setup', '--interactive', ...args],
      { cwd },
    );
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
      if (pending.endsWith(': ')) {
        pending = '';
        const answer = answers.shift();
        if (answer === undefined) child.stdin.end();
        else child.stdin.write(answer + '\n');
      }
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (status) => {
      clearTimeout(timer);
      resolveResult({ status, stdout, stderr });
    });
  });
}

test('interactive setup completes through native prompts', async () => {
  const out = join(temp, 'interactive');
  const result = await runInteractive(
    [],
    ['codex', 'remote-oauth', 'custom', 'docs', process.platform, out],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual((await validatePath(out)).services, ['docs']);
});

test('interactive setup corrects invalid answers and limits modes to the chosen client', async () => {
  const out = join(temp, 'interactive corrections');
  const result = await runInteractive(
    [],
    [
      'invalid-client',
      'chatgpt',
      'local',
      'remote-oauth',
      'invalid-preset',
      'custom',
      'invalid-service',
      'docs',
      'invalid-platform',
      process.platform,
      out,
    ],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('Mode (remote-oauth)'));
  assert.ok(
    !result.stdout.includes('Mode (remote-oauth, remote-token, local)'),
  );
  assert.deepEqual((await validatePath(out)).services, ['docs']);
  const desktop = join(temp, 'interactive desktop');
  const selected = await runInteractive(
    ['--client', 'claude-desktop', '--services', 'docs'],
    ['remote-oauth', 'linux', 'win32', desktop],
  );
  assert.equal(selected.status, 0, selected.stderr);
  assert.ok(selected.stdout.includes('Platform (win32, darwin)'));
  assert.equal((await validatePath(desktop)).options.platform, 'win32');
});

test('interactive setup rejects invalid explicit flags before prompting and cancels after correction', async () => {
  for (const args of [
    ['--client', 'chatgpt', '--mode', 'local'],
    ['--client', 'invalid'],
    ['--mode', 'invalid'],
    ['--platform', 'invalid'],
    ['--client', 'claude-desktop', '--platform', 'linux'],
    ['--services', 'invalid'],
    ['--preset', 'core', '--services', 'apps'],
  ]) {
    const out = join(temp, 'invalid interactive output');
    const result = run(['setup', '--interactive', ...args, '--output', out], {
      input: '',
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    await assert.rejects(readdir(out));
  }
  const cwd = join(temp, 'cancelled after invalid');
  await mkdir(cwd);
  const cancelled = await runInteractive([], ['invalid-client'], cwd);
  assert.equal(cancelled.status, 130, cancelled.stderr);
  assert.deepEqual(await readdir(cwd), []);
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
      version: manifest.version,
      client: 'codex',
      mode: 'remote-oauth',
      keys: ['apps'],
      platform: process.platform,
      configFile: '.codex/config.toml',
    }),
  );
  await assert.rejects(validatePath(target), /escapes/);
});

test('bundle validation requires complete current metadata and nonempty installation instructions', async () => {
  const target = join(temp, 'metadata review');
  await createBundle(
    {
      client: 'cursor',
      mode: 'remote-oauth',
      keys: ['docs'],
      platform: process.platform,
    },
    target,
  );
  const path = join(target, 'bundle.json');
  const meta = JSON.parse(await readFile(path, 'utf8'));
  for (const field of [
    'schemaVersion',
    'version',
    'client',
    'mode',
    'keys',
    'platform',
    'configFile',
  ]) {
    const incomplete = { ...meta };
    delete incomplete[field];
    await writeFile(path, JSON.stringify(incomplete));
    await assert.rejects(validatePath(target), /metadata.*Regenerate/);
  }
  for (const invalid of [
    null,
    [],
    { ...meta, version: '0.0.0' },
    { ...meta, keys: ['docs', 'docs'] },
    { ...meta, keys: [{}] },
    { ...meta, keys: [] },
    { ...meta, schemaVersion: 2 },
    { ...meta, client: {} },
    { ...meta, platform: 'unknown' },
    { ...meta, mode: 'unknown' },
  ]) {
    await writeFile(path, JSON.stringify(invalid));
    await assert.rejects(validatePath(target), /metadata|version/);
  }
  await writeFile(path, JSON.stringify(meta));
  const guide = join(target, 'INSTALL.md');
  await writeFile(guide, 'My installation notes\n');
  await validatePath(target);
  await writeFile(guide, ' \r\n');
  await assert.rejects(validatePath(target), /INSTALL.md is empty/);
  await rm(guide);
  await assert.rejects(validatePath(target), /required files/);
  await mkdir(guide);
  await assert.rejects(validatePath(target), /regular file/);
});

test('default setup output is excluded from repository validation and formatting', async () => {
  const fixture = join(temp, 'repository fixture');
  const source = fileURLToPath(root);
  await cp(source, fixture, {
    recursive: true,
    filter: (path) =>
      ![
        '.git',
        'node_modules',
        'dist',
        'coverage',
        'output',
        'output-digitaloceanapp',
      ].includes(relative(source, path).split(sep)[0]),
  });
  try {
    await symlink(
      join(source, 'node_modules'),
      join(fixture, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch {
    await cp(join(source, 'node_modules'), join(fixture, 'node_modules'), {
      recursive: true,
    });
  }
  const setup = spawnSync(
    process.execPath,
    ['bin/digitaloceanapp.js', 'setup', '--client', 'plugin'],
    { cwd: fixture, encoding: 'utf8', timeout: 20000 },
  );
  assert.equal(setup.status, 0, setup.stderr);
  const validation = spawnSync(process.execPath, ['scripts/validate.js'], {
    cwd: fixture,
    encoding: 'utf8',
    timeout: 20000,
  });
  assert.equal(validation.status, 0, validation.stderr);
  const info = await getFileInfo(
    join(fixture, 'output-digitaloceanapp', 'INSTALL.md'),
    { ignorePath: join(fixture, '.prettierignore') },
  );
  assert.equal(info.ignored, true);
  await validatePath(join(fixture, 'output-digitaloceanapp'));
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
      'skills/deployment-preflight/SKILL.md',
      'skills/recovery-review/SKILL.md',
      'src/preview.js',
      'src/fingerprints.js',
      'docs/v3-roadmap.md',
      'tests/skills/v3-evaluation.json',
      'tests/skills/v3-independent-evaluation.json',
      'tests/fixtures/v2-cost-review.md',
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
    // npm ci caches tarballs but need not cache registry packuments. Seed the
    // isolated install with the committed production dependency resolutions,
    // rather than relying on metadata left by a developer's earlier npm install.
    const locked = JSON.parse(
      await readFile(new URL('package-lock.json', root), 'utf8'),
    );
    const isolated = {
      name: 'digitaloceanapp-package-smoke',
      version: '1.0.0',
      private: true,
      dependencies: locked.packages[''].dependencies,
    };
    await writeFile(join(install, 'package.json'), JSON.stringify(isolated));
    await writeFile(
      join(install, 'package-lock.json'),
      JSON.stringify({
        name: isolated.name,
        version: isolated.version,
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': isolated,
          ...Object.fromEntries(
            Object.entries(locked.packages).filter(
              ([path, entry]) => path && !entry.dev,
            ),
          ),
        },
      }),
    );
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
    const preview = spawnSync(
      process.execPath,
      [
        installedCli,
        'setup',
        '--client',
        'plugin',
        '--output',
        output,
        '--dry-run',
        '--json',
      ],
      { cwd: install, encoding: 'utf8' },
    );
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).skills.length, 15);
    await assert.rejects(readdir(output));
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
