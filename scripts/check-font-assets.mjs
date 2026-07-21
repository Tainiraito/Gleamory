import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fontDir = path.join(root, 'src/assets/fonts')
const manifest = JSON.parse(await readFile(path.join(fontDir, 'manifest.json'), 'utf8'))
const runtimeExtensions = new Set(['.css', '.html', '.json', '.ts', '.tsx'])
const ignoredDirectories = new Set(manifest.runtimeScan.excludedDirectories)

const expandRanges = (ranges) => {
  const values = new Set()
  for (const range of ranges) {
    const [startText, endText = startText] = range.split('-')
    const start = Number.parseInt(startText, 16)
    const end = Number.parseInt(endText, 16)
    for (let value = start; value <= end; value += 1) values.add(value)
  }
  return values
}

const walk = async (directory) => {
  const paths = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) paths.push(...(await walk(entryPath)))
    else if (runtimeExtensions.has(path.extname(entry.name))) paths.push(entryPath)
  }
  return paths
}

const currentRuntimeCodepoints = new Set()
for (const sourcePath of [path.join(root, 'index.html'), ...(await walk(path.join(root, 'src')))]) {
  const content = await readFile(sourcePath, 'utf8')
  for (const character of content) currentRuntimeCodepoints.add(character.codePointAt(0))
}

const recordedRuntimeCodepoints = expandRanges(manifest.runtimeScan.codepointRanges)
const unrecorded = [...currentRuntimeCodepoints].filter((value) => !recordedRuntimeCodepoints.has(value))
if (unrecorded.length > 0) {
  const sample = unrecorded
    .sort((a, b) => a - b)
    .slice(0, 20)
    .map((value) => `U+${value.toString(16).toUpperCase().padStart(4, '0')}`)
    .join(', ')
  throw new Error(`新增运行时字符尚未更新字体子集：${sample}`)
}

const sourcePaths = [path.join(root, 'index.html'), ...(await walk(path.join(root, 'src')))]
const forbiddenSourcePatterns = [
  [/fonts\.(?:googleapis|gstatic)\.com/i, '外部字体 URL'],
  [/\b(?:font-kai|system-ui|LXGW WenKai|KaiTi)\b/i, '已废弃或系统字体主来源'],
  [/\bfont-(?:bold|italic)\b|(?<!not-)\bitalic\b|font-style\s*:\s*italic/i, '无对应本地字形的粗体或斜体'],
  [/font-weight\s*:\s*(?:650|700|750)\b|fontWeight\s*=\s*(?:\{|["'])?(?:650|700|750)\b/i, '无对应本地字形的字重'],
  [/text-\[(?:0\.(?:5\d|6\d)rem|10px)\]|fontSize\s*=\s*["'](?:9|10)["']/i, '低于 11px 的文字'],
]

for (const sourcePath of sourcePaths) {
  const content = await readFile(sourcePath, 'utf8')
  for (const [pattern, label] of forbiddenSourcePatterns) {
    if (pattern.test(content)) {
      throw new Error(`${path.relative(root, sourcePath)} 仍包含${label}：${pattern}`)
    }
  }
}

let totalBytes = 0
for (const font of manifest.files) {
  const fontPath = path.join(fontDir, font.path)
  const data = await readFile(fontPath)
  const fileStat = await stat(fontPath)
  const hash = createHash('sha256').update(data).digest('hex')
  if (hash !== font.sha256) throw new Error(`${font.path} 哈希不匹配`)
  if (fileStat.size !== font.bytes) throw new Error(`${font.path} 文件大小与 manifest 不一致`)
  const budget =
    font.coverage === 'mono'
      ? manifest.budgets.monoFileBytes
      : manifest.budgets.cjkFileBytes
  if (fileStat.size > budget) throw new Error(`${font.path} 超出 ${budget} bytes 预算`)
  totalBytes += fileStat.size
}

if (totalBytes > manifest.budgets.totalBytes) {
  throw new Error(`字体总大小 ${totalBytes} bytes 超出 ${manifest.budgets.totalBytes} bytes 预算`)
}

console.log(`字体资产检查通过：${manifest.files.length} 个文件，共 ${totalBytes} bytes。`)
