import { createHash } from 'node:crypto';

export const fileHash = (content) =>
  createHash('sha256').update(content.replaceAll('\r\n', '\n')).digest('hex');

export function generatedFileHashes(files) {
  return Object.fromEntries(
    [...files]
      .filter(([file]) => !['bundle.json', 'MIGRATE.md'].includes(file))
      .map(([file, content]) => [file, fileHash(content)]),
  );
}

export function checkFileHashes(value) {
  if (value === undefined) return;
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.values(value).some(
      (hash) => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash),
    )
  )
    throw new Error(
      'Invalid generated file fingerprints. Review bundle metadata locally.',
    );
  // Keys are advisory labels only. Never use them as filesystem paths or print them.
}
