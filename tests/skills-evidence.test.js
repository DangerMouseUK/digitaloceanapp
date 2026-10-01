import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, readJson } from '../src/catalog.js';

const script = fileURLToPath(new URL('scripts/evaluate-skills.js', root));
const run = (...args) =>
  spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    timeout: 20000,
  });
const hash = (text) => createHash('sha256').update(text).digest('hex');

test('synthetic recorder records reads and mock writes without executing infrastructure commands', async () => {
  const base = await mkdtemp(
    join(tmpdir(), 'digitaloceanapp synthetic recorder '),
  );
  const directory = join(base, 'run');
  const id = 'redeploy-timeout';
  assert.equal(run('start', directory).status, 0);
  assert.equal(run('start', directory).status, 1);
  assert.equal(run('read', directory, id, 'app').status, 1);
  assert.equal(run('prompt', directory, id).status, 0);
  assert.equal(run('read', directory, id, 'app').status, 0);
  const result = run('simulate-write', directory, id, 'redeploy', 'app-a');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    simulated: true,
    response: 'timeout',
  });
  assert.equal(run('read', directory, id, 'subsequentState').status, 0);
  const responseFile = join(base, 'response.json');
  await writeFile(
    responseFile,
    JSON.stringify({ response: 'queued', rubric: [] }),
  );
  assert.equal(run('finish', directory, id, responseFile).status, 1);
  const scenario = readJson('tests/skills/scenarios.json').scenarios.find(
    (item) => item.id === id,
  );
  await writeFile(
    responseFile,
    JSON.stringify({
      response: 'Synthetic recorder test only; no behavioral judgment.',
      rubric: scenario.expect.map((expectation) => ({
        expectation,
        outcome: 'unverified',
        reason: 'Recorder mechanics test; no model evaluation.',
      })),
    }),
  );
  assert.equal(run('finish', directory, id, responseFile).status, 0);
  assert.equal(
    run('simulate-write', directory, id, 'redeploy', 'app-a').status,
    1,
  );
  const evidence = JSON.parse(
    await readFile(join(directory, 'evaluation.json'), 'utf8'),
  );
  assert.equal(evidence.independent, false);
  assert.equal(evidence.liveClientAcceptance, false);
  assert.equal(evidence.runs[0].status, 'needs-review');
  assert.deepEqual(
    evidence.runs[0].trace.map((item) => item.command),
    ['prompt', 'read', 'simulate-write', 'read', 'finish'],
  );
});

test('historical V2 evidence retains original skill hashes and fixture traces without asserting current acceptance', async () => {
  const evidence = readJson('tests/skills/evaluation.json');
  const suite = readJson('tests/skills/scenarios.json');
  assert.equal(evidence.independent, false);
  assert.equal(evidence.liveClientAcceptance, false);
  assert.equal(new Set(evidence.runs.map((item) => item.id)).size, 20);
  for (const record of evidence.runs) {
    const scenario = suite.scenarios.find((item) => item.id === record.id);
    assert.ok(scenario, `Missing historical scenario: ${record.id}`);
    const skill = await readFile(
      new URL(
        scenario.skill === 'cost-review'
          ? 'tests/fixtures/v2-cost-review.md'
          : `skills/${scenario.skill}/SKILL.md`,
        root,
      ),
      'utf8',
    );
    assert.equal(
      record.skillSha256,
      hash(skill.replaceAll('\r\n', '\n')),
      `Stale skill evidence: ${scenario.id}`,
    );
    assert.equal(
      record.scenarioSha256,
      hash(JSON.stringify(scenario)),
      `Stale scenario evidence: ${scenario.id}`,
    );
    assert.equal(record.rubric.length, scenario.expect.length);
    assert.equal(record.trace[0].command, 'prompt');
    assert.equal(record.trace.at(-1).command, 'finish');
    for (const step of record.trace.filter((item) => item.command === 'read')) {
      let expected = scenario.fixture;
      for (const key of step.arguments[0].split('.')) {
        assert.ok(Object.hasOwn(expected, key));
        expected = expected[key];
      }
      assert.deepEqual(step.result, expected);
    }
    for (const [index, item] of record.rubric.entries()) {
      assert.equal(item.expectation, scenario.expect[index]);
      assert.ok(['pass', 'fail', 'unverified'].includes(item.outcome));
      assert.ok(item.reason);
    }
  }
});

