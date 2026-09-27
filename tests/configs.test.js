import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv/dist/2020.js';
import {
  registry,
  presets,
  selectServices,
  root,
  services,
} from '../src/catalog.js';
import { clients, configuration } from '../src/clients.js';
import { parseConfiguration, validateConfiguration } from '../src/validate.js';
import { installationGuide } from '../src/bundle.js';

const schema = JSON.parse(
  await readFile(new URL('schemas/mcp.schema.json', root), 'utf8'),
);
const validMcp = new Ajv({ strict: false }).compile(schema);

test('all supported client/mode/preset/platform combinations preserve exact selection', () => {
  for (const client of Object.keys(clients)) {
    for (const mode of clients[client].modes) {
      for (const preset of Object.keys(presets)) {
        for (const platform of ['win32', 'darwin', 'linux']) {
          if (client === 'claude-desktop' && platform === 'linux') continue;
          const keys = selectServices({ preset });
          const options = { client, mode, keys, platform };
          const generated = configuration(options);
          assert.deepEqual(
            validateConfiguration(generated.content, options).services,
            keys,
            JSON.stringify(options),
          );
          const parsed = parseConfiguration(generated.content, client);
          if (['plugin', 'chatgpt'].includes(client))
            assert.ok(validMcp(parsed), JSON.stringify(validMcp.errors));
          const servers =
            parsed.mcp_servers ?? parsed.servers ?? parsed.mcpServers;
          if (mode === 'local') {
            assert.equal(Object.keys(servers).length, 1);
            assert.ok(
              servers.digitalocean.args.includes(registry.localPackage),
            );
            assert.equal(servers.digitalocean.args.at(-1), keys.join(','));
            assert.ok(servers.digitalocean.args.includes('--services'));
            assert.equal(
              servers.digitalocean.command,
              platform === 'win32' ? 'cmd' : 'npx',
            );
          } else if (servers) {
            assert.deepEqual(
              Object.keys(servers),
              keys.map((key) => `digitalocean-${key}`),
            );
            for (const key of keys) {
              const server = servers[`digitalocean-${key}`];
              assert.equal(
                server.url ?? server.serverUrl,
                registry.services.find((s) => s.key === key).remote.url,
              );
              if (mode === 'remote-oauth' || key === 'docs') {
                assert.equal(server.headers, undefined);
                assert.equal(server.bearer_token_env_var, undefined);
              }
            }
          }
        }
      }
    }
  }
});

test('Core and PRD preset memberships are explicit and Full is opt-in', () => {
  assert.deepEqual(selectServices(), ['accounts', 'apps', 'insights', 'docs']);
  assert.deepEqual(selectServices({ preset: 'app-platform' }), [
    'accounts',
    'apps',
    'insights',
    'docr',
    'spaces',
    'networking',
    'docs',
  ]);
  assert.deepEqual(selectServices({ preset: 'infrastructure' }), [
    'accounts',
    'droplets',
    'databases',
    'doks',
    'networking',
    'volumes',
    'nfs',
    'insights',
    'docs',
  ]);
  assert.equal(selectServices({ preset: 'full' }).length, 21);
  assert.deepEqual(selectServices({ services: 'apps, docs,apps' }), [
    'apps',
    'docs',
  ]);
  for (const options of [
    { preset: 'bad' },
    { services: '' },
    { services: 'apps,' },
    { services: 'apps;whoami' },
    { services: 'apps', preset: 'core' },
  ])
    assert.throws(() => selectServices(options));
});

test('unsupported combinations fail instead of falling back', () => {
  for (const [client, mode, platform] of [
    ['chatgpt', 'local', 'linux'],
    ['plugin', 'remote-token', 'linux'],
    ['claude-desktop', 'remote-token', 'win32'],
    ['claude-desktop', 'local', 'linux'],
    ['unknown', 'local', 'linux'],
    ['codex', 'bad', 'linux'],
    ['codex', 'local', 'unknown'],
  ]) {
    assert.throws(() =>
      configuration({ client, mode, platform, keys: ['apps'] }),
    );
  }
});

test('documentation-only token/local selections contain no unnecessary token input', () => {
  for (const client of Object.keys(clients))
    for (const mode of clients[client].modes) {
      const { content } = configuration({
        client,
        mode,
        keys: ['docs'],
        platform: 'win32',
      });
      assert.ok(!content.includes('DIGITALOCEAN_API_TOKEN'));
      assert.ok(!content.includes('Authorization'));
      assert.ok(!content.includes('digitalocean-token'));
    }
});

