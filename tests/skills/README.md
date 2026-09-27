# Synthetic skill walkthroughs

`scenarios.json` contains synthetic prompts, fixtures and behavioral rubrics. Structural validation does not execute a model. The local recorder makes fixture reads and simulated writes inspectable without contacting DigitalOcean, invoking a model API or using credentials.

The checked-in [evaluation record](evaluation.json) contains the 20 author-guided walkthroughs for `1.0.0-rc.2`. Eighteen have fully passing self-reviewed rubrics; two have unverified follow-up checks. [Acceptance](../../docs/acceptance.md) explains their limits. An automated integrity check ties the record to the current skills and fixtures; it does not grade model behavior.

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

Walkthroughs recorded here are author-guided and self-reviewed in the current Codex session. They are not independent blind evaluations, tests of automatic skill routing, or authenticated client acceptance. A future independent evaluation must use a separate explicitly authorized evaluator and record its actual model/client version and tool trace. Ordinary CI only validates structure and recorder mechanics.

## Optional Python structural check

If Codex's skill-creator checker is available locally, run it with a Python interpreter that can import PyYAML. Use that same interpreter for both the import check and the validator; a successful installation through another `pip` may not make the module available to it.

```sh
python -c "import sys, yaml; print(sys.version); print(yaml.__version__)"
python -X utf8 "<path-to-skill-creator>/scripts/quick_validate.py" skills/database-review
```

Replace the checker path with its local location and repeat for each directory under `skills/`. Use `-X utf8` on Windows because the checker reads files using Python's default text encoding and the skills contain UTF-8 punctuation. The checker is an optional local tool, not a project dependency or a CI requirement.

The 2026-09-27 run passed all 13 skills with Python 3.14.7 and PyYAML 6.0.3. This checks frontmatter and scaffold structure only; the [acceptance record](../../docs/acceptance.md#python-skill-validation) keeps it separate from behavioral and authenticated testing.