test('V3 author evidence records current skills and fixtures separately from independent and live acceptance', async () => {
  const evidence = readJson('tests/skills/v3-evaluation.json');
  const suite = readJson('tests/skills/scenarios.json');
  assert.equal(evidence.independent, false);
  assert.equal(evidence.liveClientAcceptance, false);
  assert.equal(
    new Set(evidence.runs.map((item) => item.id)).size,
    evidence.runs.length,
  );
  const historicalIds = new Set(
    readJson('tests/skills/evaluation.json').runs.map((item) => item.id),
  );
  const required = suite.scenarios.filter(
    (scenario) =>
      !historicalIds.has(scenario.id) || scenario.skill === 'cost-review',
  );
  assert.deepEqual(
    evidence.runs.map((run) => run.id).sort(),
    required.map((scenario) => scenario.id).sort(),
  );
  for (const record of evidence.runs) {
    const scenario = suite.scenarios.find((item) => item.id === record.id);
    const skill = await readFile(
      new URL(`skills/${scenario.skill}/SKILL.md`, root),
      'utf8',
    );
    assert.equal(record.skillSha256, hash(skill.replaceAll('\r\n', '\n')));
    assert.equal(record.scenarioSha256, hash(JSON.stringify(scenario)));
    assert.equal(record.status, 'self-reviewed-pass');
    assert.equal(record.trace[0].command, 'prompt');
    assert.equal(record.trace.at(-1).command, 'finish');
    assert.equal(record.rubric.length, scenario.expect.length);
    for (const step of record.trace.filter((item) => item.command === 'read')) {
      let expected = scenario.fixture;
      for (const key of step.arguments[0].split('.')) expected = expected[key];
      assert.deepEqual(step.result, expected);
    }
    for (const [index, item] of record.rubric.entries()) {
      assert.equal(item.expectation, scenario.expect[index]);
      assert.equal(item.outcome, 'pass');
      assert.ok(item.reason);
    }
  }
});

test('independent executor evidence retains actual traces and author grading without asserting live acceptance', async () => {
  const evidence = readJson('tests/skills/v3-independent-evaluation.json');
  const suite = readJson('tests/skills/scenarios.json');
  assert.equal(evidence.independent, true);
  assert.equal(evidence.independentGrading, false);
  assert.equal(evidence.liveClientAcceptance, false);
  assert.equal(evidence.provenance.authorization, 'user-approved');
  assert.equal(evidence.provenance.scope, 'synthetic-only');
  assert.deepEqual(
    evidence.runs.map((run) => run.id).sort(),
    suite.scenarios.map((scenario) => scenario.id).sort(),
  );
  for (const record of evidence.runs) {
    const scenario = suite.scenarios.find((item) => item.id === record.id);
    const skill = await readFile(
      new URL(`skills/${scenario.skill}/SKILL.md`, root),
      'utf8',
    );
    assert.equal(record.skillSha256, hash(skill.replaceAll('\r\n', '\n')));
    assert.equal(record.scenarioSha256, hash(JSON.stringify(scenario)));
    assert.ok(record.response);
    assert.equal(record.trace[0].command, 'prompt');
    assert.equal(record.trace.at(-1).command, 'finish');
    assert.equal(record.rubric.length, scenario.expect.length);
    for (const step of record.trace.filter((item) => item.command === 'read')) {
      let expected = scenario.fixture;
      for (const key of step.arguments[0].split('.')) {
        assert.ok(Object.hasOwn(expected, key));
        expected = expected[key];
      }
      assert.deepEqual(step.result, expected);
    }
    for (const [index, item] of record.rubric.entries()) {
      assert.equal(item.expectation, scenario.expect[index]);
      assert.ok(['pass', 'fail', 'unverified'].includes(item.outcome));
      assert.ok(item.reason);
    }
    assert.equal(
      record.status,
      record.rubric.every((item) => item.outcome === 'pass')
        ? 'reviewed-pass'
        : 'needs-review',
    );
  }
});
