# Security policy

## Report privately

Report vulnerabilities in this project's configuration generation, validation, packaging or workflows through [GitHub private vulnerability reporting](https://github.com/DangerMouseUK/digitaloceanapp/security/advisories/new). Never place credentials or exploitable vulnerability details in a public issue. If the private form is unavailable, do not publish sensitive details; request a private reporting route from the maintainer.

Include affected version, reproduction using synthetic data, impact and any suggested mitigation. Do not attach real DigitalOcean tokens, resource secrets or production logs.

## Upstream concerns

DigitalOcean MCP authorization, tool implementation and DigitalOcean account behavior are upstream concerns. Follow [DigitalOcean's security reporting guidance](https://www.digitalocean.com/security) for those issues. Client credential storage and approval defects belong with the relevant client vendor. We can help identify the boundary without receiving credentials.

## Supported versions

The current release candidate is 1.0.0-rc.3. No stable compatibility claim is made before live acceptance. Security fixes target the current development branch and latest maintained release.

The project has no backend or credential custody. Skills are guidance, not an enforced authorization layer; see the [security model](docs/security.md).
