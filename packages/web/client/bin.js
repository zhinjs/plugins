#!/usr/bin/env node

const CAC = require('cac')
const { resolve } = require('path')
const { buildExtension } = require('./lib')

const { version } = require('./package.json')

const cli = CAC().help().version(version)

cli.command('build [root]')
    .action((root) => {
        root = resolve(process.cwd(), root || '.')
        buildExtension(root)
    })
cli.parse()

if (!cli.matchedCommand) {
    cli.outputHelp()
}
