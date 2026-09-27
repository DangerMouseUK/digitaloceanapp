import { manifest } from '../src/catalog.js';

// Exercise packaging without creating a Git tag, release, or npm publication.
process.env.GITHUB_REF_NAME = `v${manifest.version}`;
await import('./release.js');
