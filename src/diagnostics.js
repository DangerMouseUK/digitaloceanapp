// This is a public, versioned report format. Never include input or parser errors.
export function diagnosticReport(command, result) {
  const findings = [
    { code: 'CONFIGURATION_VALID', check: 'Configuration valid', ok: true },
    ...(result.findings ?? []),
  ];
  return {
    schemaVersion: 1,
    command,
    ok: findings.every((finding) => finding.ok),
    authentication: 'unverified',
    services: result.services,
    findings,
  };
}

export function diagnosticFailure(command, code = 'CONFIGURATION_INVALID') {
  return {
    schemaVersion: 1,
    command,
    ok: false,
    authentication: 'unverified',
    services: [],
    findings: [
      {
        code,
        check:
          code === 'INVALID_ARGUMENTS'
            ? 'Invalid command arguments'
            : 'Configuration could not be validated',
        ok: false,
        remedy:
          code === 'INVALID_ARGUMENTS'
            ? 'Run --help and check the command and its supported options.'
            : 'Check the path, bundle version and metadata, selected client and services, required files, and credential references. Run the text command for a more specific redacted explanation.',
      },
    ],
  };
}
