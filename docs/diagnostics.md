# Structured diagnostics

Add `--json` to `validate` or `doctor` for a single JSON report on standard output. Checks run offline; neither command authenticates, launches the MCP package or executes commands in configuration.

```sh
node bin/digitaloceanapp.js validate --path "../My bundle" --json
node bin/digitaloceanapp.js doctor --path "../My bundle" --json
```

Reports use `schemaVersion: 1`, `command`, `ok`, `services`, `authentication: "unverified"` and a `findings` array. Each finding contains a stable `code`, readable `check`, boolean `ok`, and a `remedy` when corrective action is available. Exit status is 0 for successful offline checks and 1 for invalid input or failed checks. Human-readable output remains the default.

| Code                    | Meaning                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `CONFIGURATION_VALID`   | The requested configuration or bundle passed validation.                   |
| `CONFIGURATION_INVALID` | The configuration could not be validated or read.                          |
| `INVALID_ARGUMENTS`     | Missing or unsupported CLI arguments; consult help.                        |
| `NODE_VERSION`          | Whether the running Node version meets the requirement.                    |
| `NPX_AVAILABLE`         | Whether an npx executable is on PATH; startup is unverified.               |
| `CLIENT_SECRET_INPUT`   | VS Code manages the configured password input; its value is unverified.    |
| `TOKEN_ENVIRONMENT`     | Whether the required token variable is present; its value is never output. |
| `TARGET_PLATFORM`       | A failure when the bundle targets a different operating system.            |

An invalid configuration stops prerequisite checks. The failure report omits raw input, parser details, paths and environment values; `services` is empty when validation did not complete. Run the same command without `--json` for its more specific redacted explanation. This output is a diagnostic summary, not proof of account access or a general scanner for every third-party server in your file.

Consumers should use codes and booleans rather than matching prose. Additional codes may be added within schema version 1; incompatible report changes require a new schema version.
