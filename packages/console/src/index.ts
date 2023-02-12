import {Context, Plugin, Schema, useOptions} from 'zhin'
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
    uiPath: string
    endpoint: string
}

export interface Console extends Console.Services {}

export class Console {
    public global = {} as ClientConfig
    constructor(public plugin:Plugin,public ctx: Context, public config: Console.Config) {
        const { uiPath='console', apiPath='api', selfUrl='/' } = config
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

    addEntry(filename: string) {
        this.web.addEntry(filename)
    }

    addListener<K extends keyof Events>(event: K, callback: Events[K], options?: DataService.Options) {
        this.ws.addListener(event, { callback, ...options })
    }
}

export interface Events {}

export namespace Console {
    export interface Config extends WebService.Config, WsService.Config {}
    export interface Services {
        web?: WebService
        ws?: WsService
    }
}
export const Config=Schema.object({
    root:Schema.string(),
    uiPath:Schema.string().default('console'),
    open:Schema.boolean(),
    selfUrl:Schema.string().default('/'),
    apiPath:Schema.string().default('api')
})
export function install(ctx:Context){
    let config:Console.Config=useOptions('services.console')
    if(config===null)config={}
    ctx.service('console',new Console(this,ctx,config))
}
