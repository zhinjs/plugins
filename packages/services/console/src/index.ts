import {Context, Plugin, Schema} from 'zhin'
import WebService from './web'
import WsService from './ws'
import { DataService } from './service'

export * from './service'
export * from './web'
export * from './ws'

type NestedServices = {
    [K in keyof Console.Services as `console.${K}`]: Console.Services[K]
}

declare module 'zhin' {
    namespace Zhin {
        interface Services extends NestedServices {
            console: Console
        }
    }
}

export interface ClientConfig {
    devMode: boolean
    uiPath: string
    endpoint: string
    static?: boolean
}

export interface Console extends Console.Services {}

export class Console {
    public global = {} as ClientConfig
    constructor(public plugin:Plugin,public ctx: Context, public config: Console.Config) {
        const { devMode, uiPath='', apiPath='', selfUrl='http://localhost:'+this.ctx.zhin.options.port } = config
        this.global.devMode = devMode
        this.global.uiPath = uiPath
        this.global.endpoint = selfUrl + apiPath
        ctx.service('console.web',new WebService(plugin,ctx,config))
        ctx.service('console.ws',new WsService(plugin,ctx,config))
        const _this=this
        return new Proxy(_this,{
            get(target: typeof _this, p: string | symbol, receiver: any): any {
                const data=Reflect.get(target,p,receiver)
                if(data!==undefined||typeof p==='symbol') return data
                return target.ctx[`console.${p}`]
            }
        })
    }

    addEntry(filename: string|WebService.Entry) {
        this.web.addEntry(filename)
    }
    addListener<K extends keyof Events>(event: K, callback: Events[K], options?: DataService.Options) {
        this.ws.addListener(event, { callback, ...options })
    }
    registerMethod<K extends keyof Methods>(methodName: K, handler: Methods[K], options?: DataService.Options) {
        this.ws.addListener(methodName, { callback:handler, ...options })
    }
}
export interface Methods {}
export interface Events extends Methods{
}

export namespace Console {
    export interface Config {
        root?: string
        uiPath?: string
        devMode?: boolean
        cacheDir?: string
        open?: boolean
        selfUrl?: string
        apiPath?: string
    }
    export interface Services {
        web?: WebService
        ws?: WsService
    }
}
export function install(ctx:Context){
    let config:Console.Config=ctx.useOptions('services.console',Schema.object({
        root: Schema.string().description('前端页面的根目录。').hidden(),
        uiPath: Schema.string().description('前端页面呈现的路径。'),
        apiPath: Schema.string().description('后端 API 服务的路径。'),
        selfUrl: Schema
            .string()
            .description('Zhin 服务暴露在公网的地址。')
            .component('link'),
        open:Schema.boolean().description('是否自动打开浏览器。'),
        devMode: Schema.boolean().description('启用调试模式 (仅供开发者使用)。').hidden().default(true),
        cacheDir: Schema.string().description('调试服务器缓存目录。').default('.vite').hidden(),
    }).default({
        uiPath: '',
        apiPath: '/status',
        open: false,
        selfUrl: '',
    }))
    if(!config) config={}
    ctx.service('console',new Console(this,ctx,config))
}
