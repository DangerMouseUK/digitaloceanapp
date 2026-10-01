# Upgrade a bundle

Use the current CLI to inspect a bundle from `1.0.0-rc.1`, `1.0.0-rc.2` or the current release (`1.0.0-rc.3`). Only schema version 1 is accepted. Other versions need an explicit compatibility review before they are added; use setup to generate a new selection when the old format is unsupported.

```sh
node bin/digitaloceanapp.js upgrade --path "../Old DigitalOcean bundle" --dry-run
node bin/digitaloceanapp.js upgrade --path "../Old DigitalOcean bundle" --dry-run --json
node bin/digitaloceanapp.js upgrade --path "../Old DigitalOcean bundle" --output "../New DigitalOcean bundle"
node bin/digitaloceanapp.js validate --path "../New DigitalOcean bundle"
```

The output must be a new directory outside the original bundle, with an existing writable parent. A dry run does not create output; it inspects the source and does not verify a proposed output directory's writability. Directory links inside the source are rejected. All work is offline.

The replacement preserves the exact service list, client, platform and authentication mode recorded in `bundle.json`. It does not expand a preset or silently replace unsupported services. An invalid selection fails with guidance before writing. The source must contain its expected configuration and a nonempty `INSTALL.md`.

## Review changes before installation

- `ADD` identifies a current generated file absent from the old bundle, such as a new skill.
- `REVIEW` identifies a generated file whose content differs, ignoring Windows versus Unix line endings. It may contain a release change, a customization, or both. There is no historical content baseline to separate those automatically.
- `RELEASE CHANGE` identifies a file that matches its recorded generation fingerprint but differs from the new template.
- `CUSTOMIZED` identifies a file that differs from both its recorded fingerprint and the new template. Custom content is not copied into the replacement.
- `MISSING` identifies an absent file with a recorded fingerprint. Required configuration and installation instructions must still exist before upgrade can proceed.
- Additional source files are counted for manual review. Their names and contents are suppressed because they may contain private data. They are retained only in the original bundle.

V3 generation adds an optional `generatedFileHashes` map to `bundle.json`. Values are SHA-256 fingerprints of generated template text with CRLF normalized to LF. Bundle metadata and migration notes are excluded. Hash labels never drive filesystem access; only trusted current generated paths are compared and reported. Fingerprints are advisory comparison metadata, not signatures or proof that content is safe. Strict validation still checks actual supporting files independently.

For older bundles without fingerprints, changed files retain `REVIEW`. Newly generated replacements gain fingerprints for future upgrades. Metadata changes also require review because metadata is not fingerprinted. A removed old generated file is retained in the source and counted among additional files when it is absent from the current templates.

The upgrade never executes configuration commands or copies old content into the replacement. In particular, annotations, unrelated MCP entries and custom skills must be reconciled manually. A successful upgrade is not a validation of the old configuration. Keep the original bundle, review differences locally and read `MIGRATE.md` before installing anything.

Back up installed configuration and skills, merge the new DigitalOcean entries while preserving unrelated entries, and follow `INSTALL.md` to verify the connection in the client. Revert a manual installation using your backup; deleting the generated replacement does not undo it. Authentication remains unverified by the CLI.

Strict `validate` behavior is unchanged: it checks the current version's bundle. Use `upgrade` for recognized older metadata rather than editing the old version field.
