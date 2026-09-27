# Client compatibility

Source review date: 2026-09-27. The combinations below are experimental configuration templates, not authenticated compatibility claims. Automated adapter coverage and live authentication are separate. The bundled examples use Core; setup can generate every supported preset/custom selection.

| Target                 | Modes                                          | Instructions                                 |
| ---------------------- | ---------------------------------------------- | -------------------------------------------- |
| OpenAI portable plugin | remote-oauth, local (local-capable hosts only) | [Guide](../clients/plugin/README.md)         |
| ChatGPT                | remote-oauth                                   | [Guide](../clients/chatgpt/README.md)        |
| Codex                  | remote-oauth, remote-token, local              | [Guide](../clients/codex/README.md)          |
| VS Code                | remote-oauth, remote-token, local              | [Guide](../clients/vscode/README.md)         |
| Cursor                 | remote-oauth, remote-token, local              | [Guide](../clients/cursor/README.md)         |
| Claude Code            | remote-oauth, remote-token, local              | [Guide](../clients/claude-code/README.md)    |
| Claude Desktop         | remote-oauth, local; Windows/macOS only        | [Guide](../clients/claude-desktop/README.md) |
| Windsurf               | remote-oauth, remote-token, local              | [Guide](../clients/windsurf/README.md)       |

Use OAuth by default. Unsupported combinations fail before any output is created. Linux Claude Desktop, ChatGPT local, and token modes without a verified safe reference mechanism are explicitly rejected.

All authenticated live client cells are **pending**, including OAuth, local startup and skill activation. See the [acceptance matrix](acceptance.md). Endpoint/source validation is not certification by a client vendor.
