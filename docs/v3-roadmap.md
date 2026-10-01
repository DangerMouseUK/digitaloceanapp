# V3: useful tasks, easier setup and verified compatibility

V3 is a product milestone targeting `1.0.0-rc.3`. It retains direct official DigitalOcean connections, a local setup utility, Core and remote OAuth defaults, offline ordinary commands and manual installation.

## Implemented

1. **Setup and upgrades:** text/JSON dry-run previews, task examples matched to selected services, separate connection/skill verification, advisory fingerprints of generated templates, and continued upgrades from rc.1/rc.2 without copying custom content.
2. **Useful tasks:** deployment preflight, managed database/Droplet backup and recovery reviews, and proposed-change cost comparisons. Reviews disclose unavailable evidence and do not deploy, restore, resize or save resource reports.
3. **Behavioral evidence:** automated regressions, 31 synthetic scenarios, preserved V2 records and 12 current author walkthroughs, including both V2 follow-ups. One user-authorized independent executor exercised all 31 scenarios; author grading found 29 fully passing and two original fixtures with insufficient follow-up evidence. Both new follow-ups pass. Automatic client discovery and live compatibility remain pending.

## Pending acceptance

- Preserve the distinction between independent execution and author grading. The executor record does not claim independently blinded grading, exact model/client-build identification, live pagination or automatic skill discovery. The original two partial fixtures retain their unverified outcomes.
- Test each existing client through user-assisted, explicitly authorized sessions. Record client/version/mode/OS, authentication, selected-server discovery, skill activation, inventory and applicable V3 workflows. Restrict account operations to reads and do not create billable test resources.
- Keep untested combinations experimental. Portable-plugin results apply to the host tested. Fix demonstrated failures before promoting the corresponding compatibility claims.

V3 evidence does not close V2's pending live acceptance gate or promote the package to stable. See [acceptance](acceptance.md), [synthetic evaluation](../tests/skills/README.md), [upgrades](upgrading.md) and [preview reports](diagnostics.md).

## Data boundary

Persist only configuration, skills and generated-template metadata. The utility does not store account data, export resource reports, run a backend/proxy, retain credentials, collect telemetry or perform background monitoring. The AI client and DigitalOcean have their own data policies. Development evaluation records use synthetic data only. Authentication, publishing, cloud writes and stable release promotion remain separate authorized actions. The original PRD is preserved.
