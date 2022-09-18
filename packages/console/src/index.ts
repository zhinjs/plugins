import {Bot, Plugin } from 'zhin'
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
    namespace Bot {
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
    constructor(public plugin:Plugin,public bot: Bot, public config: Console.Config) {
        const { uiPath='console', apiPath='api', selfUrl='/' } = config
        this.global.uiPath = uiPath
        this.global.endpoint = selfUrl + apiPath
        bot.service('console.web',new WebService(plugin,bot,config))
        bot.service('console.ws',new WsService(plugin,bot,config))
        const _this=this
        return new Proxy(_this,{
            get(target: typeof _this, p: string | symbol, receiver: any): any {
                const data=Reflect.get(target,p,receiver)
                if(data!==undefined||typeof p==='symbol') return data
                return target.bot[`console.${p}`]
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

export function install(bot:Bot,config:Console.Config){
    if(config===null)config={}
    bot.service('console',new Console(this,bot,config))
}
