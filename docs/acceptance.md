# Acceptance record

Implementation target: 1.0.0-rc.2. Source review: 2026-09-27. This file separates source review, automated checks, author-guided synthetic walkthroughs, and user-assisted live acceptance. No DigitalOcean account was connected for implementation. All client/mode combinations below are experimental configuration templates; none is advertised as authenticated or behaviorally certified.

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

Independent evaluation, all authenticated compatibility cells, and the two follow-up branches remain pending. Neither these walkthroughs nor successful automated checks promote V1 to stable or complete the V2 release gate.

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
