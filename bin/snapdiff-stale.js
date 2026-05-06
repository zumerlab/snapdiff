#!/usr/bin/env node
// CLI: scan a baseline directory and a source directory, report drift.
//
// Usage:
//   snapdiff-stale [--baseline DIR] [--source DIR] [--ext .html]
//                  [--unattended] [--strict] [--quiet]
//
// Default behavior: prints findings, prompts to re-record if there are stale
// baselines and you're on a TTY. CI / headless contexts auto-skip the prompt.

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, exit, argv, env } from 'node:process'
import { checkStaleness } from '../src/stale-check.js'

function parseArgs(rest) {
  const out = { _: [] }
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '-h' || a === '--help') { out.help = true; continue }
    if (!a.startsWith('--')) { out._.push(a); continue }
    const key = a.slice(2)
    const next = rest[i + 1]
    if (next == null || next.startsWith('--')) { out[key] = true; continue }
    out[key] = next
    i++
  }
  return out
}

const args = parseArgs(argv.slice(2))

if (args.help) {
  console.log(`
snapdiff-stale — report which visual baselines are older than their sources.

Usage:
  snapdiff-stale [options]

Options:
  --baseline <dir>   baseline directory (default: __snapshots__/visual)
  --source <dir>     source directory (default: demo/components)
  --ext <.ext>       source file extension (default: .html)
  --unattended       no prompts, just print
  --strict           exit 1 if any baseline is stale (for CI gates)
  --quiet            no output when everything is up to date
  -h, --help         show this help
`)
  exit(0)
}

const { stale, orphans, unrecorded } = await checkStaleness({
  baselineDir: args.baseline,
  sourceDir: args.source,
  sourceExt: args.ext,
})

const PREFIX = '[snapDiff]'

if (stale.length === 0 && orphans.length === 0 && unrecorded.length === 0) {
  if (!args.quiet) console.log(`${PREFIX} all baselines up to date`)
  exit(0)
}

if (stale.length) {
  console.warn(`${PREFIX} ${stale.length} baseline(s) older than source:`)
  const pad = Math.min(32, Math.max(...stale.map(s => s.name.length)))
  for (const s of stale) {
    console.warn(`  ${s.name.padEnd(pad)}  source +${formatAge(s.ageMs)} newer`)
  }
  console.warn('  Re-record with: UPDATE_VISUAL=1 npm test')
}
if (unrecorded.length) {
  if (stale.length) console.warn('')
  console.warn(`${PREFIX} ${unrecorded.length} source(s) without baseline (never tested):`)
  for (const n of unrecorded) console.warn(`  ${n}`)
}
if (orphans.length) {
  if (stale.length || unrecorded.length) console.warn('')
  console.warn(`${PREFIX} ${orphans.length} baseline(s) without source (consider deleting):`)
  for (const n of orphans) console.warn(`  ${n}`)
}

const interactive = !args.unattended && stdin.isTTY && stdout.isTTY
if (interactive && stale.length > 0) {
  const rl = createInterface({ input: stdin, output: stdout })
  const ans = (await rl.question('\nRe-record stale baselines now? [y/N] ')).trim().toLowerCase()
  rl.close()
  if (ans === 'y' || ans === 'yes') {
    const child = spawn('npm', ['test'], {
      stdio: 'inherit',
      env: { ...env, UPDATE_VISUAL: '1' },
      shell: true,
    })
    const code = await new Promise(resolve => child.on('exit', resolve))
    exit(code ?? 0)
  }
}

exit(args.strict && stale.length ? 1 : 0)

function formatAge(ms) {
  const days = ms / 86400000
  if (days >= 1) return `${days.toFixed(1)}d`
  const hours = ms / 3600000
  if (hours >= 1) return `${hours.toFixed(1)}h`
  const mins = ms / 60000
  if (mins >= 1) return `${mins.toFixed(0)}m`
  return `${(ms / 1000).toFixed(0)}s`
}