test('native secret references remain literal and never expand the process environment', () => {
  const previous = process.env.DIGITALOCEAN_API_TOKEN;
  const sentinel = 'private-' + 'sentinel-value';
  process.env.DIGITALOCEAN_API_TOKEN = sentinel;
  try {
    for (const [client, reference] of [
      ['codex', 'bearer_token_env_var'],
      ['vscode', '${input:digitalocean-token}'],
      ['cursor', '${env:DIGITALOCEAN_API_TOKEN}'],
      ['claude-code', '${DIGITALOCEAN_API_TOKEN}'],
      ['windsurf', '${env:DIGITALOCEAN_API_TOKEN}'],
    ]) {
      const { content } = configuration({
        client,
        mode: 'remote-token',
        keys: ['accounts', 'docs'],
        platform: 'linux',
      });
      assert.ok(content.includes(reference));
      assert.ok(!content.includes(sentinel));
    }
  } finally {
    if (previous === undefined) delete process.env.DIGITALOCEAN_API_TOKEN;
    else process.env.DIGITALOCEAN_API_TOKEN = previous;
  }
});

test('validation rejects endpoint lookalikes, embedded credentials, missing and extra services', () => {
  const options = {
    client: 'cursor',
    mode: 'remote-oauth',
    keys: ['apps'],
    platform: 'linux',
  };
  const { content } = configuration(options);
  const parse = () => JSON.parse(content);
  for (const url of [
    'http://apps.mcp.digitalocean.com/mcp',
    'https://apps.mcp.digitalocean.com.evil.test/mcp',
    'https://apps.mcp.digitalocean.com/mcp?redirect=bad',
    'https://user:pass@apps.mcp.digitalocean.com/mcp',
    'https://apps.mcp.digitalocean.com/other',
  ]) {
    const value = parse();
    value.mcpServers['digitalocean-apps'].url = url;
    assert.throws(() => validateConfiguration(JSON.stringify(value), options));
  }
  assert.throws(() => validateConfiguration('{"mcpServers":{}}', options));
  const extra = parse();
  extra.mcpServers['digitalocean-docs'] = {
    url: registry.services.find((s) => s.key === 'docs').remote.url,
  };
  assert.throws(() => validateConfiguration(JSON.stringify(extra), options));
  const secret = parse();
  secret.mcpServers['digitalocean-apps'].headers = {
    Authorization: 'Bearer ' + 'synthetic-private-value',
  };
  assert.throws(
    () => validateConfiguration(JSON.stringify(secret), options),
    /credential/,
  );
  const benign = parse();
  benign.mcpServers.other = { url: 'https://example.com/mcp' };
  benign.mcpServers.other.headers = {
    Authorization: 'Bearer ${env:OTHER_TOKEN}',
  };
  assert.doesNotThrow(() =>
    validateConfiguration(JSON.stringify(benign), options),
  );
});

test('JSONC is accepted but malformed configurations never echo input', () => {
  const options = {
    client: 'vscode',
    mode: 'remote-oauth',
    keys: ['docs'],
    platform: 'linux',
  };
  const { content } = configuration(options);
  assert.doesNotThrow(() =>
    validateConfiguration('// comment\n' + content, options),
  );
  for (const client of ['vscode', 'codex']) {
    const secret = 'sentinel-do-not-disclose';
    assert.throws(
      () => parseConfiguration(`{invalid ${secret}`, client),
      (error) => !error.message.includes(secret),
    );
  }
});

test('token credentials and VS Code password input constraints are enforced', () => {
  const options = {
    client: 'vscode',
    mode: 'remote-token',
    keys: ['apps'],
    platform: 'linux',
  };
  for (const change of [
    (c) => {
      c.inputs.push({ ...c.inputs[0], password: false });
    },
    (c) => {
      c.inputs.push({ ...c.inputs[0] });
    },
    (c) => {
      c.inputs = {};
    },
    (c) => {
      c.inputs = [null];
    },
    (c) => {
      c.inputs = ['invalid'];
    },
    (c) => {
      c.inputs = [[]];
    },
    (c) => {
      c.inputs[0].password = false;
    },
    (c) => {
      c.inputs[0].default = 'unsafe';
    },
    (c) => {
      c.inputs = [];
    },
    (c) => {
      c.servers['digitalocean-apps'].headers.Authorization =
        'Bearer ${env:WRONG}';
    },
  ]) {
    const config = JSON.parse(configuration(options).content);
    change(config);
    assert.throws(() => validateConfiguration(JSON.stringify(config), options));
  }
});

