import { spawnSync } from 'node:child_process'
import { platform } from 'node:os'

const env = { ...process.env }

if (platform() !== 'win32' && !env.TMPDIR) {
  env.TMPDIR = '/tmp'
}

const result = spawnSync('vitest', ['run', ...process.argv.slice(2)], {
  env,
  shell: platform() === 'win32',
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
