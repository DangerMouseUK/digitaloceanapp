import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  lstat,
  realpath,
} from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, manifest, fullWarning, services } from './catalog.js';
import {
  clients,
  configuration,
  compatibilityManifest,
  json,
} from './clients.js';

export async function skillFiles() {
  const base = fileURLToPath(new URL('skills/', root));
  const files = [];
  for (const dir of await readdir(base, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    files.push([
      `${dir.name}/SKILL.md`,
      await readFile(resolve(base, dir.name, 'SKILL.md'), 'utf8'),
    ]);
  }
  return files.sort(([a], [b]) => a.localeCompare(b));
}

export function installationGuide(options) {
  const { client, mode, keys, platform } = options;
  return `# digitaloceanapp installation bundle\n\nClient: ${clients[client].name}. Mode: ${mode}. Platform: ${platform}.\n\nServices: ${keys.join(', ')}.\n\n${keys.length > 9 ? fullWarning + '\n\n' : ''}## Install\n\n1. ${clients[client].destination}\n2. Back up your existing client configuration yourself before merging. Preserve unrelated server entries and existing skill folders. Do not replace a whole configuration with this fragment.\n3. ${!keys.some((key) => services.get(key).local.requiresToken) ? 'The selected public documentation tools require no DigitalOcean token. Do not configure a token solely for documentation.' : mode === 'remote-oauth' ? 'Connect through the client and complete DigitalOcean OAuth for each protected endpoint. Documentation needs no DigitalOcean token.' : client === 'vscode' ? 'Enter the token only in VS Code’s password input when it starts the connection.' : 'Set DIGITALOCEAN_API_TOKEN outside this bundle in the environment of the process launching your client. Restart the client after changing its environment. Never paste a token into these files or a chat.'}\n4. ${mode === 'local' ? 'Ensure Node.js and npx are installed and available to the client. The client will download and run the pinned official @digitalocean/mcp package from npm. This generator does not install or launch it. Desktop GUI environment inheritance must be checked on your OS; do not assume shell-profile variables reach a GUI app.' : 'The client connects directly to the selected DigitalOcean HTTPS endpoints. No digitaloceanapp server is involved.'}\n5. ${['plugin', 'chatgpt'].includes(client) ? 'Install/import this directory as a portable plugin where the host supports it. Local stdio is only for local-capable plugin hosts, never ChatGPT cloud. Availability depends on host version, account and workspace policy. If plugin import is unavailable, manually connect the listed endpoints and load the supplied skills using the host’s supported skill controls.' : 'The supplied skill folders must also be installed or manually imported; an MCP configuration alone does not activate workflows.'}\n\n## Verify\n\nRun digitaloceanapp validate --path . from this bundle (or invoke the repository CLI by absolute path). Use your client’s MCP status view, confirm the selected services and skills, then ask “Show me my DigitalOcean account.” A useful result should state scope and missing coverage. OAuth and real account behavior are unverified until this check succeeds. Review client tool approvals before use.\n\n## Remove\n\nRemove only the digitaloceanapp server entries you added, its VS Code input if unused, and its installed skill folders. Uninstall the plugin or remove remote connectors through the client UI where applicable. Revoke DigitalOcean authorization separately if desired. Deleting this generated directory does not remove configuration you copied elsewhere.\n\n## Trust and limitations\n\nThe maintainer receives no credentials or account data through normal use. Your client and DigitalOcean have their own data policies. Skills guide behavior; they cannot enforce read-only access or intercept tools. Use appropriate DigitalOcean permissions and client approvals. No configuration here automatically approves tools. Client/account compatibility is pending live acceptance.\n`;
}

export async function bundleFiles(options) {
  const config = configuration(options);
  const files = new Map([[config.file, config.content]]);
  for (const [path, content] of await skillFiles())
    files.set(`${clients[options.client].skills}/${path}`, content);
  if (['plugin', 'chatgpt'].includes(options.client)) {
    files.set('plugin.json', json(manifest));
    files.set('.codex-plugin/plugin.json', json(compatibilityManifest()));
    const compatibility = JSON.parse(config.content);
    delete compatibility.$schema;
    for (const server of Object.values(compatibility.mcpServers))
      if (server.type === 'streamable-http') server.type = 'http';
    files.set('.mcp.json', json(compatibility));
  }
  files.set('INSTALL.md', installationGuide(options));
  files.set('LICENSE', await readFile(new URL('LICENSE', root), 'utf8'));
  files.set(
    'bundle.json',
    json({
      schemaVersion: 1,
      version: manifest.version,
      ...options,
      configFile: config.file,
    }),
  );
  return files;
}

export async function createBundle(options, output) {
  const files = await bundleFiles(options);
  const directory = resolve(output);
  // Exclusive directory creation avoids touching any existing client configuration.
  try {
    await mkdir(directory);
  } catch {
    throw new Error(
      'Cannot create output: it must be a new directory with an existing writable parent.',
    );
  }
  try {
    for (const [path, content] of files) {
      const target = resolve(directory, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, { flag: 'wx' });
    }
  } catch {
    throw new Error(
      'Bundle write failed. Partial output was retained; inspect it and choose a new directory before retrying.',
    );
  }
  return directory;
}

export async function containedFile(directory, path) {
  if (
    typeof path !== 'string' ||
    isAbsolute(path) ||
    path.split(/[\\/]/).includes('..')
  )
    throw new Error('Invalid bundle path.');
  const base = await realpath(directory);
  const target = resolve(base, path);
  const actual = await realpath(target);
  const rel = relative(base, actual);
  if (
    !rel ||
    rel === '..' ||
    rel.startsWith(`..${sep}`) ||
    isAbsolute(rel) ||
    !(await lstat(target)).isFile()
  )
    throw new Error(
      'Bundle path escapes its directory or is not a regular file.',
    );
  return actual;
}
