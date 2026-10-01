import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, relative } from 'node:path';
import assert from 'node:assert/strict';
import Ajv from 'ajv/dist/2020.js';
import { parse as yaml } from 'yaml';
import {
  registry,
  presets,
  root,
  manifest,
  readJson,
  selectServices,
} from '../src/catalog.js';
import { compatibilityManifest } from '../src/clients.js';
import { hasSecret } from '../src/validate.js';

const base = fileURLToPath(root);
const ajv = new Ajv({ strict: false });
const manifestValidator = ajv.compile(readJson('schemas/plugin.schema.json'));
const mcpValidator = ajv.compile(readJson('schemas/mcp.schema.json'));
assert.ok(
  manifestValidator(manifest),
  JSON.stringify(manifestValidator.errors),
);
assert.ok(
  mcpValidator(readJson('mcp.json')),
  JSON.stringify(mcpValidator.errors),
);
assert.deepEqual(
  readJson('.codex-plugin/plugin.json'),
  compatibilityManifest(),
);
assert.equal(readJson('package.json').version, manifest.version);
assert.equal(readJson('package-lock.json').version, manifest.version);
for (const path of ['./skills/', './.mcp.json'])
  await access(new URL(path, root));

assert.equal(registry.schemaVersion, 1);
assert.ok(/^@digitalocean\/mcp@\d+\.\d+\.\d+$/.test(registry.localPackage));
assert.equal(
  new Set(registry.services.map((s) => s.key)).size,
  registry.services.length,
);
for (const service of registry.services) {
  assert.ok(/^[a-z][a-z0-9-]+$/.test(service.key));
  assert.equal(
    service.remote.url,
    `https://${service.key}.mcp.digitalocean.com/mcp`,
  );
  assert.ok(['none', 'oauth-or-token'].includes(service.remote.authentication));
  assert.ok(service.name && service.description && service.category);
  assert.ok(
    /^https:\/\/github\.com\/digitalocean-labs\/mcp-digitalocean\//.test(
      service.source,
    ),
  );
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(service.verifiedAt));
  if (service.local) {
    assert.equal(service.local.service, service.key);
    assert.equal(typeof service.local.requiresToken, 'boolean');
  }
}
for (const preset of Object.keys(presets))
  assert.ok(selectServices({ preset }).length);

async function walk(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (directory === base && entry.name === 'output-digitaloceanapp') continue;
    if (
      ['.git', 'node_modules', 'output', 'dist', 'coverage'].includes(
        entry.name,
      )
    )
      continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else if (
      entry.isFile() &&
      /\.(?:json|m?js|md|ya?ml|toml)$/.test(entry.name)
    )
      paths.push(path);
  }
  return paths;
}
let skillCount = 0;
const skillNames = [];
for (const path of await walk(base)) {
  const text = await readFile(path, 'utf8');
  assert.ok(
    !hasSecret(text),
    `Possible embedded secret in ${relative(base, path)} (value suppressed)`,
  );
  if (path.endsWith('SKILL.md')) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    assert.ok(match, `Missing skill frontmatter: ${path}`);
    const front = yaml(match[1]);
    assert.ok(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(front.name));
    assert.equal(
      relative(base, dirname(path)).replaceAll('\\', '/'),
      `skills/${front.name}`,
    );
    assert.equal(typeof front.description, 'string');
    assert.ok(front.description.length > 20);
    assert.ok(!text.includes('[TODO:'));
    skillNames.push(front.name);
    skillCount++;
  }
  if (/\.ya?ml$/.test(path)) yaml(text);
  if (path.endsWith('.md') && !path.endsWith('prd.md')) {
    const prose = text.replace(/```[\s\S]*?```/g, '');
    for (const [, link] of prose.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/.test(link)) continue;
      await access(
        resolve(dirname(path), decodeURIComponent(link.split('#')[0])),
      );
    }
  }
}
assert.equal(skillCount, 15);
const evaluation = readJson('tests/skills/scenarios.json');
assert.ok(
  ['v3-author-walkthrough-pending', 'v3-author-walkthrough-recorded'].includes(
    evaluation.status,
  ),
);
assert.equal(
  new Set(evaluation.scenarios.map((scenario) => scenario.id)).size,
  evaluation.scenarios.length,
);
for (const name of skillNames)
  assert.ok(
    evaluation.scenarios.some((s) => s.skill === name),
    `Missing evaluation case for ${name}`,
  );
for (const scenario of evaluation.scenarios)
  assert.ok(
    scenario.id &&
      scenario.prompt &&
      scenario.fixture &&
      scenario.expect.length >= 3,
  );
console.log(
  'Manifests, registry, skills, scenarios, YAML, local documentation links and secret patterns validated. Recorded author walkthroughs are separate; structural checks do not execute a model or verify live clients.',
);
