import {getPackages, PackageJson, spawnAsync } from './utils'
import { gt, prerelease } from 'semver'
import latest from 'latest-version'
import cac from 'cac'

const { args } = cac().help().parse()

function getVersion(name: string, isNext:boolean = false) {
    if (isNext) {
        return latest(name, { version: 'next' }).catch(() => getVersion(name))
    } else {
        return latest(name).catch(() => '0.0.0')
    }
}

;(async () => {
    const folders = await getPackages(args)
    const bumpMap: Record<string, PackageJson> = {}
    for(const name of folders){
        let meta: PackageJson
        try {
            meta = require(`../${name}/package.json`)
            if (!meta.private) {
                const version = await getVersion(meta.name, isNext(meta.version))
                if (gt(meta.version, version)) {
                    bumpMap[name] = meta
                }
            }
        } catch { /* pass */ }
    }

    function isNext(version: string) {
        const parts = prerelease(version)
        if (!parts) return false
        return parts[0] !== 'rc'
    }

    function publish(folder: string, name: string, version: string, tag: string) {
        console.log(`publishing ${name}@${version} ...`)
        return spawnAsync([
            'npm', 'publish',
            '--tag', tag,
            '--access', 'public',
        ],{cwd:folder})
    }

    if (Object.keys(bumpMap).length) {
        for (const folder in bumpMap) {
            const { name, version } = bumpMap[folder]
            await publish(folder, name, version, isNext(version) ? 'next' : 'latest')
        }
    }else{
        console.log('no package need publish')
        process.exit()
    }

})()
