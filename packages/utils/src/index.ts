import {Bot} from "zhin";
import {install as request} from './request'
import {Request} from "./request";
import * as time from './time'
import * as math from './math'
export * from './request'
declare module 'zhin'{
    namespace Bot{
        interface Services{
            axios:Request
        }
    }
}
export const name='utils'
export function install(bot:Bot,config:Utils.Config={}){
    if(!config) config={}
    bot.command('utils')
        .desc('公共工具')
    config.time!==false && bot.plugin(time)
    config.math!==false && bot.plugin(math)

    bot.plugin(request)
}
export namespace Utils{
    export interface Config{
        axios?:Request
        time?:boolean
        math?:boolean
    }
}