import { stringify } from 'smol-toml';
import {
  registry,
  services,
  modes,
  platforms,
  manifest,
  requiresAuthentication,
} from './catalog.js';

export const clients = {
  plugin: {
    name: 'Portable plugin (Codex, Claude Code and other plugin hosts)',
    file: 'mcp.json',
    skills: 'skills',
    modes: ['remote-oauth', 'local'],
    destination:
      'Install the bundle as a local plugin. Codex reads .codex-plugin/plugin.json. Claude Code reads .claude-plugin/plugin.json: run claude plugin marketplace add with the bundle path, then claude plugin install digitaloceanapp@digitaloceanapp. Other hosts read plugin.json and mcp.json.',
  },
  chatgpt: {
    name: 'ChatGPT',
    file: 'mcp.json',
    skills: 'skills',
    modes: ['remote-oauth'],
    destination:
      'Import the portable plugin where supported, or add each endpoint using your workspace remote MCP controls. Account/admin access may be required.',
  },
  codex: {
    name: 'Codex',
    file: '.codex/config.toml',
    skills: '.agents/skills',
    modes,
    destination:
      'Merge the MCP tables into project .codex/config.toml (trusted projects) or ~/.codex/config.toml. Copy .agents/skills into your project or user skill directory.',
  },
  vscode: {
    name: 'VS Code',
    file: '.vscode/mcp.json',
    skills: '.github/skills',
    modes,
    destination:
      'Merge servers and inputs into .vscode/mcp.json. Copy .github/skills into your project. Use MCP: List Servers to start and inspect connections.',
  },
  cursor: {
    name: 'Cursor',
    file: '.cursor/mcp.json',
    skills: '.cursor/skills',
    modes,
    destination:
      'Merge mcpServers into project .cursor/mcp.json or ~/.cursor/mcp.json. Copy .cursor/skills into your project. Check MCP settings.',
  },
  'claude-code': {
    name: 'Claude Code',
    file: '.mcp.json',
    skills: '.claude/skills',
    modes,
    destination:
      'Merge mcpServers into project .mcp.json and copy .claude/skills into your project. Approve project MCP servers and inspect /mcp.',
  },
  claude: {
    name: 'Claude apps (claude.ai, Claude Desktop, mobile, Cowork)',
    file: 'connectors.json',
    skills: 'skills',
    modes: ['remote-oauth'],
    destination:
      'Add each URL from connectors.json in Claude under Customize > Connectors > Add custom connector. On Team and Enterprise plans an owner adds it under Organization settings > Connectors, then members connect. Connectors are configured through your Claude account rather than one device.',
  },
  'claude-desktop': {
    name: 'Claude Desktop',
    file: 'claude_desktop_config.json',
    skills: 'skills',
    modes: ['remote-oauth', 'local'],
    platforms: ['win32', 'darwin'],
    destination:
      'Remote: add each URL in Customize > Connectors > Add custom connector. Local: merge mcpServers into the desktop developer configuration (Windows: %APPDATA%/Claude/claude_desktop_config.json; macOS: ~/Library/Application Support/Claude/claude_desktop_config.json). Import skills manually using the client skill UI; availability depends on your plan.',
  },
  'anthropic-api': {
    name: 'Claude API (Messages API MCP connector)',
    file: 'anthropic-mcp.json',
    skills: 'skills',
    modes: ['remote-token'],
    destination:
      'Send the anthropic-beta header and merge body.mcp_servers and body.tools into your Messages API request. In code, replace each ${DIGITALOCEAN_API_TOKEN} placeholder with a token read from your secret store at request time.',
  },
  'openai-api': {
    name: 'OpenAI Responses API (remote MCP tool)',
    file: 'openai-mcp.json',
    skills: 'skills',
    modes: ['remote-token'],
    destination:
      'Merge the tools entries into your Responses API request. In code, replace each ${DIGITALOCEAN_API_TOKEN} placeholder with a token read from your secret store at request time. Keep require_approval set to always unless you have reviewed the tools.',
  },
  windsurf: {
    name: 'Windsurf',
    file: 'mcp_config.json',
    skills: '.windsurf/skills',
    modes,
    destination:
      'Merge mcpServers into ~/.codeium/windsurf/mcp_config.json. Copy .windsurf/skills into your project. Inspect Cascade MCP settings; current upstream documentation may use Devin Desktop branding.',
  },
};

export const json = (value) => JSON.stringify(value, null, 2) + '\n';

