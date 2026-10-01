# V2: workflows and bundle upgrades

V2 is a product milestone first implemented in release candidate `1.0.0-rc.2`; it did not promote the original V1 candidate to stable or claim authenticated compatibility. The current [V3 milestone](v3-roadmap.md) targets `1.0.0-rc.3` and records independent-executor evidence while preserving the pending live gate.

## Implemented stages

1. **Setup and upgrades:** task-oriented preset guidance, installation previews, structured offline diagnostics, and replacement bundle generation with a manual migration review.
2. **App Platform and costs:** investigation paths for build, startup, health checks and runtime; explicit dependency references; evidence windows, calculation inputs and prioritized next checks.
3. **Infrastructure:** standalone database, Kubernetes, Droplet and networking reviews with tool discovery and explicit coverage limits.

The implementation retains direct official connections, Core and remote OAuth defaults, manual installation and offline ordinary commands. No backend, dashboard, credential store or automatic cloud actions are introduced.

## Acceptance gates

- Automated regressions must cover old bundle upgrades, customizations, unsupported combinations, directory boundaries, credential-safe output and JSON diagnostics.
- Synthetic walkthroughs must record reads, simulated actions, responses and rubric outcomes. Author-guided walkthroughs are useful evidence but do not establish independent model behavior or client discovery.
- Independent behavioral evaluation must exercise pagination, ambiguous targets, missing evidence, malicious tool output, authorized operations and unauthorized-write prevention.
- Authenticated client/mode results must be recorded before advertising those combinations as verified. Until then, the project offers experimental configuration templates only.

See [acceptance](acceptance.md), [synthetic evaluation](../tests/skills/README.md), [upgrading](upgrading.md) and [diagnostics](diagnostics.md). V2 completion remains pending until behavioral and live acceptance evidence is sufficient. The original PRD remains unchanged.
