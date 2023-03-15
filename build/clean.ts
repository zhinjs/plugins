import {cwd, getPackages} from './utils'
import * as path from "path";
import {rm} from 'fs-extra'
import cac from 'cac'

const {args} = cac().help().parse()

;(async () => {
    const packages = await getPackages(args)
    await Promise.all(packages.map((packckageDir) => {
        return [
            rm([cwd, packckageDir, 'dist'].join(path.sep), {recursive: true, force: true}),
            rm([cwd, packckageDir, 'lib'].join(path.sep), {recursive: true, force: true}),
            rm([cwd, packckageDir, 'temp'].join(path.sep), {recursive: true, force: true}),
            rm([cwd, packckageDir, 'tsconfig.tsbuildinfo'].join(path.sep), {recursive: true, force: true})
        ]
    }))
})()
