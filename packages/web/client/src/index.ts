import { build, InlineConfig, mergeConfig, transformWithEsbuild, UserConfig } from 'vite'
import { RollupOutput } from 'rollup'
import { existsSync, promises as fsp } from 'fs'
import vue from '@vitejs/plugin-vue'

export async function buildExtension(root: string, config: UserConfig = {}) {
    if (!existsSync(root + '/client')) return

    const outDir = root + '/dist'
    if (existsSync(outDir)) {
        await fsp.rm(outDir, { recursive: true })
    }
    await fsp.mkdir(root + '/dist', { recursive: true })

    const results = await build(mergeConfig({
        root,
        build: {
            write: false,
            outDir: 'dist',
            assetsDir: '',
            minify: true,
            emptyOutDir: true,
            commonjsOptions: {
                strictRequires: true,
            },
            lib: {
                entry: root + '/client/index.ts',
                formats: ['es'],
            },
            rollupOptions: {
                makeAbsoluteExternalsRelative: true,
                external: [
                    root + '/vue.js',
                    root + '/vue-router.js',
                    root + '/vueuse.js',
                    root + '/client.js',
                ],
                output: {
                    format: 'iife',
                    entryFileNames: '[name].js',
                },
            },
        },
        plugins: [
            vue(),
        ],
        resolve: {
            alias: {
                'vue': root + '/vue.js',
                'vue-i18n': root + '/client.js',
                'vue-router': root + '/vue-router.js',
                '@vueuse/core': root + '/vueuse.js',
                '@zhinjs/client': root + '/client.js',
                '@zhinjs/components': root + '/client.js',
            },
        },
        define: {
            'process.env.NODE_ENV': '"production"',
        },
    } as InlineConfig, config)) as RollupOutput[]

    for (const item of results[0].output) {
        if (item.fileName === 'index.mjs') item.fileName = 'index.js'
        const dest = root + '/dist/' + item.fileName
        if (item.type === 'asset') {
            await fsp.writeFile(dest, item.source)
        } else {
            const result = await transformWithEsbuild(item.code, dest, {
                minifyWhitespace: true,
            })
            await fsp.writeFile(dest, result.code)
        }
    }
}
