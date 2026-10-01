# Changelog

## Unreleased

## 1.0.0-rc.3 — 2026-10-01

- Add offline setup dry runs with services, skills, installation and authentication previews; add redacted JSON to setup and upgrade dry runs without changing validate/doctor reports.
- Record advisory generated-file fingerprints in new bundles; distinguish release changes, customizations and missing files during upgrades. Retain rc.1 and rc.2 support and manual review for older bundles without fingerprints.
- Add deployment preflight and database/Droplet backup and recovery reviews; extend cost review to compare proposed changes using official prices and explicit assumptions.
- Tailor installation task examples to connected services and separate server verification from skill discovery. Resource findings remain in the AI client, with no account-data persistence or project services.
- Add 11 synthetic scenarios and record 12 current author walkthroughs including the cost-window rerun and V2 follow-ups. Preserve historical V2 evidence and record a user-authorized independent executor's 31 scenarios with separate author grading: 29 fully passing and two original fixture-limited cases. Authenticated compatibility remains pending.

## 1.0.0-rc.2 — 2026-09-27

- Add task-oriented setup guidance and show selected services, mode and client installation steps before generation.
- Add versioned JSON reports to validate and doctor with stable check codes, outcomes and corrective actions.
- Add offline bundle upgrades with dry-run comparison, preserved selections and a manual migration guide. Existing bundles and personal client settings are never overwritten.
- Deepen App Platform troubleshooting, dependency checks and cost evidence; add database, Kubernetes, Droplet and networking review skills.
- Add upgrade and diagnostic regression tests plus a local synthetic walkthrough recorder. Independent behavioral evaluation and authenticated client acceptance remain pending; configurations are described as experimental templates.
- Scope installed-configuration checks to DigitalOcean servers while retaining whole-file detection of recognizable secret patterns; reject ambiguous VS Code token inputs.
- Require complete, current bundle metadata and nonempty installation instructions, while allowing annotations to the guide.
- Validate interactive answers at each prompt and tailor available modes, installation, verification, and removal guidance to the selected client and services.
- Check executable files and permissions in offline diagnostics, include corrective actions, and handle remote authentication independently of local service availability.
- Exclude default generated output from repository checks and add regression coverage. Live client authentication and independent skill evaluation remain pending.

## 1.0.0-rc.1 — 2026-09-27

- Full V1 implementation: 21 reviewed services, four presets/custom selection and nine workflow skills.
- Portable plugin and Codex compatibility packaging; client-specific remote and local examples.
- Offline bundle generation, configuration validation, service listing and diagnostics.
- Cross-platform automated checks, credential scanning, endpoint drift detection and future-tag release packaging.
- Authenticated client compatibility and behavioral acceptance remain pending. No stable release or public-directory publication is implied.
