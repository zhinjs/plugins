import {Plugin, Dict, Context} from 'zhin'
import { dirname, extname, resolve } from 'path'
import { createReadStream, existsSync, promises as fsp, Stats } from 'fs'
import {createServer} from "vite";
import vuePlugin from "@vitejs/plugin-vue";
import { DataService } from './service'
import { ViteDevServer } from 'vite'
import '@zhinjs/plugin-http'
import koaConnect from 'koa-connect'

class WebService extends DataService<string[]> {
    private vite: ViteDevServer
    private data: Dict<string> = {}
    root:string
    private isStarted:boolean=false

    constructor(public plugin:Plugin,ctx: Context, private config: WebService.Config) {
        super(ctx, 'web')

        this.root=config.root?config.root: resolve(dirname(require.resolve('@zhinjs/client/package.json')), 'app')
        this.start()
    }

    async start() {
        if(this.isStarted)return
        if (!this.root) return
        await this.createVite()
        this.serveAssets()
        if (this.config.open) {
            const { port=8086 } = this.ctx.app.options['http']||{}
            open(`http://localhost:${port}${this.config.uiPath}`)
        }
        this.isStarted=true
    }


    addEntry(entry: string) {
        const key = 'extension-' + Math.random().toFixed(8)
        this.data[key] = entry
        this.refresh()
        this.plugin.context.disposes.push(()=>{
            delete this.data[key]
            this.refresh()
            return true
        })
    }

    get() {
        const filenames: string[] = []
        for (const key in this.data) {
            const local = this.data[key]
            const filename = '/vite/@fs/' + local
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
        const { uiPath } = this.config
        const {root}=this
        this.ctx.router.get(uiPath + '(/.+)*', async (ctx, next) => {
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
                const key = name.slice(0, 18)
                if (this.data[key]) return sendFile(this.data[key] + name.slice(18))
            }
            const filename = resolve(root, name)
            if (!filename.startsWith(root) && !filename.includes('node_modules')) {
                return ctx.status = 403
            }
            const stats = await fsp.stat(filename).catch(()=>{})
            if (stats && stats?.isFile()) return sendFile(filename)
            const ext = extname(filename)
            if (ext && ext !== '.html') return next()
            const template = await fsp.readFile(resolve(root, 'index.html'), 'utf8')
            ctx.type = 'html'
            ctx.body = await this.transformHtml(template)
        })
    }

    private async transformHtml(template: string) {
        const { uiPath } = this.config
        if (this.vite) {
            template = await this.vite.transformIndexHtml(uiPath, template)
        } else {
            template = template.replace(/(href|src)="(?=\/)/g, (_, $1) => `${$1}="${uiPath}`)
        }
        const headInjection = `<script>oitq_config = ${JSON.stringify(this.ctx.console.global)}</script>`
        return template.replace('</title>', '</title>' + headInjection)
    }

    private async createVite() {
        const { root } = this
        this.vite = await createServer({
            root,
            base:'/vite/',
            server: {
                middlewareMode: true,
                fs: {
                    strict: false,
                }
            },
            plugins: [vuePlugin()],
            resolve: {
                dedupe: ['vue'],
                alias: {
                    '../vue.js': 'vue',
                    '../vue-router.js': 'vue-router',
                    '../vueuse.js': '@vueuse/core',
                },
            },
            optimizeDeps: {
                include: [
                    'element-plus',
                ],
            },
            build: {
                rollupOptions: {
                    input: this.root + '/index.html',
                },
            },
        })

        this.ctx.router.get('/vite(/.+)*', koaConnect(this.vite.middlewares))
        this.plugin.context.disposes.push(() => {
            this.vite.close()
            return true
        })
    }
}

namespace WebService {
    export interface Config {
        root?: string
        uiPath?: string
        open?: boolean
    }
}

export default WebService
