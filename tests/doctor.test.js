import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executableAvailable, diagnose } from '../src/doctor.js';
import { createBundle } from '../src/bundle.js';
import { services } from '../src/catalog.js';

test('doctor finds executable files rather than directories and uses target PATH separators', async () => {
  const base = await mkdtemp(join(tmpdir(), 'digitaloceanapp doctor '));
  const empty = join(base, 'empty');
  const bins = join(base, 'bin with spaces');
  await mkdir(empty);
  await mkdir(bins);
  await mkdir(join(empty, 'npx.cmd'));
  await mkdir(join(empty, 'npx'));
  assert.equal(
    await executableAvailable('npx', { PATH: empty }, 'win32'),
    false,
  );
  assert.equal(
    await executableAvailable('npx', { PATH: empty }, process.platform),
    false,
  );
  await writeFile(join(bins, 'npx.cmd'), 'This fixture must never execute.');
  assert.equal(
    await executableAvailable('npx', { Path: `${empty};${bins}` }, 'win32'),
    true,
  );
  assert.equal(await executableAvailable('npx', { PATH: '' }, 'win32'), false);
  if (process.platform !== 'win32') {
    const file = join(bins, 'npx');
    await writeFile(file, 'This fixture must never execute.', { mode: 0o600 });
    assert.equal(
      await executableAvailable('npx', { PATH: `${empty}:${bins}` }, 'linux'),
      false,
    );
    await chmod(file, 0o700);
    assert.equal(
      await executableAvailable('npx', { PATH: `${empty}:${bins}` }, 'linux'),
      true,
    );
  }
});

test('doctor reports remedies and uses remote authentication independently of local availability', async () => {
  const base = await mkdtemp(join(tmpdir(), 'digitaloceanapp diagnostics '));
  const target = join(base, 'local');
  await createBundle(
    {
      client: 'cursor',
      mode: 'local',
      keys: ['apps'],
      platform: process.platform,
    },
    target,
  );
  const result = await diagnose(target, {}, { PATH: '' });
  assert.equal(result.findings.filter((item) => !item.ok).length, 2);
  assert.ok(
    result.findings.filter((item) => !item.ok).every((item) => item.remedy),
  );
  const original = services.get('apps');
  try {
    services.set('apps', { ...original, local: null });
    for (const mode of ['remote-oauth', 'remote-token']) {
      const path = join(base, mode);
      await createBundle(
        { client: 'cursor', mode, keys: ['apps'], platform: process.platform },
        path,
      );
      const remote = await diagnose(path, {}, { PATH: '' });
      assert.equal(
        remote.findings.filter((item) => !item.ok).length,
        mode === 'remote-token' ? 1 : 0,
      );
    }
  } finally {
    services.set('apps', original);
  }
});
