# Synthetic skill walkthroughs

`scenarios.json` contains synthetic prompts, fixtures and behavioral rubrics. Structural validation does not execute a model. The local recorder makes fixture reads and simulated writes inspectable without contacting DigitalOcean, invoking a model API or using credentials.

The checked-in [V2 evaluation record](evaluation.json) preserves 20 author-guided walkthroughs for `1.0.0-rc.2`. Eighteen have fully passing self-reviewed rubrics; two retain their original unverified follow-up checks. The [V3 author record](v3-evaluation.json) contains 12 current walkthroughs for `1.0.0-rc.3`: the 11 added scenarios plus the cost-window rerun. Both V2 follow-ups have passing V3 author reviews.

The [independent-executor record](v3-independent-evaluation.json) covers all 31 scenarios in a separately authorized agent context without author answers/rubrics. The author subsequently graded actual responses and fixture traces: 29 have all expectations passing; the original audit-cleanup and ambiguous-delete cases retain one unverified expectation each because their fixtures lack the necessary state. Their supplied follow-ups pass. Execution is independent; grading is by the author, and authenticated/client-discovery acceptance remains pending.

The suite contains 31 scenarios across 15 skills. An automated integrity check ties V3 records to current skills/fixtures and historical V2 records to their original source, including the [preserved V2 cost skill](../fixtures/v2-cost-review.md). It does not grade model behavior. [Acceptance](../../docs/acceptance.md) explains the remaining gates.

Run these commands from the repository; the parent of the new run directory must exist:

```sh
node scripts/evaluate-skills.js start ../skill-run "Evaluator model and client version"
node scripts/evaluate-skills.js prompt ../skill-run inventory-pagination
node scripts/evaluate-skills.js read ../skill-run inventory-pagination accounts
node scripts/evaluate-skills.js read ../skill-run inventory-pagination apps.pages.0
node scripts/evaluate-skills.js read ../skill-run inventory-pagination apps.pages.1
node scripts/evaluate-skills.js read ../skill-run inventory-pagination droplets
node scripts/evaluate-skills.js read ../skill-run inventory-pagination insights
```

The evaluating assistant reads the skill and prompt, chooses fixture fields to inspect, then writes a response and a reasoned outcome for each scenario expectation to a JSON file:

```json
{
  "response": "The actual assistant response goes here.",
  "rubric": [
    {
      "expectation": "Copy the exact expectation from the scenario.",
      "outcome": "pass",
      "reason": "Describe the observation in the actual trace or response."
    }
  ]
}
```

Include every expectation, in order. Outcomes are `pass`, `fail` or `unverified`. Finish with:

```sh
node scripts/evaluate-skills.js finish ../skill-run inventory-pagination ../response.json
```

`evaluation.json` records timestamps, skill/scenario SHA-256 hashes, requested fixture fields, returned values, responses and rubric judgments. The recorder validates the shape of judgments, not their truth. Only use synthetic data. To exercise the authorized timeout scenario, use `simulate-write RUN_DIRECTORY redeploy-timeout redeploy app-a`, then inspect `subsequentState`; this only records a mock action and never executes a command or contacts a service.

The recorder defaults to author-guided, self-reviewed metadata. The V2 and V3 author records are not independent evaluations, tests of automatic skill routing, or authenticated client acceptance. The separate executor record documents the user-approved evaluator and author grading explicitly. Ordinary CI only validates structure, recorded-evidence integrity and recorder mechanics.

For independent execution, give the authorized evaluator only the requested skill, scenario prompt and raw synthetic tool fixture interface. Withhold author responses and grading expectations. Collect actual calls and responses before a separate rubric review; document who evaluated and who graded, along with the model/client build where available. The supplied follow-up fixtures contain brief previous-turn results; disclose that limitation. Do not relabel author responses as independent. Keep executor runs separate until provenance has been reviewed, and set `independentGrading: false` when the author grades them. Only synthetic data may be stored in development records.

## Optional Python structural check

If Codex's skill-creator checker is available locally, run it with a Python interpreter that can import PyYAML. Use that same interpreter for both the import check and the validator; a successful installation through another `pip` may not make the module available to it.

```sh
python -c "import sys, yaml; print(sys.version); print(yaml.__version__)"
python -X utf8 "<path-to-skill-creator>/scripts/quick_validate.py" skills/database-review
```

Replace the checker path with its local location and repeat for each directory under `skills/`. Use `-X utf8` on Windows because the checker reads files using Python's default text encoding and the skills contain UTF-8 punctuation. The checker is an optional local tool, not a project dependency or a CI requirement.

The 2026-09-27 run passed all 13 skills with Python 3.14.7 and PyYAML 6.0.3. This checks frontmatter and scaffold structure only; the [acceptance record](../../docs/acceptance.md#python-skill-validation) keeps it separate from behavioral and authenticated testing.
