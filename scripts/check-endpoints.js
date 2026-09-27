import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { registry } from '../src/catalog.js';

export function parseUpstream(readme, localSource) {
  const remote = new Map();
  for (const [, key, url] of readme.matchAll(
    /^\|\s*([a-z][a-z0-9-]*)\s*\|\s*(https:\/\/[^\s|]+)\s*\|/gm,
  )) {
    if (!url.includes('.mcp.digitalocean.com/')) continue;
    if (remote.has(key))
      throw new Error('Duplicate upstream service. Manual review required.');
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname.endsWith('.mcp.digitalocean.com') ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error('Unexpected upstream URL. Manual review required.');
    remote.set(key, url);
  }
  const block = localSource.match(
    /var supportedServices = map\[string\]struct\{\}\{([\s\S]*?)\n\}/,
  )?.[1];
  const local = new Set(
    [...String(block ?? '').matchAll(/"([a-z][a-z0-9-]*)"\s*:/g)].map(
      (match) => match[1],
    ),
  );
  if (!remote.size || !local.size)
    throw new Error(
      'Upstream format was not recognized; no service changes inferred.',
    );
  return { remote, local };
}

export function compareUpstream(upstream, known = registry) {
  const differences = [];
  const current = new Map(known.services.map((s) => [s.key, s]));
  for (const [key, url] of upstream.remote) {
    if (!current.has(key))
      differences.push(`New remote service: ${key} (${url}).`);
    else if (current.get(key).remote.url !== url)
      differences.push(`Remote endpoint changed for ${key}: ${url}.`);
  }
  for (const service of known.services) {
    if (!upstream.remote.has(service.key))
      differences.push(
        `Remote service missing from upstream table: ${service.key}.`,
      );
    if (service.local && !upstream.local.has(service.local.service))
      differences.push(
        `Local identifier missing upstream: ${service.local.service}.`,
      );
  }
  for (const key of upstream.local)
    if (!known.services.some((s) => s.local?.service === key))
      differences.push(`New local identifier: ${key}.`);
  return differences;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const urls = ['README.md', 'pkg/registry/registry.go'].map(
      (path) =>
        `https://raw.githubusercontent.com/digitalocean-labs/mcp-digitalocean/main/${path}`,
    );
    const sources = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20000),
          redirect: 'error',
        });
        if (!response.ok) throw new Error('Upstream metadata request failed.');
        return response.text();
      }),
    );
    const differences = compareUpstream(parseUpstream(...sources));
    const report = `## DigitalOcean upstream registry drift\n\nCompared official upstream main against the reviewed registry (local package ${registry.localPackage}).\n\n${differences.length ? differences.map((line) => `- ${line}`).join('\n') : 'No differences detected.'}\n\nReview first-party source changes and released package support before updating the registry or presets. No service has been enabled automatically.\n`;
    console.log(report);
    if (process.argv.includes('--report')) {
      await mkdir('dist', { recursive: true });
      await writeFile('dist/endpoint-drift.md', report);
      if (process.env.GITHUB_OUTPUT)
        await appendFile(
          process.env.GITHUB_OUTPUT,
          `drift=${differences.length > 0}\n`,
        );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
