# Contributing

Use Node.js 22+ and npm. Run `npm ci`, make a focused change, `npm run generate`, `npm run format`, then `npm run check`. Commit the lockfile and generated artifacts. Do not reformat the historical PRD unnecessarily.

## Services and clients

Add endpoints only with a first-party DigitalOcean source. Update the service registry with provenance/date, remote auth requirements and verified local identifiers. Review sensitive/destructive capabilities, update appropriate presets and run generation. Do not enable new services in Core automatically.

Keep syntax, paths and authentication handling in client adapters. Use the client's own documentation for interpolation and installation; upstream examples can lag behind client changes. Add a configuration fixture, supported/unsupported combination tests and a dated compatibility note. Never resolve a real credential to generate an example.

## Skills

Explain the user goal, triggers, services, investigation sequence, output, uncertainties and whether changes are allowed. Include essential safety instructions in every skill. Add realistic cases to the evaluation scenarios and document whether they were actually executed. Structural tests do not demonstrate model behavior. Keep instructions concise and avoid brittle upstream tool names.

## Pull requests

Describe user-visible changes, validation and remaining limitations. No backend, database, account system, proxy, telemetry or new production dependencies without a concrete justified need. Do not include resource data, secrets or unrelated changes.

Follow the [code of conduct](CODE_OF_CONDUCT.md). Use [private reporting](SECURITY.md) for security issues.
