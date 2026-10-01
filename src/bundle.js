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
import {
  root,
  manifest,
  fullWarning,
  requiresAuthentication,
} from './catalog.js';
import {
  clients,
  configuration,
  compatibilityManifest,
  installationDetails,
  json,
} from './clients.js';
import { generatedFileHashes } from './fingerprints.js';

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

export function installationAuthentication({ client, mode, keys }) {
  return !requiresAuthentication(keys, mode)
    ? 'The selected public documentation tools require no DigitalOcean token. Do not configure a token solely for documentation.'
    : mode === 'remote-oauth'
      ? 'Connect through the client and complete DigitalOcean OAuth for each protected endpoint. Documentation needs no DigitalOcean token.'
      : client === 'vscode'
        ? 'Enter the token only in VS Code’s password input when it starts the connection.'
        : 'Set DIGITALOCEAN_API_TOKEN outside this bundle in the environment of the process launching your client. Restart the client after changing its environment. Never paste a token into these files or a chat.';
}

export function taskExamples(keys) {
  const examples = [];
  if (keys.includes('accounts'))
    examples.push({
      skill: 'infrastructure-inventory',
      services: ['accounts'],
      prompt:
        'Show my DigitalOcean resources and state which services you could inspect.',
    });
  if (keys.includes('apps'))
    examples.push({
      skill: 'deployment-preflight',
      services: ['apps'],
      prompt:
        'Check this App Platform app before release without deploying or changing it.',
    });
  if (keys.includes('databases') || keys.includes('droplets'))
    examples.push({
      skill: 'recovery-review',
      services: keys.filter((key) => ['databases', 'droplets'].includes(key)),
      prompt:
        'Review backups and recovery gaps for these resources without creating backups or restoring anything.',
    });
  if (keys.includes('apps') && keys.includes('docs'))
    examples.push({
      skill: 'cost-review',
      services: ['apps', 'docs'],
      prompt:
        'What would adding one instance to this app cost? Show current prices, assumptions and exclusions; make no changes.',
    });
  if (keys.includes('docs'))
    examples.push({
      skill: 'documentation-research',
      services: ['docs'],
      prompt:
        'Find official DigitalOcean documentation for App Platform health checks.',
    });
  return examples;
}

export function installationGuide(options) {
  const { client, mode, keys, platform } = options;
  const { destination, removal } = installationDetails(options);
  const protectedServices = requiresAuthentication(keys, mode);
  const authentication = installationAuthentication(options);
  const question = keys.includes('accounts')
    ? 'Show me my DigitalOcean account.'
    : keys.includes('apps')
      ? 'List my DigitalOcean App Platform apps without changing them.'
      : keys.includes('docs')
        ? 'Find official DigitalOcean documentation for App Platform health checks.'
        : `Show the available read-only tools for the selected DigitalOcean services (${keys.join(', ')}). State missing coverage.`;
  return `# digitaloceanapp installation bundle

Client: ${clients[client].name}. Mode: ${mode}. Platform: ${platform}.

Services: ${keys.join(', ')}.

${keys.length > 9 ? fullWarning + '\n\n' : ''}## Install

1. Back up existing client settings before merging. Preserve unrelated server entries and skill folders; do not replace a whole configuration with this fragment.
2. ${destination}
3. ${authentication}
4. ${mode === 'local' ? 'Ensure Node.js and npx are installed and available to the client. The client will download and run the pinned official @digitalocean/mcp package from npm. This generator does not install or launch it. Desktop GUI environment inheritance must be checked on your OS; do not assume shell-profile variables reach a GUI app.' : 'The client connects directly to the selected DigitalOcean HTTPS endpoints. No digitaloceanapp server is involved.'}
5. ${['plugin', 'chatgpt'].includes(client) ? 'If plugin import is unavailable, manually connect the listed endpoints and load the supplied skills using the host’s supported controls. Availability depends on host version, account and workspace policy.' : `Install or import the supplied skills from ${clients[client].skills}/; an MCP configuration alone does not activate workflows.`}

## Verify

From your repository clone, replace the example bundle path with your generated directory:

\`\`\`sh
node bin/digitaloceanapp.js validate --path "../My DigitalOcean bundle"
node bin/digitaloceanapp.js doctor --path "../My DigitalOcean bundle"
\`\`\`

Alternatively, from the bundle directory, use an absolute path to the repository CLI (replace the example path):

\`\`\`sh
node "/path/to/digitaloceanapp/bin/digitaloceanapp.js" validate --path .
\`\`\`

On Windows, the same command accepts a quoted path such as \`"C:/Projects/digitaloceanapp/bin/digitaloceanapp.js"\`. If the CLI is installed on PATH, use \`digitaloceanapp validate --path .\`.

These checks run offline. Use your client’s MCP status view, confirm the selected services and skills, then ask “${question}” A useful result should state scope and missing coverage. ${protectedServices ? 'Authentication and real account access require a separate successful client connection.' : 'Public documentation verification does not establish account access.'} Review client tool approvals before use.

Confirm MCP connections and skill discovery separately: inspect the selected server list, then use the client's skill controls to find an installed skill by name. If automatic selection is unavailable, load that skill explicitly using the client's supported controls. A server connection alone does not prove a skill is active.

## Try a task

${
  taskExamples(keys)
    .map(
      ({ skill, services, prompt }) =>
        `- **${skill}** (requires ${services.join(', ')}): “${prompt}”`,
    )
    .join('\n') ||
  'Ask the assistant to discover available read tools for the selected services and explain missing coverage.'
}

All supplied skills are included. Tasks above match selected services; other workflows may need additional connections. Optional dependency services and unavailable evidence must be disclosed by the assistant.

## Remove

${removal} ${protectedServices ? 'Revoke DigitalOcean authorization separately if desired. ' : ''}Deleting this generated directory does not remove configuration you copied elsewhere.

## Trust and limitations

The maintainer receives no credentials or account data through normal use. Your client and DigitalOcean have their own data policies. Skills guide behavior; they cannot enforce read-only access or intercept tools. Use appropriate DigitalOcean permissions and client approvals. No configuration here automatically approves tools. Client/account compatibility is pending live acceptance.
`;
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
      generatedFileHashes: generatedFileHashes(files),
    }),
  );
  return files;
}

export async function createBundle(options, output, migrationGuide) {
  const files = await bundleFiles(options);
  if (migrationGuide !== undefined) files.set('MIGRATE.md', migrationGuide);
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