// Hosted connector lists and API request fragments are compared as whole documents.
export const connectorClients = ['claude'];
export const apiClients = ['anthropic-api', 'openai-api'];
export const anthropicMcpBeta = 'mcp-client-2025-11-20';

export function documentField(client, mode) {
  if (client === 'codex') return 'mcp_servers';
  if (client === 'vscode') return 'servers';
  if (
    connectorClients.includes(client) ||
    (client === 'claude-desktop' && mode === 'remote-oauth')
  )
    return 'connectors';
  if (client === 'anthropic-api') return 'body';
  if (client === 'openai-api') return 'tools';
  return 'mcpServers';
}

export function supportedPlatforms(client) {
  return clients[client].platforms ?? platforms;
}

export function installationDetails({ client, mode, platform, keys }) {
  let destination = clients[client].destination;
  let removal = `Remove only the DigitalOcean server entries you added and the skill folders you installed from ${clients[client].skills}/.`;
  if (
    client === 'vscode' &&
    mode !== 'remote-oauth' &&
    requiresAuthentication(keys, mode)
  )
    removal +=
      ' Remove digitalocean-token from inputs only if no remaining server uses it.';
  if (client === 'claude-desktop') {
    destination =
      mode === 'remote-oauth'
        ? 'Add each URL from connectors.json using Customize > Connectors > Add custom connector. This file is an installation inventory, not a native client configuration.'
        : `Back up and merge mcpServers into ${platform === 'win32' ? '%APPDATA%/Claude/claude_desktop_config.json' : '~/Library/Application Support/Claude/claude_desktop_config.json'}. Preserve unrelated server entries.`;
    destination +=
      ' Import the supplied skills through the client skill UI; availability depends on your plan.';
    if (mode === 'remote-oauth')
      removal =
        'Remove the connectors you added through the client UI and the skills you imported.';
  }
  if (['plugin', 'chatgpt'].includes(client))
    removal =
      'Uninstall the plugin through the host plugin controls (Claude Code: claude plugin uninstall digitaloceanapp@digitaloceanapp, then claude plugin marketplace remove digitaloceanapp). If you installed endpoints and skills manually, remove only those connectors and imported skills.';
  if (client === 'claude')
    removal =
      'Remove the connectors you added under Customize > Connectors (or Organization settings > Connectors) and delete the skills you uploaded under Customize > Skills.';
  if (apiClients.includes(client))
    removal =
      'Remove the DigitalOcean entries from your request code. Revoke or rotate the DigitalOcean token if nothing else uses it.';
  return { destination, removal };
}

export function assertCombination(client, mode, keys, platform) {
  if (!Object.hasOwn(clients, client))
    throw new Error('Unknown client. Run setup --help for choices.');
  if (!modes.includes(mode) || !clients[client].modes.includes(mode))
    throw new Error(
      `Unsupported client/mode combination. ${clients[client].name} supports: ${clients[client].modes.join(', ')}.`,
    );
  if (!platforms.includes(platform))
    throw new Error('Platform must be win32, darwin, or linux.');
  if (!supportedPlatforms(client).includes(platform))
    throw new Error(
      'Claude Desktop is not supported on Linux. Choose Claude Code or another client.',
    );
  if (
    !Array.isArray(keys) ||
    !keys.length ||
    keys.some((key) => !services.has(key))
  )
    throw new Error('Unknown or empty service selection.');
  if (mode === 'local' && keys.some((key) => !services.get(key).local))
    throw new Error(
      'A selected service is unavailable locally. Choose remote-oauth explicitly.',
    );
}

function reference(client) {
  if (client === 'vscode') return '${input:digitalocean-token}';
  // API placeholders are substituted by the caller's code, never by this tool.
  if (['claude-code', ...apiClients].includes(client))
    return '${DIGITALOCEAN_API_TOKEN}';
  return '${env:DIGITALOCEAN_API_TOKEN}';
}

