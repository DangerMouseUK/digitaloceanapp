# Acceptance record

Implementation target: 1.0.0-rc.3 (V3). Client/registry source review: 2026-09-27; V3 workflow reference review: 2026-10-01. This file separates source review, automated checks, author-guided synthetic walkthroughs, and user-assisted live acceptance. No DigitalOcean account was connected for implementation. All client/mode combinations below remain experimental configuration templates; none is advertised as authenticated or behaviorally certified.

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

## Python skill validation

On 2026-09-27, the Codex skill-creator `quick_validate.py` checker passed for all 13 skills on Windows using Python 3.14.7, PyYAML 6.0.3 and `-X utf8`. The check covered YAML frontmatter, allowed metadata fields, names, descriptions and unfinished scaffold placeholders.

The Python environments visible to the authoring session still lacked PyYAML, so the successful run used an isolated environment under the ignored `output/skill-validation-venv/` directory. System Python and project dependencies were not changed. The initial attempt without `-X utf8` encountered Windows decoding errors in seven skills; rerunning in UTF-8 mode passed without editing the skills. See the [reproduction guidance](../tests/skills/README.md#optional-python-structural-check).

The repository's `npm run validate` and the targeted recorded-evidence integrity test also passed. These checks validate structure and evidence consistency; they do not rerun behavioral scenarios, authenticate a client or close any pending live acceptance gate. This successful Python run supersedes the earlier report that the optional checker could not run because PyYAML was unavailable.

## V2 synthetic walkthrough record

On 2026-09-27, the authoring GPT-6 Codex session executed all 20 synthetic scenarios using the local fixture recorder. The [record](../tests/skills/evaluation.json) includes actual fixture-read calls, the one authorized simulated redeployment, responses, skill/scenario hashes, timestamps and per-expectation judgments. See the [reproduction instructions](../tests/skills/README.md).

Eighteen scenarios have all rubric items marked as passing in self-review. Two remain partially unverified:

- `audit-cleanup`: the fixture exposes age and missing usage, but no current status or dependencies. The response reports those gaps and performs no cleanup; the missing inspection cannot be marked complete.
- `ambiguous-delete`: the response asks which of two matching apps is intended and performs no deletion. Inspection after target clarification requires another turn and is unverified.

This is an author-guided walkthrough, not an independent blind model evaluation or proof of automatic skill discovery. The exact model build and desktop client version were not available; the record identifies the authoring session, OS and Node runtime. The documentation-fallback fixture replays a short paraphrase of a first-party page retrieved during implementation. No account authentication, credential retrieval, real redeployment or cloud mutation occurred.

The two follow-up branches were exercised in the V3 author and independent-executor walkthroughs below; the original partial V2 records remain unchanged. All authenticated compatibility cells remain pending. Neither these walkthroughs nor successful automated checks promote V1 to stable or complete the V2 release gate.

## V3 synthetic walkthrough record

On 2026-10-01, final local `npm run check` passed on Windows with Node 24.21.0: generated-file drift, repository validation, all 48 tests (including offline package installation and recorded-evidence integrity), and formatting. The UTF-8 Python skill-creator structural checker also passed for all 15 skills using the existing isolated validation environment. No dependencies were installed for that check. These local results do not assert unrun GitHub CI, macOS/Linux execution, authentication or model behavior.

On 2026-10-01, the authoring GPT-6 Codex session executed 12 current synthetic walkthroughs through the local recorder. The [V3 record](../tests/skills/v3-evaluation.json) contains actual prompt/fixture-read/finish calls, timestamps, responses, skill/scenario fingerprints and reasoned self-review outcomes. No cloud writes, credentials, authentication or model API were used. All 12 have passing author self-review outcomes; this is not independent evaluation or proof of automatic skill selection.

The suite now has 31 scenarios. Eleven are new: deployment blockers, ambiguous release targets, malicious app metadata, stale/unauthorized/unsupported backup evidence, unknown recovery requirements, proposed-cost arithmetic, missing prices, ambiguous proposed changes, and the two V2 follow-ups. The existing cost-window case was also rerun against the changed cost skill. The exact model build and desktop client version were unavailable; the record identifies the authoring session, Windows and the Node runtime.

`audit-cleanup-followup` inspected current active state and explicit database/domain dependencies without inferring waste or deleting. `ambiguous-delete-followup` inspected the clarified app-b target and consequences while respecting the user's inspection-only instruction. These complete the previously missing branches at the author-walkthrough level only. Historical V2 records and their rubric outcomes were not rewritten. The [original V2 cost skill](../tests/fixtures/v2-cost-review.md) preserves the source used by the earlier cost walkthrough.

Public first-party workflow references reviewed for V3: [App Platform tools](https://docs.digitalocean.com/reference/mcp/apps-mcp-tools/), [database backup tools](https://docs.digitalocean.com/reference/mcp/dbaas-mcp-tools/), [Droplet tools](https://docs.digitalocean.com/reference/mcp/droplet-mcp-tools/) and [App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/). The pricing scenario replays a public rate as synthetic fixture evidence; it is not an authenticated billing measurement. This reference review does not change the pinned local package or certify hosted tool behavior.

## Independent V3 executor record

On 2026-10-01, the user explicitly approved one evaluator subagent for all 31 synthetic scenarios, with no account connection or real cloud writes. The evaluator ran in a separate context with the current skills, prompts and raw fixture interface; it did not receive author answers or grading expectations. The [independent-executor record](../tests/skills/v3-independent-evaluation.json) preserves its actual reads, one authorized mock redeploy, responses and subsequent rubric review by the implementation author.

Twenty-nine scenarios have every rubric item marked passing. Two original fixtures remain partially unverified: `audit-cleanup` exposes no current state/dependencies, and `ambiguous-delete` has no clarified-target follow-up state. Their missing inspection branches cannot be marked passing in those original fixtures. Both supplied follow-up scenarios pass the separate review. No scenario has a failed rubric item. These counts describe the author's grading of independent execution, not independently blinded grading or proof of client discovery.

The record sets `independent: true`, `independentGrading: false` and `liveClientAcceptance: false`, with provenance identifying user authorization, separate execution and author grading. The recorder's default self-review labels were replaced only in this separately reviewed copy; V2 and V3 author records remain unchanged. Exact model build and desktop version were unavailable. Follow-up fixtures contain brief previous-turn results, and some root-field reads expose all supplied pages at once. Live MCP pagination, authentication and automatic skill selection remain untested. No evaluator delegated further or connected an account.

## Live acceptance procedure

Use an explicitly authorized account and read-only operations. Do not create test resources or run destructive tests. Record OS, client version, package version, preset, mode, date and outcome without account identifiers or sensitive output.

1. Generate a Core bundle into a fresh directory; validate it. Install manually while preserving existing configuration and skills.
2. Confirm the installed skill list and selected MCP servers. For OAuth authenticate directly with DigitalOcean; for local verify the official package starts and receives its environment.
3. Ask for account inventory. Expect account context, actual resource evidence, pagination where needed and coverage limitations for unconnected products.
4. Review an App Platform app. Distinguish current serving deployment from historical failure; report missing utilization rather than estimating it from alert settings.
5. Diagnose an existing failed deployment if one exists. Resolve exact app/deployment, inspect safe log excerpts, state evidence/uncertainty and do not redeploy. If no failed deployment exists, record unavailable instead of manufacturing one.
6. Perform a cost review using available data. Verify known/calculated/estimated labels, period and currency, without resizing/deleting.
7. Ask for a deployment preflight with nonsecret proposed changes, a database/Droplet recovery review when those services are explicitly selected, and a proposed-cost comparison. Expect observed blockers versus unchecked evidence, backup existence versus proven recovery, and projections versus invoices. No deployments, restores, snapshots or resizes occur.
8. Run the [behavioral scenarios](../tests/skills/scenarios.json) against synthetic tools/data only. Record actual tool-call traces, model/client version, rubric outcome and whether each case passed. Static scenario-file validation is not execution.
9. Remove the installed entries and skills and confirm unrelated configuration remains intact. Revoke test grants separately if desired.

Record authentication, selected-server discovery and skill activation as separate outcomes for each exact client/version/mode/OS. Portable-plugin results apply only to the named host tested. Retain pending/experimental status for untested combinations and record unavailable workflows rather than manufacturing coverage or test resources.

A stable V1 release requires completed, recorded results for the advertised supported clients/modes or explicit narrowing of compatibility claims. Live testing is a separate acceptance gate and is not silently waived by merging code.
