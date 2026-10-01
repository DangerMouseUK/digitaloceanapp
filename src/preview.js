import {
  bundleFiles,
  installationAuthentication,
  taskExamples,
} from './bundle.js';
import { clients, installationDetails } from './clients.js';

export async function setupPreview(options) {
  const files = [...(await bundleFiles(options)).keys()];
  const prefix = `${clients[options.client].skills}/`;
  return {
    schemaVersion: 1,
    command: 'setup',
    ok: true,
    dryRun: true,
    authentication: 'unverified',
    selection: options,
    files,
    skills: files
      .filter((file) => file.startsWith(prefix) && file.endsWith('/SKILL.md'))
      .map((file) => file.slice(prefix.length, -'/SKILL.md'.length)),
    installation: {
      destination: installationDetails(options).destination,
      skills: clients[options.client].skills,
      authentication: installationAuthentication(options),
    },
    tasks: taskExamples(options.keys),
  };
}

export function setupPreviewSummary(report) {
  const { selection, installation } = report;
  return [
    `Client: ${clients[selection.client].name}. Mode: ${selection.mode}. Platform: ${selection.platform}.`,
    `Services: ${selection.keys.join(', ')}`,
    `Skills: ${report.skills.join(', ')}`,
    `Install: ${installation.destination}`,
    `Skill directory: ${installation.skills}/. Verify connections and skill discovery separately in the client.`,
    `Authentication: ${installation.authentication}`,
    'Dry run: no files written. Authentication remains unverified.',
  ].join('\n');
}

export function upgradePreview(plan) {
  return {
    schemaVersion: 1,
    command: 'upgrade',
    ok: true,
    dryRun: true,
    authentication: 'unverified',
    selection: plan.options,
    fromVersion: plan.fromVersion,
    toVersion: plan.toVersion,
    changes: plan.changes,
    extraFileCount: plan.extraFileCount,
  };
}

export function previewFailure(command, code) {
  return {
    schemaVersion: 1,
    command,
    ok: false,
    dryRun: true,
    authentication: 'unverified',
    findings: [
      {
        code,
        remedy:
          'Check supported arguments, selections and bundle metadata locally. Run --help. Input details are suppressed.',
      },
    ],
  };
}