function apiConfiguration(client, mode, keys) {
  const authenticated = (service) =>
    mode === 'remote-token' && service.remote.authentication !== 'none';
  if (client === 'anthropic-api') {
    const servers = keys.map((key) => {
      const service = services.get(key);
      const server = {
        type: 'url',
        url: service.remote.url,
        name: `digitalocean-${key}`,
      };
      if (authenticated(service))
        server.authorization_token = reference(client);
      return server;
    });
    return {
      headers: { 'anthropic-beta': anthropicMcpBeta },
      body: {
        mcp_servers: servers,
        tools: servers.map(({ name }) => ({
          type: 'mcp_toolset',
          mcp_server_name: name,
        })),
      },
    };
  }
  return {
    tools: keys.map((key) => {
      const service = services.get(key);
      const tool = {
        type: 'mcp',
        server_label: `digitalocean_${key}`,
        server_description: `DigitalOcean ${service.name}: ${service.description}`,
        server_url: service.remote.url,
      };
      if (authenticated(service)) tool.authorization = reference(client);
      tool.require_approval = 'always';
      return tool;
    }),
  };
}

export function configuration({
  client,
  mode = 'remote-oauth',
  keys,
  platform = process.platform,
}) {
  assertCombination(client, mode, keys, platform);
  const servers = {};
  const needsToken = requiresAuthentication(keys, mode);
  if (apiClients.includes(client))
    return {
      file: clients[client].file,
      content: json(apiConfiguration(client, mode, keys)),
    };
  if (documentField(client, mode) === 'connectors') {
    return {
      file: 'connectors.json',
      content: json({
        connectors: keys.map((key) => ({
          name: `digitalocean-${key}`,
          url: services.get(key).remote.url,
        })),
      }),
    };
  }
  if (mode === 'local') {
    // Windows stdio hosts need cmd to execute the npx.cmd shim; inputs are registry-owned.
    const args = [
      '-y',
      registry.localPackage,
      '--services',
      keys.map((key) => services.get(key).local.service).join(','),
    ];
    const server = {
      command: platform === 'win32' ? 'cmd' : 'npx',
      args: platform === 'win32' ? ['/d', '/s', '/c', 'npx', ...args] : args,
    };
    if (client !== 'codex' && client !== 'claude-desktop')
      server.type = 'stdio';
    if (needsToken) {
      if (client === 'codex') server.env_vars = ['DIGITALOCEAN_API_TOKEN'];
      // Desktop and portable stdio use the launching process environment, never invented interpolation.
      else if (!['claude-desktop', 'plugin'].includes(client))
        server.env = { DIGITALOCEAN_API_TOKEN: reference(client) };
    }
    servers.digitalocean = server;
  } else {
    for (const key of keys) {
      const service = services.get(key);
      const server =
        client === 'windsurf'
          ? { serverUrl: service.remote.url }
          : { url: service.remote.url };
      if (['plugin', 'chatgpt'].includes(client))
        server.type = 'streamable-http';
      if (['vscode', 'claude-code'].includes(client)) server.type = 'http';
      if (mode === 'remote-token' && service.remote.authentication !== 'none') {
        if (client === 'codex')
          server.bearer_token_env_var = 'DIGITALOCEAN_API_TOKEN';
        else server.headers = { Authorization: `Bearer ${reference(client)}` };
      }
      servers[`digitalocean-${key}`] = server;
    }
  }
  const config =
    client === 'codex'
      ? { mcp_servers: servers }
      : { [client === 'vscode' ? 'servers' : 'mcpServers']: servers };
  if (['plugin', 'chatgpt'].includes(client))
    config.$schema = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
  if (client === 'vscode' && mode !== 'remote-oauth' && needsToken)
    config.inputs = [
      {
        type: 'promptString',
        id: 'digitalocean-token',
        description:
          'DigitalOcean API token (stored by VS Code, not digitaloceanapp)',
        password: true,
      },
    ];
  return {
    file: clients[client].file,
    content: client === 'codex' ? stringify(config) : json(config),
  };
}

// Claude Code reads .claude-plugin/plugin.json and loads skills/ and .mcp.json from their default locations.
export function claudePluginManifest() {
  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    homepage: manifest.homepage,
    repository: manifest.repository,
    license: manifest.license,
    keywords: manifest.keywords,
    privacyPolicyUrl:
      manifest.extensions['com.openai'].interface.privacyPolicyURL,
  };
}

export function claudeMarketplace() {
  return {
    name: manifest.name,
    owner: { name: manifest.author.name },
    description: manifest.description,
    plugins: [
      {
        name: manifest.name,
        source: './',
        description: manifest.description,
      },
    ],
  };
}

export function compatibilityManifest() {
  const { $schema, extensions, ...metadata } = manifest;
  return {
    ...metadata,
    skills: './skills/',
    mcpServers: './.mcp.json',
    interface: extensions['com.openai'].interface,
  };
}
