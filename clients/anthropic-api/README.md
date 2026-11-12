# Claude API

Use this guide to give Claude DigitalOcean tools from your own code through the Messages API [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector). Anthropic's API connects to DigitalOcean's hosted servers for each request.

Configuration mode: remote-token. The API has no interactive sign-in, so your code supplies a DigitalOcean API token. Source reviewed 2026-11-12; live DigitalOcean compatibility is pending.

## Generate

```sh
node bin/digitaloceanapp.js setup --client anthropic-api --mode remote-token --preset core --output ./claude-api-bundle
```

`anthropic-mcp.json` contains the beta header and the `mcp_servers` and `tools` entries for the selected services. Each protected server has the placeholder `${DIGITALOCEAN_API_TOKEN}`; nothing substitutes it for you.

## Use it in a request

Read the token from your secret store at request time, replace the placeholder, and pass the entries with the beta header. A TypeScript example:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';

const fragment = JSON.parse(readFileSync('anthropic-mcp.json', 'utf8'));
const token = process.env.DIGITALOCEAN_API_TOKEN;
const mcpServers = fragment.body.mcp_servers.map((server) =>
  server.authorization_token
    ? { ...server, authorization_token: token }
    : server,
);

const client = new Anthropic();
const response = await client.beta.messages.create({
  model: 'claude-opus-5-5',
  max_tokens: 16000,
  betas: [fragment.headers['anthropic-beta']],
  mcp_servers: mcpServers,
  tools: fragment.body.tools,
  messages: [
    { role: 'user', content: 'List my App Platform apps. Make no changes.' },
  ],
});
```

Keep the token out of prompts, logs and source control. The `mcp-client-2025-11-20` header is accepted on the Claude API and the cloud platforms listed in Anthropic's documentation. The newer `mcp-client-2026-09-15` header adds tool-list pinning on the Claude API; switch to it only if you also return the `mcp_tool_listing` blocks it produces.

## Permissions

The Messages API runs MCP tool calls without a per-call approval step, and DigitalOcean's tools can change and delete resources. Before connecting:

- Create a DigitalOcean token with the narrowest scopes that cover your task. A read-only token is the safest choice for reviews.
- Disable tools you do not need with `default_config` and `configs` on each `mcp_toolset` (for example `"default_config": { "enabled": false }` plus an allowlist).
- Include the relevant `SKILL.md` from `skills/` in your system prompt. Skills guide the model; they do not block tools.

## Verify and remove

Run `node bin/digitaloceanapp.js validate --path ./claude-api-bundle`. `doctor` checks that `DIGITALOCEAN_API_TOKEN` is present in the current shell without printing it. A successful request lists `mcp_tool_use` and `mcp_tool_result` blocks in the response.

To remove, delete the entries from your request code and revoke the token if nothing else uses it. Local MCP servers cannot be reached by the API; use [Claude Code](../claude-code/README.md) for local mode.
