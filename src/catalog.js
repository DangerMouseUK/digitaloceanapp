import { readFileSync } from 'node:fs';

export const root = new URL('../', import.meta.url);
export const readJson = (path) =>
  JSON.parse(readFileSync(new URL(path, root), 'utf8'));
export const registry = readJson('data/services.json');
export const presets = readJson('data/presets.json');
export const manifest = readJson('plugin.json');
export const services = new Map(
  registry.services.map((service) => [service.key, service]),
);
export const modes = ['remote-oauth', 'remote-token', 'local'];
export const platforms = ['win32', 'darwin', 'linux'];
export const fullWarning =
  'Advanced: Full enables many tools and may reduce tool-selection accuracy.';

export function requiresAuthentication(keys, mode) {
  return keys.some((key) => {
    const service = services.get(key);
    return mode === 'local'
      ? service.local?.requiresToken === true
      : service.remote.authentication !== 'none';
  });
}

export function selectServices({ preset, services: selection } = {}) {
  if (preset !== undefined && selection !== undefined)
    throw new Error('Choose --preset or --services, not both.');
  let keys;
  if (selection !== undefined)
    keys = Array.isArray(selection)
      ? selection
      : selection.split(',').map((key) => key.trim());
  else {
    preset ??= 'core';
    if (!Object.hasOwn(presets, preset))
      throw new Error('Unknown preset. Run services for choices.');
    keys = preset === 'full' ? [...services.keys()] : presets[preset];
  }
  if (!keys.length || keys.some((key) => !services.has(key)))
    throw new Error(
      'Empty or unknown service selection. Run services for valid keys.',
    );
  return [...new Set(keys)];
}
