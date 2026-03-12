import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const soundsDir = path.join(rootDir, 'public', 'sounds')
const manifestPath = path.join(soundsDir, 'manifest.json')

const allowedExtensions = new Set(['.wav', '.mp3', '.ogg', '.opus'])

const entries = await readdir(soundsDir, { withFileTypes: true })

const files = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()))
  .sort((left, right) => left.localeCompare(right))

const manifest = {
  files,
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

console.log(`[sound-manifest] Wrote ${files.length} file(s) to public/sounds/manifest.json`)
