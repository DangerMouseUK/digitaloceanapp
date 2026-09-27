# digitaloceanapp

DigitalOcean tools and workflows for your AI assistant.

Connect your assistant to [DigitalOcean's official MCP servers](https://github.com/digitalocean-labs/mcp-digitalocean) to explore your infrastructure, review App Platform deployments, and investigate your cloud costs. digitaloceanapp supplies the client configuration and reusable instructions—called skills—that guide those tasks.

Your assistant connects directly to DigitalOcean, either through its hosted servers or its official MCP package running on your computer. This project runs no backend and receives none of your credentials or account data.

**Release candidate:** `1.0.0-rc.1`. Automated configuration and packaging checks pass on Windows, macOS, and Linux. Live authentication and client testing are [still pending](docs/acceptance.md).

## Get started

You'll need **Node.js 22 or newer**, npm, and an MCP-compatible AI client.

```sh
git clone https://github.com/DangerMouseUK/digitaloceanapp.git
cd digitaloceanapp
npm ci
node bin/digitaloceanapp.js setup
```

Choose your client, select **Remote OAuth** and the **Core** preset, then pick a new output directory. Setup creates the configuration, skills, and an `INSTALL.md` with instructions for your client.

Follow that file to install the skills and merge the configuration into your client. Setup doesn't change your existing settings. Once installed, connect the servers and sign in through DigitalOcean when your client prompts you.

Try asking:

> What do I have running on DigitalOcean?

> Review my App Platform apps. Are there any deployment problems or resources worth checking for oversizing?

> Why did my latest deployment fail?

The included skills also cover account audits, recent deployment history, infrastructure relationships, and official documentation research. Review and troubleshooting skills are written to inspect resources without changing them; resource changes require a specific request.

## Choose a client

| Client                      | Setup guide                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| Codex                       | [Configuration and skills](clients/codex/README.md)              |
| VS Code                     | [Configuration and skills](clients/vscode/README.md)             |
| Cursor                      | [Configuration and skills](clients/cursor/README.md)             |
| Claude Code                 | [Configuration and skills](clients/claude-code/README.md)        |
| Claude Desktop              | [Connectors and local MCP](clients/claude-desktop/README.md)     |
| Windsurf                    | [Configuration and skills](clients/windsurf/README.md)           |
| ChatGPT                     | [Remote connections and plugin setup](clients/chatgpt/README.md) |
| Other portable plugin hosts | [Plugin package](clients/plugin/README.md)                       |

Connection modes and skill installation vary by client. ChatGPT uses remote connections; Claude Desktop configuration is provided for Windows and macOS. See the [compatibility notes](docs/clients.md) for the current limits.

## Select your services

Start with the services you use. Connecting every server adds tools your assistant may not need.

| Preset           | Includes                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `core` — default | Accounts, App Platform, Insights, Documentation                                                  |
| `app-platform`   | Core plus Container Registry, Spaces, and Networking                                             |
| `infrastructure` | Accounts, Droplets, Databases, Kubernetes, Networking, Volumes, NFS, Insights, and Documentation |
| `full`           | All 21 services in the reviewed registry                                                         |

You can also choose individual services. For example, to generate a Cursor configuration for App Platform and documentation:

```sh
node bin/digitaloceanapp.js setup --client cursor --services apps,docs --output ./do-config
```

The output directory must be new, and its parent must already exist. Run `node bin/digitaloceanapp.js services` for the full list, or browse the [service reference](docs/supported-services.md).

## Authentication

**Remote OAuth is the default.** Your client opens DigitalOcean's sign-in flow; you don't give this project a token. Public Documentation MCP needs no account credentials.

For local MCP, select `--mode local`. The generated configuration runs the pinned official DigitalOcean package on your computer. Supply `DIGITALOCEAN_API_TOKEN` through the client's supported secret input or launching environment.

Remote API-token configurations are also available for Codex, VS Code, Cursor, Claude Code, and Windsurf. Setup only writes references to credentials, never their values. See [authentication](docs/authentication.md), [remote mode](docs/remote-mode.md), or [local mode](docs/local-mode.md) for instructions.

## Check your setup

```sh
node bin/digitaloceanapp.js validate --path ./do-config
node bin/digitaloceanapp.js doctor --path ./do-config
```

`validate` checks the generated files. `doctor` also checks local prerequisites and whether a required token variable is present, without displaying it. Both run offline; confirm the actual connection in your client's MCP settings.

Run `node bin/digitaloceanapp.js --help` for all options. If something isn't working, start with [troubleshooting](docs/troubleshooting.md).

## Permissions and privacy

DigitalOcean's tools can change and delete infrastructure. The skills guide your assistant's behavior, but **they cannot enforce read-only access**. Use appropriately scoped DigitalOcean access and your client's tool approval controls.

The project has no telemetry, proxy, or account database. Your AI client and DigitalOcean handle your requests under their own policies. Resource coverage, metrics, and billing detail depend on the tools DigitalOcean exposes; missing data should be reported as missing, not treated as zero usage.

Read the [security model](docs/security.md), [privacy statement](docs/privacy.md), and [known limitations](docs/limitations.md). Report vulnerabilities through [private security reporting](SECURITY.md).

## Contributing

Improvements to skills, client setup, and service coverage are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow. Coding agents should follow the repository's AGENTS.md.

```sh
npm ci
npm run check
```

Configuration and service-documentation changes are generated from the registry with `npm run generate`. The test suite covers client formats, CLI behavior, credential handling, and package installation. Live client checks are tracked separately in the [acceptance record](docs/acceptance.md).

For bugs and feature requests, [open an issue](https://github.com/DangerMouseUK/digitaloceanapp/issues). Please leave credentials and account data out of reports.

## License

[MIT](LICENSE). This is an independent community project, not an official DigitalOcean product or an endorsed integration.