test('validation scopes server identification and credential rules to DigitalOcean', () => {
  const options = {
    client: 'cursor',
    mode: 'remote-oauth',
    keys: ['apps'],
    platform: 'linux',
  };
  const config = JSON.parse(configuration(options).content);
  config.mcpServers.other = {
    url: 'https://example.com/mcp',
    description: 'Documentation for DigitalOcean projects',
    env: { TOKENIZER_MODEL: 'example-model' },
  };
  config.secret_setting_description = 'A noncredential client setting';
  assert.doesNotThrow(() =>
    validateConfiguration(JSON.stringify(config), options),
  );
  for (const entry of [
    { url: 'https://docs.mcp.digitalocean.com/mcp' },
    { serverUrl: 'https://apps.mcp.digitalocean.com/mcp' },
    { command: 'npx', args: ['-y', '@digitalocean/mcp@0.0.0'] },
    { command: '@digitalocean/mcp' },
  ]) {
    config.mcpServers.extra = entry;
    assert.throws(
      () => validateConfiguration(JSON.stringify(config), options),
      /DigitalOcean configuration differs/,
    );
  }
  delete config.mcpServers.extra;
  const sentinel = 'dop_v1_' + 'c'.repeat(64);
  config.mcpServers.other.description = sentinel;
  assert.throws(
    () => validateConfiguration(JSON.stringify(config), options),
    (error) =>
      /credential/.test(error.message) && !error.message.includes(sentinel),
  );
});

test('remote-only services use remote authentication metadata and reject local selection', () => {
  const original = services.get('docs');
  try {
    for (const authentication of ['none', 'oauth-or-token']) {
      services.set('docs', {
        ...original,
        local: null,
        remote: { ...original.remote, authentication },
      });
      for (const mode of ['remote-oauth', 'remote-token']) {
        const options = {
          client: 'vscode',
          mode,
          keys: ['docs'],
          platform: 'linux',
        };
        const config = JSON.parse(configuration(options).content);
        const needsToken = mode === 'remote-token' && authentication !== 'none';
        assert.equal(Boolean(config.inputs), needsToken);
        assert.equal(
          Boolean(config.servers['digitalocean-docs'].headers),
          needsToken,
        );
        assert.doesNotThrow(() =>
          validateConfiguration(JSON.stringify(config), options),
        );
        const guide = installationGuide(options);
        assert.equal(
          guide.includes('require no DigitalOcean token'),
          authentication === 'none',
        );
      }
      assert.throws(
        () =>
          configuration({
            client: 'vscode',
            mode: 'local',
            keys: ['docs'],
            platform: 'linux',
          }),
        /unavailable locally/,
      );
    }
    services.set('docs', {
      ...original,
      local: { ...original.local, requiresToken: true },
    });
    const local = JSON.parse(
      configuration({
        client: 'vscode',
        mode: 'local',
        keys: ['docs'],
        platform: 'linux',
      }).content,
    );
    assert.ok(local.inputs);
    assert.ok(local.servers.digitalocean.env);
  } finally {
    services.set('docs', original);
  }
});

test('installation guidance matches selected services, client and mode', () => {
  const options = {
    client: 'vscode',
    mode: 'remote-oauth',
    keys: ['docs'],
    platform: 'win32',
  };
  const docs = installationGuide(options);
  assert.ok(docs.includes('Find official DigitalOcean documentation'));
  assert.ok(!docs.includes('Show me my DigitalOcean account'));
  assert.ok(docs.includes('validate --path "../My DigitalOcean bundle"'));
  assert.ok(!docs.includes('Remove digitalocean-token'));
  assert.ok(
    installationGuide({ ...options, keys: ['apps'] }).includes(
      'List my DigitalOcean App Platform apps',
    ),
  );
  assert.ok(
    installationGuide({ ...options, keys: ['accounts'] }).includes(
      'Show me my DigitalOcean account',
    ),
  );
  assert.ok(
    installationGuide({
      ...options,
      keys: ['apps'],
      mode: 'remote-token',
    }).includes('Remove digitalocean-token'),
  );
  const remote = installationGuide({ ...options, client: 'claude-desktop' });
  assert.ok(remote.includes('connectors.json'));
  assert.ok(!remote.includes('claude_desktop_config.json'));
  const local = installationGuide({
    ...options,
    client: 'claude-desktop',
    mode: 'local',
  });
  assert.ok(local.includes('%APPDATA%/Claude/claude_desktop_config.json'));
  assert.ok(!local.includes('Add custom connector'));
});
