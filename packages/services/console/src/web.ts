import {Plugin, Dict, Context, noop} from 'zhin'
import {dirname, extname, resolve} from 'path'
import {createReadStream, existsSync, promises as fsp} from 'fs'
import {DataService} from './service'
import {Console} from "./index";
import {ViteDevServer} from 'vite'

class WebService extends DataService<string[]> {
    private vite: ViteDevServer
    private entries: Dict<WebService.Entry> = {}
    root: string
    private isStarted: boolean = false

    constructor(public plugin: Plugin, ctx: Context, private config: Console.Config) {
        super(ctx, 'web')
        this.root = config.root ? config.root : ctx.zhin.isDev ?
            resolve(dirname(require.resolve('@zhinjs/client/package.json')), 'app') :
            resolve(__dirname, '../dist')
        this.start()
    }

    async start() {
        if (this.isStarted) return
        if (!this.root) return
        if (this.ctx.zhin.isDev) await this.createVite()
        this.serveAssets()
        this.isStarted = true
    }


    addEntry(entry: string | WebService.Entry) {
        const key = 'extension-' + Math.random().toFixed(8)
        if (typeof entry === 'string') entry = {
            dev: entry,
            prod: entry
        }
        this.entries[key] = entry
        this.refresh()
        this.plugin.context.disposes.push(() => {
            delete this.entries[key]
            this.refresh()
            return true
        })
    }

    get() {
        const filenames: string[] = []
        for (const key in this.entries) {
            const local = this.ctx.zhin.isDev ? this.entries[key].dev : this.entries[key].prod
            const filename = this.ctx.zhin.isDev ? '/vite/@fs/' + local : this.config.uiPath + '/' + key
            if (extname(local)) {
                filenames.push(filename)
            } else {
                filenames.push(filename + '/index.js')
                if (existsSync(local + '/style.css')) {
                    filenames.push(filename + '/style.css')
                }
            }
        }
        return filenames
    }

    private serveAssets() {
        const {uiPath} = this.config

        this.ctx.router.get(uiPath + '(/.+)*', async (ctx, next) => {
            await next()
            if (ctx.body || ctx.response.body) return

            // add trailing slash and redirect
            if (ctx.path === uiPath && !uiPath.endsWith('/')) {
                return ctx.redirect(ctx.path + '/')
            }
            const name = ctx.path.slice(uiPath.length).replace(/^\/+/, '')
            const sendFile = (filename: string) => {
                ctx.type = extname(filename)
                return ctx.body = createReadStream(filename)
            }
            if (name.startsWith('extension-')) {
                const key = name.slice(0, 20)
                if (this.entries[key]) return sendFile((this.ctx.zhin.isDev ?
                    this.entries[key].dev :
                    this.entries[key].prod) + name.slice(20))
            }
            const filename = resolve(this.root, name)
            if (!filename.startsWith(this.root) && !filename.includes('node_modules')) {
                return ctx.status = 403
            }
            const stats = await fsp.stat(filename).catch(noop)
            if (stats && stats?.isFile()) return sendFile(filename)
            const ext = extname(filename)
            if (ext && ext !== '.html') return ctx.status = 404
            const template = await fsp.readFile(resolve(this.root, 'index.html'), 'utf8')
            ctx.type = 'html'
            ctx.body = await this.transformHtml(template)
        })
    }

    private async transformHtml(template: string) {
        const {uiPath} = this.config
        if (this.vite) {
            template = await this.vite.transformIndexHtml(uiPath, template)
        } else {
            template = template.replace(/(href|src)="(?=\/)/g, (_, $1) => `${$1}="${uiPath}`)
        }
        const headInjection = `<script>zhin_config = ${JSON.stringify(this.ctx.console.global)}</script>`
        return template.replace('</title>', '</title>' + headInjection)
    }

    private async createVite() {
        const {cacheDir} = this.config
        const {createServer} = require('vite') as typeof import('vite')
        const {default: vue} = require('@vitejs/plugin-vue') as typeof import('@vitejs/plugin-vue')
        this.vite = await createServer({
            root: this.root,
            base: '/vite/',
            cacheDir: resolve(process.cwd(), cacheDir),
            server: {
                middlewareMode: true,
                fs: {
                    strict: false,
                },
            },
            plugins: [vue()],
            resolve: {
                dedupe: ['vue', 'vue-demi', 'vue-router', 'element-plus', '@vueuse/core', '@popperjs/core', 'marked'],
                alias: {
                    '../client.js': '@zhinjs/client',
                    '../vue.js': 'vue',
                    '../vue-router.js': 'vue-router',
                    '../vueuse.js': '@vueuse/core',
                },
            },
            optimizeDeps: {
                include: [
                    'vue',
                    'vue-router',
                    'element-plus',
                    '@vueuse/core',
                    '@popperjs/core',
                    'marked',
                ],
            },
            build: {
                rollupOptions: {
                    input: this.root + '/index.html',
                },
            },
        })

        this.ctx.router.all('/vite(/.+)*', (ctx) => new Promise((resolve) => {
            this.vite.middlewares(ctx.req, ctx.res, resolve)
        }))

        this.ctx.on('dispose', () => this.vite.close())
    }
}

namespace WebService {
    export interface Config {
        root?: string
        uiPath?: string
        open?: boolean
    }

    export interface Entry {
        dev: string
        prod: string
    }
}

export default WebService
