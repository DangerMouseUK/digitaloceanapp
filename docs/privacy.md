# Privacy

The maintainers of digitaloceanapp do not receive or store DigitalOcean account credentials or infrastructure data through normal use of the software. There is no project backend, telemetry endpoint, analytics system or retention database.

Setup writes user-selected configuration and skill files locally. Diagnostics inspect local configuration and whether the required token variable is present. They do not display its value or send diagnostics anywhere.

V3 bundles also store fingerprints of generated template files in their local metadata to help review upgrades. They do not record credentials, infrastructure identifiers, account responses or resource history. Dry-run previews write no files. Reviews and proposed-cost comparisons remain in the user's AI client; the utility does not export resource reports or maintain caches.

Repository behavioral-test evidence uses synthetic fixtures only. It is separate from any real user account or authenticated client session.

Your AI client, DigitalOcean, GitHub and npm have their own privacy and retention policies. MCP results may become part of your AI client's conversation history. Files or reports you independently choose to share in an issue are received by GitHub and the maintainers; redact them first.

Uninstalling this package does not remove client-managed credentials, revoke DigitalOcean grants or delete copies of generated bundles. Follow the client and provider's controls for those actions.
