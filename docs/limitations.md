# Limitations

- This release candidate has no completed authenticated compatibility matrix. Account access, OAuth, skill activation and behavior require the live acceptance gate.
- Public Plugin Directory submission and local/personal plugin compatibility are separate. This maintainer cannot verify control of DigitalOcean's MCP domains.
- Every client has different formats, secret handling, installation controls and feature availability. ChatGPT cloud does not run the local stdio bundle. Claude Desktop Linux is rejected.
- The Claude API and OpenAI Responses API targets require a DigitalOcean API token supplied by your code; neither can run DigitalOcean OAuth. The Claude API executes MCP tool calls without per-call approval. Neither API loads skill folders, and acceptance of a DigitalOcean API token in their authorization fields is unverified live.
- The Claude apps accept remote connectors only, and skill uploads depend on plan, code execution and organization policy. Installing this repository as a Claude Code plugin always selects Core with remote OAuth and places the setup utility in `bin/` on the Bash tool's `PATH`; use a generated plugin bundle for other selections.
- Setup generates a bundle; the user installs it manually. It does not merge, back up or remove personal client configuration.
- Upgrade accepts reviewed rc.1/rc.2/current bundles and creates a replacement in a fresh directory. V3 fingerprints distinguish some release changes from customizations; older bundles without fingerprints still require manual comparison. Fingerprints are advisory, not integrity evidence. Additional files and customizations remain in the original bundle for manual reconciliation.
- Deployment preflight cannot certify unseen code or future builds. Backup completion does not prove restorability or a recovery-time objective. Proposed costs depend on current prices and stated runtime/usage assumptions.
- Setup and upgrade dry runs do not check output-directory writability. JSON previews require noninteractive arguments and cannot be combined with writing commands.
- A supported endpoint does not guarantee a particular tool. Insights can expose monitoring policies without app CPU/memory timeseries. Spaces can expose access keys/CDNs without a complete bucket inventory.
- Cost review has no project-maintained history. It uses available invoices, prices and measurements and reports observation periods, missing peaks and estimates.
- Static tests check structure and scenarios, not AI behavior. Skills cannot guarantee non-destructive execution; use client approvals and DigitalOcean permissions.
- Offline doctor checks cannot establish package startup, OAuth success, GUI environment inheritance, client subscription eligibility or account access.
- Validation is scoped to DigitalOcean entries and expected selections. It is not a validator for every third-party MCP server or every optional client setting.
- Ordinary CI has no DigitalOcean credentials and never performs cloud mutations. No test account or billable resource is provisioned.
