# Claude Code

Configuration modes: remote-oauth, remote-token, local.

[First-party setup reference](https://code.claude.com/docs/en/mcp). Source reviewed 2026-09-27; live DigitalOcean compatibility is pending.

## Install as a plugin

The quickest route for Core with remote OAuth is to install this repository as a Claude Code plugin. In your shell:

```sh
claude plugin marketplace add DangerMouseUK/digitaloceanapp
claude plugin install digitaloceanapp@digitaloceanapp
```

The plugin adds the Core servers and all skills, namespaced as `/digitaloceanapp:<skill>`. Run `/mcp` in a session to connect and sign in to DigitalOcean. Remove it with `claude plugin uninstall digitaloceanapp@digitaloceanapp`, then `claude plugin marketplace remove digitaloceanapp`. The repository's `bin/` directory is placed on the Bash tool's `PATH` while the plugin is enabled; it contains only this offline setup utility.

For a different preset or local mode as a plugin, generate a [portable plugin bundle](../plugin/README.md). For project-level configuration, follow the steps below.

## Generate

```sh
node bin/digitaloceanapp.js setup --client claude-code --mode remote-oauth --preset core --output ./claude-code-bundle
```

Run from the repository. Use `--platform win32`, `--platform darwin` or `--platform linux` for a different supported target. The generator rejects unsupported combinations rather than silently changing modes. Generated examples under `examples/` cover supported modes and operating systems for Core; the CLI supports all presets/custom selections.

## Install and verify

Merge mcpServers into project .mcp.json and copy .claude/skills into the project. Approve the project MCP configuration, inspect /mcp and complete OAuth. HTTP entries include type: http. Token references remain literal ${DIGITALOCEAN_API_TOKEN}; do not expand a token through a shell command that writes config.

Skill location in the generated bundle: `.claude/skills/`. Back up and merge rather than replacing an existing client file. Preserve other server entries and skills.

Run validation against the bundle, inspect the client’s MCP connection and skill controls, then ask “Show me my DigitalOcean account.” Confirm the answer identifies connected scope and missing services. See [acceptance](../../docs/acceptance.md) for the full live gate.

## Remove and troubleshoot

Remove only the server entries/connector registrations and skill folders installed from this bundle. Revoke DigitalOcean grants separately if required.

For token modes, use the [authentication guide](../../docs/authentication.md); never copy token values into JSON/TOML or chat. GUI environment inheritance can differ from a shell. See [troubleshooting](../../docs/troubleshooting.md). No live compatibility claim follows from an example parsing successfully.
