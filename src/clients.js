import { stringify } from 'smol-toml';
import { registry, services, modes, platforms, manifest } from './catalog.js';

export const clients = {
  plugin: { name: 'OpenAI portable plugin', file: 'mcp.json', skills: 'skills', modes: ['remote-oauth', 'local'], destination: 'Install the bundle as a local plugin in a host that supports portable plugins.' },
  chatgpt: { name: 'ChatGPT', file: 'mcp.json', skills: 'skills', modes: ['remote-oauth'], destination: 'Import the portable plugin where supported, or add each endpoint using your workspace remote MCP controls. Account/admin access may be required.' },
  codex: { name: 'Codex', file: '.codex/config.toml', skills: '.agents/skills', modes, destination: 'Merge the MCP tables into project .codex/config.toml (trusted projects) or ~/.codex/config.toml. Copy .agents/skills into your project or user skill directory.' },
  vscode: { name: 'VS Code', file: '.vscode/mcp.json', skills: '.github/skills', modes, destination: 'Merge servers and inputs into .vscode/mcp.json. Copy .github/skills into your project. Use MCP: List Servers to start and inspect connections.' },
  cursor: { name: 'Cursor', file: '.cursor/mcp.json', skills: '.cursor/skills', modes, destination: 'Merge mcpServers into project .cursor/mcp.json or ~/.cursor/mcp.json. Copy .cursor/skills into your project. Check MCP settings.' },
  'claude-code': { name: 'Claude Code', file: '.mcp.json', skills: '.claude/skills', modes, destination: 'Merge mcpServers into project .mcp.json and copy .claude/skills into your project. Approve project MCP servers and inspect /mcp.' },
  'claude-desktop': { name: 'Claude Desktop', file: 'claude_desktop_config.json', skills: 'skills', modes: ['remote-oauth', 'local'], destination: 'Remote: add each URL in Customize > Connectors > Add custom connector. Local: merge mcpServers into the desktop developer configuration (Windows: %APPDATA%/Claude/claude_desktop_config.json; macOS: ~/Library/Application Support/Claude/claude_desktop_config.json). Import skills manually using the client skill UI; availability depends on your plan.' },
  windsurf: { name: 'Windsurf', file: 'mcp_config.json', skills: '.windsurf/skills', modes, destination: 'Merge mcpServers into ~/.codeium/windsurf/mcp_config.json. Copy .windsurf/skills into your project. Inspect Cascade MCP settings; current upstream documentation may use Devin Desktop branding.' },
};

export const json = (value) => JSON.stringify(value, null, 2) + '\n';

export function assertCombination(client, mode, keys, platform) {
  if (!Object.hasOwn(clients, client)) throw new Error('Unknown client. Run setup --help for choices.');
  if (!modes.includes(mode) || !clients[client].modes.includes(mode)) throw new Error('Unsupported client/mode combination. Use remote-oauth or another documented client.');
  if (!platforms.includes(platform)) throw new Error('Platform must be win32, darwin, or linux.');
  if (client === 'claude-desktop' && platform === 'linux') throw new Error('Claude Desktop is not supported on Linux. Choose Claude Code or another client.');
  if (!keys.length || keys.some((key) => !services.has(key))) throw new Error('Unknown or empty service selection.');
  if (mode === 'local' && keys.some((key) => !services.get(key).local)) throw new Error('A selected service is unavailable locally. Choose remote-oauth explicitly.');
}

function reference(client) {
  if (client === 'vscode') return '${input:digitalocean-token}';
  if (client === 'claude-code') return '${DIGITALOCEAN_API_TOKEN}';
  return '${env:DIGITALOCEAN_API_TOKEN}';
}

export function configuration({ client, mode = 'remote-oauth', keys, platform = process.platform }) {
  assertCombination(client, mode, keys, platform);
  const servers = {};
  const needsToken = keys.some((key) => services.get(key).local.requiresToken);
  if (client === 'claude-desktop' && mode === 'remote-oauth') {
    return { file: 'connectors.json', content: json({ connectors: keys.map((key) => ({ name: `digitalocean-${key}`, url: services.get(key).remote.url })) }) };
  }
  if (mode === 'local') {
    // Windows stdio hosts need cmd to execute the npx.cmd shim; inputs are registry-owned.
    const args = ['-y', registry.localPackage, '--services', keys.map((key) => services.get(key).local.service).join(',')];
    const server = { command: platform === 'win32' ? 'cmd' : 'npx', args: platform === 'win32' ? ['/d', '/s', '/c', 'npx', ...args] : args };
    if (client !== 'codex' && client !== 'claude-desktop') server.type = 'stdio';
    if (needsToken) {
      if (client === 'codex') server.env_vars = ['DIGITALOCEAN_API_TOKEN'];
      // Desktop and portable stdio use the launching process environment, never invented interpolation.
      else if (!['claude-desktop', 'plugin'].includes(client)) server.env = { DIGITALOCEAN_API_TOKEN: reference(client) };
    }
    servers.digitalocean = server;
  } else {
    for (const key of keys) {
      const service = services.get(key);
      const server = client === 'windsurf' ? { serverUrl: service.remote.url } : { url: service.remote.url };
      if (['plugin', 'chatgpt'].includes(client)) server.type = 'streamable-http';
      if (['vscode', 'claude-code'].includes(client)) server.type = 'http';
      if (mode === 'remote-token' && service.remote.authentication !== 'none') {
        if (client === 'codex') server.bearer_token_env_var = 'DIGITALOCEAN_API_TOKEN';
        else server.headers = { Authorization: `Bearer ${reference(client)}` };
      }
      servers[`digitalocean-${key}`] = server;
    }
  }
  const config = client === 'codex' ? { mcp_servers: servers } : { [client === 'vscode' ? 'servers' : 'mcpServers']: servers };
  if (['plugin', 'chatgpt'].includes(client)) config.$schema = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
  if (client === 'vscode' && mode !== 'remote-oauth' && needsToken) config.inputs = [{ type: 'promptString', id: 'digitalocean-token', description: 'DigitalOcean API token (stored by VS Code, not digitaloceanapp)', password: true }];
  return { file: clients[client].file, content: client === 'codex' ? stringify(config) : json(config) };
}

export function compatibilityManifest() {
  const { $schema, ...metadata } = manifest;
  return { ...metadata, skills: './skills/', mcpServers: './.mcp.json' };
}
