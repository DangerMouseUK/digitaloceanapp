import { readFile, stat } from 'node:fs/promises';
import { parse as parseJsonc } from 'jsonc-parser';
import { parse as parseToml } from 'smol-toml';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { configuration, clients } from './clients.js';
import { bundleFiles, containedFile } from './bundle.js';
import { selectServices } from './catalog.js';

// Other MCP providers may coexist with DigitalOcean. Their safe references are
// permitted here; DigitalOcean entries are checked against the exact adapter below.
const isReference = (value) =>
  /^\$\{(?:(?:env|input):)?[A-Za-z_][A-Za-z0-9_-]*\}$/.test(value);
export function hasSecret(text) {
  return /\b(?:dop_v1_|doo_v1_|dor_v1_)[a-zA-Z0-9]{20,}\b|\bgh[pousr]_[a-zA-Z0-9]{20,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
    text,
  );
}

function credentialProblem(value, key = '') {
  if (Array.isArray(value))
    return value.some((entry) => credentialProblem(entry));
  if (value && typeof value === 'object')
    return Object.entries(value).some(([k, entry]) =>
      credentialProblem(entry, k),
    );
  if (typeof value !== 'string') return false;
  if (key === 'bearer_token_env_var')
    return !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
  if (/^(authorization|proxy-authorization)$/i.test(key))
    return !value.startsWith('Bearer ') || !isReference(value.slice(7));
  if (/token|password|secret|api[_-]?key/i.test(key))
    return !isReference(value);
  return false;
}

export function parseConfiguration(text, client) {
  if (hasSecret(text))
    throw new Error(
      'Embedded credential detected; values are suppressed. Remove credentials from configuration.',
    );
  let value;
  try {
    if (client === 'codex') value = parseToml(text);
    else {
      const errors = [];
      value = parseJsonc(text, errors, {
        allowTrailingComma: true,
        disallowComments: false,
      });
      if (errors.length) throw new Error();
    }
  } catch {
    throw new Error(
      'Malformed configuration; parser details suppressed to protect credentials.',
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Configuration must be an object.');
  if (credentialProblem(value))
    throw new Error(
      'Embedded credential or unsupported secret reference detected; values are suppressed.',
    );
  // TOML parsers may use null-prototype tables; compare semantic data uniformly.
  return JSON.parse(JSON.stringify(value));
}

export function validateConfiguration(text, options) {
  const expected = configuration(options);
  const actual = parseConfiguration(text, options.client);
  const desired = parseConfiguration(expected.content, options.client);
  const field =
    options.client === 'codex'
      ? 'mcp_servers'
      : options.client === 'vscode'
        ? 'servers'
        : options.client === 'claude-desktop' && options.mode === 'remote-oauth'
          ? 'connectors'
          : 'mcpServers';
  if (!actual[field] || typeof actual[field] !== 'object')
    throw new Error('Missing MCP server map or connector list.');
  if (field === 'connectors') {
    if (!isDeepStrictEqual(actual[field], desired[field]))
      throw new Error(
        'Connector endpoints or selected services differ from the registry.',
      );
  } else {
    const managed = Object.fromEntries(
      Object.entries(actual[field]).filter(
        ([name, entry]) =>
          name === 'digitalocean' ||
          name.startsWith('digitalocean-') ||
          /digitalocean/i.test(JSON.stringify(entry)),
      ),
    );
    if (!isDeepStrictEqual(managed, desired[field]))
      throw new Error(
        'DigitalOcean configuration differs: check missing/unexpected services, exact endpoints, package version, transport and credential references.',
      );
  }
  if (desired.inputs) {
    const input = actual.inputs?.find(
      (entry) => entry.id === 'digitalocean-token',
    );
    if (
      !input ||
      input.type !== 'promptString' ||
      input.password !== true ||
      Object.hasOwn(input, 'default')
    )
      throw new Error(
        'VS Code requires a password input without a default value.',
      );
  }
  return { services: options.keys, authentication: 'unverified' };
}

export async function validatePath(path, options = {}) {
  const target = resolve(path);
  try {
    if ((await stat(target)).isDirectory()) {
      if (
        ['client', 'mode', 'preset', 'services', 'platform'].some(
          (key) => options[key] !== undefined,
        )
      )
        throw new Error(
          'Bundle validation uses bundle.json. Selection flags apply only to explicit configuration files.',
        );
      const meta = JSON.parse(
        await readFile(await containedFile(target, 'bundle.json'), 'utf8'),
      );
      if (meta.schemaVersion !== 1 || !Array.isArray(meta.keys))
        throw new Error('Unsupported bundle metadata.');
      const selected = {
        client: meta.client,
        mode: meta.mode,
        keys: selectServices({ services: meta.keys }),
        platform: meta.platform,
      };
      const expected = configuration(selected);
      if (meta.configFile !== expected.file)
        throw new Error('Bundle config path does not match its client.');
      const result = validateConfiguration(
        await readFile(await containedFile(target, expected.file), 'utf8'),
        selected,
      );
      for (const [file, content] of await bundleFiles(selected)) {
        if (
          file === 'bundle.json' ||
          file === expected.file ||
          file === 'INSTALL.md'
        )
          continue;
        const actual = await readFile(
          await containedFile(target, file),
          'utf8',
        );
        if (
          actual.replaceAll('\r\n', '\n') !== content.replaceAll('\r\n', '\n')
        )
          throw new Error(
            'Bundle supporting files are missing or differ from this installed digitaloceanapp version. Regenerate the bundle.',
          );
      }
      return { ...result, options: selected };
    }
    if (!Object.hasOwn(clients, options.client))
      throw new Error('Explicit config validation requires --client.');
    const selected = {
      client: options.client,
      mode: options.mode ?? 'remote-oauth',
      keys: selectServices(options),
      platform: options.platform ?? process.platform,
    };
    return {
      ...validateConfiguration(await readFile(target, 'utf8'), selected),
      options: selected,
    };
  } catch (error) {
    if (error.code || error instanceof SyntaxError)
      throw new Error(
        'Cannot read a complete valid bundle/configuration. Check the path, metadata and required files.',
      );
    throw error;
  }
}
