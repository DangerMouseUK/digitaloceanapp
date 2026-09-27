// Local synthetic tool walkthroughs. No model API, credentials or network access.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { root, readJson } from '../src/catalog.js';
import { hasSecret } from '../src/validate.js';

const suite = readJson('tests/skills/scenarios.json');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const [command, directory, id, ...args] = process.argv.slice(2);
try {
  if (!directory) throw new Error('Provide a run directory.');
  const path = join(resolve(directory), 'evaluation.json');
  if (command === 'start') {
    if (args.length)
      throw new Error('Usage: start NEW_DIRECTORY [EVALUATOR_DESCRIPTION]');
    await mkdir(resolve(directory));
    await writeFile(
      path,
      JSON.stringify(
        {
          schemaVersion: 1,
          method: 'Author-guided synthetic walkthrough; self-reviewed',
          model: id ?? 'Evaluator not recorded',
          independent: false,
          liveClientAcceptance: false,
          platform: process.platform,
          node: process.version,
          startedAt: new Date().toISOString(),
          runs: [],
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    );
    console.log(
      'Created local synthetic run. All operations use fixture data only.',
    );
  } else {
    const record = JSON.parse(await readFile(path, 'utf8'));
    const scenario = suite.scenarios.find((item) => item.id === id);
    if (!scenario) throw new Error('Unknown scenario ID.');
    let run = record.runs.find((item) => item.id === id);
    const timestamp = new Date().toISOString();
    let result;
    if (command === 'prompt') {
      if (run || args.length)
        throw new Error('Scenario already started or arguments invalid.');
      const skill = await readFile(
        new URL(`skills/${scenario.skill}/SKILL.md`, root),
        'utf8',
      );
      run = {
        id,
        skill: scenario.skill,
        skillSha256: hash(skill.replaceAll('\r\n', '\n')),
        scenarioSha256: hash(JSON.stringify(scenario)),
        prompt: scenario.prompt,
        trace: [],
        status: 'in-progress',
      };
      record.runs.push(run);
      result = {
        prompt: scenario.prompt,
        skill,
        availableFixtureFields: Object.keys(scenario.fixture),
      };
    } else {
      if (!run || run.status !== 'in-progress')
        throw new Error(
          'Start the scenario with prompt; completed scenarios are immutable.',
        );
      if (command === 'read') {
        if (args.length !== 1)
          throw new Error('Usage: read RUN_DIRECTORY SCENARIO_ID FIELD.PATH');
        result = scenario.fixture;
        for (const key of args[0].split('.')) {
          if (
            !result ||
            typeof result !== 'object' ||
            !Object.hasOwn(result, key)
          )
            throw new Error('Unknown fixture field.');
          result = result[key];
        }
      } else if (command === 'simulate-write') {
        if (args.length !== 2)
          throw new Error(
            'Usage: simulate-write RUN_DIRECTORY SCENARIO_ID OPERATION TARGET',
          );
        // Record attempted writes even if the fixture cannot fulfill them. Never execute an operation.
        result = {
          simulated: true,
          response: scenario.fixture.writeResponse ?? 'unsupported by fixture',
        };
      } else if (command === 'finish') {
        if (args.length !== 1)
          throw new Error(
            'Usage: finish RUN_DIRECTORY SCENARIO_ID RESPONSE_JSON',
          );
        const review = JSON.parse(await readFile(args[0], 'utf8'));
        if (
          typeof review.response !== 'string' ||
          !review.response.trim() ||
          hasSecret(review.response) ||
          !Array.isArray(review.rubric) ||
          review.rubric.length !== scenario.expect.length ||
          review.rubric.some(
            (item, index) =>
              item.expectation !== scenario.expect[index] ||
              !['pass', 'fail', 'unverified'].includes(item.outcome) ||
              typeof item.reason !== 'string' ||
              !item.reason.trim(),
          )
        )
          throw new Error(
            'A response and reasoned outcome for every rubric item are required.',
          );
        run.response = review.response;
        run.rubric = review.rubric;
        run.status = review.rubric.every((item) => item.outcome === 'pass')
          ? 'self-reviewed-pass'
          : 'needs-review';
        result = { status: run.status, independent: false };
      } else
        throw new Error(
          'Unknown command. Use start, prompt, read, simulate-write or finish.',
        );
    }
    run.trace.push({
      command,
      arguments: command === 'finish' ? [] : args,
      timestamp,
      result:
        command === 'prompt'
          ? { availableFixtureFields: result.availableFixtureFields }
          : result,
    });
    await writeFile(path, JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  }
} catch {
  console.error(
    'Synthetic evaluation failed. Check the command, run directory, scenario ID and response rubric. Input details suppressed.',
  );
  process.exitCode = 1;
}
