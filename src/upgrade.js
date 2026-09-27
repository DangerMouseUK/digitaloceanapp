import { readFile, readdir, realpath, lstat } from 'node:fs/promises';
import {
  resolve,
  dirname,
  basename,
  relative,
  isAbsolute,
  sep,
} from 'node:path';
import { bundleFiles, containedFile, createBundle } from './bundle.js';
import { clients, configuration, installationDetails } from './clients.js';
import { manifest, modes, platforms, services } from './catalog.js';

// Only bundle versions whose metadata contract has been reviewed are accepted.
const sourceVersions = new Set(['1.0.0-rc.1', manifest.version]);
const normalize = (text) => text.replaceAll('\r\n', '\n');

async function sourceFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(resolve(directory, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Do not traverse linked directories or read linked/special files.
    if (entry.isSymbolicLink())
      throw new Error(
        'Bundle contains a link. Use a regular-file bundle for upgrade.',
      );
    if (entry.isDirectory())
      files.push(...(await sourceFiles(directory, path)));
    else if (entry.isFile()) {
      await containedFile(directory, path);
      files.push(path);
    } else
      throw new Error(
        'Bundle contains a non-regular file. Review the source locally.',
      );
  }
  return files;
}

export async function planUpgrade(path) {
  try {
    const directory = await realpath(path);
    const meta = JSON.parse(
      await readFile(await containedFile(directory, 'bundle.json'), 'utf8'),
    );
    if (
      !meta ||
      Array.isArray(meta) ||
      meta.schemaVersion !== 1 ||
      !sourceVersions.has(meta.version)
    )
      throw new Error(
        'Unsupported bundle schema or version. Upgrade accepts reviewed V1 bundles and the current release; use setup for other formats.',
      );
    if (
      typeof meta.client !== 'string' ||
      !Object.hasOwn(clients, meta.client) ||
      !modes.includes(meta.mode) ||
      !platforms.includes(meta.platform) ||
      !Array.isArray(meta.keys) ||
      !meta.keys.length ||
      new Set(meta.keys).size !== meta.keys.length ||
      meta.keys.some((key) => typeof key !== 'string' || !services.has(key))
    )
      throw new Error(
        'Invalid bundle selection. Review client, mode, platform and service keys; no services will be silently removed.',
      );
    const options = {
      client: meta.client,
      mode: meta.mode,
      platform: meta.platform,
      keys: meta.keys,
    };
    const config = configuration(options); // Reject unsupported combinations before writing.
    if (meta.configFile !== config.file)
      throw new Error(
        'Bundle config path does not match its client. Review the metadata locally.',
      );
    const previous = new Set(await sourceFiles(directory));
    for (const required of [config.file, 'INSTALL.md']) {
      if (
        !previous.has(required) ||
        !(
          await readFile(await containedFile(directory, required), 'utf8')
        ).trim()
      )
        throw new Error(
          'Source bundle is incomplete. Configuration and nonempty INSTALL.md are required.',
        );
    }
    const expected = await bundleFiles(options);
    const changes = [];
    for (const [file, content] of expected) {
      const status = !previous.has(file)
        ? 'added'
        : normalize(
              await readFile(await containedFile(directory, file), 'utf8'),
            ) === normalize(content)
          ? 'unchanged'
          : 'review';
      changes.push({ file, status }); // Only trusted generated paths are reported.
    }
    return {
      directory,
      fromVersion: meta.version,
      toVersion: manifest.version,
      options,
      changes,
      extraFileCount: [...previous].filter((file) => !expected.has(file))
        .length,
    };
  } catch (error) {
    if (
      error.code ||
      error instanceof SyntaxError ||
      error instanceof TypeError
    )
      throw new Error(
        'Cannot inspect the source bundle. Check its directory, metadata and file access. Sensitive details suppressed.',
      );
    throw error;
  }
}

export function upgradeSummary(plan) {
  return [
    `Bundle upgrade: ${plan.fromVersion} -> ${plan.toVersion}`,
    `Client: ${plan.options.client}. Mode: ${plan.options.mode}. Platform: ${plan.options.platform}.`,
    `Services preserved: ${plan.options.keys.join(', ')}`,
    ...plan.changes
      .filter(({ status }) => status !== 'unchanged')
      .map(
        ({ file, status }) =>
          `${status === 'added' ? 'ADD' : 'REVIEW'}: ${file}`,
      ),
    `Additional source files requiring manual review: ${plan.extraFileCount}. Names and contents are suppressed.`,
    'REVIEW means release changes or local customizations; without a historical baseline these cannot be distinguished. Existing settings and customizations are not copied. Keep the original bundle and review differences locally before installing.',
  ].join('\n');
}

export async function upgradeBundle(plan, output) {
  // Resolve the parent to catch destinations nested through a directory link.
  const destination = resolve(
    await realpath(dirname(resolve(output))),
    basename(resolve(output)),
  );
  const rel = relative(plan.directory, destination);
  if (!rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`)))
    throw new Error(
      'Upgrade output must be outside the source bundle in a new directory.',
    );
  try {
    await lstat(destination);
    throw new Error(
      'Cannot create output: it must be a new directory with an existing writable parent.',
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const guide = `# Review and install the upgraded bundle\n\n${upgradeSummary(plan)}\n\n## Manual migration\n\n1. Keep the original bundle and back up your installed client configuration and skills.\n2. Compare every REVIEW file and additional source file locally. The replacement contains current defaults; manually reconcile your customizations, annotations, and unrelated entries before installation. Do not copy literal credentials.\n3. ${installationDetails(plan.options).destination}\n4. Follow INSTALL.md to install the supplied skills and verify the selected connections in your client. Offline validation does not verify authentication.\n5. If reverting, use your saved original configuration and skills. Deleting this bundle does not undo manual installation.\n`;
  return createBundle(plan.options, destination, guide);
}
