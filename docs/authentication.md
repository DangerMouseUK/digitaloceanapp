# Authentication

Prefer remote OAuth: add only the official endpoint through the supported client and sign in directly to DigitalOcean. Each service may need its own connection/consent. This project implements no OAuth flow and holds no client secret. Documentation MCP requires no account token.

For local MCP or supported remote-token adapters, choose appropriately scoped DigitalOcean access. Enter the value only in the client's secret input/store or the environment of the process that starts the client. Never paste it into digitaloceanapp setup, configuration files, source code, issue reports or chat.

| Client                                | Credential reference generated                                     |
| ------------------------------------- | ------------------------------------------------------------------ |
| Codex remote                          | `bearer_token_env_var = "DIGITALOCEAN_API_TOKEN"`                  |
| Codex local                           | `env_vars = ["DIGITALOCEAN_API_TOKEN"]`                            |
| VS Code                               | `${input:digitalocean-token}` with `password: true`                |
| Cursor / Windsurf                     | `${env:DIGITALOCEAN_API_TOKEN}`                                    |
| Claude Code                           | `${DIGITALOCEAN_API_TOKEN}`                                        |
| Portable local / Claude Desktop local | Inherited launching-process environment; no invented interpolation |
| Claude API / OpenAI Responses API     | `${DIGITALOCEAN_API_TOKEN}` placeholder replaced by your own code  |

Remote-token bundles are not offered for ChatGPT, the Claude apps, portable plugins or Claude Desktop because this adapter does not establish a portable safe secret-injection mechanism for those paths. Use OAuth or a documented local-capable client explicitly.

The Claude API and OpenAI Responses API cannot run DigitalOcean's OAuth sign-in, so they use remote-token only. The placeholder is not an interpolation syntax either API understands: read the token from your secret store at request time and substitute it in memory. Never commit the substituted request, log it or include the token in a prompt. Both providers send the token to DigitalOcean on each request and do not return it in responses. The Claude API runs MCP tool calls without per-call approval, so prefer read-only token scopes there.

On Windows, use the operating system's user environment-variable UI and restart the client. On macOS/Linux, use a secure secret manager or non-echoing shell input in the launching session. GUI apps may not inherit a shell's environment. Never verify a token using `echo`; `doctor` reports presence only. Presence in the CLI environment does not prove presence in the client's environment.

Revocation is managed by DigitalOcean and the client. Removing this repository or a bundle does not revoke grants or delete tokens held by other software. Consult [DigitalOcean's authentication guidance](https://github.com/digitalocean-labs/mcp-digitalocean#authentication).
