# Maintenance and release

## Source updates

Review DigitalOcean's official hosted service table and the service registry in the pinned local release. Remote and local availability are separate. Update `data/services.json` with exact source references/date and supported local identifiers, then explicitly review presets. Never add a service to Core merely because upstream added it.

Run `npm run generate`, inspect generated changes, `npm run format`, and `npm run check`. Check release/package versions together when updating the local package pin. Commit generated files so users can inspect examples without running tooling.

The scheduled endpoint check downloads only public upstream README/registry metadata. It compares endpoints and local identifiers, opens or updates one GitHub drift issue on change, and never updates configurations automatically. Network/parse failures fail the job rather than being interpreted as removal of all services. Its issue-writing permission is limited to the maintenance job on the default branch. Normal CLI commands and PR tests remain offline.

## Verification

`npm run check` covers generated drift, manifests, registry, skills/references, secret patterns, CLI/unit/packaging tests and formatting. CI runs on Node 22 and 24 on Windows, macOS and Linux. Credentialed account tests are not part of ordinary CI. GitHub Actions logs and the PR report provide actual results; [acceptance](acceptance.md) tracks live gates.

Development-only dependencies support schema/YAML validation and formatting. The production dependencies are parsers for client JSONC and TOML. No model API or MCP bridge is required for tests.

## Future releases

After live acceptance, update package/lockfile, portable manifest and changelog versions together, regenerate compatibility metadata, and run checks. Review the npm tarball with `npm pack --dry-run` and the release archive before publication. The tag workflow checks that tag and metadata versions match and packages the repository's declared product artifacts.

A `v*` tag triggers the release workflow; prerelease versions remain GitHub prereleases. This implementation does not create a tag, merge its review PR, publish to npm or submit a plugin-directory listing. Public listing needs separate provider/domain verification. No workflow deploys infrastructure.

GitHub private vulnerability reporting, secret scanning and push protection should remain enabled where available. Dependabot covers npm and GitHub Actions. Repository settings may depend on account policy; settings changes and unavailable features should be reported explicitly.
