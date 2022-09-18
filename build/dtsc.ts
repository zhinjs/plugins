/* eslint-disable no-cond-assign */

import { cwd, getPackages, PackageJson, requireSafe, spawnAsync } from './utils'
import { resolve,join } from 'path'
import {promises as fsp} from 'fs'
import json5 from 'json5'
import * as dtsc from 'dtsc'
import cac from 'cac'
import ts from 'typescript'

const { args, options } = cac().help().parse()
delete options['--']

async function readJson(path: string) {
    const data = await fsp.readFile(path, 'utf8')
    return json5.parse(data)
}

interface TsConfig {
    compilerOptions: ts.CompilerOptions
}

async function prepareBuild(nodes: Node[]) {
    if (!nodes.length) return
    await fsp.writeFile(cwd + '/tsconfig.temp.json', JSON.stringify({
        files: [],
        references: nodes.map(node => ({ path: '.' + node.path })),
    }, null, 2))
}

async function bundleNodes(nodes: Node[]) {
    for (const node of nodes) {
        console.log('building',node.path)
        await dtsc.build(join(cwd, node.path),['--outFile',join(cwd, node.path,'lib/index.d.ts')])
    }
}

interface Node {
    path?: string
    meta?: PackageJson
    prev?: string[]
    next?: Set<string>
    bundle?: boolean
    config?: TsConfig
    visited?: boolean
}


;(async () => {
    // Step 1: get relevant packages
    const folders = await getPackages(args)

    // Step 2: initialize nodes
    const nodes: Record<string, Node> = {}
    await Promise.all(folders.map(async (path) => {
        const fullPath = resolve(cwd, path)
        const meta: PackageJson = requireSafe(fullPath + '/package.json')
        if (!meta || meta.private) return
        const config: TsConfig = await readJson(fullPath + '/tsconfig.json')
        const bundle = true
        nodes[meta.name] = { path, meta, config, bundle, prev: [], next: new Set() }
    }))

    // Step 3: build dependency graph
    for (const name in nodes) {
        const { meta } = nodes[name]
        const deps = {
            ...meta.dependencies,
            ...meta.devDependencies,
            ...meta.peerDependencies,
        }
        for (const dep in deps) {
            if (!nodes[dep]) continue
            nodes[name].prev.push(dep)
            nodes[dep].next.add(name)
        }
        delete nodes[name].meta
    }

    // Step 4: generate bundle workflow
    let bundle = false
    const layers: Node[][] = []
    while (Object.keys(nodes).length) {
        const layer: Node[] = []
        bundle = !bundle
        let flag = true
        while (flag) {
            flag = false
            for (const name of Object.keys(nodes)) {
                const node = nodes[name]
                if (node.next.size || node.bundle === bundle) continue
                flag = true
                layer.unshift(node)
                delete nodes[name]
                node.prev.forEach((prev) => {
                    nodes[prev].next.delete(name)
                })
            }
        }
        if (layers.length && !layer.length) {
            console.log(nodes)
            throw new Error('circular dependency detected')
        }
        layers.unshift(layer)
    }

    // Step 5: generate dts files
    // make sure the number of layers is even
    if (bundle) layers.unshift([])
    for (let i = 0; i < layers.length; i += 2) {
        const bundleTargets = layers[i]
        const buildTargets = layers[i + 1]
        await Promise.all([
            prepareBuild(buildTargets),
            bundleNodes(bundleTargets),
        ])
        if (buildTargets.length) {
            const code = await spawnAsync(['tsc', '-b', 'tsconfig.temp.json'])
            if (code) process.exit(code)
        }
    }
})()
