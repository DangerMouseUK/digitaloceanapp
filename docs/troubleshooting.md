# Troubleshooting

## Setup or validation

Run `node bin/digitaloceanapp.js --help` from the clone. Node 22+ is required. An existing output directory is refused even if empty; choose a new directory with an existing writable parent.

Use `validate --path BUNDLE_DIRECTORY` for generated bundles. For an installed file, pass `--client`, the selected `--mode`, and `--preset` or `--services`. Without a selection, validation expects Core/remote OAuth. A wrong expected preset is not proof that the installed configuration is broken.

Malformed-file diagnostics omit parser details because they can contain secrets. Inspect the named file locally; do not paste its full content into an issue. DigitalOcean config errors can indicate an endpoint, transport, service selection, token reference or package-version mismatch.

## Client connection

- MCP entries absent: merge into the client's documented location, restart/reload, and approve project configuration if needed.
- Skills absent: install the skills as well as MCP. For manual import clients, use their skill controls. Check feature availability and the client version.
- OAuth not offered or rejected: remove accidental Authorization headers in OAuth mode; inspect client connection state and workspace policy. Authenticate directly through DigitalOcean. Do not change accounts silently.
- Local server fails: check Node/npx on the client's PATH, platform/architecture, npm network access and the pinned package. Run doctor in the same launching environment where possible.
- Missing token: set it outside the bundle or use VS Code's secret input. Restart GUI clients after environment changes; a shell variable may not reach a desktop process.
- Partial inventory or no metrics: check which services and tools are actually connected. Unavailable data is not evidence that a resource is absent or idle.

For support, include client/version, OS, mode, preset, CLI version and redacted error categories. Never include a PAT, raw app specification, passwords or unredacted logs. Use the repository issue templates; security reports follow [SECURITY.md](../SECURITY.md).
