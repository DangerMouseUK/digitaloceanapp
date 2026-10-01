import { readFile, stat } from 'node:fs/promises';
import { parse as parseJsonc } from 'jsonc-parser';
import { parse as parseToml } from 'smol-toml';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { configuration, clients } from './clients.js';
import { bundleFiles, containedFile } from './bundle.js';
import { checkFileHashes } from './fingerprints.js';
import {
  selectServices,
  manifest,
  modes,
  platforms,
  services,
} from './catalog.js';

// Credential-reference rules apply to managed entries, not unrelated client settings.
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
  // TOML parsers may use null-prototype tables; compare semantic data uniformly.
  return JSON.parse(JSON.stringify(value));
}

function managedServer(name, entry) {
  if (name === 'digitalocean' || name.startsWith('digitalocean-')) return true;
  if (!entry || typeof entry !== 'object') return false;
  for (const value of [entry.url, entry.serverUrl]) {
    if (typeof value !== 'string') continue;
    try {
      const { hostname } = new URL(value);
      if (
        hostname === 'mcp.digitalocean.com' ||
        hostname.endsWith('.mcp.digitalocean.com')
      )
        return true;
    } catch {
      // Unrelated malformed URLs are outside this validator's scope.
    }
  }
  return [entry.command, ...(Array.isArray(entry.args) ? entry.args : [])].some(
    (value) =>
      typeof value === 'string' &&
      /^@digitalocean\/mcp(?:@[^\s]+)?$/.test(value),
  );
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
    if (Array.isArray(actual[field]))
      throw new Error('MCP servers must be an object.');
    const managed = Object.fromEntries(
      Object.entries(actual[field]).filter(([name, entry]) =>
        managedServer(name, entry),
      ),
    );
    if (credentialProblem(managed))
      throw new Error(
        'Embedded credential or unsupported secret reference detected; values are suppressed.',
      );
    if (!isDeepStrictEqual(managed, desired[field]))
      throw new Error(
        'DigitalOcean configuration differs: check missing/unexpected services, exact endpoints, package version, transport and credential references.',
      );
  }
  if (desired.inputs) {
    if (
      !Array.isArray(actual.inputs) ||
      actual.inputs.some(
        (entry) => !entry || typeof entry !== 'object' || Array.isArray(entry),
      )
    )
      throw new Error('VS Code inputs must be an array of input objects.');
    const inputs = actual.inputs.filter(
      (entry) => entry.id === 'digitalocean-token',
    );
    const [input] = inputs;
    if (
      inputs.length !== 1 ||
      input.type !== 'promptString' ||
      input.password !== true ||
      Object.hasOwn(input, 'default')
    )
      throw new Error(
        'VS Code requires exactly one digitalocean-token password input without a default value.',
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
      if (
        !meta ||
        typeof meta !== 'object' ||
        Array.isArray(meta) ||
        meta.schemaVersion !== 1 ||
        typeof meta.version !== 'string' ||
        typeof meta.client !== 'string' ||
        !Object.hasOwn(clients, meta.client) ||
        !modes.includes(meta.mode) ||
        !platforms.includes(meta.platform) ||
        typeof meta.configFile !== 'string' ||
        !Array.isArray(meta.keys) ||
        !meta.keys.length ||
        meta.keys.some(
          (key) => typeof key !== 'string' || !services.has(key),
        ) ||
        new Set(meta.keys).size !== meta.keys.length
      )
        throw new Error(
          'Invalid or incomplete bundle metadata. Regenerate the bundle.',
        );
      if (meta.version !== manifest.version)
        throw new Error(
          'Bundle version differs from this installed digitaloceanapp version. Regenerate the bundle.',
        );
      checkFileHashes(meta.generatedFileHashes);
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
      if (
        !(
          await readFile(await containedFile(target, 'INSTALL.md'), 'utf8')
        ).trim()
      )
        throw new Error('Bundle INSTALL.md is empty. Regenerate the bundle.');
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
