import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import { services } from './catalog.js';
import { validatePath } from './validate.js';

export async function executableAvailable(
  name,
  env = process.env,
  platform = process.platform,
) {
  for (const directory of (env.PATH ?? env.Path ?? '')
    .split(delimiter)
    .filter(Boolean)) {
    for (const suffix of platform === 'win32'
      ? ['.exe', '.cmd', '.bat']
      : ['']) {
      try {
        await access(
          join(directory, name + suffix),
          platform === 'win32' ? constants.F_OK : constants.X_OK,
        );
        return true;
      } catch {
        /* Try next PATH entry. */
      }
    }
  }
  return false;
}

export async function diagnose(path, options, env = process.env) {
  const result = await validatePath(path, options);
  const findings = [
    {
      check: 'Node.js >=22',
      ok: Number(process.versions.node.split('.')[0]) >= 22,
    },
  ];
  const { client, mode, keys, platform } = result.options;
  if (mode === 'local')
    findings.push({
      check: 'npx available on PATH (package startup unverified)',
      ok: await executableAvailable('npx', env),
    });
  if (
    mode !== 'remote-oauth' &&
    keys.some((key) => services.get(key).local.requiresToken)
  ) {
    if (client === 'vscode')
      findings.push({
        check: 'VS Code password input configured; value managed by client',
        ok: true,
      });
    else
      findings.push({
        check: 'DIGITALOCEAN_API_TOKEN present (value never displayed)',
        ok: Boolean(env.DIGITALOCEAN_API_TOKEN?.trim()),
      });
  }
  if (platform !== process.platform)
    findings.push({
      check: 'Bundle targets a different OS; run doctor on the target OS',
      ok: false,
    });
  return {
    findings,
    services: keys,
    authentication: 'unverified',
    note: 'Offline checks only. Client installation, package startup, GUI environment inheritance, OAuth and account access remain unverified.',
  };
}
