# Architecture

Remote: user → AI client with configuration and skills → official DigitalOcean MCP endpoints → DigitalOcean account.

Local: user → AI client with configuration and skills → official local DigitalOcean MCP process → DigitalOcean API/public documentation.

The maintainer is absent from both data paths. npm downloads the official package when the user starts local MCP; npm and GitHub have their own service policies. digitaloceanapp setup itself is offline.

## Implementation boundaries

- `data/services.json` holds endpoint provenance, authentication requirements and local identifiers; `data/presets.json` holds service selections.
- `src/clients.js` renders client formats without resolving secrets. `scripts/generate.js` builds committed examples and documentation from that data.
- `src/bundle.js` copies skills and renders a new installation directory. Existing client configuration is never edited.
- `src/validate.js` parses JSON/JSONC/TOML without executing commands. `src/doctor.js` checks local prerequisites and reports presence of required environment variables, never their values.
- `skills/` contains fifteen user workflows. Each carries its own essential safety and uncertainty instructions.
- Setup and upgrade previews report trusted selections and generated paths without writes. V3 bundle metadata records fingerprints of generated files for advisory upgrade comparisons; custom data and fingerprint labels never become output paths.

There is no runtime request handler, OAuth implementation, database, telemetry, resource cache or persistent account history. CLI output contains configuration diagnostics, not account data. Scheduled maintenance runs on GitHub and only compares public upstream metadata.

The utility persists configuration, skills and generated-file metadata only. Resource findings stay in the user's AI client. Development walkthrough records contain synthetic fixtures and responses, not customer account data.

Portable manifest identity is canonical in root `plugin.json`. The Codex compatibility manifest and HTTP compatibility config are generated from it and the registry. Plugin hosts determine their own discovery and precedence behavior; client testing is recorded separately.
