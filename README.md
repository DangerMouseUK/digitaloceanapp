# digitaloceanapp

An open-source AI integration for DigitalOcean's official MCP servers.

**No backend. No database. No credential storage. Your AI client connects directly to DigitalOcean.**

`digitaloceanapp` does not operate a backend and does not receive your DigitalOcean credentials or account data. Your MCP client connects directly to DigitalOcean's official MCP servers, or to DigitalOcean's official MCP software running locally on your computer. Clients and DigitalOcean have their own data handling policies.

This is an independent open-source project, not an official DigitalOcean product. The development name does not imply trademark approval or endorsement.

## What you get

- A reviewed registry of 21 official services and four presets, with Core enabled by default.
- Nine evidence-based skills for inventory, auditing, App Platform review, deployment troubleshooting/review, cost review, architecture explanation, documentation and safe operations.
- Offline setup, validation and diagnostics for eight client targets.
- Portable plugin packaging, generated examples and manual installation/removal guides.

**Status: 1.0.0-rc.1.** Configuration and packaging have automated coverage. Authenticated client compatibility and behavioral acceptance remain pending; see the [acceptance matrix](docs/acceptance.md). This repository is the product; there is no web application to deploy.

## Quick start

Requires Node.js 22 or newer and npm. From a terminal:

```sh
git clone https://github.com/DangerMouseUK/digitaloceanapp.git
cd digitaloceanapp
npm ci
node bin/digitaloceanapp.js setup
```

Setup asks for a client, connection mode, preset/custom services, platform and **new** output directory. It generates a bundle and `INSTALL.md`; it does not install it into your client. Follow that guide to merge the configuration and install the skills. Expected setup time is about five minutes once the client is ready; OAuth/client access can take longer.

For a repeatable Codex/Core bundle:

```sh
node bin/digitaloceanapp.js setup --client codex --mode remote-oauth --preset core --output ./my-do-bundle
node bin/digitaloceanapp.js validate --path ./my-do-bundle
node bin/digitaloceanapp.js doctor --path ./my-do-bundle
```

The output parent must exist and the destination must not exist. Back up your client configuration before merging the generated fragment. Preserve unrelated entries. Configure client approvals, complete DigitalOcean OAuth through your client, then ask:

> Show me my DigitalOcean account.

> Review my App Platform apps for operational issues and possible waste.

> Why did my latest deployment fail?

The default Core preset connects Accounts, Apps, Insights and Documentation. Inventory must disclose services that are not connected. Metrics and billing detail depend on tools DigitalOcean actually exposes.

## Connection modes

**Remote OAuth (preferred):** the client talks to official HTTPS endpoints and opens DigitalOcean's authentication flow. There is no token prompt in this CLI. Documentation is public and needs no account token. See [remote mode](docs/remote-mode.md).

**Local MCP:** generate a bundle that launches the pinned official `@digitalocean/mcp@1.1.1` through npx with an explicit service list. Set `DIGITALOCEAN_API_TOKEN` in the client process environment or the client's supported secret input. The CLI never reads the token during setup or writes its value. See [local mode](docs/local-mode.md).

```sh
node bin/digitaloceanapp.js setup --client vscode --mode local --preset app-platform --output ./local-do-bundle
```

**Remote token:** available only on adapters with documented runtime secret references: Codex, VS Code, Cursor, Claude Code and Windsurf. Prefer OAuth. Never put real credentials in examples, commands, committed files or chat. See [authentication](docs/authentication.md).

## Clients, presets and commands

Supported configuration targets: OpenAI portable plugin (`plugin`), ChatGPT, Codex, VS Code, Cursor, Claude Code, Claude Desktop and Windsurf. Availability varies by client, platform, plan and mode; consult [client instructions](docs/clients.md).

Presets: `core`, `app-platform`, `infrastructure`, `full`, or select services with `--services apps,docs`. Full is advanced: too many tools can reduce tool-selection accuracy. Presets and custom lists are mutually exclusive.

```sh
node bin/digitaloceanapp.js services
node bin/digitaloceanapp.js services --json
node bin/digitaloceanapp.js --help
```

For explicit client files, pass the expected selection. Validation defaults to Core/remote OAuth:

```sh
node bin/digitaloceanapp.js validate --path /path/to/mcp.json --client cursor --preset app-platform
```

Generated bundles contain their own selection metadata. `doctor` checks this configuration, the Node/npx prerequisites and token-variable presence where appropriate. It does not contact DigitalOcean or prove the client can connect.

## Trust, safety and limitations

Skills are behavioral guidance, **not a technical read-only boundary**. Direct MCP access can expose write and destructive tools. DigitalOcean authorization and client permissions ultimately govern operations. Audits do not authorize deletion. Use appropriately scoped access and client approvals; see [security](docs/security.md).

No hosted infrastructure, telemetry, proxy, custom OAuth, account system or project-maintained resource history is included. Zero mandatory maintainer hosting cost does not mean DigitalOcean resources or AI client subscriptions are free. See [privacy](docs/privacy.md), [architecture](docs/architecture.md) and [limitations](docs/limitations.md).

## Development and distribution

```sh
npm ci
npm run generate
npm run check
npm pack
```

The tarball contains the CLI, plugin, configurations, skills and documentation. It can be installed locally with npm to expose `digitaloceanapp`; no npm registry publication is implied. The GitHub release workflow runs only on a future version tag. Public plugin-directory publication is a separate process requiring provider cooperation where domain verification applies.

See [supported services](docs/supported-services.md), [maintenance](docs/maintenance.md), [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [CHANGELOG](CHANGELOG.md) and the [MIT license](LICENSE).
