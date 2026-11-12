# OpenAI Responses API

Use this guide to give OpenAI models DigitalOcean tools from your own code through the Responses API [remote MCP tool](https://developers.openai.com/api/docs/guides/tools-connectors-mcp). OpenAI's API connects to DigitalOcean's hosted servers for each request.

Configuration mode: remote-token. The API has no interactive sign-in, so your code supplies a DigitalOcean API token. Source reviewed 2026-11-12; live DigitalOcean compatibility is pending.

## Generate

```sh
node bin/digitaloceanapp.js setup --client openai-api --mode remote-token --preset core --output ./openai-api-bundle
```

`openai-mcp.json` contains one `type: "mcp"` tool per selected service. Each protected server has the placeholder `${DIGITALOCEAN_API_TOKEN}` in `authorization`; nothing substitutes it for you. Every tool sets `require_approval: "always"`.

## Use it in a request

Read the token from your secret store at request time and replace the placeholder:

```js
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';

const { tools } = JSON.parse(readFileSync('openai-mcp.json', 'utf8'));
const token = process.env.DIGITALOCEAN_API_TOKEN;
const client = new OpenAI();
const response = await client.responses.create({
  model: 'YOUR_MODEL',
  tools: tools.map((tool) =>
    tool.authorization ? { ...tool, authorization: token } : tool,
  ),
  input: 'List my App Platform apps. Make no changes.',
});
```

The response contains `mcp_approval_request` items. Review each one and send an `mcp_approval_response` to allow it. Relax `require_approval` only for tools you have reviewed, for example read-only listing tools, and add `allowed_tools` to limit what each server exposes. The OpenAI Agents SDK accepts the same tool configuration through its hosted MCP tool.

## Permissions and skills

DigitalOcean's tools can change and delete resources. Create a token with the narrowest scopes that cover your task; a read-only token is the safest choice for reviews. Keep the token out of prompts, logs and source control.

The API does not load the bundle's skill folders. Include the relevant `SKILL.md` from `skills/` in your instructions. Skills guide the model; they do not block tools.

## Verify and remove

Run `node bin/digitaloceanapp.js validate --path ./openai-api-bundle`. `doctor` checks that `DIGITALOCEAN_API_TOKEN` is present in the current shell without printing it. To remove, delete the entries from your request code and revoke the token if nothing else uses it.

For ChatGPT itself, use the [ChatGPT guide](../chatgpt/README.md). For Codex, use the [Codex guide](../codex/README.md).
