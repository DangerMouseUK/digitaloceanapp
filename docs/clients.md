# Client compatibility

Source review dates: 2026-09-27 for the original targets; 2026-11-12 for the Claude apps, Claude Code plugin, Claude API and OpenAI Responses API targets. The combinations below are experimental configuration templates, not authenticated compatibility claims. Automated adapter coverage and live authentication are separate. The bundled examples use Core; setup can generate every supported preset/custom selection.

| Target                                       | `--client`       | Modes                                          | Instructions                                 |
| -------------------------------------------- | ---------------- | ---------------------------------------------- | -------------------------------------------- |
| Portable plugin (Codex, Claude Code, others) | `plugin`         | remote-oauth, local (local-capable hosts only) | [Guide](../clients/plugin/README.md)         |
| ChatGPT                                      | `chatgpt`        | remote-oauth                                   | [Guide](../clients/chatgpt/README.md)        |
| Codex                                        | `codex`          | remote-oauth, remote-token, local              | [Guide](../clients/codex/README.md)          |
| OpenAI Responses API                         | `openai-api`     | remote-token                                   | [Guide](../clients/openai-api/README.md)     |
| VS Code                                      | `vscode`         | remote-oauth, remote-token, local              | [Guide](../clients/vscode/README.md)         |
| Cursor                                       | `cursor`         | remote-oauth, remote-token, local              | [Guide](../clients/cursor/README.md)         |
| Claude Code                                  | `claude-code`    | remote-oauth, remote-token, local              | [Guide](../clients/claude-code/README.md)    |
| Claude apps (claude.ai, Desktop, mobile)     | `claude`         | remote-oauth                                   | [Guide](../clients/claude/README.md)         |
| Claude Desktop                               | `claude-desktop` | remote-oauth, local; Windows/macOS only        | [Guide](../clients/claude-desktop/README.md) |
| Claude API (Messages MCP connector)          | `anthropic-api`  | remote-token                                   | [Guide](../clients/anthropic-api/README.md)  |
| Windsurf                                     | `windsurf`       | remote-oauth, remote-token, local              | [Guide](../clients/windsurf/README.md)       |

Use OAuth by default. Unsupported combinations fail before any output is created, and the error names the modes the client supports. Linux Claude Desktop, ChatGPT and Claude app local mode, API OAuth, and token modes without a verified safe reference mechanism are explicitly rejected.

## Claude and Anthropic

- **Claude Code** can install this repository directly as a plugin from its own marketplace (`.claude-plugin/marketplace.json`), or use a generated portable plugin bundle, which carries `.claude-plugin/plugin.json` and its own marketplace file. Both pass `claude plugin validate --strict`. The repository root includes `bin/`, which Claude Code adds to the Bash tool's `PATH` while the plugin is enabled.
- **Claude apps** add remote connectors through the account UI. Skills are uploaded one ZIP per skill. Local MCP is not available there.
- **Claude API** fragments use the `mcp-client-2025-11-20` beta header with one `mcp_toolset` per server. The API runs MCP tool calls without per-call approval; restrict token scopes and disable unneeded tools.

## OpenAI

- **Codex** and the **portable plugin** cover Codex CLI, IDE and app hosts that read `.codex-plugin/plugin.json`.
- **ChatGPT** uses remote OAuth through workspace connector or plugin import controls.
- **OpenAI Responses API** fragments use `type: "mcp"` tools with `require_approval: "always"`.

All authenticated live client cells are **pending**, including OAuth, local startup and skill activation. See the [acceptance matrix](acceptance.md). Endpoint/source validation is not certification by a client vendor.

V3 retains every target above. Before installing, use `setup --client CLIENT --dry-run` to inspect services, included skills, destinations and authentication steps. After manual installation, check both server connections and skill discovery in the client; neither proves the other. Verify each client/version/mode/OS separately. Portable-plugin acceptance applies only to the named host tested, not all plugin hosts.
