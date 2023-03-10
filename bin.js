#!/usr/bin/env node

import sade from 'sade'
import { getPkg, unwarnify } from './lib.js'
import { pack } from './index.js'

unwarnify()

const cli = sade('ipfs-car2')

cli
  .version(getPkg().version)
  .example('pack path/to/files')

cli
  .command('pack [file]')
  .describe('Pack files into a CAR.')
  .option('-H, --hidden', 'Include paths that start with ".".')
  .option('--no-wrap', 'Don\'t wrap input files with a directory.', false)
  .option('-o, --output', 'Output file.')
  .action(pack)

cli.parse(process.argv)
