#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import {
  clients,
  assertCombination,
  supportedPlatforms,
} from '../src/clients.js';
import {
  registry,
  presets,
  selectServices,
  fullWarning,
  modes,
} from '../src/catalog.js';
import { createBundle } from '../src/bundle.js';
import { validatePath } from '../src/validate.js';
import { diagnose } from '../src/doctor.js';

const help = `digitaloceanapp — offline configuration and workflow bundles

  setup [--client CLIENT] [--mode MODE] [--preset PRESET | --services a,b]
        [--output NEW_DIRECTORY] [--platform win32|darwin|linux] [--interactive]
  validate --path BUNDLE_OR_CONFIG [--client CLIENT] [--mode MODE]
           [--preset PRESET | --services a,b] [--platform PLATFORM]
  doctor --path BUNDLE_OR_CONFIG [same validation options]
  services [--json]

Clients: ${Object.keys(clients).join(', ')}
Modes: ${modes.join(', ')}
Presets: ${Object.keys(presets).join(', ')} (default: core)
Default mode: remote-oauth. Default platform: current OS.
Explicit config validation defaults to Core/remote-oauth; specify a different selection.
Setup requires a client in noninteractive use. Default output: ./output-digitaloceanapp.
No commands install plugins, modify client settings, authenticate or contact DigitalOcean.
`;

async function interview(values) {
  const validateAnswers = (options) => {
    const client = options.client ?? 'codex';
    // A placeholder platform validates explicit flags without choosing the user's target.
    assertCombination(
      client,
      options.mode ?? 'remote-oauth',
      selectServices(options),
      options.platform ??
        (Object.hasOwn(clients, client)
          ? supportedPlatforms(client)[0]
          : process.platform),
    );
  };
  validateAnswers(values);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    rl.close();
  };
  rl.on('SIGINT', cancel);
  const ask = (question) =>
    new Promise((resolve, reject) => {
      const closed = () => {
        cancelled = true;
        reject(new Error('Setup cancelled; no output was written.'));
      };
      rl.once('close', closed);
      rl.question(question, (answer) => {
        rl.off('close', closed);
        resolve(answer.trim());
      });
    });
  const askValid = async (question, fallback, validate) => {
    while (true) {
      const answer = (await ask(question)) || fallback;
      try {
        validate(answer);
        return answer;
      } catch (error) {
        console.error(error.message);
      }
    }
  };
  try {
    const options = { ...values };
    options.client ??= await askValid(
      `Client (${Object.keys(clients).join(', ')}) [codex]: `,
      'codex',
      (client) => validateAnswers({ ...options, client }),
    );
    options.mode ??= await askValid(
      `Mode (${clients[options.client].modes.join(', ')}) [remote-oauth]: `,
      'remote-oauth',
      (mode) => validateAnswers({ ...options, mode }),
    );
    if (options.preset === undefined && options.services === undefined) {
      const selection = await askValid(
        `Preset (${Object.keys(presets).join(', ')}, custom) [core]: `,
        'core',
        (preset) => {
          if (preset !== 'custom') validateAnswers({ ...options, preset });
        },
      );
      if (selection === 'custom')
        options.services = await askValid(
          'Comma-separated service keys (run services to list): ',
          '',
          (services) => validateAnswers({ ...options, services }),
        );
      else options.preset = selection;
    }
    const targets = supportedPlatforms(options.client);
    const defaultPlatform = targets.includes(process.platform)
      ? process.platform
      : targets[0];
    options.platform ??= await askValid(
      `Platform (${targets.join(', ')}) [${defaultPlatform}]: `,
      defaultPlatform,
      (platform) => validateAnswers({ ...options, platform }),
    );
    options.output ??=
      (await ask('New output directory [./output-digitaloceanapp]: ')) ||
      './output-digitaloceanapp';
    if (cancelled) throw new Error('Setup cancelled; no output was written.');
    return options;
  } finally {
    rl.close();
    if (cancelled) process.exitCode = 130;
  }
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      strict: true,
      options: Object.fromEntries([
        ...[
          'client',
          'mode',
          'preset',
          'services',
          'output',
          'platform',
          'path',
        ].map((key) => [key, { type: 'string' }]),
        ...['help', 'json', 'interactive'].map((key) => [
          key,
          { type: 'boolean' },
        ]),
      ]),
    });
  } catch {
    throw new Error(
      'Invalid arguments. Run --help. Argument values are suppressed.',
    );
  }
  const { positionals } = parsed;
  let { values } = parsed;
  if (values.help || !positionals.length) {
    console.log(help);
    return;
  }
  if (positionals.length !== 1)
    throw new Error('Expected one command. Run --help.');
  const command = positionals[0];
  const allowed = {
    setup: [
      'client',
      'mode',
      'preset',
      'services',
      'output',
      'platform',
      'interactive',
    ],
    validate: ['path', 'client', 'mode', 'preset', 'services', 'platform'],
    doctor: ['path', 'client', 'mode', 'preset', 'services', 'platform'],
    services: ['json'],
  };
  if (
    !allowed[command] ||
    Object.keys(values).some((key) => !allowed[command].includes(key))
  )
    throw new Error('Unknown command or unsupported option. Run --help.');
  if (command === 'services') {
    if (values.json)
      console.log(JSON.stringify({ ...registry, presets }, null, 2));
    else {
      console.log(
        registry.services
          .map(
            (s) =>
              `${s.key}: ${s.description} [remote: ${s.remote.authentication}; local: ${s.local ? 'yes' : 'no'}]`,
          )
          .join('\n'),
      );
      console.log(
        '\nPresets: ' + Object.keys(presets).join(', ') + '\n' + fullWarning,
      );
    }
    return;
  }
  if (command === 'setup') {
    if (values.interactive || (!values.client && process.stdin.isTTY))
      values = await interview(values);
    if (!values.client)
      throw new Error('Noninteractive setup requires --client. Run --help.');
    const keys = selectServices(values);
    if (values.preset === 'full') console.error(fullWarning);
    const output = await createBundle(
      {
        client: values.client,
        mode: values.mode ?? 'remote-oauth',
        keys,
        platform: values.platform ?? process.platform,
      },
      values.output ?? './output-digitaloceanapp',
    );
    console.log(
      `Generated bundle: ${output}\nRead INSTALL.md for manual installation and removal. Authentication remains unverified.`,
    );
    return;
  }
  if (!values.path)
    throw new Error(
      'Provide --path to a bundle directory or client configuration file.',
    );
  if (command === 'validate') {
    const result = await validatePath(values.path, values);
    console.log(
      `Configuration valid. Services: ${result.services.join(', ')}. Authentication: unverified.`,
    );
  } else {
    const result = await diagnose(values.path, values);
    for (const item of result.findings)
      console.log(
        `${item.ok ? 'OK' : 'FAIL'}: ${item.check}${!item.ok && item.remedy ? '\n  ' + item.remedy : ''}`,
      );
    console.log(`Services: ${result.services.join(', ')}\n${result.note}`);
    if (result.findings.some((item) => !item.ok)) process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  // Only our controlled errors reach the user; filesystem/runtime details can include secrets.
  console.error(
    error.code || error instanceof TypeError
      ? 'Operation failed. Check input, filesystem access and configuration. No sensitive details displayed.'
      : error.message,
  );
  process.exitCode ||= 1;
}
