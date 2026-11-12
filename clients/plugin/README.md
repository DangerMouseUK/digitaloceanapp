# Portable plugin

One bundle that installs as a plugin in Codex, Claude Code and other hosts that read the portable plugin format.

Configuration modes: remote-oauth, local (local-capable hosts only).

First-party references: [OpenAI plugins](https://developers.openai.com/plugins/build/plugins) (source reviewed 2026-09-27) and [Claude Code plugins](https://code.claude.com/docs/en/plugins-reference) (source reviewed 2026-11-12). Live DigitalOcean compatibility is pending.

## Generate

```sh
node bin/digitaloceanapp.js setup --client plugin --mode remote-oauth --preset core --output ./plugin-bundle
```

Run from the repository. Use `--platform win32`, `--platform darwin` or `--platform linux` for a different supported target. The generator rejects unsupported combinations rather than silently changing modes. Generated examples under `examples/` cover supported modes and operating systems for Core; the CLI supports all presets/custom selections.

## Install and verify

Install the generated bundle as a portable plugin using the host’s plugin controls. The root manifest and mcp.json are canonical; `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json` and `.mcp.json` provide generated compatibility surfaces. This tool does not register or modify marketplaces.

**Codex:** where Codex requires a personal marketplace, follow its local marketplace installation instructions.

**Claude Code:** the bundle is also a single-plugin marketplace. Run these in your shell, replacing the path with your bundle directory:

```sh
claude plugin marketplace add "./plugin-bundle"
claude plugin install digitaloceanapp@digitaloceanapp
```

To try it for one session without installing, start `claude --plugin-dir "./plugin-bundle"`. Skills appear namespaced, such as `/digitaloceanapp:app-troubleshooting`; use `/mcp` to connect and sign in. `claude plugin validate "./plugin-bundle"` checks the manifests offline.

The bundle has no top-level `bin/` directory, so it also meets the packaging rule for Claude plugins distributed to claude.ai and Cowork; that distribution path is untested.

Skill location in the generated bundle: `skills/`. Back up and merge rather than replacing an existing client file. Preserve other server entries and skills.

Run validation against the bundle, inspect the client’s MCP connection and skill controls, then ask “Show me my DigitalOcean account.” Confirm the answer identifies connected scope and missing services. See [acceptance](../../docs/acceptance.md) for the full live gate.

## Remove and troubleshoot

Remove only the server entries/connector registrations and skill folders installed from this bundle. Revoke DigitalOcean grants separately if required. For plugin installation, uninstall through the host’s plugin controls.

For local mode, use the [authentication guide](../../docs/authentication.md); never copy token values into JSON or chat. GUI environment inheritance can differ from a shell. See [troubleshooting](../../docs/troubleshooting.md). No live compatibility claim follows from an example parsing successfully.
