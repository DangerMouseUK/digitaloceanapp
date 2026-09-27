# Windsurf

Configuration modes: remote-oauth, remote-token, local.

[First-party setup reference](https://docs.windsurf.com/windsurf/cascade/mcp). Source reviewed 2026-09-27; live DigitalOcean compatibility is pending.

## Generate

```sh
node bin/digitaloceanapp.js setup --client windsurf --mode remote-oauth --preset core --output ./windsurf-bundle
```

Run from the repository. Use `--platform win32`, `--platform darwin` or `--platform linux` for a different supported target. The generator rejects unsupported combinations rather than silently changing modes. Generated examples under `examples/` cover supported modes and operating systems for Core; the CLI supports all presets/custom selections.

## Install and verify

Merge mcpServers into ~/.codeium/windsurf/mcp_config.json. Remote entries use serverUrl and runtime ${env:NAME} references where needed. Copy .windsurf/skills into the project and verify discovery. Inspect Cascade MCP controls and authenticate; current first-party documentation redirects to Devin Desktop branding, so verify your installed product/version.

Skill location in the generated bundle: `.windsurf/skills/`. Back up and merge rather than replacing an existing client file. Preserve other server entries and skills.

Run validation against the bundle, inspect the client’s MCP connection and skill controls, then ask “Show me my DigitalOcean account.” Confirm the answer identifies connected scope and missing services. See [acceptance](../../docs/acceptance.md) for the full live gate.

## Remove and troubleshoot

Remove only the server entries/connector registrations and skill folders installed from this bundle. Remove any now-unused VS Code secret input. Revoke DigitalOcean grants separately if required. For plugin installation, uninstall through the host’s plugin controls.

For token modes, use the [authentication guide](../../docs/authentication.md); never copy token values into JSON/TOML or chat. GUI environment inheritance can differ from a shell. See [troubleshooting](../../docs/troubleshooting.md). No live compatibility claim follows from an example parsing successfully.
