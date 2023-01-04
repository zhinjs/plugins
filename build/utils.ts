import { resolve } from 'path'
import spawn from 'cross-spawn'
import { readdir } from 'fs-extra'
import { SpawnOptions } from 'child_process'

export const cwd = resolve(__dirname, '..')

const categories = [
    'packages',
    'games'
]
const coreLib=[
    'http',
    "prompt",
    'console',
    'database',
    'client'
].map(lib=>`packages/${lib}`)
export async function getPackages(args: readonly string[]) {
    const folders = (await Promise.all(categories.map(async (seg) => {
        const names = await readdir(`${cwd}/${seg}`).catch<string[]>(() => [])
        return names.map(name => `${seg}/${name}`).filter(name => !name.includes('.') && !categories.includes(name))
    }))).flat()
    return args.length ? folders.filter(folder=>args.includes(folder)) : folders.sort((a,b)=>{
        if(coreLib.indexOf(a)>-1){
            if(coreLib.indexOf(b)>-1){
                return coreLib.indexOf(a)>coreLib.indexOf(b)?-1:1
            }
            return 1
        }else if(coreLib.indexOf(b)>-1){
            return -1
        }
        return 0
    })
}

export function requireSafe(id: string) {
    try {
        return require(id)
    } catch {}
}

export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'

export interface PackageJson extends Partial<Record<DependencyType, Record<string, string>>> {
    name?: string
    main?: string
    module?: string
    description?: string
    private?: boolean
    version?: string
}

export function spawnAsync(args: string[], options?: SpawnOptions) {
    const child = spawn(args[0], args.slice(1), { cwd, stdio: 'inherit', ...options })
    return new Promise<number>((resolve) => {
        child.on('close', resolve)
    })
}
