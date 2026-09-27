import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { requiresAuthentication } from './catalog.js';
import { validatePath } from './validate.js';

export async function executableAvailable(
  name,
  env = process.env,
  platform = process.platform,
) {
  for (const directory of (env.PATH ?? env.Path ?? '')
    .split(platform === 'win32' ? ';' : ':')
    .filter(Boolean)) {
    for (const suffix of platform === 'win32'
      ? ['.exe', '.cmd', '.bat']
      : ['']) {
      try {
        const candidate = join(directory, name + suffix);
        if (!(await stat(candidate)).isFile()) continue;
        await access(
          candidate,
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
      remedy: 'Install Node.js 22 or newer and rerun doctor.',
    },
  ];
  const { client, mode, keys, platform } = result.options;
  if (mode === 'local')
    findings.push({
      check: 'npx available on PATH (package startup unverified)',
      ok: await executableAvailable('npx', env),
      remedy:
        'Install npm with Node.js and add its executable directory to the client launching environment PATH.',
    });
  if (mode !== 'remote-oauth' && requiresAuthentication(keys, mode)) {
    if (client === 'vscode')
      findings.push({
        check: 'VS Code password input configured; value managed by client',
        ok: true,
      });
    else
      findings.push({
        check: 'DIGITALOCEAN_API_TOKEN present (value never displayed)',
        ok: Boolean(env.DIGITALOCEAN_API_TOKEN?.trim()),
        remedy:
          'Set DIGITALOCEAN_API_TOKEN securely in the client launching environment, then restart the client. Never paste it into configuration or chat.',
      });
  }
  if (platform !== process.platform)
    findings.push({
      check: 'Bundle targets a different OS; run doctor on the target OS',
      ok: false,
      remedy:
        'Run doctor on the target OS or generate a new bundle for this OS.',
    });
  return {
    findings,
    services: keys,
    authentication: 'unverified',
    note: 'Offline checks only. Client installation, package startup, GUI environment inheritance, OAuth and account access remain unverified.',
  };
}
