import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry, presets, selectServices, root } from '../src/catalog.js';
import {
  clients,
  configuration,
  compatibilityManifest,
  json,
} from '../src/clients.js';

export function generatedFiles() {
  const files = new Map();
  const defaults = {
    client: 'plugin',
    mode: 'remote-oauth',
    keys: selectServices(),
    platform: 'linux',
  };
  files.set('mcp.json', configuration(defaults).content);
  files.set('.codex-plugin/plugin.json', json(compatibilityManifest()));
  const compatibility = JSON.parse(configuration(defaults).content);
  delete compatibility.$schema;
  for (const entry of Object.values(compatibility.mcpServers))
    entry.type = 'http';
  files.set('.mcp.json', json(compatibility));
  for (const preset of Object.keys(presets)) {
    for (const mode of ['remote-oauth', 'local']) {
      files.set(
        `configs/${mode === 'local' ? 'local' : 'remote'}/${preset}.json`,
        configuration({ ...defaults, mode, keys: selectServices({ preset }) })
          .content,
      );
    }
  }
  for (const [client, adapter] of Object.entries(clients)) {
    for (const mode of adapter.modes) {
      for (const platform of ['linux', 'darwin', 'win32']) {
        if (client === 'claude-desktop' && platform === 'linux') continue;
        const config = configuration({ ...defaults, client, mode, platform });
        files.set(
          `clients/${client}/examples/${platform}/${mode}.${client === 'codex' ? 'toml' : 'json'}`,
          config.content,
        );
      }
    }
  }
  files.set(
    'docs/supported-services.md',
    `# Supported services\n\nGenerated from data/services.json. Verified ${registry.verifiedAt}. Do not edit manually.\n\n[Remote source](${registry.remoteSource}) · [Local identifiers](${registry.localSource})\n\nLocal package: \`${registry.localPackage}\`. All endpoints and tools remain upstream-managed. Local MCP also registers shared region tools; service selection is not an authorization boundary.\n\n| Key | Service | Remote endpoint | Authentication | Local |\n| --- | --- | --- | --- | --- |\n${registry.services.map((s) => `| ${s.key} | ${s.name} | ${s.remote.url} | ${s.remote.authentication} | ${s.local?.service ?? 'Unavailable'} |`).join('\n')}\n\n## Presets\n\n${Object.keys(
      presets,
    )
      .map(
        (preset) =>
          `- **${preset}**: ${selectServices({ preset }).join(', ')}.`,
      )
      .join(
        '\n',
      )}\n\nCore is the default. Full is advanced and may reduce tool-selection accuracy. Custom selections enable only the requested services. Availability of an endpoint does not establish support for every resource or metric within its product.\n`,
  );
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let drift = false;
  for (const [path, content] of generatedFiles()) {
    const target = new URL(path, root);
    if (check) {
      const actual = await readFile(target, 'utf8').catch(() => null);
      if (actual?.replaceAll('\r\n', '\n') !== content) {
        console.error(`Generated file differs: ${path}`);
        drift = true;
      }
    } else {
      await mkdir(dirname(fileURLToPath(target)), { recursive: true });
      await writeFile(target, content);
    }
  }
  if (drift) process.exitCode = 1;
  else
    console.log(
      check
        ? 'Generated artifacts are current.'
        : 'Generated registry-derived artifacts.',
    );
}
