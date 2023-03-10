import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

export function getPkg () {
  // @ts-ignore JSON.parse works with Buffer in Node.js
  return JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)))
}

/**
 * @param {string|string[]} paths
 */
export function checkPathsExist (paths) {
  paths = Array.isArray(paths) ? paths : [paths]
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.error(`The path ${path.resolve(p)} does not exist`)
      process.exit(1)
    }
  }
  return paths
}

/**
 * Patch process.emit to skip experimental api warnings for fetch. ONLY FORWARDS!
 * source: https://stackoverflow.com/a/73525885/6490163
 */
export function unwarnify () {
  const originalEmit = process.emit
  process.emit = function (name, data) {
    if (
      name === 'warning' &&
      typeof data === 'object' &&
      data.name === 'ExperimentalWarning' &&
      data.message.includes('Fetch API')
    ) {
      return false
    }
    return originalEmit.apply(process, arguments)
  }
}

/**
 * @param {string[]} paths
 * @param {object} [options]
 * @param {boolean} [options.hidden]
 * @returns {Promise<import('./types').FileLike[]>}
 */
export async function filesFromPaths (paths, options) {
  /** @type {string[]|undefined} */
  let commonParts
  const files = []
  for (const p of paths) {
    for await (const file of filesFromPath(p, options)) {
      files.push(file)
      const nameParts = file.name.split(path.sep)
      if (commonParts == null) {
        commonParts = nameParts.slice(0, -1)
        continue
      }
      for (let i = 0; i < commonParts.length; i++) {
        if (commonParts[i] !== nameParts[i]) {
          commonParts = commonParts.slice(0, i)
          break
        }
      }
    }
  }
  const commonPath = `${(commonParts ?? []).join('/')}/`
  return files.map(f => ({ ...f, name: f.name.slice(commonPath.length) }))
}

/**
 * @param {string} filepath
 * @param {object} [options]
 * @param {boolean} [options.hidden]
 * @returns {AsyncIterableIterator<import('./types').FileLike>}
 */
async function * filesFromPath (filepath, options = {}) {
  filepath = path.resolve(filepath)
  const hidden = options.hidden ?? false

  /** @param {string} filepath */
  const filter = filepath => {
    if (!hidden && path.basename(filepath).startsWith('.')) return false
    return true
  }

  const name = filepath
  const stat = await fs.promises.stat(filepath)

  if (!filter(name)) {
    return
  }

  if (stat.isFile()) {
    const stream = () => Readable.toWeb(fs.createReadStream(filepath))
    // @ts-expect-error node web stream not type compatible with web stream
    yield { name, stream, size: stat.size }
  } else if (stat.isDirectory()) {
    yield * filesFromDir(filepath, filter)
  }
}

/**
 * @param {string} dir
 * @param {(name: string) => boolean} filter
 * @returns {AsyncIterableIterator<import('./types').FileLike>}
 */
async function * filesFromDir (dir, filter) {
  const entries = await fs.promises.readdir(path.join(dir), { withFileTypes: true })
  for (const entry of entries) {
    if (!filter(entry.name)) {
      continue
    }

    if (entry.isFile()) {
      const name = path.join(dir, entry.name)
      const { size } = await fs.promises.stat(name)
      const stream = () => Readable.toWeb(fs.createReadStream(name))
      // @ts-expect-error node web stream not type compatible with web stream
      yield { name, stream, size }
    } else if (entry.isDirectory()) {
      yield * filesFromDir(path.join(dir, entry.name), filter)
    }
  }
}
