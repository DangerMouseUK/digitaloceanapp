# Local mode

Generate `setup --client CLIENT --mode local --preset core --output NEW_DIRECTORY`. Local MCP is available for the `plugin`, Codex, VS Code, Cursor, Claude Code, Claude Desktop and Windsurf targets. ChatGPT cloud is remote-only; Claude Desktop has no Linux adapter.

The generated configuration starts `npx -y @digitalocean/mcp@1.1.1 --services SELECTED_SERVICES`. Windows configurations invoke the npx shim through `cmd /d /s /c`; command arguments come from the reviewed registry. No shell command incorporates token values or user-provided arbitrary service names.

Node/npx must be installed and reachable from the AI client. The package download is performed by npm when the user starts the server; network access may be needed then. The CLI does not download or execute MCP as part of setup or diagnostics.

Set the token outside the bundle using [client-appropriate authentication](authentication.md). Public documentation tools do not require a DigitalOcean API token. Upstream also registers shared region tools regardless of service selection; these may require authorization. Selection limits product tools, not underlying token permissions.

Confirm the selected service tools in the client, run a read-only inventory, and record the client version and result in the [acceptance matrix](acceptance.md). A successful configuration parse is not evidence that the process started or that authentication worked.

If startup fails, inspect redacted client logs for Node/npx availability, architecture/platform support and environment inheritance. Do not paste raw environment dumps or app secrets into an issue.
