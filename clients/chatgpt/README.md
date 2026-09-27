# ChatGPT

Configuration modes: remote-oauth.

[First-party setup reference](https://developers.openai.com/plugins/build/plugins). Source reviewed 2026-09-27; live DigitalOcean compatibility is pending.

## Generate

```sh
node bin/digitaloceanapp.js setup --client chatgpt --mode remote-oauth --preset core --output ./chatgpt-bundle
```

Run from the repository. Use `--platform win32`, `--platform darwin` or `--platform linux` for a different supported target. The generator rejects unsupported combinations rather than silently changing modes. Generated examples under `examples/` cover supported modes and operating systems for Core; the CLI supports all presets/custom selections.

## Install and verify

Import the portable package in a ChatGPT surface that supports private/local package import, subject to your workspace policy. Otherwise use the host’s remote MCP setup controls for each listed URL and its supported skill import workflow. Do not claim installing the package in Codex also installs it in ChatGPT. No local stdio or public-directory submission is performed.

Skill location in the generated bundle: `skills/ (manual import if needed)`. Back up and merge rather than replacing an existing client file. Preserve other server entries and skills.

Run validation against the bundle, inspect the client’s MCP connection and skill controls, then ask “Show me my DigitalOcean account.” Confirm the answer identifies connected scope and missing services. See [acceptance](../../docs/acceptance.md) for the full live gate.

## Remove and troubleshoot

Remove only the server entries/connector registrations and skill folders installed from this bundle. Remove any now-unused VS Code secret input. Revoke DigitalOcean grants separately if required. For plugin installation, uninstall through the host’s plugin controls.

For token modes, use the [authentication guide](../../docs/authentication.md); never copy token values into JSON/TOML or chat. GUI environment inheritance can differ from a shell. See [troubleshooting](../../docs/troubleshooting.md). No live compatibility claim follows from an example parsing successfully.
