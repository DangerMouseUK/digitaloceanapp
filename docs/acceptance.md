# Acceptance record

Implementation target: 1.0.0-rc.1. Source review: 2026-09-27. This file separates completed static source review, automated checks, and user-assisted live acceptance. No DigitalOcean account was connected for implementation.

| Target          | Source reviewed | Automated configuration coverage                    | Authenticated / skills live |
| --------------- | --------------- | --------------------------------------------------- | --------------------------- |
| Portable plugin | 2026-09-27      | All supported modes/presets/platforms in test suite | Pending                     |
| ChatGPT         | 2026-09-27      | Remote OAuth bundles only                           | Pending                     |
| Codex           | 2026-09-27      | OAuth, token, local; all presets/platforms          | Pending                     |
| VS Code         | 2026-09-27      | OAuth, token, local; all presets/platforms          | Pending                     |
| Cursor          | 2026-09-27      | OAuth, token, local; all presets/platforms          | Pending                     |
| Claude Code     | 2026-09-27      | OAuth, token, local; all presets/platforms          | Pending                     |
| Claude Desktop  | 2026-09-27      | OAuth instructions/local; Windows and macOS         | Pending                     |
| Windsurf        | 2026-09-27      | OAuth, token, local; all presets/platforms          | Pending                     |

Automated results are recorded by the implementation PR and GitHub Actions for its exact commit. This table describes suite coverage, not an assertion that unrun CI jobs passed. Endpoint registry and package identifiers were checked against DigitalOcean v1.1.1; plugin schemas target Agent Plugins 1.0.0.

## Live acceptance procedure

Use an explicitly authorized account and read-only operations. Do not create test resources or run destructive tests. Record OS, client version, package version, preset, mode, date and outcome without account identifiers or sensitive output.

1. Generate a Core bundle into a fresh directory; validate it. Install manually while preserving existing configuration and skills.
2. Confirm the installed skill list and selected MCP servers. For OAuth authenticate directly with DigitalOcean; for local verify the official package starts and receives its environment.
3. Ask for account inventory. Expect account context, actual resource evidence, pagination where needed and coverage limitations for unconnected products.
4. Review an App Platform app. Distinguish current serving deployment from historical failure; report missing utilization rather than estimating it from alert settings.
5. Diagnose an existing failed deployment if one exists. Resolve exact app/deployment, inspect safe log excerpts, state evidence/uncertainty and do not redeploy. If no failed deployment exists, record unavailable instead of manufacturing one.
6. Perform a cost review using available data. Verify known/calculated/estimated labels, period and currency, without resizing/deleting.
7. Run the [behavioral scenarios](../tests/skills/scenarios.json) against synthetic tools/data only. Record actual tool-call traces, model/client version, rubric outcome and whether each case passed. Static scenario-file validation is not execution.
8. Remove the installed entries and skills and confirm unrelated configuration remains intact. Revoke test grants separately if desired.

A stable V1 release requires completed, recorded results for the advertised supported clients/modes or explicit narrowing of compatibility claims. Live testing is a separate acceptance gate and is not silently waived by merging code.
