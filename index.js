/* eslint-env browser */
import fs from 'fs'
import { Writable } from 'stream'
import * as UnixFS from './unixfs.js'
import { checkPathsExist, filesFromPaths } from './lib.js'
import { CAREncoderStream } from './car.js'

/**
 * @param {string} file
 * @param {object} opts
 * @param {string[]} opts._
 * @param {string} [opts.file]
 * @param {boolean} [opts.hidden]
 * @param {string} [opts.output]
 */
export async function pack (file, opts) {
  const paths = checkPathsExist([file, ...opts._].filter(Boolean))
  const hidden = !!opts.hidden
  const files = await filesFromPaths(paths, { hidden })
  const blockStream = files.length === 1 && opts['no-wrap']
    ? UnixFS.createFileEncoderStream(files[0])
    : UnixFS.createDirectoryEncoderStream(files)
  const carEncoderStream = new CAREncoderStream()
  const outStream = Writable.toWeb(opts.output ? fs.createWriteStream(opts.output) : process.stdout)
  await blockStream.pipeThrough(carEncoderStream).pipeTo(outStream)
  console.error(carEncoderStream.finalBlock?.cid.toString())
}
