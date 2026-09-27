# Changelog

## Unreleased

- Scope installed-configuration checks to DigitalOcean servers while retaining whole-file detection of recognizable secret patterns; reject ambiguous VS Code token inputs.
- Require complete, current bundle metadata and nonempty installation instructions, while allowing annotations to the guide.
- Validate interactive answers at each prompt and tailor available modes, installation, verification, and removal guidance to the selected client and services.
- Check executable files and permissions in offline diagnostics, include corrective actions, and handle remote authentication independently of local service availability.
- Exclude default generated output from repository checks and add regression coverage. Live client authentication and skill behavior remain pending; the package stays at `1.0.0-rc.1`.

## 1.0.0-rc.1 — 2026-09-27

- Full V1 implementation: 21 reviewed services, four presets/custom selection and nine workflow skills.
- Portable plugin and Codex compatibility packaging; client-specific remote and local examples.
- Offline bundle generation, configuration validation, service listing and diagnostics.
- Cross-platform automated checks, credential scanning, endpoint drift detection and future-tag release packaging.
- Authenticated client compatibility and behavioral acceptance remain pending. No stable release or public-directory publication is implied.
