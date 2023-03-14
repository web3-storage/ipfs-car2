import fs from 'fs'
import path from 'path'

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
