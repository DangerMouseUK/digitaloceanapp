# DigitalOcean collaboration draft

**Draft only — not sent.** Send only when the maintainer explicitly chooses a contact and authorizes outreach.

Subject: Feedback on digitaloceanapp, an independent MCP workflow integration

We have built an open-source, MIT-licensed client configuration and workflow package around DigitalOcean's official MCP services. It includes service presets, installation bundles and skills for account inventory, App Platform review, troubleshooting and cost analysis.

The architecture connects AI clients directly to DigitalOcean's hosted MCP endpoints or official local MCP package. There is no project backend, proxy, database, credential custody, telemetry or charge for the integration.

We would welcome technical review of endpoint/authentication assumptions, service coverage and skills, plus guidance on our working name, digitaloceanapp. The repository states that it is independent and not an official DigitalOcean product. We will consider any naming guidance before a wider launch.

Repository: [DangerMouseUK/digitaloceanapp](https://github.com/DangerMouseUK/digitaloceanapp).

Longer term, would DigitalOcean be interested in collaboration or supporting public OpenAI plugin distribution using its existing MCP infrastructure?

## Distribution options

1. Continue GitHub distribution with private/local plugin installation and native client configs.
2. Explore a skills-only public listing if current submission requirements allow it.
3. Pursue a full MCP-backed listing with DigitalOcean's involvement and domain verification.

[OpenAI submission guidance](https://developers.openai.com/plugins/deploy/submission) was reviewed on 2026-09-27. Public MCP-backed submission requires control of the server domain. Recheck at submission time. Do not introduce a hosted proxy to work around this requirement. No endorsement, approval or DigitalOcean feedback has been received as part of this implementation.
