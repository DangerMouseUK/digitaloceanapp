# Claude apps

Use this guide for Claude on the web (claude.ai), Claude Desktop, the mobile apps and Cowork. Connectors you add here are configured through your Claude account and brokered from Anthropic's cloud, not installed on one computer.

Configuration mode: remote-oauth.

First-party references: [custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) and [skills](https://support.claude.com/en/articles/12512180-using-skills-in-claude). Source reviewed 2026-11-12; live DigitalOcean compatibility is pending.

## Generate

```sh
node bin/digitaloceanapp.js setup --client claude --preset core --output ./claude-bundle
```

The bundle contains `connectors.json` (the list of URLs to add), the skills and `INSTALL.md`. `connectors.json` is a checklist for the steps below, not a file Claude reads.

## Connect the servers

1. In Claude, open **Customize > Connectors**, choose **Add**, then **Add custom connector**.
2. Enter a name and the URL for one entry in `connectors.json`. Repeat for each entry.
3. Choose **Connect** and sign in to DigitalOcean when prompted. The Documentation connector needs no sign-in.

On Team and Enterprise plans, an owner adds each connector under **Organization settings > Connectors**, and members then connect it from **Customize > Connectors**. Free plans allow one custom connector, so pick the single service you need most.

Claude connects to DigitalOcean from Anthropic's cloud on your behalf. Local MCP servers are not available here; for a local server use [Claude Desktop](../claude-desktop/README.md) or [Claude Code](../claude-code/README.md).

## Add the skills

Claude uploads skills as ZIP files, one per skill. Each ZIP contains the skill folder, which contains `SKILL.md`.

```sh
cd claude-bundle/skills
zip -r app-troubleshooting.zip app-troubleshooting
```

On Windows PowerShell:

```powershell
Compress-Archive -Path app-troubleshooting -DestinationPath app-troubleshooting.zip
```

Upload each ZIP under **Customize > Skills > + > Create skill > Upload a skill**. Skills need code execution to be turned on, and an organization owner can restrict uploads.

## Verify

Run `node bin/digitaloceanapp.js validate --path ./claude-bundle`, check that each connector shows as connected and that your skills appear in the skills list, then ask "Show me my DigitalOcean account." A useful answer names the connected services and any it could not inspect. See [acceptance](../../docs/acceptance.md) for the full live check.

## Remove

Remove the connectors under **Customize > Connectors** (or **Organization settings > Connectors**) and delete the skills you uploaded. Revoke the DigitalOcean authorization separately if you no longer need it. See [troubleshooting](../../docs/troubleshooting.md) if a connector does not connect.
