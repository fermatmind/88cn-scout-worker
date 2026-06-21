import fs from 'node:fs';
import path from 'node:path';
import {
  assertSafeOutputDir,
  buildAgentRunResult,
  readAgentManifest
} from '../contracts/agent-contracts.mjs';

const ARTIFACT_NAMES = [
  'manifest.json',
  'result.json',
  'events.jsonl',
  'quarantine.jsonl',
  'review-ready.jsonl',
  'report.md'
];

export function runAgentCli(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      process.stdout.write(usage());
      return 0;
    }
    const missing = ['agent', 'manifest', 'out'].filter((key) => !args[key]);
    if (missing.length > 0) {
      process.stderr.write(`missing required option(s): ${missing.join(', ')}\n`);
      return 2;
    }
    if (!args.dryRun) {
      process.stderr.write('--dry-run is required\n');
      return 2;
    }
    if (!args.noNetwork) {
      process.stderr.write('--no-network is required\n');
      return 2;
    }

    const validation = readAgentManifest(args.manifest);
    if (!validation.ok) {
      process.stderr.write(`invalid manifest: ${validation.errors.join(', ')}\n`);
      return 3;
    }
    if (validation.manifest.agent !== args.agent) {
      process.stderr.write(`agent mismatch: cli=${args.agent} manifest=${validation.manifest.agent}\n`);
      return 3;
    }

    const outputDir = assertSafeOutputDir(args.out);
    writeAgentArtifacts({
      manifest: validation.manifest,
      outputDir
    });
    return 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

export function writeAgentArtifacts({ manifest, outputDir }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const result = buildAgentRunResult({
    manifest,
    artifactNames: ARTIFACT_NAMES
  });
  const files = {
    manifest: path.join(outputDir, 'manifest.json'),
    result: path.join(outputDir, 'result.json'),
    events: path.join(outputDir, 'events.jsonl'),
    quarantine: path.join(outputDir, 'quarantine.jsonl'),
    reviewReady: path.join(outputDir, 'review-ready.jsonl'),
    report: path.join(outputDir, 'report.md')
  };

  fs.writeFileSync(files.manifest, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(files.result, JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(files.events, `${JSON.stringify({
    event: 'agent_contract_validated',
    run_id: manifest.run_id,
    agent: manifest.agent,
    dry_run: true,
    network_used: false
  })}\n`);
  fs.writeFileSync(files.quarantine, '');
  fs.writeFileSync(files.reviewReady, '');
  fs.writeFileSync(files.report, [
    `# ${manifest.agent} Dry-Run Report`,
    '',
    '- Runtime started: no',
    '- Network used: no',
    '- DB/Supabase writes: no',
    '- published_projection writes: no',
    '- Sitemap mutation: no',
    '- External outreach: no',
    ''
  ].join('\n'));
  return files;
}

function parseArgs(argv) {
  const args = {
    agent: null,
    manifest: null,
    out: null,
    dryRun: false,
    noNetwork: false,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--no-network') args.noNetwork = true;
    else if (arg === '--agent') args.agent = argv[++index];
    else if (arg === '--manifest') args.manifest = argv[++index];
    else if (arg === '--out') args.out = argv[++index];
    else throw new Error(`unknown option: ${arg}`);
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    'node ./src/cli/agent-runner.mjs --agent <AGENT> --manifest <path> --out <output_dir> --dry-run --no-network',
    ''
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runAgentCli();
}
