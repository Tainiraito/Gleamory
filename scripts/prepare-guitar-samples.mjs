import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const cacheDir = join(root, '.cache', 'guitar-samples')
const sourceZip = join(cacheDir, 'iowa-guitar-mono.zip')
const extractDir = join(cacheDir, 'iowa-guitar-mono')
const outDir = join(root, 'public', 'audio', 'guitar-samples', 'acoustic')

const downloadUrl = 'https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/guitar/Guitar.mono.1644.1.zip'
const samples = [
  { midiNumber: 40, noteName: 'E2', file: 'midi-40.ogg', sourceFile: '1644mono/Guitar.mf.sulE.E2B2.aif' },
  { midiNumber: 45, noteName: 'A2', file: 'midi-45.ogg', sourceFile: '1644mono/Guitar.mf.sulA.A2B2.aif' },
  { midiNumber: 50, noteName: 'D3', file: 'midi-50.ogg', sourceFile: '1644mono/Guitar.mf.sulD.D3B3.aif' },
  { midiNumber: 55, noteName: 'G3', file: 'midi-55.ogg', sourceFile: '1644mono/Guitar.mf.sulG.G3B3.aif' },
  { midiNumber: 59, noteName: 'B3', file: 'midi-59.ogg', sourceFile: '1644mono/Guitar.mf.sulB.B3.aif' },
  { midiNumber: 64, noteName: 'E4', file: 'midi-64.ogg', sourceFile: '1644mono/Guitar.mf.sul_E.E4B4.aif' },
]

const dryRun = process.argv.includes('--dry-run')

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function downloadZip() {
  mkdirSync(cacheDir, { recursive: true })
  try {
    readFileSync(sourceZip)
    return
  } catch {
    run('curl', ['-L', downloadUrl, '-o', sourceZip])
  }
}

function extractSourceFiles() {
  mkdirSync(extractDir, { recursive: true })
  const code = [
    'import zipfile, pathlib, sys',
    `zip_path = ${JSON.stringify(sourceZip)}`,
    `out_dir = pathlib.Path(${JSON.stringify(extractDir)})`,
    `names = ${JSON.stringify(samples.map((sample) => sample.sourceFile))}`,
    'out_dir.mkdir(parents=True, exist_ok=True)',
    'with zipfile.ZipFile(zip_path) as archive:',
    '    for name in names:',
    '        archive.extract(name, out_dir)',
  ].join('\n')
  run('python3', ['-c', code])
}

function convertSamples() {
  mkdirSync(outDir, { recursive: true })
  for (const sample of samples) {
    run('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      '0.04',
      '-t',
      '2.1',
      '-i',
      join(extractDir, sample.sourceFile),
      '-af',
      'afade=t=in:st=0:d=0.005,afade=t=out:st=1.75:d=0.35,loudnorm=I=-18:TP=-1.5:LRA=11',
      '-c:a',
      'libvorbis',
      '-q:a',
      '4',
      join(outDir, sample.file),
    ])
  }
}

function writeManifest() {
  const manifest = {
    sourceName: 'University of Iowa Musical Instrument Samples - Guitar',
    sourceUrl: 'https://theremin.music.uiowa.edu/MISguitar.html',
    downloadUrl,
    licenseSummary: 'The source overview states that all recordings may be downloaded and used in any projects, without restrictions.',
    preparedAt: new Date().toISOString().slice(0, 10),
    format: 'ogg/vorbis',
    strategy: 'Open-string mf mono samples, pitch-shifted at playback with Web Audio playbackRate.',
    samples,
  }
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
}

if (dryRun) {
  console.log(`Source: ${downloadUrl}`)
  console.log(`Runtime output: ${outDir}`)
  for (const sample of samples) {
    console.log(`${sample.noteName} -> ${sample.file} from ${sample.sourceFile}`)
  }
  process.exit(0)
}

downloadZip()
extractSourceFiles()
convertSamples()
writeManifest()
